import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import * as bcrypt from 'bcryptjs'
import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/prisma/prisma.service'

const TEST_URL = 'postgresql://postgres@127.0.0.1:5433/tiendita_test'
const PW = 'pw123456'

describe('Sales — create (e2e)', () => {
  let app: INestApplication
  let server: ReturnType<INestApplication['getHttpServer']>
  let prisma: PrismaService
  let token: string

  const post = (path: string, body: object) =>
    request(server).post(path).auth(token, { type: 'bearer' }).send(body)
  const get = (path: string) => request(server).get(path).auth(token, { type: 'bearer' })

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
    await prisma.product.create({
      data: { barcode: 'LOW', name: 'Escaso', price: 10, cost: 5, stock: 5 },
    })
    await prisma.product.create({
      data: { barcode: 'WS', name: 'Mayoreo', price: 10, cost: 5, stock: 100, wholesalePrice: 8, wholesaleMinQty: 3 },
    })
    await prisma.product.create({
      data: { barcode: 'CH', name: 'Cambio', price: 62, cost: 40, stock: 100 },
    })
    token = (await request(server).post('/auth/login').send({ email: 'c@t.mx', password: PW })).body.access_token
  })

  afterAll(async () => {
    await app.close()
  })

  it('crea una venta con pago mixto → 201, totales e impuesto congelados', async () => {
    const res = await post('/sales', {
      items: [{ barcode: 'P', quantity: 2 }],
      payments: [{ method: 'cash', amount: 100 }, { method: 'card', amount: 24 }],
    })
    expect(res.status).toBe(201)
    expect(Number(res.body.total)).toBeCloseTo(124)
    expect(Number(res.body.taxTotal)).toBeCloseTo(24)
    expect(Number(res.body.profitTotal)).toBeCloseTo(20)
    expect(res.body.payments.length).toBe(2)
  })

  it('pagos que no suman el total → 400', async () => {
    const res = await post('/sales', {
      items: [{ barcode: 'P', quantity: 1 }],
      payments: [{ method: 'cash', amount: 1 }],
    })
    expect(res.status).toBe(400)
  })

  it('vender más que el stock → 409 y el stock no cambia', async () => {
    const before = (await prisma.product.findUnique({ where: { barcode: 'P' } }))!.stock
    const res = await post('/sales', {
      items: [{ barcode: 'P', quantity: 99999 }],
      payments: [{ method: 'cash', amount: 9999999 }],
    })
    expect(res.status).toBe(409)
    const after = (await prisma.product.findUnique({ where: { barcode: 'P' } }))!.stock
    expect(Number(after)).toBe(Number(before))
  })

  it('congelado: cambiar el precio del producto no altera la venta previa', async () => {
    const sale = await post('/sales', {
      items: [{ barcode: 'P', quantity: 1 }],
      payments: [{ method: 'cash', amount: 62 }],
    })
    await prisma.product.update({ where: { barcode: 'P' }, data: { price: 999 } })
    const got = await get(`/sales/${sale.body.id}`)
    expect(got.status).toBe(200)
    expect(Number(got.body.items[0].unitPrice)).toBe(62)
  })

  it('líneas duplicadas del mismo producto no sobrevenden el stock → 409', async () => {
    const before = Number((await prisma.product.findUnique({ where: { barcode: 'LOW' } }))!.stock)
    const res = await post('/sales', {
      items: [{ barcode: 'LOW', quantity: 3 }, { barcode: 'LOW', quantity: 3 }],
      payments: [{ method: 'cash', amount: 60 }],
    })
    expect(res.status).toBe(409)
    const after = Number((await prisma.product.findUnique({ where: { barcode: 'LOW' } }))!.stock)
    expect(after).toBe(before)
  })

  it('mayoreo vía POST persiste usedWholesale y el precio de mayoreo', async () => {
    const res = await post('/sales', {
      items: [{ barcode: 'WS', quantity: 3 }],
      payments: [{ method: 'cash', amount: 24 }],
    })
    expect(res.status).toBe(201)
    expect(res.body.items[0].usedWholesale).toBe(true)
    expect(Number(res.body.items[0].unitPrice)).toBe(8)
  })

  it('sobrepago en efectivo → 201 y guarda el cambio', async () => {
    const res = await post('/sales', {
      items: [{ barcode: 'CH', quantity: 1 }],
      payments: [{ method: 'cash', amount: 100 }],
    })
    expect(res.status).toBe(201)
    expect(Number(res.body.change)).toBeCloseTo(38) // total 62, recibido 100
  })

  it('sobrepago no cubierto por efectivo (solo tarjeta) → 400', async () => {
    const res = await post('/sales', {
      items: [{ barcode: 'CH', quantity: 1 }],
      payments: [{ method: 'card', amount: 100 }],
    })
    expect(res.status).toBe(400)
  })

  it('pago insuficiente (menos que el total) → 400', async () => {
    const res = await post('/sales', {
      items: [{ barcode: 'CH', quantity: 1 }],
      payments: [{ method: 'cash', amount: 50 }],
    })
    expect(res.status).toBe(400)
  })
})
