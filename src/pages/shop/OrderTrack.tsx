import { useEffect, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Bell, CreditCard, MapPin, PackageSearch, Store } from 'lucide-react'
import ShopLayout from '../../components/shop/ShopLayout'
import PromoLine from '../../components/ui/PromoLine'
import { QrCode } from '../../components/qr/Qr'
import { ChannelBadge, OrderStepper, OrderTimeline, PaidBadge, StatusPill } from '../../components/orders/OrderParts'
import { EmptyState } from '../../components/ui/Misc'
import { useOrderStore } from '../../store/useOrderStore'
import { useBranchStore } from '../../store/useBranchStore'
import { toast } from '../../store/useUiStore'
import { payOrderOnline } from '../../store/orderActions'
import { FULFILLMENT_LABEL, isActive, orderQrValue } from '../../utils/orders'
import { formatDateTime, formatMoney, formatQty } from '../../utils/format'

/** Seguimiento público del pedido (liga que se comparte por WhatsApp o correo). */
export default function OrderTrack() {
  const { code = '' } = useParams()
  const order = useOrderStore((s) => s.orders.find((o) => o.code === code.toUpperCase()))
  const branch = useBranchStore((s) => s.branches.find((b) => b.id === order?.branchId))
  const lastCount = useRef(order?.timeline.length ?? 0)

  // Aviso en pantalla cuando el personal cambia el estatus (llega desde otra pestaña/dispositivo)
  useEffect(() => {
    if (!order) return
    if (order.timeline.length > lastCount.current) {
      const e = order.timeline[order.timeline.length - 1]
      toast({ type: 'info', title: 'Actualización de tu pedido', message: e.message, duration: 6000 })
    }
    lastCount.current = order.timeline.length
  }, [order])

  if (!order) {
    return (
      <ShopLayout>
        <EmptyState icon={PackageSearch} title="No encontramos ese pedido" message="Revisa el código o entra a Mis pedidos." action={<Link to="/tienda/cuenta" className="btn-primary mt-2">Mis pedidos</Link>} />
      </ShopLayout>
    )
  }

  const last = order.timeline[order.timeline.length - 1]
  const showQr = isActive(order) && order.fulfillment !== 'delivery'

  return (
    <ShopLayout>
      <Link to="/tienda/cuenta" className="mb-3 inline-flex items-center gap-1 text-xs text-ink-soft hover:text-ink">
        <ArrowLeft className="size-3.5" /> Mis pedidos
      </Link>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <section className="card space-y-4 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="mr-auto text-xl font-bold">Pedido {order.code}</h1>
              <ChannelBadge channel={order.channel} />
              <StatusPill status={order.status} />
            </div>
            <OrderStepper order={order} />
            <div className="flex items-start gap-3 rounded-2xl bg-brand-50 p-4">
              <Bell className="mt-0.5 size-5 shrink-0 text-brand-600" />
              <div>
                <p className="text-sm font-medium">{last?.message}</p>
                <p className="text-[11px] text-ink-soft">{last && formatDateTime(last.date)}</p>
              </div>
            </div>
            {order.paymentMode === 'online' && !order.paid && isActive(order) && (
              <button
                className="btn-primary w-full py-3"
                onClick={() => {
                  payOrderOnline(order.id)
                  toast({ title: 'Pago aprobado (demo)', message: `Pedido ${order.code} pagado.` })
                }}
              >
                <CreditCard className="size-4" /> Pagar en línea {formatMoney(order.total)} (simulado)
              </button>
            )}
          </section>
          <section className="card p-5">
            <p className="mb-3 text-sm font-semibold">Avisos de tu pedido</p>
            <OrderTimeline order={order} />
          </section>
        </div>

        <div className="space-y-4">
          {showQr && (
            <section className="card flex flex-col items-center gap-2 p-5 text-center">
              <p className="text-sm font-semibold">{order.paid ? 'Muestra este código para recoger' : 'Muestra este código en caja para pagar'}</p>
              <QrCode value={orderQrValue(order.code)} size={190} />
              <p className="font-mono text-2xl font-bold tracking-widest">{order.code}</p>
            </section>
          )}
          <section className="card space-y-3 p-5 text-sm">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{FULFILLMENT_LABEL[order.fulfillment]}</p>
              <PaidBadge order={order} />
            </div>
            <p className="flex items-start gap-2 text-xs text-ink-soft">
              {order.fulfillment === 'delivery' ? <MapPin className="size-4 shrink-0" /> : <Store className="size-4 shrink-0" />}
              {order.fulfillment === 'delivery' ? order.address : `${branch?.name} · ${branch?.address}`}
            </p>
            <div className="space-y-1.5 border-t border-line pt-3 text-xs">
              {order.items.map((i) => (
                <div key={i.productId} className="flex justify-between gap-2">
                  <span className="truncate">
                    {i.emoji} {i.unit === 'kg' ? formatQty(i.qty, 'kg') : `${i.qty} ×`} {i.name}
                  </span>
                  <span>{formatMoney(i.price * i.qty)}</span>
                </div>
              ))}
              {order.promotions.map((p) => (
                <PromoLine key={p.promoId} promo={p} icon={false} />
              ))}
              {order.deliveryFee > 0 && (
                <div className="flex justify-between">
                  <span>Envío</span>
                  <span>{formatMoney(order.deliveryFee)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-dashed border-line pt-2 text-sm font-semibold">
                <span>Total</span>
                <span>{formatMoney(order.total)}</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </ShopLayout>
  )
}
