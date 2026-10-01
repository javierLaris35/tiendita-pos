import { useState } from 'react'

export interface BarDatum {
  label: string
  value: number
}

interface StripedBarChartProps {
  data: BarDatum[]
  step?: number
  formatY?: (v: number) => string
  formatValue?: (v: number) => string
  defaultActive?: number
  height?: string
}

const pct = (v: number) => `${v}%`

const niceMax = (v: number, step: number) => Math.max(step * 4, Math.ceil((v * 1.1) / step) * step)

/**
 * Barras formadas por segmentos redondeados apilados; el segmento parcial superior
 * se dibuja rayado. La barra resaltada usa un degradado de azules (diseño FastCart).
 */
export default function StripedBarChart({ data, step = 5, formatY = pct, formatValue = formatY, defaultActive, height = 'h-48' }: StripedBarChartProps) {
  const peak = data.reduce((m, d, i) => (d.value > data[m].value ? i : m), 0)
  const [active, setActive] = useState<number | null>(defaultActive ?? null)
  const [hover, setHover] = useState<number | null>(null)
  const highlighted = active ?? peak
  const max = niceMax(Math.max(...data.map((d) => d.value), 0), step)
  const segments = Math.round(max / step)
  const ticks = Array.from({ length: segments + 1 }, (_, i) => (segments - i) * step)

  return (
    <div className="flex gap-2">
      <div className={`${height} flex flex-col justify-between pb-6 text-right text-[10px] text-ink-soft`}>
        {ticks.map((t) => (
          <span key={t} className="leading-none">
            {formatY(t)}
          </span>
        ))}
      </div>
      <div className={`${height} flex flex-1 items-stretch justify-between gap-1.5 sm:gap-3`}>
        {data.map((d, i) => {
          const full = Math.floor(d.value / step + 1e-9)
          const partial = d.value - full * step > 0.01
          const isActive = i === highlighted
          return (
            <button
              key={d.label}
              type="button"
              onClick={() => setActive(i)}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              className="group relative flex min-w-0 flex-1 flex-col items-center"
            >
              {hover === i && (
                <span className="animate-fade absolute -top-7 z-10 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[10px] text-white">
                  {formatValue(d.value)}
                </span>
              )}
              <div className="flex w-full max-w-11 flex-1 flex-col-reverse gap-[3px] pb-2 pt-[5px]">
                {Array.from({ length: segments }, (_, s) => {
                  let cls = 'opacity-0'
                  if (s < full) {
                    cls = isActive ? ACTIVE_SHADES[Math.min(s, ACTIVE_SHADES.length - 1)] : 'bg-brand-100 group-hover:bg-brand-200'
                  } else if (s === full && partial) {
                    cls = isActive ? 'hatch-strong' : 'hatch bg-brand-50'
                  }
                  return <div key={s} className={`min-h-0 flex-1 rounded-[5px] transition-colors ${cls}`} />
                })}
              </div>
              <span className={`h-4 text-[10px] sm:text-[11px] ${isActive ? 'font-semibold text-ink' : 'text-ink-soft'}`}>{d.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

const ACTIVE_SHADES = ['bg-brand-500', 'bg-brand-400', 'bg-brand-300', 'bg-brand-200', 'bg-brand-200', 'bg-brand-100']
