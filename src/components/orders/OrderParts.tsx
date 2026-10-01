import { Check } from 'lucide-react'
import { CHANNEL_META, FLOW, STATUS_META } from '../../utils/orders'
import { formatDateTime, formatTime } from '../../utils/format'
import type { Order } from '../../types'

export function StatusPill({ status }: { status: Order['status'] }) {
  const m = STATUS_META[status]
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ${m.tone}`}>
      <span className={`size-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  )
}

export function ChannelBadge({ channel }: { channel: Order['channel'] }) {
  const m = CHANNEL_META[channel]
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium ${m.tone}`}>{m.emoji} {m.label}</span>
}

export function PaidBadge({ order }: { order: Order }) {
  if (order.paid) return <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Pagado</span>
  if (order.paymentMode === 'online') return <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Pago en línea pendiente</span>
  return <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-700">{order.fulfillment === 'delivery' ? 'Cobrar al entregar' : 'Cobrar en caja'}</span>
}

/** Línea de progreso del pedido según su tipo de entrega. */
export function OrderStepper({ order }: { order: Order }) {
  if (order.status === 'cancelled') return <p className="rounded-xl bg-red-50 p-3 text-center text-sm font-medium text-red-600">Pedido cancelado</p>
  const flow = FLOW[order.fulfillment]
  const current = flow.indexOf(order.status)
  return (
    <ol className="flex items-start">
      {flow.map((s, i) => {
        const done = i <= current
        const event = order.timeline.find((e) => e.status === s)
        return (
          <li key={s} className="relative flex flex-1 flex-col items-center text-center">
            {i > 0 && <span className={`absolute right-1/2 top-3.5 h-0.5 w-full ${i <= current ? 'bg-brand-500' : 'bg-line'}`} />}
            <span className={`relative z-10 grid size-7 place-items-center rounded-full border-2 text-[11px] font-bold ${done ? 'border-brand-500 bg-brand-500 text-white' : 'border-line bg-white text-ink-mute'} ${i === current ? 'ring-4 ring-brand-100' : ''}`}>
              {done ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span className={`mt-1.5 text-[10px] leading-tight ${i === current ? 'font-semibold text-ink' : 'text-ink-soft'}`}>{STATUS_META[s].short}</span>
            {event && <span className="text-[9px] text-ink-mute">{formatTime(event.date)}</span>}
          </li>
        )
      })}
    </ol>
  )
}

/** Avisos enviados al cliente (más reciente arriba). */
export function OrderTimeline({ order }: { order: Order }) {
  return (
    <div className="space-y-2">
      {[...order.timeline].reverse().map((e, i) => (
        <div key={e.date + i} className="flex gap-3">
          <span className={`mt-1.5 size-2 shrink-0 rounded-full ${STATUS_META[e.status].dot}`} />
          <div className="min-w-0">
            <p className="text-xs">{e.message}</p>
            <p className="text-[10px] text-ink-mute">
              {formatDateTime(e.date)}
              {e.note ? ` · ${e.note}` : ''}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
