import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import * as bcrypt from 'bcryptjs'
import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/prisma/prisma.service'

const TEST_URL = 'postgresql://postgres@127.0.0.1:5433/tiendita_test'
const PW = 'pw123456'

describe('Sales — return (e2e)', () => {
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
    await prisma.salePayment.deleteMany()
    await prisma.saleItem.deleteMany()
    await prisma.sale.deleteMany()
    await prisma.product.deleteMany()
    await prisma.user.deleteMany()
    await prisma.user.create({
      data: { email: 'c@t.mx', name: 'cashier', passwordHash: await bcrypt.hash(PW, 10), role: 'cashier' },
    })
    await prisma.product.create({
      data: { barcode: 'P', name: 'Refresco', price: 62, cost: 40, ivaRate: '0.1600', iepsRate: '0.0800', stock: 100 },
    })
    token = (await request(server).post('/auth/login').send({ email: 'c@t.mx', password: PW })).body.access_token
  })

  afterAll(async () => {
    await app.close()
  })

  it('devolver un ticket restaura stock y lo marca returned', async () => {
    const before = Number((await prisma.product.findUnique({ where: { barcode: 'P' } }))!.stock)
    const sale = await post('/sales', {
      items: [{ barcode: 'P', quantity: 2 }],
      payments: [{ method: 'cash', amount: 124 }],
    })
    saleId = sale.body.id

    const ret = await post(`/sales/${saleId}/return`, {})
    expect(ret.status).toBe(200)
    expect(ret.body.status).toBe('returned')
    const after = Number((await prisma.product.findUnique({ where: { barcode: 'P' } }))!.stock)
    expect(after).toBe(before)
  })

  it('devolver un ticket ya devuelto → 409', async () => {
    const again = await post(`/sales/${saleId}/return`, {})
    expect(again.status).toBe(409)
  })
})
