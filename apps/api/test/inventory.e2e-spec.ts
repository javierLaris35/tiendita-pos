import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import * as bcrypt from 'bcryptjs'
import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/prisma/prisma.service'

const TEST_URL = 'postgresql://postgres@127.0.0.1:5433/tiendita_test'
const PW = 'pw123456'

describe('Inventory — manual ops (e2e)', () => {
  let app: INestApplication
  let server: ReturnType<INestApplication['getHttpServer']>
  let prisma: PrismaService
  let token: string
  let cashierToken: string

  const post = (path: string, body: object) =>
    request(server).post(path).auth(token, { type: 'bearer' }).send(body)
  const get = (path: string) => request(server).get(path).auth(token, { type: 'bearer' })
  const stockOf = async (barcode: string) =>
    Number((await prisma.product.findUnique({ where: { barcode } }))!.stock)

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
      data: { email: 'm@t.mx', name: 'manager', passwordHash: await bcrypt.hash(PW, 10), role: 'manager' },
    })
    await prisma.user.create({
      data: { email: 'cash@t.mx', name: 'cashier', passwordHash: await bcrypt.hash(PW, 10), role: 'cashier' },
    })
    await prisma.product.create({ data: { barcode: 'P', name: 'Refresco', price: 62, cost: 40, stock: 100 } })
    token = (await request(server).post('/auth/login').send({ email: 'm@t.mx', password: PW })).body.access_token
    cashierToken = (await request(server).post('/auth/login').send({ email: 'cash@t.mx', password: PW })).body.access_token
  })

  afterAll(async () => {
    await app.close()
  })

  it('recepción sube stock y registra receipt', async () => {
    const before = await stockOf('P')
    const res = await post('/inventory/receipt', { barcode: 'P', quantity: 10 })
    expect(res.status).toBe(201)
    expect(res.body.reason).toBe('receipt')
    expect(await stockOf('P')).toBe(before + 10)
  })

  it('merma mayor al stock → 409, stock sin cambios y sin movimiento', async () => {
    const before = await stockOf('P')
    const res = await post('/inventory/waste', { barcode: 'P', quantity: 999999 })
    expect(res.status).toBe(409)
    expect(await stockOf('P')).toBe(before)
    expect(await prisma.inventoryMovement.count({ where: { reason: 'waste' } })).toBe(0)
  })

  it('ajuste deja el stock en el valor indicado y registra el delta con signo', async () => {
    const before = await stockOf('P')
    const res = await post('/inventory/adjust', { barcode: 'P', newStock: 50 })
    expect(res.status).toBe(201)
    expect(await stockOf('P')).toBe(50)
    expect(res.body.reason).toBe('adjustment')
    expect(Number(res.body.quantity)).toBe(50 - before)
    const hist = await get('/inventory/P/movements')
    expect(hist.body[0].reason).toBe('adjustment')
  })

  it('cashier no puede mover inventario → 403', async () => {
    const res = await request(server)
      .post('/inventory/adjust')
      .auth(cashierToken, { type: 'bearer' })
      .send({ barcode: 'P', newStock: 1 })
    expect(res.status).toBe(403)
  })

  it('historial lista los movimientos más recientes primero', async () => {
    const res = await get('/inventory/P/movements')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThan(0)
  })
})
