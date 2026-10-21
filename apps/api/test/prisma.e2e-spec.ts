import { PrismaService } from '../src/prisma/prisma.service'
import { runSeed } from '../prisma/seed'

const TEST_URL = 'postgresql://postgres@127.0.0.1:5433/tiendita_test'

describe('Prisma + seed (e2e)', () => {
  let prisma: PrismaService

  beforeAll(async () => {
    prisma = new PrismaService({ datasources: { db: { url: TEST_URL } } })
    await prisma.$connect()
    await prisma.user.deleteMany()
    await runSeed(prisma)
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('tras el seed existe exactamente un admin', async () => {
    const admins = await prisma.user.findMany({ where: { role: 'admin' } })
    expect(admins.length).toBe(1)
  })

  it('el seed es idempotente (correr dos veces no duplica)', async () => {
    await runSeed(prisma)
    await runSeed(prisma)
    const admins = await prisma.user.count({ where: { role: 'admin' } })
    expect(admins).toBe(1)
  })

  it('PrismaService con DATABASE_URL inválida rechaza al conectar', async () => {
    const bad = new PrismaService({ datasources: { db: { url: 'postgresql://x:x@127.0.0.1:1/none' } } })
    await expect(bad.$connect()).rejects.toBeDefined()
    await bad.$disconnect().catch(() => {})
  })
})
