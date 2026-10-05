import { useState } from 'react'
import { ShoppingBag, Banknote, CreditCard, HandCoins, Landmark, Minus, PauseCircle, Plus, Receipt, Sparkles, Trash2, UserRound, X } from 'lucide-react'
import { CreditMeter, CreditStatus } from '../credit/Credit'
import PromoLine from '../ui/PromoLine'
import { useOrderStore } from '../../store/useOrderStore'
import { CHANNEL_META } from '../../utils/orders'
import { useCustomerStats } from '../../hooks'
import { ConfirmDialog } from '../ui/Modal'
import { EmptyState } from '../ui/Misc'
import { useCartStore, useTicket, type CartLine } from '../../store/useCartStore'
import { nextSaleNumber } from '../../store/useSalesStore'
import { formatMoney, formatQty } from '../../utils/format'
import type { PaymentMethod } from '../../types'

export interface PosTicketProps {
  onPay: (m: PaymentMethod) => void
  onEditWeight: (line: CartLine) => void
  onCustomer: () => void
  onParked: () => void
  /** Clases del contenedor (la hoja de teléfono lo hace ocupar todo el alto) */
  className?: string
}

export default function PosTicket({ onPay, onEditWeight, onCustomer, onParked, className = 'min-h-[560px] md:min-h-0' }: PosTicketProps) {
  const { lines, ticket } = useTicket()
  const { inc, dec, remove, clear, add, park, customerId, setCustomer, parked } = useCartStore()
  const customer = useCustomerStats().find((c) => c.id === customerId)
  const orderId = useCartStore((s) => s.orderId)
  const order = useOrderStore((s) => s.orders.find((o) => o.id === orderId))
  const canCredit = Boolean(customer?.creditEnabled) && ticket.total > 0 && ticket.total <= (customer?.available ?? 0) + 0.001
  const [confirmCancel, setConfirmCancel] = useState(false)
  const empty = lines.length === 0

  return (
    <section className={`card flex flex-col overflow-hidden ${className}`}>
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <Receipt className="size-5 text-brand-500" />
        <div className="flex-1">
          <p className="text-sm font-bold tracking-wide">TICKET</p>
          <p className="text-[10px] text-ink-soft">#{nextSaleNumber()} · {ticket.units} artículos</p>
        </div>
        <button onClick={onParked} className="relative flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-[11px] hover:bg-brand-50" title="Ventas en espera">
          <PauseCircle className="size-3.5" /> Espera
          {parked.length > 0 && <span className="absolute -right-1.5 -top-1.5 grid size-4 place-items-center rounded-full bg-orange-500 text-[9px] font-bold text-white">{parked.length}</span>}
        </button>
      </div>

      {order && (
        <div className="mx-3 mt-3 flex items-center gap-2 rounded-xl border border-fuchsia-200 bg-fuchsia-50 px-3 py-2 text-xs text-fuchsia-900">
          <ShoppingBag className="size-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">
            Pedido <b>{order.code}</b> · {CHANNEL_META[order.channel].label}
          </span>
          <button onClick={clear} className="text-fuchsia-700 hover:underline">Quitar</button>
        </div>
      )}
      <button onClick={onCustomer} className="mx-3 mt-3 flex items-center gap-2 rounded-xl bg-tile px-3 py-2 text-left text-xs hover:bg-brand-50">
        <UserRound className="size-4 text-brand-600" />
        <span className="flex-1 truncate">{customer ? customer.name : 'Público general'}</span>
        {customer ? (
          <span
            role="button"
            onClick={(e) => {
              e.stopPropagation()
              setCustomer(null)
            }}
            className="text-ink-mute hover:text-ink"
          >
            <X className="size-3.5" />
          </span>
        ) : (
          <span className="text-[10px] text-brand-600">Asignar cliente · F10</span>
        )}
      </button>
      {customer?.creditEnabled && (
        <div className={`mx-3 mt-2 space-y-1.5 rounded-xl border px-3 py-2 text-[11px] ${canCredit || empty ? 'border-emerald-200 bg-emerald-50/60' : 'border-red-200 bg-red-50'}`}>
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 font-medium">
              <HandCoins className="size-3.5" /> Crédito disponible {formatMoney(customer.available)}
            </span>
            <CreditStatus customer={customer} />
          </div>
          <CreditMeter balance={customer.balance} limit={customer.creditLimit} compact />
          {!canCredit && !empty && <p className="text-red-600">El ticket rebasa su crédito por {formatMoney(ticket.total - customer.available)}.</p>}
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-2 scrollbar-thin">
        {empty && <EmptyState icon={Receipt} title="Ticket vacío" message="Escanea un código o toca un producto para empezar la venta." />}
        {lines.map((l) => {
          const saving = ticket.lineDiscounts[l.productId]
          const gross = l.price * l.qty
          return (
          <div key={l.productId} className="animate-pop group flex items-center gap-2 rounded-xl px-1.5 py-1.5 hover:bg-tile">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-tile text-xl">{l.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium leading-tight">{l.name}</p>
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                <span className="whitespace-nowrap text-[10px] text-ink-soft">
                  {l.unit === 'kg' ? `${formatQty(l.qty, 'kg')} × ${formatMoney(l.price)}` : `${formatMoney(l.price)} c/u`}
                </span>
                {saving?.badges.map((b) => (
                  <span key={b} className="whitespace-nowrap rounded bg-emerald-100 px-1 py-px text-[9px] font-bold leading-tight text-emerald-700">
                    {b}
                  </span>
                ))}
              </div>
            </div>
            {l.unit === 'kg' ? (
              <button onClick={() => onEditWeight(l)} className="rounded-lg border border-line px-2 py-1 text-[11px] hover:bg-brand-50">
                Peso
              </button>
            ) : (
              <div className="flex items-center rounded-full border border-line bg-white">
                <button onClick={() => dec(l.productId)} className="grid size-7 place-items-center rounded-full hover:bg-brand-50" aria-label="Quitar uno">
                  <Minus className="size-3" />
                </button>
                <span className="w-6 text-center text-xs font-semibold">{l.qty}</span>
                <button onClick={() => inc(l.productId)} className="grid size-7 place-items-center rounded-full hover:bg-brand-50" aria-label="Agregar uno">
                  <Plus className="size-3" />
                </button>
              </div>
            )}
            {/* Importe: si hay oferta, el original tachado y el precio final en verde */}
            <div className="w-[72px] shrink-0 text-right leading-tight">
              {saving ? (
                <>
                  <p className="whitespace-nowrap text-[10px] text-ink-mute line-through">{formatMoney(gross)}</p>
                  <p className="whitespace-nowrap text-[13px] font-semibold text-emerald-700">{formatMoney(gross - saving.amount)}</p>
                </>
              ) : (
                <p className="whitespace-nowrap text-[13px] font-semibold">{formatMoney(gross)}</p>
              )}
            </div>
            <button onClick={() => remove(l.productId)} className="text-ink-mute opacity-0 transition hover:text-red-500 group-hover:opacity-100" aria-label="Quitar producto">
              <X className="size-3.5" />
            </button>
          </div>
          )
        })}

        {ticket.suggestions.map((s) => (
          <button
            key={s.promoId + s.productId}
            onClick={() => add(s.productId, s.qty)}
            className="animate-pop flex w-full items-center gap-2 rounded-xl border border-dashed border-orange-300 bg-orange-50 px-3 py-2 text-left text-[11px] text-orange-800 hover:bg-orange-100"
          >
            <Sparkles className="size-4 shrink-0 text-orange-500" />
            <span className="flex-1">{s.message}</span>
            <span className="rounded-lg bg-orange-500 px-2 py-1 text-[10px] font-semibold text-white">+ Agregar</span>
          </button>
        ))}
      </div>

      <div className="space-y-1.5 border-t border-dashed border-line px-4 py-3">
        {ticket.promotions.map((p) => (
          <PromoLine key={p.promoId} promo={p} />
        ))}
        <div className="flex justify-between text-sm">
          <span className="text-ink-soft">SUBTOTAL</span>
          <span>{formatMoney(ticket.subtotal)}</span>
        </div>
        {ticket.discount > 0 && (
          <div className="flex justify-between text-sm text-emerald-700">
            <span>AHORRO</span>
            <span>−{formatMoney(ticket.discount)}</span>
          </div>
        )}
        <div className="flex items-end justify-between">
          <span className="text-base font-bold">TOTAL</span>
          <span className="text-3xl font-bold tracking-tight">{formatMoney(ticket.total)}</span>
        </div>
        <p className="text-right text-[10px] text-ink-mute">IVA incluido {formatMoney(ticket.tax)}</p>
      </div>

      <div className="space-y-2 bg-tile p-3">
        <div className="grid grid-cols-2 gap-2">
          <button disabled={empty} onClick={() => onPay('cash')} className="flex flex-col items-center gap-1 rounded-2xl bg-emerald-500 py-3.5 text-white shadow-md shadow-emerald-500/30 transition hover:bg-emerald-600 active:scale-[0.98] disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none">
            <Banknote className="size-7" />
            <span className="text-sm font-semibold">Efectivo</span>
            <kbd className="rounded bg-white/25 px-1.5 text-[9px]">F4</kbd>
          </button>
          <button disabled={empty} onClick={() => onPay('card')} className="flex flex-col items-center gap-1 rounded-2xl bg-brand-500 py-3.5 text-white shadow-md shadow-brand-500/30 transition hover:bg-brand-600 active:scale-[0.98] disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none">
            <CreditCard className="size-7" />
            <span className="text-sm font-semibold">Tarjeta</span>
            <kbd className="rounded bg-white/25 px-1.5 text-[9px]">F6</kbd>
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2 text-[11px]">
          <button disabled={empty} onClick={() => onPay('transfer')} className="btn-ghost px-2 py-2 text-[11px]">
            <Landmark className="size-3.5" /> Transfer.
          </button>
          <button
            disabled={empty}
            onClick={() => (customer?.creditEnabled ? onPay('credit') : onCustomer())}
            title={customer?.creditEnabled ? 'Vender a crédito' : 'Asigna un cliente con crédito'}
            className={`btn px-2 py-2 text-[11px] ${canCredit ? 'bg-amber-500 text-white hover:bg-amber-600' : 'border border-line bg-white text-ink hover:bg-brand-50'}`}
          >
            <HandCoins className="size-3.5" /> Crédito
          </button>
          <button disabled={empty} onClick={() => park()} className="btn-ghost px-2 py-2 text-[11px]">
            <PauseCircle className="size-3.5" /> Espera <kbd className="text-[9px] text-ink-mute">F8</kbd>
          </button>
          <button disabled={empty} onClick={() => setConfirmCancel(true)} className="btn-ghost px-2 py-2 text-[11px] text-red-500">
            <Trash2 className="size-3.5" /> Cancelar
          </button>
        </div>
      </div>
      <ConfirmDialog open={confirmCancel} onClose={() => setConfirmCancel(false)} onConfirm={clear} title="Cancelar venta" message="Se quitarán todos los productos del ticket actual." confirmLabel="Cancelar venta" />
    </section>
  )
}
