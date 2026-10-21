import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import * as bcrypt from 'bcryptjs'
import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/prisma/prisma.service'

const TEST_URL = 'postgresql://postgres@127.0.0.1:5433/tiendita_test'
const PW = 'pw123456'

describe('Cash sessions — open, movements, cut X (e2e)', () => {
  let app: INestApplication
  let server: ReturnType<INestApplication['getHttpServer']>
  let prisma: PrismaService
  let token: string
  let token2: string
  let sessionId: number

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
    await prisma.cashMovement.deleteMany()
    await prisma.cashSession.deleteMany()
    await prisma.inventoryMovement.deleteMany()
    await prisma.salePayment.deleteMany()
    await prisma.saleItem.deleteMany()
    await prisma.sale.deleteMany()
    await prisma.product.deleteMany()
    await prisma.user.deleteMany()
    await prisma.user.create({
      data: { email: 'c@t.mx', name: 'cashier', passwordHash: await bcrypt.hash(PW, 10), role: 'cashier' },
    })
    await prisma.user.create({
      data: { email: 'c2@t.mx', name: 'cashier2', passwordHash: await bcrypt.hash(PW, 10), role: 'cashier' },
    })
    await prisma.product.create({ data: { barcode: 'P', name: 'Refresco', price: 62, cost: 40, stock: 100 } })
    token = (await request(server).post('/auth/login').send({ email: 'c@t.mx', password: PW })).body.access_token
    token2 = (await request(server).post('/auth/login').send({ email: 'c2@t.mx', password: PW })).body.access_token
  })

  afterAll(async () => {
    await app.close()
  })

  it('abrir turno → 201; segunda apertura del mismo cajero → 409', async () => {
    const first = await post('/cash-sessions/open', { openingAmount: 500 })
    expect(first.status).toBe(201)
    sessionId = first.body.id
    const second = await post('/cash-sessions/open', { openingAmount: 500 })
    expect(second.status).toBe(409)
  })

  it('una venta en efectivo aumenta el efectivo esperado (recibido − cambio)', async () => {
    await post('/sales', { items: [{ barcode: 'P', quantity: 1 }], payments: [{ method: 'cash', amount: 100 }] })
    const x = await get(`/cash-sessions/${sessionId}/cut`)
    expect(Number(x.body.expectedCash)).toBeCloseTo(562) // 500 + (100 - 38 de cambio)
  })

  it('corte X no cierra el turno', async () => {
    await get(`/cash-sessions/${sessionId}/cut`)
    const s = await prisma.cashSession.findUnique({ where: { id: sessionId } })
    expect(s!.status).toBe('open')
  })

  it('entrada y retiro de efectivo afectan el esperado', async () => {
    await post(`/cash-sessions/${sessionId}/movement`, { type: 'in', amount: 50, reason: 'préstamo' })
    await post(`/cash-sessions/${sessionId}/movement`, { type: 'out', amount: 20, reason: 'compra' })
    const x = await get(`/cash-sessions/${sessionId}/cut`)
    expect(Number(x.body.expectedCash)).toBeCloseTo(592) // 562 + 50 - 20
  })

  it('otro cajero no puede leer el corte de un turno ajeno → 403', async () => {
    const res = await request(server).get(`/cash-sessions/${sessionId}/cut`).auth(token2, { type: 'bearer' })
    expect(res.status).toBe(403)
  })

  it('otro cajero no puede mover efectivo de un turno ajeno → 403', async () => {
    const res = await request(server)
      .post(`/cash-sessions/${sessionId}/movement`)
      .auth(token2, { type: 'bearer' })
      .send({ type: 'in', amount: 10, reason: 'x' })
    expect(res.status).toBe(403)
  })
})
