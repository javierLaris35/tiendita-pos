import { app, BrowserWindow } from 'electron'

// En desarrollo carga el Vite dev server; en producción, el web servido por el
// API local. Se configura con WEB_URL.
const WEB_URL = process.env.WEB_URL ?? 'http://localhost:5173'

function createWindow(): void {
  const win = new BrowserWindow({
    fullscreen: true,
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true },
  })
  void win.loadURL(WEB_URL)
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
