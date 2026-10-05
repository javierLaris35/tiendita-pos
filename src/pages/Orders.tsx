import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bike, Clock, Globe, MessageCircle, PackageCheck, ScanLine, ShoppingBag, Store } from 'lucide-react'
import OrderDetailModal from '../components/orders/OrderDetailModal'
import { ChannelBadge, PaidBadge } from '../components/orders/OrderParts'
import { Dropdown } from '../components/ui/Dropdown'
import { useOrderStore } from '../store/useOrderStore'
import { useBranchStore } from '../store/useBranchStore'
import { toast } from '../store/useUiStore'
import { findOrderByCode, setOrderStatus } from '../store/orderActions'
import Modal from '../components/ui/Modal'
import { CameraScanner } from '../components/qr/Qr'
import { FINAL, nextStatus, primaryAction } from '../utils/orders'
import { formatMoney, timeAgo } from '../utils/format'
import type { Order, OrderChannel, PedidoStatus } from '../types'

const COLUMNS: { id: string; title: string; statuses: PedidoStatus[]; accent: string }[] = [
  { id: 'new', title: 'Nuevos', statuses: ['received'], accent: 'bg-sky-500' },
  { id: 'confirmed', title: 'Confirmados', statuses: ['confirmed'], accent: 'bg-indigo-500' },
  { id: 'preparing', title: 'Armando', statuses: ['preparing'], accent: 'bg-amber-500' },
  { id: 'ready', title: 'Listos / por cobrar', statuses: ['ready', 'awaiting_payment'], accent: 'bg-emerald-500' },
  { id: 'route', title: 'En camino', statuses: ['on_the_way'], accent: 'bg-violet-500' },
  { id: 'closed', title: 'Cerrados hoy', statuses: FINAL, accent: 'bg-slate-400' },
]

