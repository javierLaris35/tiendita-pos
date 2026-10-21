import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/prisma/prisma.service'

const TEST_URL = 'postgresql://postgres@127.0.0.1:5433/tiendita_test'

describe('Setup (first-run) (e2e)', () => {
  let app: INestApplication
  let server: ReturnType<INestApplication['getHttpServer']>
  let prisma: PrismaService

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_URL
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
    server = app.getHttpServer()
    prisma = app.get(PrismaService)
    await prisma.storeSettings.deleteMany()
    await prisma.user.deleteMany()
  })

  afterAll(async () => {
    await app.close()
  })

  it('status sin setup → { complete: false } y es público (sin token)', async () => {
    const res = await request(server).get('/setup/status')
    expect(res.status).toBe(200)
    expect(res.body.complete).toBe(false)
  })

  it('POST /setup crea la configuración y un admin que puede iniciar sesión', async () => {
    const res = await request(server)
      .post('/setup')
      .send({ businessName: 'Tiendita Doña Mago', admin: { email: 'dueno@t.mx', name: 'Dueño', password: 'secret123' } })
    expect(res.status).toBe(201)

    const login = await request(server).post('/auth/login').send({ email: 'dueno@t.mx', password: 'secret123' })
    expect(login.status).toBe(200)
    expect(login.body.access_token).toBeTruthy()

    const status = await request(server).get('/setup/status')
    expect(status.body.complete).toBe(true)
  })

  it('POST /setup cuando ya está completo → 409', async () => {
    const res = await request(server)
      .post('/setup')
      .send({ businessName: 'Otra', admin: { email: 'x@t.mx', name: 'X', password: 'secret123' } })
    expect(res.status).toBe(409)
  })
})
