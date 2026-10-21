import { useSettingsStore } from '../store/useSettingsStore'

let ctx: AudioContext | null = null

/** Bip corto de lector de códigos (respeta el ajuste "Sonido al escanear"). */
export function beep(freq = 1250, ms = 70) {
  if (!useSettingsStore.getState().soundOnScan) return
  try {
    ctx ??= new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    gain.gain.value = 0.08
    osc.frequency.value = freq
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + ms / 1000)
  } catch {
    /* sin audio disponible */
  }
}
