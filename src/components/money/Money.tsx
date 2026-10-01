import { useId, type ReactNode } from 'react'
import { Minus, Plus } from 'lucide-react'
import { BILLS, COINS, moneySpec, type BillSpec, type CoinSpec } from '../../data/money'
import { countTotal, type Piece } from '../../utils/cash'
import { formatMoney } from '../../utils/format'
import type { CashCount } from '../../types'

const fmtValue = (v: number) => (v < 1 ? `${v * 100}¢` : `$${v}`)

/** Miniatura estilizada de un billete (colores y motivo de la familia G). */
export function Banknote({ spec, width = 120 }: { spec: BillSpec; width?: number }) {
  const id = useId().replace(/:/g, '')
  const w = 160 * spec.length
  const h = 76
  const [dark, light] = spec.colors
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={width * spec.length} height={(width * h) / 160} role="img" aria-label={`Billete de ${spec.value} pesos`} className="drop-shadow-sm">
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={light} />
          <stop offset="55%" stopColor={dark} />
          <stop offset="100%" stopColor={dark} />
        </linearGradient>
        <clipPath id={`c${id}`}>
          <rect width={w} height={h} rx="7" />
        </clipPath>
      </defs>
      <g clipPath={`url(#c${id})`}>
        <rect width={w} height={h} fill={`url(#g${id})`} />
        {/* guilloches */}
        {[0, 1, 2, 3, 4].map((i) => (
          <path
            key={i}
            d={`M0 ${16 + i * 11} C ${w * 0.25} ${6 + i * 11}, ${w * 0.5} ${28 + i * 11}, ${w} ${14 + i * 11}`}
            fill="none"
            stroke="white"
            strokeOpacity="0.16"
            strokeWidth="1"
          />
        ))}
        {/* ventana / banda clara */}
        <rect x={w * 0.42} y="0" width="14" height={h} fill="white" opacity="0.14" />
        <circle cx="30" cy={h / 2} r="21" fill="white" opacity="0.22" />
        <text x="30" y={h / 2 + 8} textAnchor="middle" fontSize="23">
          {spec.motif}
        </text>
        <text x="8" y="14" fill="white" fontSize="10" fontWeight="700" opacity="0.9">
          {spec.value}
        </text>
        <text x="8" y={h - 7} fill="white" fontSize="6" letterSpacing="1.5" opacity="0.8">
          PESOS
        </text>
        <text x={w - 8} y={h - 10} textAnchor="end" fill="white" fontSize="24" fontWeight="800" style={{ paintOrder: 'stroke' }} stroke={dark} strokeWidth="2">
          ${spec.value}
        </text>
      </g>
      <rect width={w} height={h} rx="7" fill="none" stroke="black" strokeOpacity="0.12" />
    </svg>
  )
}

/** Miniatura de moneda: bimetálica ($10, $5) o de acero. */
export function Coin({ spec, size = 44 }: { spec: CoinSpec; size?: number }) {
  const id = useId().replace(/:/g, '')
  const s = spec.style === 'small' ? size * 0.78 : size
  return (
    <svg viewBox="0 0 48 48" width={s} height={s} role="img" aria-label={`Moneda de ${fmtValue(spec.value)}`} className="drop-shadow-sm">
      <defs>
        <radialGradient id={`s${id}`} cx="35%" cy="30%">
          <stop offset="0%" stopColor="#f4f6f8" />
          <stop offset="100%" stopColor="#97a1ac" />
        </radialGradient>
        <radialGradient id={`o${id}`} cx="35%" cy="30%">
          <stop offset="0%" stopColor="#fbe7a6" />
          <stop offset="100%" stopColor="#c08f22" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="23" fill={`url(#s${id})`} stroke="#7d8792" strokeWidth="1" />
      {spec.style === 'bimetal' && <circle cx="24" cy="24" r="15" fill={`url(#o${id})`} stroke="#a77a17" strokeWidth="0.8" />}
      <circle cx="24" cy="24" r="20.5" fill="none" stroke="white" strokeOpacity="0.5" strokeDasharray="1 2" />
      <text x="24" y="28.5" textAnchor="middle" fontSize={spec.value < 1 ? 11 : 12.5} fontWeight="800" fill="#3d3420">
        {fmtValue(spec.value)}
      </text>
    </svg>
  )
}

