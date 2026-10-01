import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { QrCode, Box, CircleCheck, Clock3, EyeOff, PackageCheck, PackagePlus, Recycle, Search, Truck, X, Archive, ClipboardList } from 'lucide-react'
import { Dropdown, KebabMenu } from '../components/ui/Dropdown'
import QrLabelsModal from '../components/qr/QrLabelsModal'
import { EmptyState, KeyValue, PanelHeader, ProductThumb, StockBadge } from '../components/ui/Misc'
import { ProductFormModal, OrderStockModal, WasteModal } from '../components/pos/InventoryModals'
import { useInventoryStore, ORDER_STATUS } from '../store/useInventoryStore'
import { toast } from '../store/useUiStore'
import { CATEGORIES } from '../data/seed'
import { stockStatus } from '../utils/stock'
import { formatDate, timeAgo } from '../utils/format'
import type { Product, StockStatus, SupplierOrder } from '../types'

const catName = (id: string) => CATEGORIES.find((c) => c.id === id)?.name ?? id
const STATUS_ICON = { approval: Clock3, transit: Truck, delivered: PackageCheck, cancelled: X }
const FILTERS: { value: StockStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'ok', label: 'En stock' },
  { value: 'low', label: 'Stock bajo' },
  { value: 'out', label: 'Agotado' },
]

interface ProductListProps {
  onEdit: (p: Product) => void
  onOrder: (productId?: string | null) => void
  selectedId: string | null
  onAdd: () => void
  onLabels: () => void
}

function ProductList({ onEdit, onOrder, selectedId, onAdd, onLabels }: ProductListProps) {
  const products = useInventoryStore((s) => s.products)
  const [params] = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  const [filter, setFilter] = useState<StockStatus | 'all'>('all')
  const list = useMemo(
    () =>
      products.filter(
        (p) => (filter === 'all' || stockStatus(p) === filter) && `${p.name} ${p.brand} ${p.barcode}`.toLowerCase().includes(q.toLowerCase()),
      ),
    [products, q, filter],
  )

  return (
    <section className="card relative flex min-h-[560px] flex-col gap-3 p-3 sm:p-4 xl:min-h-0">
      <PanelHeader icon={Box} title="Productos y existencias">
        <Dropdown value={filter} onChange={setFilter} options={FILTERS} />
        <KebabMenu
          items={[
            { label: 'Agregar producto', icon: PackagePlus, onClick: onAdd },
            { label: 'Ordenar stock', icon: Truck, onClick: () => onOrder() },
            { label: 'Etiquetas QR de anaquel', icon: QrCode, onClick: onLabels },
          ]}
        />
      </PanelHeader>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-mute" />
        <input className="input py-2 pl-9" placeholder="Buscar por nombre, marca o código…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="-mr-1 min-h-0 flex-1 space-y-2 overflow-y-auto pb-16 pr-1 scrollbar-thin">
        {!list.length && <EmptyState icon={Box} title="Sin productos" message="Prueba con otro filtro o búsqueda." />}
        {list.map((p) => {
          const active = p.id === selectedId
          return (
            <button
              key={p.id}
              onClick={() => onEdit(p)}
              className={`row-card grid w-full grid-cols-[minmax(0,1.5fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_auto] items-center gap-3 p-2 text-left ${active ? 'row-card-active' : 'hover:border-brand-200'}`}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <ProductThumb product={p} />
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">{p.name}</p>
                  <p className={`truncate text-[10px] ${active ? 'text-white/80' : 'text-brand-600'}`}>{catName(p.category)}</p>
                </div>
              </div>
              <KeyValue light={active} label="Disponible" value={p.stock} />
              <KeyValue light={active} label="Último reabasto" value={timeAgo(p.lastRestocked)} />
              <StockBadge product={p} className={active ? 'bg-white' : 'bg-transparent'} />
            </button>
          )
        })}
      </div>
      <button onClick={() => onOrder(selectedId)} className="btn-primary absolute bottom-4 left-1/2 -translate-x-1/2 px-10 py-3 shadow-lg">
        <ClipboardList className="size-4" /> Ordenar stock
      </button>
    </section>
  )
}

