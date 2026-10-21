import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import * as bcrypt from 'bcryptjs'
import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/prisma/prisma.service'
import { PRINTER_TRANSPORT } from '../src/printing/printer-transport'

const TEST_URL = 'postgresql://postgres@127.0.0.1:5433/tiendita_test'
const PW = 'pw123456'

const fakeTransport = {
  sent: [] as Buffer[],
  async send(b: Buffer) {
    this.sent.push(b)
  },
}

describe('Printing (e2e)', () => {
  let app: INestApplication
  let server: ReturnType<INestApplication['getHttpServer']>
  let prisma: PrismaService
  let token: string
  let saleId: number

  const post = (path: string) => request(server).post(path).auth(token, { type: 'bearer' })

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_URL
    fakeTransport.sent = []
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PRINTER_TRANSPORT)
      .useValue(fakeTransport)
      .compile()
    app = moduleRef.createNestApplication()
    await app.init()
    server = app.getHttpServer()
    prisma = app.get(PrismaService)

    await prisma.storeSettings.deleteMany()
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
    await prisma.product.create({ data: { barcode: 'P', name: 'Refresco', price: 62, cost: 40, stock: 100 } })
    token = (await request(server).post('/auth/login').send({ email: 'c@t.mx', password: PW })).body.access_token
    const sale = await request(server)
      .post('/sales')
      .auth(token, { type: 'bearer' })
      .send({ items: [{ barcode: 'P', quantity: 2 }], payments: [{ method: 'cash', amount: 124 }] })
    saleId = sale.body.id
  })

  afterAll(async () => {
    await app.close()
  })

  it('printSale envía un buffer con el total al transporte', async () => {
    const res = await post(`/print/sale/${saleId}`)
    expect(res.status).toBe(201)
    expect(fakeTransport.sent.length).toBe(1)
    expect(fakeTransport.sent[0].toString('latin1')).toContain('124.00')
  })

  it('imprimir una venta inexistente → 404', async () => {
    const res = await post('/print/sale/999999')
    expect(res.status).toBe(404)
  })

  it('openDrawer envía el comando de cajón', async () => {
    await post('/print/drawer')
    const last = fakeTransport.sent.at(-1)!
    expect(last.equals(Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa]))).toBe(true)
  })

  it('imprime el corte de un turno cerrado → 201 con sus montos', async () => {
    const session = await prisma.cashSession.create({
      data: {
        cashierId: 1,
        openingAmount: 500,
        status: 'closed',
        closedAt: new Date(),
        expectedCash: 562,
        countedCash: 600,
        difference: 38,
      },
    })
    const before = fakeTransport.sent.length
    const res = await post(`/print/corte/${session.id}`)
    expect(res.status).toBe(201)
    expect(fakeTransport.sent.length).toBe(before + 1)
    expect(fakeTransport.sent.at(-1)!.toString('latin1')).toContain('562.00')
  })

  it('imprimir el corte de un turno inexistente → 404', async () => {
    const res = await post('/print/corte/999999')
    expect(res.status).toBe(404)
  })

  it('el ticket usa el nombre de negocio de la configuración', async () => {
    await prisma.storeSettings.create({ data: { businessName: 'Mi Negocio', setupComplete: true } })
    await post(`/print/sale/${saleId}`)
    expect(fakeTransport.sent.at(-1)!.toString('latin1')).toContain('Mi Negocio')
  })
})
