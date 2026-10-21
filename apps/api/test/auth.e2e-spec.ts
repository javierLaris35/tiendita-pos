import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import * as bcrypt from 'bcryptjs'
import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/prisma/prisma.service'
import { runSeed } from '../prisma/seed'

const TEST_URL = 'postgresql://postgres@127.0.0.1:5433/tiendita_test'
const ADMIN_EMAIL = 'admin@tiendita.mx'
const ADMIN_PASSWORD = 'admin123'
const CAJERA_EMAIL = 'cajera@tiendita.mx'
const CAJERA_PASSWORD = 'cajera123'

describe('Auth (e2e)', () => {
  let app: INestApplication
  let server: ReturnType<INestApplication['getHttpServer']>
  let prisma: PrismaService

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_URL
    process.env.SEED_ADMIN_EMAIL = ADMIN_EMAIL
    process.env.SEED_ADMIN_PASSWORD = ADMIN_PASSWORD

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
    server = app.getHttpServer()

    prisma = app.get(PrismaService)
    await prisma.user.deleteMany()
    await runSeed(prisma)
    await prisma.user.create({
      data: {
        email: CAJERA_EMAIL,
        name: 'Cajera',
        passwordHash: await bcrypt.hash(CAJERA_PASSWORD, 10),
        role: 'cajera',
      },
    })
  })

  afterAll(async () => {
    await app.close()
  })

  const login = (email: string, password: string) =>
    request(server).post('/auth/login').send({ email, password })

  const tokenFor = async (email: string, password: string): Promise<string> =>
    (await login(email, password)).body.access_token

  it('login correcto → 200 y devuelve access_token', async () => {
    const res = await login(ADMIN_EMAIL, ADMIN_PASSWORD)
    expect(res.status).toBe(200)
    expect(res.body.access_token).toBeTruthy()
  })

  it('login con password incorrecta → 401 y sin filtrar si el usuario existe', async () => {
    const res = await login(ADMIN_EMAIL, 'mala')
    expect(res.status).toBe(401)
    expect(JSON.stringify(res.body)).not.toMatch(/exist|encontr|no such/i)
  })

  it('ruta protegida sin token → 401', async () => {
    const res = await request(server).get('/users/me')
    expect(res.status).toBe(401)
  })

  it('ruta de solo-admin con rol cajera → 403', async () => {
    const token = await tokenFor(CAJERA_EMAIL, CAJERA_PASSWORD)
    const res = await request(server).get('/users').auth(token, { type: 'bearer' })
    expect(res.status).toBe(403)
  })

  it('login con cuerpo mal formado (sin campos) → 400', async () => {
    const res = await request(server).post('/auth/login').send({})
    expect(res.status).toBe(400)
  })

  it('ruta protegida con token inválido → 401', async () => {
    const res = await request(server).get('/users/me').auth('garbage.token.xxx', { type: 'bearer' })
    expect(res.status).toBe(401)
  })

  it('admin con rol válido entra a /users → 200 y devuelve lista', async () => {
    const token = await tokenFor(ADMIN_EMAIL, ADMIN_PASSWORD)
    const res = await request(server).get('/users').auth(token, { type: 'bearer' })
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })
})