function SupplierOrders({ onNew }: { onNew: () => void }) {
  const orders = useInventoryStore((s) => s.supplierOrders)
  const products = useInventoryStore((s) => s.products)
  const advanceOrder = useInventoryStore((s) => s.advanceOrder)
  const cancelOrder = useInventoryStore((s) => s.cancelOrder)
  const [hideDone, setHideDone] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const list = orders.filter((o) => !hideDone || (o.status !== 'delivered' && o.status !== 'cancelled'))

  const advance = (o: SupplierOrder) => {
    const next = advanceOrder(o.id)
    if (!next) return
    const p = products.find((x) => x.id === o.productId)
    toast(
      next === 'delivered'
        ? { title: `Orden ${o.code} recibida`, message: `+${o.qty} unidades de ${p?.name} en inventario.` }
        : { type: 'info', title: `Orden ${o.code} aprobada`, message: 'El proveedor ya fue notificado.' },
    )
  }

  return (
    <section className="card flex min-h-[300px] flex-1 flex-col gap-3 p-3 sm:p-4 xl:min-h-0">
      <PanelHeader icon={Archive} title="Reabasto y órdenes a proveedor">
        <KebabMenu
          items={[
            { label: 'Nueva orden', icon: Truck, onClick: onNew },
            { label: hideDone ? 'Mostrar todas' : 'Ocultar finalizadas', icon: EyeOff, onClick: () => setHideDone((h) => !h) },
          ]}
        />
      </PanelHeader>
      <div className="-mr-1 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 scrollbar-thin">
        {!list.length && <EmptyState icon={Truck} title="Sin órdenes" />}
        {list.map((o) => {
          const p = products.find((x) => x.id === o.productId)
          const st = ORDER_STATUS[o.status]
          const Icon = STATUS_ICON[o.status]
          const active = selected === o.id || (selected === null && o.status === 'delivered' && o === list.find((x) => x.status === 'delivered'))
          return (
            <div
              key={o.id}
              onClick={() => setSelected(o.id)}
              className={`row-card grid cursor-pointer grid-cols-[repeat(4,minmax(0,1fr))_auto] items-center gap-2 p-2.5 sm:gap-3 ${active ? 'row-card-active' : 'hover:border-brand-200'}`}
            >
              <KeyValue light={active} label="Orden" value={o.code} />
              <KeyValue light={active} label="Proveedor" value={o.supplier} />
              <KeyValue light={active} label="Artículos" value={`${o.qty} ${p?.name ?? '—'}`} />
              <KeyValue light={active} label="Entrega" value={formatDate(o.expected)} />
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    advance(o)
                  }}
                  disabled={!st.next}
                  title={st.next ? st.nextLabel : st.label}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[10px] font-medium transition disabled:cursor-default disabled:opacity-100 ${
                    active ? 'bg-white/20 text-white' : o.status === 'cancelled' ? 'text-red-500' : 'text-ink hover:bg-brand-50'
                  }`}
                >
                  <Icon className="size-3.5" /> {st.label}
                </button>
                {st.next && (
                  <KebabMenu
                    light={active}
                    items={[
                      { label: st.nextLabel ?? 'Avanzar', icon: CircleCheck, onClick: () => advance(o) },
                      { label: 'Cancelar orden', icon: X, danger: true, onClick: () => cancelOrder(o.id) },
                    ]}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function ExpiryWaste({ onAdd }: { onAdd: () => void }) {
  const waste = useInventoryStore((s) => s.waste)
  const products = useInventoryStore((s) => s.products)
  const removeWaste = useInventoryStore((s) => s.removeWaste)
  const [selected, setSelected] = useState<string | null>(null)
  const sorted = [...waste].sort((a, b) => new Date(a.expiry).getTime() - new Date(b.expiry).getTime())

  return (
    <section className="card flex min-h-[300px] flex-1 flex-col gap-3 p-3 sm:p-4 xl:min-h-0">
      <PanelHeader icon={Recycle} title="Caducidad y merma">
        <KebabMenu items={[{ label: 'Registrar lote / historial', icon: Recycle, onClick: onAdd }]} />
      </PanelHeader>
      <div className="-mr-1 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 scrollbar-thin">
        {!sorted.length && <EmptyState icon={CircleCheck} title="Sin productos por caducar" message="Todo en orden por ahora." />}
        {sorted.map((w) => {
          const p = products.find((x) => x.id === w.productId)
          if (!p) return null
          const expired = new Date(w.expiry) < new Date()
          const active = selected === w.id
          return (
            <div key={w.id} onClick={() => setSelected(w.id)} className={`row-card grid cursor-pointer grid-cols-[minmax(0,1.4fr)_minmax(0,0.7fr)_minmax(0,0.9fr)_auto] items-center gap-3 p-2 ${active ? 'row-card-active' : 'hover:border-brand-200'}`}>
              <div className="flex min-w-0 items-center gap-2.5">
                <ProductThumb product={p} />
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">{p.name}</p>
                  <p className={`truncate text-[10px] ${active ? 'text-white/80' : 'text-brand-600'}`}>{catName(p.category)}</p>
                </div>
              </div>
              <KeyValue light={active} label="Cantidad" value={w.qty} />
              <KeyValue light={active} label={expired ? 'Caducado' : 'Caduca'} value={formatDate(w.expiry)} valueClass={expired && !active ? '!text-red-500' : ''} />
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  removeWaste(w.id)
                  toast({ type: 'info', title: 'Merma retirada', message: `${w.qty} × ${p.name} descontados del inventario.` })
                }}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] transition ${active ? 'border-white bg-white text-brand-600' : 'border-line bg-tile hover:bg-red-50 hover:text-red-500'}`}
              >
                <Recycle className="size-3.5" /> Retirar
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default function Inventory() {
  const [editing, setEditing] = useState<Product | 'new' | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [order, setOrder] = useState<{ productId?: string | null } | null>(null)
  const [wasteOpen, setWasteOpen] = useState(false)
  const [labels, setLabels] = useState(false)

  return (
    <div className="grid grid-cols-1 gap-3 xl:h-full xl:grid-cols-2">
      <ProductList
        selectedId={selectedId}
        onEdit={(p) => {
          setSelectedId(p.id)
          setEditing(p)
        }}
        onAdd={() => setEditing('new')}
        onLabels={() => setLabels(true)}
        onOrder={(productId) => setOrder({ productId })}
      />
      <div className="flex min-h-0 flex-col gap-3">
        <SupplierOrders onNew={() => setOrder({})} />
        <ExpiryWaste onAdd={() => setWasteOpen(true)} />
      </div>
      {editing && <ProductFormModal open onClose={() => setEditing(null)} product={editing === 'new' ? null : editing} />}
      {order && <OrderStockModal open onClose={() => setOrder(null)} productId={order.productId} />}
      {wasteOpen && <WasteModal open onClose={() => setWasteOpen(false)} />}
      {labels && <QrLabelsModal onClose={() => setLabels(false)} />}
    </div>
  )
}
