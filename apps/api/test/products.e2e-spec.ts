import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import * as bcrypt from 'bcryptjs'
import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/prisma/prisma.service'

const TEST_URL = 'postgresql://postgres@127.0.0.1:5433/tiendita_test'
const PW = 'pw123456'

describe('Products (e2e)', () => {
  let app: INestApplication
  let server: ReturnType<INestApplication['getHttpServer']>
  let prisma: PrismaService
  let adminToken: string
  let managerToken: string
  let cashierToken: string

  const mkUser = async (email: string, role: 'admin' | 'manager' | 'cashier') =>
    prisma.user.create({ data: { email, name: role, passwordHash: await bcrypt.hash(PW, 10), role } })

  const token = async (email: string): Promise<string> =>
    (await request(server).post('/auth/login').send({ email, password: PW })).body.access_token

  const post = (path: string, tk: string, body: object) =>
    request(server).post(path).auth(tk, { type: 'bearer' }).send(body)
  const get = (path: string, tk: string) => request(server).get(path).auth(tk, { type: 'bearer' })

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_URL
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
    server = app.getHttpServer()
    prisma = app.get(PrismaService)
    await prisma.product.deleteMany()
    await prisma.user.deleteMany()
    await mkUser('admin@t.mx', 'admin')
    await mkUser('manager@t.mx', 'manager')
    await mkUser('cashier@t.mx', 'cashier')
    adminToken = await token('admin@t.mx')
    managerToken = await token('manager@t.mx')
    cashierToken = await token('cashier@t.mx')
  })

  afterAll(async () => {
    await app.close()
  })

  it('admin crea un producto → 201', async () => {
    const res = await post('/products', adminToken, { barcode: 'B1', name: 'Pan', price: 15 })
    expect(res.status).toBe(201)
    expect(res.body.barcode).toBe('B1')
  })

  it('código de barras duplicado → 409', async () => {
    await post('/products', adminToken, { barcode: 'B2', name: 'A', price: 1 })
    const res = await post('/products', adminToken, { barcode: 'B2', name: 'B', price: 2 })
    expect(res.status).toBe(409)
  })

  it('cashier no puede crear producto → 403', async () => {
    const res = await post('/products', cashierToken, { barcode: 'B3', name: 'X', price: 1 })
    expect(res.status).toBe(403)
  })

  it('GET /products/:barcode inexistente → 404', async () => {
    const res = await get('/products/NOPE', adminToken)
    expect(res.status).toBe(404)
  })

  it('manager crea un producto → 201', async () => {
    const res = await post('/products', managerToken, { barcode: 'BM1', name: 'Jabón', price: 22 })
    expect(res.status).toBe(201)
    expect(res.body.barcode).toBe('BM1')
  })

  it('ivaRate/iepsRate vía POST se persisten como Decimal', async () => {
    const created = await post('/products', adminToken, {
      barcode: 'BTAX',
      name: 'Refresco',
      price: 18,
      ivaRate: 0.16,
      iepsRate: 0.08,
    })
    expect(created.status).toBe(201)
    const res = await get('/products/BTAX', adminToken)
    expect(res.status).toBe(200)
    expect(Number(res.body.ivaRate)).toBeCloseTo(0.16)
    expect(Number(res.body.iepsRate)).toBeCloseTo(0.08)
  })
})
