import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

/**
 * Siembra el usuario administrador. Idempotente: hace upsert por email,
 * así correrla varias veces no duplica ni cambia el admin existente.
 */
export async function runSeed(prisma: PrismaClient): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@tiendita.mx'
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'admin123'
  const passwordHash = await bcrypt.hash(password, 10)

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: 'Administrador', passwordHash, role: 'admin' },
  })
}

if (require.main === module) {
  const prisma = new PrismaClient()
  runSeed(prisma)
    .then(() => console.log('Seed completado'))
    .catch((e) => {
      console.error(e)
      process.exitCode = 1
    })
    .finally(() => prisma.$disconnect())
}
