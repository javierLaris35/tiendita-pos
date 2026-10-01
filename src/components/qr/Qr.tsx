import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import jsQR from 'jsqr'
import { CameraOff, Keyboard, Sparkles } from 'lucide-react'

/** Código QR en SVG (nítido al imprimir). */
export function QrCode({ value, size = 160, className = '' }: { value: string; size?: number; className?: string }) {
  const [svg, setSvg] = useState('')
  useEffect(() => {
    let alive = true
    QRCode.toString(value, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0f3a5c', light: '#ffffff' } })
      .then((s) => alive && setSvg(s))
      .catch(() => alive && setSvg(''))
    return () => {
      alive = false
    }
  }, [value])
  return <div role="img" aria-label={`Código QR: ${value}`} style={{ width: size, height: size }} className={`[&>svg]:size-full ${className}`} dangerouslySetInnerHTML={{ __html: svg }} />
}

interface BarcodeDetectorLike {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>
}
declare global {
  interface Window {
    BarcodeDetector?: new (opts: { formats: string[] }) => BarcodeDetectorLike
  }
}

/**
 * Lector con la cámara del teléfono. Usa el BarcodeDetector nativo (QR y códigos de barras)
 * y, si el navegador no lo tiene, decodifica QR con jsQR. Siempre ofrece captura manual.
 */
export function CameraScanner({ onResult, onSimulate }: { onResult: (text: string) => void; onSimulate?: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [manual, setManual] = useState('')
  const last = useRef({ text: '', at: 0 })
  const onResultRef = useRef(onResult)
  useEffect(() => {
    onResultRef.current = onResult
  })

  useEffect(() => {
    let stream: MediaStream | null = null
    let raf = 0
    let stopped = false
    const detector = window.BarcodeDetector ? new window.BarcodeDetector({ formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'upc_a'] }) : null

    const emit = (text: string) => {
      const now = Date.now()
      if (text === last.current.text && now - last.current.at < 2000) return
      last.current = { text, at: now }
      onResultRef.current(text)
    }

    const tick = async () => {
      const video = videoRef.current
      if (stopped || !video) return
      if (video.readyState >= 2) {
        try {
          if (detector) {
            const codes = await detector.detect(video)
            if (codes[0]?.rawValue) emit(codes[0].rawValue)
          } else if (canvasRef.current) {
            const c = canvasRef.current
            c.width = video.videoWidth
            c.height = video.videoHeight
            const ctx = c.getContext('2d', { willReadFrequently: true })
            if (ctx && c.width) {
              ctx.drawImage(video, 0, 0)
              const code = jsQR(ctx.getImageData(0, 0, c.width, c.height).data, c.width, c.height)
              if (code?.data) emit(code.data)
            }
          }
        } catch {
          /* cuadro ilegible: se intenta con el siguiente */
        }
      }
      raf = window.setTimeout(() => requestAnimationFrame(tick), 180)
    }

    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'environment' } })
      .then((s) => {
        if (stopped) return s.getTracks().forEach((t) => t.stop())
        stream = s
        if (videoRef.current) {
          videoRef.current.srcObject = s
          void videoRef.current.play()
        }
        tick()
      })
      .catch(() => setError('No pudimos abrir la cámara. Da permiso en tu navegador o escribe el código.'))
    if (!navigator.mediaDevices) setError('Este navegador no permite usar la cámara aquí. Escribe el código o simula el escaneo.')

    return () => {
      stopped = true
      clearTimeout(raf)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-ink">
        {error ? (
          <div className="grid size-full place-items-center p-6 text-center text-sm text-white/80">
            <div>
              <CameraOff className="mx-auto mb-2 size-8" />
              {error}
            </div>
          </div>
        ) : (
          <>
            <video ref={videoRef} playsInline muted className="size-full object-cover" />
            <div className="pointer-events-none absolute inset-[18%] rounded-3xl border-4 border-white/80 shadow-[0_0_0_999px_rgba(15,58,92,0.45)]" />
            <div className="animate-scan pointer-events-none absolute inset-x-[20%] h-0.5 bg-brand-300 shadow-[0_0_12px_2px] shadow-brand-300" />
          </>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (manual.trim()) onResult(manual.trim())
          setManual('')
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Keyboard className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-mute" />
          <input className="input pl-9" inputMode="numeric" placeholder="Escribe el código" value={manual} onChange={(e) => setManual(e.target.value)} />
        </div>
        <button className="btn-primary">Agregar</button>
      </form>
      {onSimulate && (
        <button type="button" onClick={onSimulate} className="btn-ghost w-full">
          <Sparkles className="size-4 text-brand-500" /> Simular escaneo (demo sin cámara)
        </button>
      )}
    </div>
  )
}
