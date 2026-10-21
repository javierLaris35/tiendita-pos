import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { app, BrowserWindow } from 'electron'
import { Orchestrator } from './orchestrator'

// En desarrollo se carga el Vite dev server directamente (sin orquestar nada).
const WEB_URL = process.env.WEB_URL
let orchestrator: Orchestrator | undefined

function getOrCreateSecret(file: string): string {
  if (existsSync(file)) return readFileSync(file, 'utf8').trim()
  const secret = randomBytes(32).toString('hex')
  writeFileSync(file, secret, { mode: 0o600 })
  return secret
}

async function createWindow(): Promise<void> {
  const win = new BrowserWindow({
    fullscreen: true,
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true },
  })

  if (WEB_URL) {
    await win.loadURL(WEB_URL)
    return
  }

  const res = process.resourcesPath
  const userData = app.getPath('userData')
  orchestrator = new Orchestrator({
    pgBin: join(res, 'pgsql', 'bin'),
    dataDir: join(userData, 'pgdata'),
    apiMain: join(res, 'api', 'dist', 'src', 'main.js'),
    prismaCli: join(res, 'api', 'node_modules', 'prisma', 'build', 'index.js'),
    schema: join(res, 'api', 'prisma', 'schema.prisma'),
    nodeExe: process.execPath,
    jwtSecret: getOrCreateSecret(join(userData, 'jwt.secret')),
  })

  try {
    await orchestrator.start()
    await win.loadFile(join(res, 'web', 'index.html'))
  } catch {
    await win.loadURL(
      'data:text/html;charset=utf-8,' +
        encodeURIComponent('<h1 style="font-family:sans-serif">No se pudo iniciar el POS</h1>'),
    )
  }
}

app.whenReady().then(() => {
  void createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow()
  })
})

app.on('window-all-closed', () => {
  orchestrator?.stop()
  if (process.platform !== 'darwin') app.quit()
})
