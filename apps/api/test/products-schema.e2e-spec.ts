import { PrismaService } from '../src/prisma/prisma.service'

const TEST_URL = 'postgresql://postgres@127.0.0.1:5433/tiendita_test'

describe('Product & CatalogItem schema (e2e)', () => {
  let prisma: PrismaService

  beforeAll(async () => {
    prisma = new PrismaService({ datasources: { db: { url: TEST_URL } } })
    await prisma.$connect()
    await prisma.product.deleteMany()
    await prisma.catalogItem.deleteMany()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('crea un producto con impuesto por producto (IVA 16% + IEPS 8%)', async () => {
    const p = await prisma.product.create({
      data: {
        barcode: '7501000111111',
        name: 'Refresco',
        unit: 'pz',
        price: 18.5,
        cost: 12,
        ivaRate: '0.1600',
        iepsRate: '0.0800',
      },
    })
    expect(p.id).toBeGreaterThan(0)
    expect(p.ivaRate.toString()).toBe('0.16')
    expect(p.iepsRate.toString()).toBe('0.08')
  })

  it('crea una entrada de catálogo base por código', async () => {
    const c = await prisma.catalogItem.create({
      data: { code: '7501000222222', name: 'Leche 1L', brand: 'Lala' },
    })
    expect(c.code).toBe('7501000222222')
  })

  it('la BD no permite stock negativo (CHECK)', async () => {
    const p = await prisma.product.create({
      data: { barcode: '7501000333333', name: 'Prueba', price: 1, stock: 5 },
    })
    await expect(prisma.product.update({ where: { id: p.id }, data: { stock: -1 } })).rejects.toThrow()
  })
})
