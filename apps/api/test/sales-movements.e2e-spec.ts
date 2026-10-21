import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import * as bcrypt from 'bcryptjs'
import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/prisma/prisma.service'

const TEST_URL = 'postgresql://postgres@127.0.0.1:5433/tiendita_test'
const PW = 'pw123456'

describe('Sales → inventory movements (e2e)', () => {
  let app: INestApplication
  let server: ReturnType<INestApplication['getHttpServer']>
  let prisma: PrismaService
  let token: string
  let saleId: number

  const post = (path: string, body: object) =>
    request(server).post(path).auth(token, { type: 'bearer' }).send(body)

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_URL
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
    server = app.getHttpServer()
    prisma = app.get(PrismaService)
    await prisma.inventoryMovement.deleteMany()
    await prisma.salePayment.deleteMany()
    await prisma.saleItem.deleteMany()
    await prisma.sale.deleteMany()
    await prisma.product.deleteMany()
    await prisma.user.deleteMany()
    await prisma.user.create({
      data: { email: 'c@t.mx', name: 'cashier', passwordHash: await bcrypt.hash(PW, 10), role: 'cashier' },
    })
    await prisma.product.create({ data: { barcode: 'P', name: 'Refresco', price: 62, cost: 40, stock: 100 } })
    token = (await request(server).post('/auth/login').send({ email: 'c@t.mx', password: PW })).body.access_token
  })

  afterAll(async () => {
    await app.close()
  })

  it('una venta registra un movimiento sale con stockAfter', async () => {
    const sale = await post('/sales', {
      items: [{ barcode: 'P', quantity: 2 }],
      payments: [{ method: 'cash', amount: 124 }],
    })
    saleId = sale.body.id
    const mv = await prisma.inventoryMovement.findMany({ where: { saleId, reason: 'sale' } })
    expect(mv.length).toBe(1)
    expect(Number(mv[0].quantity)).toBe(-2)
    expect(Number(mv[0].stockAfter)).toBe(98)
  })

  it('devolver registra un movimiento return', async () => {
    await post(`/sales/${saleId}/return`, {})
    const mv = await prisma.inventoryMovement.findMany({ where: { saleId, reason: 'return' } })
    expect(mv.length).toBe(1)
    expect(Number(mv[0].quantity)).toBe(2)
  })
})
