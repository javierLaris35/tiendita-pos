import { PrismaService } from '../src/prisma/prisma.service'
import { importOffRecords, OffRecord } from '../src/catalog/off-importer'

const TEST_URL = 'postgresql://postgres@127.0.0.1:5433/tiendita_test'
const sample = require('./fixtures/off-sample.json') as OffRecord[]

describe('Open Food Facts importer (e2e)', () => {
  let prisma: PrismaService

  beforeAll(async () => {
    prisma = new PrismaService({ datasources: { db: { url: TEST_URL } } })
    await prisma.$connect()
    await prisma.catalogItem.deleteMany()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('importa solo registros MX válidos y omite el resto', async () => {
    const { imported, skipped } = await importOffRecords(prisma, sample)
    expect(imported).toBe(2)
    expect(skipped).toBeGreaterThanOrEqual(2)
    const one = await prisma.catalogItem.findUnique({ where: { code: '7501055555555' } })
    expect(one?.name).toBeTruthy()
  })

  it('reimportar es idempotente (no duplica)', async () => {
    await importOffRecords(prisma, sample)
    const before = await prisma.catalogItem.count()
    await importOffRecords(prisma, sample)
    expect(await prisma.catalogItem.count()).toBe(before)
  })
})
