import { Tag } from 'lucide-react'
import { formatMoney } from '../../utils/format'
import type { AppliedPromotion } from '../../types'

/**
 * Renglón de oferta aplicada: la etiqueta y el monto nunca se parten; si el nombre es largo
 * se recorta con "…" (completo al pasar el cursor).
 */
export default function PromoLine({ promo, icon = true, className = '' }: { promo: AppliedPromotion; icon?: boolean; className?: string }) {
  return (
    <div className={`flex items-center gap-2 text-xs text-emerald-700 ${className}`} title={`${promo.name} · −${formatMoney(promo.discount)}`}>
      {icon && <Tag className="size-3.5 shrink-0" />}
      <span className="shrink-0 whitespace-nowrap rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold leading-none">{promo.badge}</span>
      <span className="min-w-0 flex-1 truncate">{promo.name}</span>
      <span className="shrink-0 whitespace-nowrap font-semibold tabular-nums">−{formatMoney(promo.discount)}</span>
    </div>
  )
}
