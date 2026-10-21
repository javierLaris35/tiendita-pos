import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import * as bcrypt from 'bcryptjs'
import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/prisma/prisma.service'

const TEST_URL = 'postgresql://postgres@127.0.0.1:5433/tiendita_test'
const PW = 'pw123456'

describe('Cash sessions — cut Z (close) (e2e)', () => {
  let app: INestApplication
  let server: ReturnType<INestApplication['getHttpServer']>
  let prisma: PrismaService
  let token: string
  let sessionId: number

  const post = (path: string, body: object) =>
    request(server).post(path).auth(token, { type: 'bearer' }).send(body)

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_URL
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
    server = app.getHttpServer()
    prisma = app.get(PrismaService)
    await prisma.cashMovement.deleteMany()
    await prisma.cashSession.deleteMany()
    await prisma.user.deleteMany()
    await prisma.user.create({
      data: { email: 'c@t.mx', name: 'cashier', passwordHash: await bcrypt.hash(PW, 10), role: 'cashier' },
    })
    token = (await request(server).post('/auth/login').send({ email: 'c@t.mx', password: PW })).body.access_token
    const open = await post('/cash-sessions/open', { openingAmount: 500 })
    sessionId = open.body.id
  })

  afterAll(async () => {
    await app.close()
  })

  it('corte Z calcula la diferencia por arqueo y cierra el turno', async () => {
    const res = await post(`/cash-sessions/${sessionId}/close`, { countedBreakdown: { '500': 1, '100': 1 } })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('closed')
    expect(Number(res.body.countedCash)).toBe(600)
    expect(Number(res.body.expectedCash)).toBe(500) // fondo 500, sin ventas ni movimientos
    expect(Number(res.body.difference)).toBeCloseTo(100) // 600 contado − 500 esperado
  })

  it('cerrar un turno ya cerrado → 409', async () => {
    const again = await post(`/cash-sessions/${sessionId}/close`, { countedBreakdown: { '500': 1 } })
    expect(again.status).toBe(409)
  })
})
