import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { AppModule } from '../src/app.module'
import { configureCors } from '../src/cors'

const TEST_URL = 'postgresql://postgres@127.0.0.1:5433/tiendita_test'

describe('CORS (e2e)', () => {
  let app: INestApplication
  let server: ReturnType<INestApplication['getHttpServer']>
  const prevCors = process.env.CORS_ORIGIN

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_URL
    // Simula el valor que le pasa el orquestador de Electron al API empaquetado.
    process.env.CORS_ORIGIN = 'true'
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    configureCors(app)
    await app.init()
    server = app.getHttpServer()
  })

  afterAll(async () => {
    await app.close()
    if (prevCors === undefined) delete process.env.CORS_ORIGIN
    else process.env.CORS_ORIGIN = prevCors
  })

  it('responde con Access-Control-Allow-Origin a una petición con Origin', async () => {
    const res = await request(server).get('/health').set('Origin', 'http://localhost:5173')
    expect(res.headers['access-control-allow-origin']).toBeDefined()
  })

  it('con CORS_ORIGIN="true" refleja el Origin de la petición (no el literal "true")', async () => {
    const res = await request(server).get('/health').set('Origin', 'http://localhost:5173')
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173')
  })
})
