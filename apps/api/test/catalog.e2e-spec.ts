import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import * as bcrypt from 'bcryptjs'
import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/prisma/prisma.service'

const TEST_URL = 'postgresql://postgres@127.0.0.1:5433/tiendita_test'
const PW = 'pw123456'

describe('Catalog (e2e)', () => {
  let app: INestApplication
  let server: ReturnType<INestApplication['getHttpServer']>
  let prisma: PrismaService
  let token: string

  const get = (path: string) => request(server).get(path).auth(token, { type: 'bearer' })

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_URL
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
    server = app.getHttpServer()
    prisma = app.get(PrismaService)
    await prisma.product.deleteMany()
    await prisma.catalogItem.deleteMany()
    await prisma.user.deleteMany()
    await prisma.user.create({
      data: { email: 'admin@t.mx', name: 'admin', passwordHash: await bcrypt.hash(PW, 10), role: 'admin' },
    })
    await prisma.product.create({ data: { barcode: 'B1', name: 'Pan', price: 15 } })
    await prisma.catalogItem.create({ data: { code: '7501000222222', name: 'Leche 1L' } })
    token = (await request(server).post('/auth/login').send({ email: 'admin@t.mx', password: PW })).body.access_token
  })

  afterAll(async () => {
    await app.close()
  })

  it('código de un producto propio → source product', async () => {
    const res = await get('/catalog/B1')
    expect(res.status).toBe(200)
    expect(res.body.source).toBe('product')
    expect(res.body.product.barcode).toBe('B1')
  })

  it('código solo en catálogo base → source catalog (prellena nombre)', async () => {
    const res = await get('/catalog/7501000222222')
    expect(res.status).toBe(200)
    expect(res.body.source).toBe('catalog')
    expect(res.body.item.name).toBe('Leche 1L')
  })

  it('código desconocido → 200 source unknown (no 404/500)', async () => {
    const res = await get('/catalog/NADA')
    expect(res.status).toBe(200)
    expect(res.body.source).toBe('unknown')
    expect(res.body.barcode).toBe('NADA')
  })
})
