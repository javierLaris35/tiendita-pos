import { PrismaService } from '../src/prisma/prisma.service'

const TEST_URL = 'postgresql://postgres@127.0.0.1:5433/tiendita_test'

describe('CashSession schema (e2e)', () => {
  let prisma: PrismaService

  beforeAll(async () => {
    prisma = new PrismaService({ datasources: { db: { url: TEST_URL } } })
    await prisma.$connect()
    await prisma.cashMovement.deleteMany()
    await prisma.cashSession.deleteMany()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('crea un turno abierto con un movimiento de efectivo', async () => {
    const s = await prisma.cashSession.create({
      data: {
        cashierId: 1,
        openingAmount: 500,
        movements: { create: [{ type: 'in', amount: 100, reason: 'préstamo de fondo' }] },
      },
      include: { movements: true },
    })
    expect(s.id).toBeGreaterThan(0)
    expect(s.status).toBe('open')
    expect(s.movements.length).toBe(1)
    expect(s.movements[0].type).toBe('in')
  })

  it('no permite dos turnos abiertos para el mismo cajero (índice único parcial)', async () => {
    await prisma.cashSession.create({ data: { cashierId: 999, openingAmount: 100 } })
    await expect(prisma.cashSession.create({ data: { cashierId: 999, openingAmount: 100 } })).rejects.toThrow()
  })
})
