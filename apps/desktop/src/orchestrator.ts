import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

export const API_PORT = 51732
const PG_PORT = 55432
const DB_NAME = 'tiendita'

export interface OrchestratorPaths {
  pgBin: string // carpeta con initdb.exe, postgres.exe, psql.exe, pg_ctl.exe…
  dataDir: string // data dir de Postgres (en userData)
  apiMain: string // dist/src/main.js del API
  prismaCli: string // node_modules/prisma/build/index.js
  schema: string // prisma/schema.prisma
  nodeExe: string // ejecutable que corre Node (Electron con ELECTRON_RUN_AS_NODE)
  jwtSecret: string
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Arranca Postgres portable y la API al inicio de la app, y los detiene al cerrar. */
export class Orchestrator {
  private pg?: ChildProcess
  private api?: ChildProcess

  constructor(private readonly paths: OrchestratorPaths) {}

  private get databaseUrl(): string {
    return `postgresql://postgres@127.0.0.1:${PG_PORT}/${DB_NAME}`
  }

  private get nodeEnv(): NodeJS.ProcessEnv {
    return { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
  }

  async start(): Promise<string> {
    this.initPostgresIfNeeded()
    this.startPostgres()
    await this.waitFor(() => this.pgReady(), 'PostgreSQL')
    this.createDatabaseIfNeeded()
    this.migrate()
    this.startApi()
    await this.waitFor(() => this.apiReady(), 'la API')
    return `http://127.0.0.1:${API_PORT}`
  }

  stop(): void {
    this.api?.kill()
    if (existsSync(join(this.paths.pgBin, 'pg_ctl.exe'))) {
      spawnSync(join(this.paths.pgBin, 'pg_ctl.exe'), ['-D', this.paths.dataDir, 'stop', '-m', 'fast'])
    }
    this.pg?.kill()
  }

  private initPostgresIfNeeded(): void {
    if (existsSync(join(this.paths.dataDir, 'PG_VERSION'))) return
    spawnSync(
      join(this.paths.pgBin, 'initdb.exe'),
      ['-D', this.paths.dataDir, '-U', 'postgres', '--auth=trust', '-E', 'UTF8', '--locale=C'],
      { stdio: 'ignore' },
    )
  }

  private startPostgres(): void {
    this.pg = spawn(
      join(this.paths.pgBin, 'postgres.exe'),
      ['-D', this.paths.dataDir, '-p', String(PG_PORT)],
      { stdio: 'ignore' },
    )
  }

  private pgReady(): boolean {
    const r = spawnSync(join(this.paths.pgBin, 'pg_isready.exe'), ['-h', '127.0.0.1', '-p', String(PG_PORT)])
    return r.status === 0
  }

  private createDatabaseIfNeeded(): void {
    const check = spawnSync(join(this.paths.pgBin, 'psql.exe'), [
      '-h', '127.0.0.1', '-p', String(PG_PORT), '-U', 'postgres', '-tAc',
      `SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'`,
    ])
    if (!String(check.stdout).trim().startsWith('1')) {
      spawnSync(
        join(this.paths.pgBin, 'createdb.exe'),
        ['-h', '127.0.0.1', '-p', String(PG_PORT), '-U', 'postgres', DB_NAME],
        { stdio: 'ignore' },
      )
    }
  }

  private migrate(): void {
    spawnSync(this.paths.nodeExe, [this.paths.prismaCli, 'migrate', 'deploy', '--schema', this.paths.schema], {
      env: { ...this.nodeEnv, DATABASE_URL: this.databaseUrl },
      stdio: 'ignore',
    })
  }

  private startApi(): void {
    this.api = spawn(this.paths.nodeExe, [this.paths.apiMain], {
      env: {
        ...this.nodeEnv,
        DATABASE_URL: this.databaseUrl,
        JWT_SECRET: this.paths.jwtSecret,
        PORT: String(API_PORT),
        CORS_ORIGIN: 'true',
      },
      stdio: 'ignore',
    })
  }

  private async apiReady(): Promise<boolean> {
    try {
      const res = await fetch(`http://127.0.0.1:${API_PORT}/health`)
      return res.ok
    } catch {
      return false
    }
  }

  private async waitFor(check: () => boolean | Promise<boolean>, what: string): Promise<void> {
    for (let i = 0; i < 60; i++) {
      if (await check()) return
      await sleep(500)
    }
    throw new Error(`${what} no respondió a tiempo`)
  }
}
