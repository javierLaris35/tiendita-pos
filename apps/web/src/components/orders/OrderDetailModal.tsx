import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Banknote, CheckSquare, ClipboardList, CreditCard, MapPin, MessageCircle, Phone, Printer, Square, Store, XCircle } from 'lucide-react'
import Modal, { Field } from '../ui/Modal'
import PromoLine from '../ui/PromoLine'
import { ChannelBadge, OrderStepper, OrderTimeline, PaidBadge, StatusPill } from './OrderParts'
import { useOrderStore } from '../../store/useOrderStore'
import { useBranchStore } from '../../store/useBranchStore'
import { toast } from '../../store/useUiStore'
import { setOrderStatus, togglePicked } from '../../store/orderActions'
import { FULFILLMENT_LABEL, isActive, nextStatus, primaryAction } from '../../utils/orders'
import { formatDateTime, formatMoney, formatQty } from '../../utils/format'

export default function OrderDetailModal({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const order = useOrderStore((s) => s.orders.find((o) => o.id === orderId))
  const branch = useBranchStore((s) => s.branches.find((b) => b.id === order?.branchId))
  const navigate = useNavigate()
  const [cancelling, setCancelling] = useState(false)
  const [reason, setReason] = useState('')
  const [collecting, setCollecting] = useState(false)
  if (!order) return null

  const picked = order.items.filter((i) => i.picked).length
  const action = primaryAction(order)
  const next = nextStatus(order)

  const run = () => {
    if (action.kind === 'register') return navigate(`/caja?pedido=${order.code}`)
    if (action.kind === 'collect') return setCollecting(true)
    if (next) {
      setOrderStatus(order.id, next)
      toast({ title: `${order.code}: ${action.label}`, message: 'Se avisó al cliente.' })
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      icon={ClipboardList}
      title={`Pedido ${order.code}`}
      subtitle={`${order.customerName} · ${formatDateTime(order.createdAt)}`}
      width="max-w-4xl"
      footer={
        <>
          {isActive(order) && (
            <button className="btn-ghost mr-auto text-red-500" onClick={() => setCancelling(true)}>
              <XCircle className="size-4" /> Cancelar
            </button>
          )}
          <button className="btn-ghost" onClick={() => window.print()}>
            <Printer className="size-4" /> Hoja de surtido
          </button>
          {action.kind !== 'none' && (
            <button className="btn-primary min-w-44" disabled={Boolean(action.disabled)} title={action.disabled} onClick={run}>
              {action.label}
            </button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <ChannelBadge channel={order.channel} />
          <StatusPill status={order.status} />
          <PaidBadge order={order} />
          <span className="rounded-full bg-tile px-2 py-0.5 text-[10px] font-medium">{FULFILLMENT_LABEL[order.fulfillment]}</span>
        </div>
        <OrderStepper order={order} />
        <div className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="print-area space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Productos a surtir</p>
              <span className="text-xs text-ink-soft">
                {picked}/{order.items.length} armados
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(picked / order.items.length) * 100}%` }} />
            </div>
            <div className="space-y-1.5">
              {order.items.map((i) => (
                <button
                  key={i.productId}
                  disabled={!isActive(order)}
                  onClick={() => togglePicked(order.id, i.productId)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${i.picked ? 'border-emerald-200 bg-emerald-50/70' : 'border-line hover:bg-tile'}`}
                >
                  {i.picked ? <CheckSquare className="size-5 shrink-0 text-emerald-600" /> : <Square className="size-5 shrink-0 text-ink-mute" />}
                  <span className="text-xl">{i.emoji}</span>
                  <span className={`min-w-0 flex-1 text-sm ${i.picked ? 'text-ink-soft line-through' : 'font-medium'}`}>{i.name}</span>
                  <span className="rounded-lg bg-white px-2 py-1 text-sm font-bold">{i.unit === 'kg' ? formatQty(i.qty, 'kg') : `×${i.qty}`}</span>
                </button>
              ))}
            </div>
            {order.notes && <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">📝 {order.notes}</p>}
            <div className="space-y-1 rounded-xl bg-tile p-3 text-xs">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatMoney(order.subtotal)}</span></div>
              {order.promotions.map((p) => (
                <PromoLine key={p.promoId} promo={p} icon={false} />
              ))}
              {order.deliveryFee > 0 && <div className="flex justify-between"><span>Envío</span><span>{formatMoney(order.deliveryFee)}</span></div>}
              <div className="flex justify-between text-sm font-semibold"><span>Total</span><span>{formatMoney(order.total)}</span></div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="space-y-2 rounded-2xl border border-line p-3 text-xs">
              <p className="text-sm font-semibold">{order.customerName}</p>
              <p className="flex items-center gap-2 text-ink-soft"><Phone className="size-3.5" /> {order.phone}</p>
              <p className="flex items-start gap-2 text-ink-soft">
                {order.fulfillment === 'delivery' ? <MapPin className="size-3.5 shrink-0" /> : <Store className="size-3.5 shrink-0" />}
                {order.fulfillment === 'delivery' ? order.address : branch?.name}
              </p>
              {order.channel === 'whatsapp' && (
                <button onClick={() => window.open(`/whatsapp?tel=${encodeURIComponent(order.phone)}`, '_blank')} className="flex items-center gap-1.5 text-emerald-700 hover:underline">
                  <MessageCircle className="size-3.5" /> Ver conversación de WhatsApp
                </button>
              )}
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold">Avisos al cliente</p>
              <div className="max-h-64 overflow-y-auto pr-1 scrollbar-thin">
                <OrderTimeline order={order} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {collecting && (
        <Modal open onClose={() => setCollecting(false)} icon={Banknote} title="¿Cómo pagó el cliente?" subtitle={`${order.code} · ${formatMoney(order.total)}`} width="max-w-sm">
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['cash', 'Efectivo', Banknote],
                ['card', 'Tarjeta (terminal)', CreditCard],
              ] as const
            ).map(([m, label, Icon]) => (
              <button
                key={m}
                onClick={() => {
                  setOrderStatus(order.id, 'delivered', { collected: m })
                  setCollecting(false)
                  toast({ title: `${order.code} entregado`, message: `Cobrado en ${label.toLowerCase()}. Se registró la venta.` })
                }}
                className="flex flex-col items-center gap-2 rounded-2xl border border-line p-4 text-sm hover:border-brand-400 hover:bg-brand-50"
              >
                <Icon className="size-6 text-brand-500" /> {label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-ink-soft">Si tienes turno de caja abierto, el cobro queda en tu corte.</p>
        </Modal>
      )}
      {cancelling && (
        <Modal
          open
          onClose={() => setCancelling(false)}
          icon={XCircle}
          title="Cancelar pedido"
          width="max-w-sm"
          footer={
            <button
              className="btn-danger"
              onClick={() => {
                setOrderStatus(order.id, 'cancelled', { note: reason.trim() || 'Cancelado por la tienda' })
                setCancelling(false)
                toast({ type: 'info', title: `${order.code} cancelado`, message: 'La mercancía apartada quedó libre y se avisó al cliente.' })
              }}
            >
              Cancelar pedido
            </button>
          }
        >
          <Field label="Motivo (se le envía al cliente)">
            <input autoFocus className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej. no tenemos producto en buen estado" />
          </Field>
        </Modal>
      )}
    </Modal>
  )
}
