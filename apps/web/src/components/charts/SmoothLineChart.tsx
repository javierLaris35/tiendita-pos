import { useState, type MouseEvent } from 'react'
import { useElementSize } from '../../hooks'

type Point = [number, number]

export interface LineSeries {
  name: string
  values: number[]
}

interface SmoothLineChartProps {
  labels: string[]
  series: LineSeries[]
  formatY?: (v: number) => string
  height?: number
  tickCount?: number
  highlightLabel?: string
}

function smoothPath(points: Point[]) {
  if (points.length < 2) return ''
  let d = `M ${points[0][0]},${points[0][1]}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C ${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`
  }
  return d
}

const niceStep = (max: number, n: number) => {
  const raw = max / n
  const pow = 10 ** Math.floor(Math.log10(raw || 1))
  const nice = [1, 2, 2.5, 5, 10].find((m) => m * pow >= raw) ?? 10
  return nice * pow
}

/**
 * Gráfica de líneas suavizadas. La primera serie es la principal (azul intenso);
 * las demás se dibujan en tonos claros. Al pasar el cursor muestra el valor.
 */
export default function SmoothLineChart({ labels, series, formatY = (v) => `${v}%`, height = 200, tickCount = 5, highlightLabel }: SmoothLineChartProps) {
  const [ref, { width }] = useElementSize()
  const main = series[0]?.values ?? []
  const peak = main.reduce((m, v, i) => (v > main[m] ? i : m), 0)
  const [hover, setHover] = useState<number | null>(null)
  const active = hover ?? peak

  const all = series.flatMap((s) => s.values)
  const step = niceStep(Math.max(...all, 1) * 1.15, tickCount)
  const max = step * tickCount
  const pad = { l: 40, r: 12, t: 16, b: 26 }
  const w = Math.max(width, 200)
  const innerW = w - pad.l - pad.r
  const innerH = height - pad.t - pad.b
  const x = (i: number) => pad.l + (labels.length === 1 ? innerW / 2 : (i * innerW) / (labels.length - 1))
  const y = (v: number) => pad.t + innerH - (v / max) * innerH
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => i * step)

  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left
    const i = Math.round(((px - pad.l) / innerW) * (labels.length - 1))
    setHover(Math.max(0, Math.min(labels.length - 1, i)))
  }

  const ax = x(active)
  const ay = y(main[active] ?? 0)
  const tipW = 92
  const tipX = Math.min(Math.max(ax - tipW / 2, pad.l), w - pad.r - tipW)

  return (
    <div ref={ref} className="relative w-full select-none">
      {width > 0 && (
        <svg width={w} height={height} onMouseMove={onMove} onMouseLeave={() => setHover(null)} className="block">
          <defs>
            <linearGradient id="lineFade" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--color-brand-300)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--color-brand-300)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <text key={t} x={pad.l - 10} y={y(t) + 3} textAnchor="end" className="fill-ink-soft text-[10px]">
              {formatY(t)}
            </text>
          ))}
          {labels.map((l, i) => (
            <text
              key={l}
              x={x(i)}
              y={height - 6}
              textAnchor="middle"
              className={`text-[10px] ${i === active ? 'fill-ink font-semibold' : 'fill-ink-soft'}`}
            >
              {l}
            </text>
          ))}
          {series
            .slice()
            .reverse()
            .map((s, ri) => {
              const isMain = ri === series.length - 1
              const pts = s.values.map((v, i): Point => [x(i), y(v)])
              return (
                <g key={s.name}>
                  {isMain && (
                    <path d={`${smoothPath(pts)} L ${x(pts.length - 1)},${y(0)} L ${x(0)},${y(0)} Z`} fill="url(#lineFade)" />
                  )}
                  <path
                    d={smoothPath(pts)}
                    fill="none"
                    stroke={isMain ? 'var(--color-brand-500)' : 'var(--color-brand-200)'}
                    strokeWidth={isMain ? 2 : 1.6}
                    strokeLinecap="round"
                  />
                </g>
              )
            })}
          <line x1={ax} x2={ax} y1={ay} y2={y(0)} stroke="var(--color-brand-500)" strokeWidth="1.5" />
          <circle cx={ax} cy={ay} r="9" fill="var(--color-brand-200)" opacity="0.6" />
          <circle cx={ax} cy={ay} r="3.5" fill="var(--color-brand-500)" stroke="white" strokeWidth="1.5" />
          <g transform={`translate(${tipX}, ${Math.max(ay - 62, 0)})`}>
            <rect width={tipW} height="48" rx="8" fill="var(--color-brand-100)" stroke="var(--color-brand-300)" />
            <text x={tipW / 2} y="13" textAnchor="middle" className="fill-ink-soft text-[8px]">
              {highlightLabel ?? series[0]?.name}
            </text>
            <text x={tipW / 2} y="29" textAnchor="middle" className="fill-ink text-[13px] font-semibold">
              {formatY(main[active] ?? 0)}
            </text>
            <text x={tipW / 2} y="41" textAnchor="middle" className="fill-ink-soft text-[8px]">
              {labels[active]}
            </text>
          </g>
        </svg>
      )}
      {series.length > 1 && (
        <div className="mt-1 flex flex-wrap gap-4 pl-10 text-[10px] text-ink-soft">
          {series.map((s, i) => (
            <span key={s.name} className="flex items-center gap-1.5">
              <span className={`h-0.5 w-4 rounded ${i === 0 ? 'bg-brand-500' : 'bg-brand-200'}`} />
              {s.name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
