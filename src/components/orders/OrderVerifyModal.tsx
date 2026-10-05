import { AlertTriangle, CheckCircle2, Clock, PackageCheck, Phone, ScanLine, Store, Wallet } from 'lucide-react'
import Modal from '../ui/Modal'
import { ChannelBadge, StatusPill } from './OrderParts'
import { useOrderStore } from '../../store/useOrderStore'
import { useBranchStore } from '../../store/useBranchStore'
import { FULFILLMENT_LABEL, STATUS_META, isActive } from '../../utils/orders'
import { formatMoney, formatQty, timeAgo } from '../../utils/format'

/**
 * Lo que ve el cajero al leer el QR de un pedido: la orden completa y, en grande, si ya está pagada.
 * Pagado → se entrega. Por cobrar → se carga al ticket y se abre el cobro.
 */
export default function OrderVerifyModal({ orderId, onCharge, onDeliver, onClose }: { orderId: string; onCharge: () => void; onDeliver: () => void; onClose: () => void }) {
  const order = useOrderStore((s) => s.orders.find((o) => o.id === orderId))
  const branchId = useBranchStore((s) => s.activeBranchId)
  const branchName = useBranchStore((s) => s.branches.find((b) => b.id === order?.branchId)?.name)
  if (!order) return null

  const active = isActive(order)
  const otherBranch = order.branchId !== branchId
  const notReady = active && ['received', 'confirmed', 'preparing'].includes(order.status)
  const picked = order.items.filter((i) => i.picked).length

  return (
    <Modal
      open
      onClose={onClose}
      icon={ScanLine}
      title={`Pedido ${order.code}`}
      subtitle={`${FULFILLMENT_LABEL[order.fulfillment]} · ${timeAgo(order.createdAt)}`}
      width="max-w-lg"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cerrar</button>
          {active && !otherBranch && (order.paid ? (
            <button className="btn bg-emerald-500 text-white hover:bg-emerald-600" onClick={onDeliver}>
              <PackageCheck className="size-4" /> {notReady ? 'Entregar de todos modos' : 'Entregar pedido'}
            </button>
          ) : (
            <button className="btn-primary" onClick={onCharge}>
              <Wallet className="size-4" /> Cobrar {formatMoney(order.total)}
            </button>
          ))}
        </>
      }
    >
      <div className="space-y-4">
        {/* Estado de pago, lo primero que debe ver el cajero */}
        {order.paid ? (
          <div className="flex items-center gap-3 rounded-2xl bg-emerald-500 p-4 text-white">
            <CheckCircle2 className="size-9 shrink-0" />
            <div>
              <p className="text-xl font-bold leading-tight">PAGADO</p>
              <p className="text-xs text-white/90">
                {order.paymentMode === 'online' ? `Pagó en línea ${formatMoney(order.total)}.` : `Pagado ${formatMoney(order.total)} en tienda.`}
                {active ? ' No se cobra nada: solo entrega.' : ''}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl bg-orange-500 p-4 text-white">
            <Wallet className="size-9 shrink-0" />
            <div>
              <p className="text-xl font-bold leading-tight">POR COBRAR {formatMoney(order.total)}</p>
              <p className="text-xs text-white/90">Cóbralo en caja antes de entregar.</p>
            </div>
          </div>
        )}

        {!active && (
          <p className="flex items-center gap-2 rounded-xl bg-slate-100 p-3 text-sm font-medium text-ink">
            <AlertTriangle className="size-4 shrink-0" /> Este pedido ya está {STATUS_META[order.status].label.toLowerCase()}; no hay nada pendiente.
          </p>
        )}
        {otherBranch && active && (
          <p className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
            <Store className="size-4 shrink-0" /> Este pedido se recoge en {branchName}, no en esta sucursal.
          </p>
        )}
        {notReady && !otherBranch && (
          <p className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
            <Clock className="size-4 shrink-0" /> Aún no está marcado como listo ({STATUS_META[order.status].label}, {picked}/{order.items.length} productos armados). Revisa que la bolsa esté completa.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line p-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{order.customerName}</p>
            <p className="flex items-center gap-1 text-[11px] text-ink-soft">
              <Phone className="size-3" /> {order.phone}
            </p>
          </div>
          <ChannelBadge channel={order.channel} />
          <StatusPill status={order.status} />
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-ink-soft">Lo que se entrega ({order.items.length} productos)</p>
          <div className="max-h-56 space-y-1 overflow-y-auto pr-1 scrollbar-thin">
            {order.items.map((i) => (
              <div key={i.productId} className="flex items-center gap-2 rounded-lg bg-tile px-3 py-2 text-sm">
                <span className="text-lg">{i.emoji}</span>
                <span className="min-w-0 flex-1 truncate">{i.name}</span>
                <b className="whitespace-nowrap">{i.unit === 'kg' ? formatQty(i.qty, 'kg') : `×${i.qty}`}</b>
              </div>
            ))}
          </div>
        </div>
        {order.notes && <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">📝 {order.notes}</p>}
      </div>
    </Modal>
  )
}
