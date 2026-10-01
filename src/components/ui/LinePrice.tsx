import { formatMoney } from '../../utils/format'
import type { LineDiscount } from '../../types'

/**
 * Precio de un renglón para las vistas del cliente: si una oferta aplica, muestra el importe
 * original tachado, el precio final en verde y la etiqueta de la oferta. Nada se parte en dos líneas.
 */
export default function LinePrice({ gross, saving, unitLabel }: { gross: number; saving?: LineDiscount; unitLabel?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs">
      {unitLabel && <span className="whitespace-nowrap text-ink-soft">{unitLabel}</span>}
      {saving ? (
        <>
          <span className="whitespace-nowrap text-ink-mute line-through">{formatMoney(gross)}</span>
          <span className="whitespace-nowrap font-semibold text-emerald-700">{formatMoney(gross - saving.amount)}</span>
          {saving.badges.map((b) => (
            <span key={b} className="whitespace-nowrap rounded bg-emerald-100 px-1 py-px text-[9px] font-bold leading-tight text-emerald-700">
              {b}
            </span>
          ))}
        </>
      ) : (
        !unitLabel && <span className="whitespace-nowrap text-ink-soft">{formatMoney(gross)}</span>
      )}
    </div>
  )
}
