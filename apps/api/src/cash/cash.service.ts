import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { CashMovement, CashSession, Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { round2 } from '../sales/sale-math'
import { countCash } from './cash-count'
import { CloseDto, MovementDto, OpenDto } from './dto/cash.dto'

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

  async open(cashierId: number, dto: OpenDto): Promise<CashSession> {
    const existing = await this.prisma.cashSession.findFirst({ where: { cashierId, status: 'open' } })
    if (existing) throw new ConflictException('Ya tienes un turno abierto')
    return this.prisma.cashSession.create({ data: { cashierId, openingAmount: dto.openingAmount } })
  }

  async movement(userId: number, sessionId: number, dto: MovementDto): Promise<CashMovement> {
    const session = await this.prisma.cashSession.findUnique({ where: { id: sessionId } })
    if (!session) throw new NotFoundException(`No existe el turno ${sessionId}`)
    if (session.status === 'closed') throw new ConflictException(`El turno ${sessionId} está cerrado`)
    return this.prisma.cashMovement.create({
      data: { sessionId, type: dto.type, amount: dto.amount, reason: dto.reason, userId },
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

  async cutX(sessionId: number): Promise<CutResult> {
    const session = await this.prisma.cashSession.findUnique({ where: { id: sessionId } })
    if (!session) throw new NotFoundException(`No existe el turno ${sessionId}`)
    return this.computeExpected(this.prisma, session)
  }

  /** Corte Z: cierra el turno (atómico por estado) y congela esperado/contado/diferencia. */
  async close(sessionId: number, dto: CloseDto): Promise<CashSession> {
    return this.prisma.$transaction(async (tx) => {
      const marked = await tx.cashSession.updateMany({
        where: { id: sessionId, status: 'open' },
        data: { status: 'closed' },
      })
      if (marked.count !== 1) {
        const exists = await tx.cashSession.findUnique({ where: { id: sessionId } })
        if (!exists) throw new NotFoundException(`No existe el turno ${sessionId}`)
        throw new ConflictException(`El turno ${sessionId} ya está cerrado`)
      }

      const session = await tx.cashSession.findUniqueOrThrow({ where: { id: sessionId } })
      const cut = await this.computeExpected(tx, session)
      const countedCash = countCash(dto.countedBreakdown)
      const difference = round2(countedCash - cut.expectedCash)

      return tx.cashSession.update({
        where: { id: sessionId },
        data: { closedAt: new Date(), expectedCash: cut.expectedCash, countedCash, difference, notes: dto.notes },
      })
    })
  }
}
