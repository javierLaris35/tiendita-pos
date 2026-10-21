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
    await mkUser('cashier@t.mx', 'cashier')
    adminToken = await token('admin@t.mx')
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
})
