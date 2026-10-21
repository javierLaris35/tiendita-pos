import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { CashMovement, CashSession, Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { round2 } from '../sales/sale-math'
import { countCash } from './cash-count'
import { CloseDto, MovementDto, OpenDto } from './dto/cash.dto'

export interface Actor {
  userId: number
  role: string
}

export interface CutResult {
  openingAmount: number
  cashFromSales: number
  cashIn: number
  cashOut: number
  expectedCash: number
}

@Injectable()
export class CashService {
  constructor(private readonly prisma: PrismaService) {}

  /** Un cajero solo opera su propia caja; admin/manager pueden cualquier turno. */
  private assertOwnership(session: CashSession, actor: Actor): void {
    if (actor.role === 'cashier' && session.cashierId !== actor.userId) {
      throw new ForbiddenException('Ese turno es de otro cajero')
    }
  }

  private validateBreakdown(breakdown: Record<string, number>): void {
    for (const [denom, count] of Object.entries(breakdown)) {
      const d = Number(denom)
      if (!Number.isFinite(d) || d <= 0) throw new BadRequestException(`Denominación inválida: ${denom}`)
      if (!Number.isInteger(count) || count < 0) {
        throw new BadRequestException(`Cantidad inválida para la denominación ${denom}`)
      }
    }
  }

  async open(cashierId: number, dto: OpenDto): Promise<CashSession> {
    const existing = await this.prisma.cashSession.findFirst({ where: { cashierId, status: 'open' } })
    if (existing) throw new ConflictException('Ya tienes un turno abierto')
    try {
      return await this.prisma.cashSession.create({ data: { cashierId, openingAmount: dto.openingAmount } })
    } catch (e) {
      // Índice único parcial: dos aperturas concurrentes del mismo cajero → 409.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Ya tienes un turno abierto')
      }
      throw e
    }
  }

  async movement(actor: Actor, sessionId: number, dto: MovementDto): Promise<CashMovement> {
    const session = await this.prisma.cashSession.findUnique({ where: { id: sessionId } })
    if (!session) throw new NotFoundException(`No existe el turno ${sessionId}`)
    this.assertOwnership(session, actor)
    if (session.status === 'closed') throw new ConflictException(`El turno ${sessionId} está cerrado`)
    return this.prisma.cashMovement.create({
      data: { sessionId, type: dto.type, amount: dto.amount, reason: dto.reason, userId: actor.userId },
    })
  }

  /** Efectivo esperado = fondo + efectivo neto de ventas (recibido − cambio) + entradas − retiros. */
  private async computeExpected(client: Prisma.TransactionClient, session: CashSession): Promise<CutResult> {
    const sales = await client.sale.findMany({
      where: { cashSessionId: session.id, status: 'completed' },
      include: { payments: true },
    })
    let cashFromSales = 0
    for (const s of sales) {
      const cashPaid = s.payments.filter((p) => p.method === 'cash').reduce((a, p) => a + Number(p.amount), 0)
      cashFromSales += cashPaid - Number(s.change)
    }
    cashFromSales = round2(cashFromSales)

    const movements = await client.cashMovement.findMany({ where: { sessionId: session.id } })
    const cashIn = round2(movements.filter((m) => m.type === 'in').reduce((a, m) => a + Number(m.amount), 0))
    const cashOut = round2(movements.filter((m) => m.type === 'out').reduce((a, m) => a + Number(m.amount), 0))

    const openingAmount = Number(session.openingAmount)
    return {
      openingAmount,
      cashFromSales,
      cashIn,
      cashOut,
      expectedCash: round2(openingAmount + cashFromSales + cashIn - cashOut),
    }
  }

  async cutX(sessionId: number, actor: Actor): Promise<CutResult> {
    const session = await this.prisma.cashSession.findUnique({ where: { id: sessionId } })
    if (!session) throw new NotFoundException(`No existe el turno ${sessionId}`)
    this.assertOwnership(session, actor)
    return this.computeExpected(this.prisma, session)
  }

  /** Corte Z: cierra el turno (atómico por estado) y congela esperado/contado/diferencia. */
  async close(sessionId: number, dto: CloseDto, actor: Actor): Promise<CashSession> {
    this.validateBreakdown(dto.countedBreakdown)
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.cashSession.findUnique({ where: { id: sessionId } })
      if (!session) throw new NotFoundException(`No existe el turno ${sessionId}`)
      this.assertOwnership(session, actor)

      const marked = await tx.cashSession.updateMany({
        where: { id: sessionId, status: 'open' },
        data: { status: 'closed' },
      })
      if (marked.count !== 1) throw new ConflictException(`El turno ${sessionId} ya está cerrado`)

      const fresh = await tx.cashSession.findUniqueOrThrow({ where: { id: sessionId } })
      const cut = await this.computeExpected(tx, fresh)
      const countedCash = countCash(dto.countedBreakdown)
      const difference = round2(countedCash - cut.expectedCash)

      return tx.cashSession.update({
        where: { id: sessionId },
        data: { closedAt: new Date(), expectedCash: cut.expectedCash, countedCash, difference, notes: dto.notes },
      })
    })
  }
}
