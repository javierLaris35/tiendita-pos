import { PrismaService } from '../src/prisma/prisma.service'

const TEST_URL = 'postgresql://postgres@127.0.0.1:5433/tiendita_test'

describe('InventoryMovement schema (e2e)', () => {
  let prisma: PrismaService

  beforeAll(async () => {
    prisma = new PrismaService({ datasources: { db: { url: TEST_URL } } })
    await prisma.$connect()
    await prisma.inventoryMovement.deleteMany()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('crea un movimiento de inventario con motivo, cantidad con signo y stock resultante', async () => {
    const mv = await prisma.inventoryMovement.create({
      data: { productId: 1, reason: 'adjustment', quantity: -3, stockAfter: 7, note: 'conteo' },
    })
    expect(mv.id).toBeGreaterThan(0)
    expect(mv.reason).toBe('adjustment')
    expect(Number(mv.quantity)).toBe(-3)
    expect(Number(mv.stockAfter)).toBe(7)
  })
})
