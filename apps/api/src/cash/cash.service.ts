import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { CashMovement, CashSession } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { round2 } from '../sales/sale-math'
import { MovementDto, OpenDto } from './dto/cash.dto'

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

  /** Efectivo esperado del turno = fondo + efectivo neto de ventas + entradas − retiros. */
  async cutX(sessionId: number): Promise<CutResult> {
    const session = await this.prisma.cashSession.findUnique({ where: { id: sessionId } })
    if (!session) throw new NotFoundException(`No existe el turno ${sessionId}`)

    const sales = await this.prisma.sale.findMany({
      where: { cashSessionId: sessionId, status: 'completed' },
      include: { payments: true },
    })
    let cashFromSales = 0
    for (const s of sales) {
      const cashPaid = s.payments.filter((p) => p.method === 'cash').reduce((a, p) => a + Number(p.amount), 0)
      cashFromSales += cashPaid - Number(s.change)
    }
    cashFromSales = round2(cashFromSales)

    const movements = await this.prisma.cashMovement.findMany({ where: { sessionId } })
    const cashIn = round2(movements.filter((m) => m.type === 'in').reduce((a, m) => a + Number(m.amount), 0))
    const cashOut = round2(movements.filter((m) => m.type === 'out').reduce((a, m) => a + Number(m.amount), 0))

    const openingAmount = Number(session.openingAmount)
    const expectedCash = round2(openingAmount + cashFromSales + cashIn - cashOut)
    return { openingAmount, cashFromSales, cashIn, cashOut, expectedCash }
  }
}
