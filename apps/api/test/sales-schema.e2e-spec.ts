import { PrismaService } from '../src/prisma/prisma.service'

const TEST_URL = 'postgresql://postgres@127.0.0.1:5433/tiendita_test'

describe('Sales schema (e2e)', () => {
  let prisma: PrismaService

  beforeAll(async () => {
    prisma = new PrismaService({ datasources: { db: { url: TEST_URL } } })
    await prisma.$connect()
    await prisma.salePayment.deleteMany()
    await prisma.saleItem.deleteMany()
    await prisma.sale.deleteMany()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('crea una venta con línea y pago mixto', async () => {
    const sale = await prisma.sale.create({
      data: {
        cashierId: 1,
        subtotal: 100,
        taxTotal: 24,
        total: 124,
        profitTotal: 20,
        items: {
          create: [
            {
              productId: 1,
              barcode: 'P',
              name: 'Refresco',
              quantity: 2,
              unitPrice: 62,
              unitCost: 40,
              ivaRate: '0.1600',
              iepsRate: '0.0800',
              lineTotal: 124,
              lineTax: 24,
              lineProfit: 20,
            },
          ],
        },
        payments: {
          create: [
            { method: 'cash', amount: 100 },
            { method: 'card', amount: 24 },
          ],
        },
      },
      include: { items: true, payments: true },
    })
    expect(sale.items.length).toBe(1)
    expect(sale.payments.length).toBe(2)
    expect(sale.status).toBe('completed')
  })
})