export function MoneyPiece({ value, size = 'md' }: { value: number; size?: 'xs' | 'sm' | 'md' | 'lg' }) {
  const spec = moneySpec(value)
  if (!spec) return null
  const billW = { xs: 46, sm: 70, md: 108, lg: 132 }[size]
  const coinS = { xs: 22, sm: 32, md: 44, lg: 54 }[size]
  return spec.kind === 'bill' ? <Banknote spec={spec} width={billW} /> : <Coin spec={spec} size={coinS} />
}

/** Fila compacta de piezas: "2× [billete $200] 1× [moneda $5]". */
export function PiecesRow({ pieces, size = 'xs', className = '' }: { pieces: Piece[]; size?: 'xs' | 'sm'; className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 ${className}`}>
      {pieces.map((p) => (
        <span key={p.value} className="flex items-center gap-1">
          {p.count > 1 && <span className="text-[10px] font-semibold">{p.count}×</span>}
          <MoneyPiece value={p.value} size={size} />
        </span>
      ))}
    </div>
  )
}

function CounterCell({ v, n, onSet, children }: { v: number; n: number; onSet: (v: number, n: number) => void; children: ReactNode }) {
  const set = onSet
  return (
      <div className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 transition ${n ? 'border-brand-300 bg-brand-50' : 'border-line bg-white'}`}>
        <button type="button" onClick={() => set(v, n + 1)} className="grid h-14 place-items-center transition hover:scale-105" title={`Agregar ${fmtValue(v)}`}>
          {children}
        </button>
        <div className="flex items-center rounded-full border border-line bg-white">
          <button type="button" onClick={() => set(v, n - 1)} className="grid size-6 place-items-center rounded-full hover:bg-brand-50" aria-label="Quitar">
            <Minus className="size-3" />
          </button>
          <input
            value={n}
            onChange={(e) => set(v, Number(e.target.value.replace(/\D/g, '')) || 0)}
            className="w-8 bg-transparent text-center text-xs font-semibold outline-none"
            inputMode="numeric"
            aria-label={`Cantidad de ${fmtValue(v)}`}
          />
          <button type="button" onClick={() => set(v, n + 1)} className="grid size-6 place-items-center rounded-full hover:bg-brand-50" aria-label="Agregar">
            <Plus className="size-3" />
          </button>
        </div>
        <span className="text-[10px] text-ink-soft">{n ? formatMoney(n * v) : '—'}</span>
      </div>
  )
}

/** Contador de efectivo por denominación (apertura y corte de caja). */
export function CashCounter({ value, onChange }: { value: CashCount; onChange: (v: CashCount) => void }) {
  const set = (v: number, n: number) => onChange({ ...value, [String(v)]: Math.max(0, n) })
  const countOf = (v: number) => value[String(v)] ?? 0

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {BILLS.map((b) => (
          <CounterCell key={b.value} v={b.value} n={countOf(b.value)} onSet={set}>
            <Banknote spec={b} width={96} />
          </CounterCell>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {COINS.map((c) => (
          <CounterCell key={c.value} v={c.value} n={countOf(c.value)} onSet={set}>
            <Coin spec={c} size={40} />
          </CounterCell>
        ))}
      </div>
      <div className="flex items-center justify-between rounded-xl bg-ink px-4 py-3 text-white">
        <span className="text-sm">Total contado</span>
        <span className="text-xl font-semibold">{formatMoney(countTotal(value))}</span>
      </div>
    </div>
  )
}
