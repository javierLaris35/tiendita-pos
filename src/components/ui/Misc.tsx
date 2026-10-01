import { Apple, Beef, Carrot, Cookie, Croissant, CupSoda, LayoutGrid, Milk, SprayCan, Wheat } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { STOCK_STATUS, stockStatus } from '../../utils/stock'
import type { CategoryIconName, Product } from '../../types'

const CATEGORY_ICONS: Record<CategoryIconName, LucideIcon> = { Milk, Carrot, Apple, Croissant, Beef, CupSoda, Cookie, Wheat, SprayCan, LayoutGrid }

export function CategoryIcon({ name, className = 'size-4' }: { name: CategoryIconName; className?: string }) {
  const Icon = CATEGORY_ICONS[name] ?? LayoutGrid
  return <Icon className={className} />
}

export function Logo({ className = '', textClass = 'text-lg' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 48 36" className="h-7 w-9 shrink-0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 9h6" className="text-brand-400" stroke="currentColor" />
        <path d="M4 15h8" className="text-brand-400" stroke="currentColor" />
        <path d="M10 4h6l5 20h19l4-14H19" className="text-brand-600" stroke="currentColor" />
        <circle cx="24" cy="31" r="2.6" className="text-brand-600" stroke="currentColor" />
        <circle cx="37" cy="31" r="2.6" className="text-brand-600" stroke="currentColor" />
      </svg>
      <span className={`font-semibold tracking-tight text-brand-600 ${textClass}`}>
        Tiendita<span className="text-brand-400"> POS</span>
      </span>
    </div>
  )
}

export function PanelHeader({ icon: Icon, title, children, light = false }: { icon?: LucideIcon; title: string; children?: ReactNode; light?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      {Icon && (
        <div className={light ? 'grid size-10 place-items-center rounded-xl bg-white/20 text-white' : 'icon-box'}>
          <Icon className="size-5" />
        </div>
      )}
      <h2 className="flex-1 truncate text-base font-medium text-ink sm:text-lg">{title}</h2>
      {children}
    </div>
  )
}

export function StatusDot({ dot, label, className = '' }: { dot: string; label: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-medium ${className}`}>
      <span className={`size-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  )
}

export function StockBadge({ product, className = 'bg-white' }: { product: Product; className?: string }) {
  const s = STOCK_STATUS[stockStatus(product)]
  return <StatusDot dot={s.dot} label={s.label} className={`${className} text-ink`} />
}

export function ProductThumb({ product, size = 'size-11', text = 'text-2xl', className = '' }: { product?: Pick<Product, 'emoji'>; size?: string; text?: string; className?: string }) {
  return (
    <div className={`${size} grid shrink-0 place-items-center rounded-lg border border-line bg-white ${className}`}>
      <span className={`${text} leading-none`}>{product?.emoji ?? '📦'}</span>
    </div>
  )
}

export function EmptyState({ icon: Icon, title, message, action }: { icon?: LucideIcon; title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
      {Icon && (
        <div className="grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-500">
          <Icon className="size-7" />
        </div>
      )}
      <p className="text-sm font-medium text-ink">{title}</p>
      {message && <p className="max-w-xs text-xs text-ink-soft">{message}</p>}
      {action}
    </div>
  )
}

export function KeyValue({ label, value, valueClass = '', light = false }: { label: string; value: ReactNode; valueClass?: string; light?: boolean }) {
  return (
    <div className="min-w-0">
      <p className={`text-[10px] leading-tight ${light ? 'text-white/80' : 'text-ink-soft'}`}>{label}</p>
      <p className={`truncate text-xs font-medium sm:text-[13px] ${light ? 'text-white' : 'text-ink'} ${valueClass}`}>{value}</p>
    </div>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-brand-500' : 'bg-slate-200'}`}
    >
      <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}