function OrderCard({ order, onOpen }: { order: Order; onOpen: () => void }) {
  const navigate = useNavigate()
  const branch = useBranchStore((s) => s.branches.find((b) => b.id === order.branchId))
  const action = primaryAction(order)
  const picked = order.items.filter((i) => i.picked).length
  const age = (Date.now() - new Date(order.createdAt).getTime()) / 60000
  const late = !FINAL.includes(order.status) && age > 45

  const quick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (action.kind === 'register') return navigate(`/caja?pedido=${order.code}`)
    if (action.kind === 'collect' || action.disabled) return onOpen()
    const next = nextStatus(order)
    if (next) {
      setOrderStatus(order.id, next)
      toast({ title: `${order.code}: ${action.label}`, message: 'Se avisó al cliente.' })
    }
  }

  return (
    <div onClick={onOpen} className={`animate-pop cursor-pointer space-y-2 rounded-2xl border bg-white p-3 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-900/5 ${late ? 'border-red-200' : 'border-line'}`}>
      <div className="flex items-center gap-2">
        <span className="whitespace-nowrap font-mono text-sm font-bold">{order.code}</span>
        <ChannelBadge channel={order.channel} />
        <span className={`ml-auto flex items-center gap-1 text-[10px] ${late ? 'font-semibold text-red-500' : 'text-ink-mute'}`}>
          <Clock className="size-3" /> {timeAgo(order.createdAt).replace('Hace ', '')}
        </span>
      </div>
      <p className="truncate text-sm font-medium">{order.customerName}</p>
      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
        <span className="flex items-center gap-1 rounded-full bg-tile px-2 py-0.5">
          {order.fulfillment === 'delivery' ? <Bike className="size-3" /> : order.fulfillment === 'pickup' ? <Store className="size-3" /> : <ScanLine className="size-3" />}
          {order.fulfillment === 'delivery' ? 'Domicilio' : order.fulfillment === 'pickup' ? `Recoge en ${branch?.name.replace('Tiendita ', '')}` : 'En tienda'}
        </span>
        <PaidBadge order={order} />
      </div>
      {order.status === 'preparing' && (
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(picked / order.items.length) * 100}%` }} />
        </div>
      )}
      <div className="flex items-center justify-between text-xs">
        <span className="text-ink-soft">
          {order.items.length} productos · <b className="text-ink">{formatMoney(order.total)}</b>
        </span>
      </div>
      {action.kind !== 'none' && (
        <button onClick={quick} className={`w-full rounded-xl py-2 text-xs font-semibold transition ${action.kind === 'register' ? 'bg-ink text-white hover:bg-ink/90' : action.disabled ? 'bg-tile text-ink-soft' : 'bg-brand-500 text-white hover:bg-brand-600'}`}>
          {action.disabled ? 'Armar productos…' : action.label}
        </button>
      )}
    </div>
  )
}

export default function Orders() {
  const orders = useOrderStore((s) => s.orders)
  const branches = useBranchStore((s) => s.branches)
  const activeBranch = useBranchStore((s) => s.activeBranchId)
  const [branch, setBranch] = useState<string>(activeBranch)
  const [channel, setChannel] = useState<OrderChannel | 'all'>('all')
  const [open, setOpen] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  // En teléfono se ve una columna a la vez, elegida con pestañas
  const [mobileCol, setMobileCol] = useState(COLUMNS[0].id)

  const visible = useMemo(() => {
    const dayAgo = Date.now() - 86400000
    return orders.filter(
      (o) =>
        (branch === 'all' || o.branchId === branch) &&
        (channel === 'all' || o.channel === channel) &&
        (!FINAL.includes(o.status) || new Date(o.updatedAt).getTime() > dayAgo),
    )
  }, [orders, branch, channel])

  const stat = (fn: (o: Order) => boolean) => visible.filter(fn).length

  return (
    <div className="flex flex-col gap-3">
      <section className="card flex flex-wrap items-center gap-3 p-4">
        <div className="icon-box"><ShoppingBag className="size-5" /></div>
        <div className="mr-auto">
          <h1 className="text-lg font-medium">Pedidos</h1>
          <p className="text-xs text-ink-soft">Tienda en línea, WhatsApp y Escanea y paga en un solo tablero</p>
        </div>
        <Dropdown value={branch} onChange={setBranch} options={[{ value: 'all', label: 'Todas las sucursales' }, ...branches.map((b) => ({ value: b.id, label: b.name }))]} />
        <Dropdown
          value={channel}
          onChange={setChannel}
          options={[
            { value: 'all', label: 'Todos los canales' },
            { value: 'web', label: '🌐 Tienda en línea' },
            { value: 'whatsapp', label: '💬 WhatsApp' },
            { value: 'scan', label: '📱 Escanea y paga' },
          ]}
        />
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setScanning(true)} className="btn-primary px-3 py-2 text-xs" title="Leer el QR del cliente">
            <ScanLine className="size-4" /> Escanear QR
          </button>
          <button onClick={() => window.open('/tienda', '_blank')} className="btn-ghost px-3 py-2 text-xs" title="Abrir la tienda en línea">
            <Globe className="size-4" /> Tienda
          </button>
          <button onClick={() => window.open('/whatsapp', '_blank')} className="btn-ghost px-3 py-2 text-xs" title="Abrir simulador de WhatsApp">
            <MessageCircle className="size-4" /> WhatsApp
          </button>
          <button onClick={() => window.open('/scan', '_blank')} className="btn-ghost px-3 py-2 text-xs" title="Abrir Escanea y paga">
            <ScanLine className="size-4" /> Escanea
          </button>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Nuevos sin confirmar', value: stat((o) => o.status === 'received'), tone: 'border-sky-500 bg-sky-500 text-white' },
          { label: 'En preparación', value: stat((o) => ['confirmed', 'preparing'].includes(o.status)) },
          { label: 'Por cobrar en caja', value: stat((o) => !o.paid && ['ready', 'awaiting_payment'].includes(o.status) && o.fulfillment !== 'delivery') },
          { label: 'En camino', value: stat((o) => o.status === 'on_the_way') },
        ].map((k) => (
          <div key={k.label} className={`card p-4 ${k.tone ?? ''}`}>
            <p className={`text-xs ${k.tone ? 'text-white/85' : 'text-ink-soft'}`}>{k.label}</p>
            <p className="text-2xl font-semibold">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 no-scrollbar md:hidden">
        {COLUMNS.map((col) => {
          const n = visible.filter((o) => col.statuses.includes(o.status)).length
          return (
            <button
              key={col.id}
              onClick={() => setMobileCol(col.id)}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-medium ${mobileCol === col.id ? 'border-brand-500 bg-brand-500 text-white' : 'border-line bg-white text-ink'}`}
            >
              <span className={`size-2 rounded-full ${col.accent}`} />
              {col.title}
              <span className={`rounded-full px-1.5 text-[10px] ${mobileCol === col.id ? 'bg-white text-brand-700' : 'bg-tile'}`}>{n}</span>
            </button>
          )
        })}
      </div>
      <div className="-mx-1 flex gap-3 px-1 pb-2 md:min-h-[520px] md:overflow-x-auto md:scrollbar-thin">
        {COLUMNS.map((col) => {
          const list = visible.filter((o) => col.statuses.includes(o.status)).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
          return (
            <section key={col.id} className={`${col.id === mobileCol ? 'flex' : 'hidden'} w-full shrink-0 flex-col rounded-2xl bg-tile p-2.5 md:flex md:w-72 xl:w-auto xl:min-w-52 xl:flex-1`}>
              <div className="mb-2 flex items-center gap-2 px-1">
                <span className={`size-2.5 rounded-full ${col.accent}`} />
                <p className="text-sm font-semibold">{col.title}</p>
                <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[11px] font-medium">{list.length}</span>
              </div>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5 scrollbar-thin">
                {list.map((o) => (
                  <OrderCard key={o.id} order={o} onOpen={() => setOpen(o.id)} />
                ))}
                {!list.length && (
                  <p className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-line py-6 text-[11px] text-ink-mute">
                    <PackageCheck className="size-3.5" /> Sin pedidos
                  </p>
                )}
              </div>
            </section>
          )
        })}
      </div>
      {open && <OrderDetailModal orderId={open} onClose={() => setOpen(null)} />}
      {scanning && (
        <Modal open onClose={() => setScanning(false)} icon={ScanLine} title="Escanear pedido" subtitle="Lee el QR del pase del cliente o escribe su código" width="max-w-md">
          <CameraScanner
            onResult={(text) => {
              const order = findOrderByCode(text)
              if (!order) return toast({ type: 'error', title: 'Pedido no encontrado', message: text })
              setScanning(false)
              setOpen(order.id)
            }}
          />
        </Modal>
      )}
    </div>
  )
}
