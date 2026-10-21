// Ensambla los recursos que el instalador empaqueta: web (con la URL del API
// local), API (dist + node_modules de producción + prisma) y Postgres portable.
import { execSync } from 'node:child_process'
import { cpSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const desktop = resolve(here, '..')
const root = resolve(desktop, '..', '..')
const staging = join(desktop, 'staging')

const API_PORT = 51732
const PG_SRC = process.env.PG_SRC ?? 'C:/CustomDevs/pg-portable/pgsql'
const PNPM = 'corepack pnpm@9.12.0'

function run(cmd, env = {}) {
  console.log('>', cmd)
  execSync(cmd, { cwd: root, stdio: 'inherit', env: { ...process.env, ...env } })
}

rmSync(staging, { recursive: true, force: true })
mkdirSync(staging, { recursive: true })

// 1. Web (con VITE_API_URL apuntando al API local empaquetado)
run(`${PNPM} -C apps/web build`, { VITE_API_URL: `http://127.0.0.1:${API_PORT}` })
cpSync(join(root, 'apps/web/dist'), join(staging, 'web'), { recursive: true })

// 2. API: cliente Prisma + build + deploy con node_modules de producción
run(`${PNPM} -C apps/api exec prisma generate`)
run(`${PNPM} -C apps/api build`)
run(`${PNPM} --filter @tiendita/api deploy --prod "${join(staging, 'api')}"`)
cpSync(join(root, 'apps/api/dist'), join(staging, 'api/dist'), { recursive: true })
cpSync(join(root, 'apps/api/prisma'), join(staging, 'api/prisma'), { recursive: true })

// 3. Postgres portable
cpSync(PG_SRC, join(staging, 'pgsql'), { recursive: true })

console.log('Ensamblado listo en', staging)
