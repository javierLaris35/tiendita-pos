import { useMemo, useRef, useState } from 'react'
import { ScanLine, ShoppingBag, Barcode, CalendarClock, PackageSearch, Plus, Receipt, ScanSearch, Search, ShieldCheck, UserPlus, UsersRound } from 'lucide-react'
import Modal from '../ui/Modal'
import Avatar from '../ui/Avatar'
import { CategoryIcon, EmptyState, Toggle } from '../ui/Misc'
import { AbonoModal, CreditPanel, CreditStatus } from '../credit/Credit'
import { CATEGORIES } from '../../data/seed'
import { useInventoryStore } from '../../store/useInventoryStore'
import { useActivePromotions } from '../../store/usePromotionStore'
import { useCustomerStore, loyaltyFor } from '../../store/useCustomerStore'
import { useSalesStore, PAYMENT_METHODS } from '../../store/useSalesStore'
import { useBranchStore } from '../../store/useBranchStore'
import { useMySession } from '../../store/useCashStore'
import { useCurrentUser } from '../../store/useAuthStore'
import { useUiStore, toast } from '../../store/useUiStore'
import { useOrderStore } from '../../store/useOrderStore'
import { ChannelBadge, StatusPill } from '../orders/OrderParts'
import { CameraScanner } from '../qr/Qr'
import { useCustomerStats } from '../../hooks'
import { promoBadge, promoColor, promoDescription, promoProductIds } from '../../utils/promotions'
import { STOCK_STATUS, stockStatus } from '../../utils/stock'
import { formatMoney, formatQty, formatTime, timeAgo } from '../../utils/format'
import { periodRange, inRange } from '../../utils/period'
import type { Product } from '../../types'

// ---------------------------------------------------------------- Consultar precio

/** "¿Cuánto cuesta…?": consulta sin tocar el ticket. Acepta escáner. */
export function PriceCheckModal({ onAdd, onClose }: { onAdd: (p: Product) => void; onClose: () => void }) {
  const products = useInventoryStore((s) => s.products)
  const promos = useActivePromotions()
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<Product | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])
  const results = useMemo(() => {
    const t = q.trim().toLowerCase()
    return t ? products.filter((p) => `${p.name} ${p.brand} ${p.barcode}`.toLowerCase().includes(t)).slice(0, 8) : []
  }, [q, products])
  const product = selected ? (byId.get(selected.id) ?? selected) : null
  const productPromos = product ? promos.filter((p) => promoProductIds(p, products).includes(product.id) || p.giftProductId === product.id) : []
  const st = product ? STOCK_STATUS[stockStatus(product)] : null

  const choose = (p: Product) => {
    setSelected(p)
    setQ('')
  }

  return (
    <Modal open onClose={onClose} icon={ScanSearch} title="Consultar precio" subtitle="Escanea o busca; no se agrega al ticket" width="max-w-2xl">
      <div className="space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const exact = products.find((p) => p.barcode === q.trim())
            if (exact ?? results[0]) choose(exact ?? results[0])
          }}
          className="relative"
        >
          <Barcode className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-brand-500" />
          <input ref={inputRef} autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Escanea el código o escribe el nombre…" className="input py-3.5 pl-12 text-base" />
          {results.length > 0 && (
            <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-2xl border border-line bg-white p-1.5 shadow-xl">
              {results.map((p) => (
                <button type="button" key={p.id} onClick={() => choose(p)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-brand-50">
                  <span className="text-2xl">{p.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{p.name}</span>
                    <span className="text-[11px] text-ink-soft">{p.brand} · {formatQty(p.stock, p.unit)} en stock</span>
                  </span>
                  <span className="text-sm font-semibold">{formatMoney(p.price)}{p.unit === 'kg' && <span className="text-[10px] font-normal">/kg</span>}</span>
                </button>
              ))}
            </div>
          )}
        </form>

        {!product ? (
          <EmptyState icon={PackageSearch} title="¿Qué producto preguntan?" message="El precio, la existencia y las ofertas aparecerán aquí en grande para mostrárselas al cliente." />
        ) : (
          <div className="animate-pop grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
            <div className="grid aspect-square place-items-center rounded-3xl bg-tile text-[96px]">{product.emoji}</div>
            <div className="space-y-3">
              <div>
                <p className="flex items-center gap-1.5 text-[11px] text-ink-soft">
                  <CategoryIcon name={CATEGORIES.find((c) => c.id === product.category)?.icon ?? 'LayoutGrid'} className="size-3.5" />
                  {CATEGORIES.find((c) => c.id === product.category)?.name} · {product.brand}
                </p>
                <h3 className="text-xl font-semibold leading-tight">{product.name}</h3>
                <p className="font-mono text-[11px] text-ink-mute">{product.barcode}</p>
              </div>
              <p className="text-5xl font-bold tracking-tight text-ink">
                {formatMoney(product.price)}
                {product.unit === 'kg' && <span className="text-lg font-medium text-ink-soft"> /kg</span>}
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-medium ${st!.pill}`}>
                  <span className={`size-2 rounded-full ${st!.dot}`} /> {st!.label} · {formatQty(product.stock, product.unit)}
                </span>
                <span className="flex items-center gap-1.5 rounded-full bg-tile px-3 py-1 text-ink-soft">
                  <CalendarClock className="size-3.5" /> Surtido {timeAgo(product.lastRestocked)}
                </span>
              </div>
              {productPromos.map((p) => (
                <div key={p.id} className={`flex items-center gap-3 rounded-2xl bg-gradient-to-r p-3 text-white ${promoColor(p)}`}>
                  <span className="rounded-lg bg-white/25 px-2 py-1 text-sm font-bold">{promoBadge(p)}</span>
                  <span className="text-xs">{promoDescription(p, byId)}</span>
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <button
                  className="btn-ghost flex-1"
                  onClick={() => {
                    setSelected(null)
                    inputRef.current?.focus()
                  }}
                >
                  <Search className="size-4" /> Consultar otro
                </button>
                <button
                  className="btn-primary flex-1"
                  disabled={product.stock <= 0}
                  onClick={() => {
                    onAdd(product)
                    onClose()
                  }}
                >
                  <Plus className="size-4" /> Agregar al ticket
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------- Clientes y crédito

type CustomerFilter = 'all' | 'credit' | 'debt'

/** Buscar clientes, ver su saldo, asignarlos a la venta, abonar y (encargados) ajustar su crédito. */
export function CustomersModal({ assignedId, onAssign, onClose }: { assignedId: string | null; onAssign: (id: string | null) => void; onClose: () => void }) {
  const customers = useCustomerStats()
  const addCustomer = useCustomerStore((s) => s.addCustomer)
  const updateCustomer = useCustomerStore((s) => s.updateCustomer)
  const user = useCurrentUser()
  const canManageCredit = /admin|gerente/i.test(user?.role ?? '')
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<CustomerFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(assignedId)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', creditEnabled: false, creditLimit: 500 })
  const [abono, setAbono] = useState(false)
  const [editCredit, setEditCredit] = useState(false)

  const list = customers
    .filter((c) => `${c.name} ${c.phone}`.toLowerCase().includes(q.toLowerCase()))
    .filter((c) => (filter === 'credit' ? c.creditEnabled : filter === 'debt' ? c.balance > 0 : true))
    .sort((a, b) => b.balance - a.balance || a.name.localeCompare(b.name))
  const selected = customers.find((c) => c.id === selectedId)

  const create = () => {
    if (!form.name.trim()) return
    const c = addCustomer({ name: form.name.trim(), phone: form.phone, creditEnabled: canManageCredit && form.creditEnabled, creditLimit: canManageCredit && form.creditEnabled ? form.creditLimit : 0 })
    setSelectedId(c.id)
    setAdding(false)
    setForm({ name: '', phone: '', creditEnabled: false, creditLimit: 500 })
    toast({ title: 'Cliente registrado', message: c.name })
  }

  return (
    <Modal open onClose={onClose} icon={UsersRound} title="Clientes y crédito" subtitle="Busca al cliente, revisa su cuenta y asígnalo a la venta" width="max-w-5xl">
      <div className="grid min-h-[480px] gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="flex min-h-0 flex-col gap-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-mute" />
              <input autoFocus className="input py-2.5 pl-9" placeholder="Nombre o teléfono…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <button className="btn-ghost px-3" onClick={() => setAdding((a) => !a)} title="Nuevo cliente">
              <UserPlus className="size-4" />
            </button>
          </div>
          {adding && (
            <div className="space-y-2 rounded-xl bg-tile p-3">
              <input className="input py-2" placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input className="input py-2" placeholder="Teléfono" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              {canManageCredit && (
                <div className="flex items-center gap-2 text-xs">
                  <Toggle checked={form.creditEnabled} onChange={(v) => setForm({ ...form, creditEnabled: v })} label="Autorizar crédito" />
                  <span className="flex-1">Autorizar crédito</span>
                  {form.creditEnabled && (
                    <input type="number" className="input w-28 py-1.5" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: Number(e.target.value) })} aria-label="Límite de crédito" />
                  )}
                </div>
              )}
              <button className="btn-primary w-full py-2" onClick={create}>Registrar</button>
            </div>
          )}
          <div className="flex gap-1.5">
            {(
              [
                ['all', 'Todos'],
                ['credit', 'Con crédito'],
                ['debt', 'Con saldo'],
              ] as const
            ).map(([v, l]) => (
              <button key={v} onClick={() => setFilter(v)} className={`rounded-lg px-2.5 py-1 text-[11px] ${filter === v ? 'bg-brand-500 text-white' : 'bg-tile hover:bg-brand-50'}`}>
                {l}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1 scrollbar-thin md:max-h-[420px]">
            {list.map((c) => (
              <button
                key={c.id}
                onClick={() => (setSelectedId(c.id), setEditCredit(false))}
                className={`flex w-full items-center gap-3 rounded-xl border px-2.5 py-2 text-left transition ${selectedId === c.id ? 'border-brand-500 bg-brand-50' : 'border-transparent hover:bg-tile'}`}
              >
                <Avatar src={c.avatar} name={c.name} size="size-9" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 truncate text-sm font-medium">
                    {c.name} {c.id === assignedId && <span className="rounded bg-brand-500 px-1.5 text-[9px] text-white">En venta</span>}
                  </span>
                  <span className="text-[11px] text-ink-soft">{c.phone || 'Sin teléfono'}</span>
                </span>
                <CreditStatus customer={c} />
              </button>
            ))}
            {!list.length && <p className="p-4 text-center text-xs text-ink-soft">Sin coincidencias.</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-line p-4">
          {!selected ? (
            <EmptyState icon={UsersRound} title="Selecciona un cliente" message="Verás su saldo, su crédito disponible y sus últimos movimientos." />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar src={selected.avatar} name={selected.name} size="size-12" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold">{selected.name}</p>
                  <p className="text-xs text-ink-soft">
                    {selected.phone} · {selected.segment} · Miembro {loyaltyFor(selected.total).label}
                  </p>
                </div>
                <CreditStatus customer={selected} />
              </div>

              {editCredit ? (
                <div className="space-y-3 rounded-xl bg-tile p-3">
                  <div className="flex items-center gap-2 text-xs">
                    <Toggle checked={selected.creditEnabled} onChange={(v) => updateCustomer(selected.id, { creditEnabled: v, creditLimit: v && !selected.creditLimit ? 500 : selected.creditLimit })} label="Crédito autorizado" />
                    Crédito autorizado
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-[11px] text-ink-soft">
                      Límite
                      <input type="number" className="input mt-1 py-2" value={selected.creditLimit} onChange={(e) => updateCustomer(selected.id, { creditLimit: Number(e.target.value) })} />
                    </label>
                    <label className="text-[11px] text-ink-soft">
                      Plazo (días)
                      <input type="number" className="input mt-1 py-2" value={selected.creditDays} onChange={(e) => updateCustomer(selected.id, { creditDays: Number(e.target.value) })} />
                    </label>
                  </div>
                  <button className="btn-primary w-full py-2" onClick={() => (setEditCredit(false), toast({ title: 'Crédito actualizado' }))}>Listo</button>
                </div>
              ) : (
                <CreditPanel customer={selected} onAbono={() => setAbono(true)} maxRows={8} />
              )}

              <div className="flex flex-wrap gap-2 border-t border-line pt-3">
                {canManageCredit && !editCredit && (
                  <button className="btn-ghost py-2 text-xs" onClick={() => setEditCredit(true)}>
                    <ShieldCheck className="size-4" /> {selected.creditEnabled ? 'Ajustar crédito' : 'Autorizar crédito'}
                  </button>
                )}
                {selected.id === assignedId ? (
                  <button className="btn-ghost ml-auto py-2 text-xs" onClick={() => (onAssign(null), onClose())}>
                    Quitar de la venta
                  </button>
                ) : (
                  <button className="btn-primary ml-auto py-2" onClick={() => (onAssign(selected.id), onClose())}>
                    Asignar a la venta
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      {abono && selected && <AbonoModal customer={selected} onClose={() => setAbono(false)} />}
    </Modal>
  )
}

// ---------------------------------------------------------------- Buscar ticket

type TicketScope = 'session' | 'today' | 'week'

export function TicketSearchModal({ onClose }: { onClose: () => void }) {
  const sales = useSalesStore((s) => s.sales)
  const customers = useCustomerStore((s) => s.customers)
  const branchId = useBranchStore((s) => s.activeBranchId)
  const session = useMySession()
  const openReceipt = useUiStore((s) => s.openReceipt)
  const [q, setQ] = useState('')
  const [scope, setScope] = useState<TicketScope>(session ? 'session' : 'today')

  const list = useMemo(() => {
    const { start, end } = periodRange(scope === 'week' ? 'week' : 'today')
    const term = q.trim().toLowerCase().replace('#', '')
    return sales
      .filter((s) => s.storeId === branchId && (scope === 'session' ? s.sessionId === session?.id : inRange(s.date, start, end)))
      .filter((s) => {
        if (!term) return true
        const name = customers.find((c) => c.id === s.customerId)?.name ?? 'público general'
        return String(s.number).includes(term) || name.toLowerCase().includes(term)
      })
      .slice(0, 80)
  }, [sales, customers, branchId, scope, session, q])

  return (
    <Modal open onClose={onClose} icon={Receipt} title="Buscar ticket" subtitle="Reimprime o devuelve una venta" width="max-w-2xl">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-48 flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-mute" />
            <input autoFocus className="input py-2.5 pl-9" placeholder="Número de ticket o cliente…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="flex rounded-xl bg-tile p-1 text-xs">
            {(
              [
                ['session', 'Mi turno'],
                ['today', 'Hoy'],
                ['week', 'Semana'],
              ] as const
            ).map(([v, l]) => (
              <button key={v} disabled={v === 'session' && !session} onClick={() => setScope(v)} className={`rounded-lg px-3 py-1.5 disabled:text-ink-mute ${scope === v ? 'bg-white font-semibold shadow-sm' : ''}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="max-h-[420px] space-y-1 overflow-y-auto pr-1 scrollbar-thin">
          {!list.length && <EmptyState icon={Receipt} title="Sin tickets" message="Prueba con otro número o periodo." />}
          {list.map((s) => (
            <button key={s.id} onClick={() => openReceipt(s.id)} className="flex w-full items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-left hover:border-brand-300 hover:bg-brand-50">
              <span className="w-16 font-mono text-sm font-semibold">#{s.number}</span>
              <span className="w-14 text-xs text-ink-soft">{formatTime(s.date)}</span>
              <span className="min-w-0 flex-1 truncate text-sm">{customers.find((c) => c.id === s.customerId)?.name ?? 'Público general'}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${s.payment === 'credit' ? 'bg-amber-50 text-amber-700' : 'bg-tile text-ink-soft'}`}>{PAYMENT_METHODS[s.payment]}</span>
              {s.refunded && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600">Devuelto</span>}
              <span className={`w-20 text-right text-sm font-semibold ${s.refunded ? 'text-ink-mute line-through' : ''}`}>{formatMoney(s.total)}</span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  )
}


// ---------------------------------------------------------------- Pedidos por cobrar / entregar

/** Pedidos de esta sucursal que el cliente viene a pagar o recoger (web, WhatsApp o Escanea y paga). */
export function PosOrdersModal({ onLoad, onClose }: { onLoad: (code: string) => void; onClose: () => void }) {
  const orders = useOrderStore((s) => s.orders)
  const branchId = useBranchStore((s) => s.activeBranchId)
  const [q, setQ] = useState('')
  const [camera, setCamera] = useState(false)
  const list = orders
    .filter((o) => o.branchId === branchId && o.fulfillment !== 'delivery' && ['ready', 'awaiting_payment', 'preparing', 'confirmed', 'received'].includes(o.status))
    .filter((o) => !q.trim() || `${o.code} ${o.customerName}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => Number(['ready', 'awaiting_payment'].includes(b.status)) - Number(['ready', 'awaiting_payment'].includes(a.status)) || a.createdAt.localeCompare(b.createdAt))

  return (
    <Modal open onClose={onClose} icon={ShoppingBag} title="Pedidos para cobrar o entregar" subtitle="Escanea el QR del cliente o búscalo por código" width="max-w-2xl">
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-mute" />
            <input autoFocus className="input py-2.5 pl-9" placeholder="Código (P-2004) o cliente…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <button onClick={() => setCamera((c) => !c)} className={camera ? 'btn-primary px-3' : 'btn-ghost px-3'} title="Escanear con la cámara">
            <ScanLine className="size-4" /> <span className="hidden sm:inline">Cámara</span>
          </button>
        </div>
        {camera && <CameraScanner onResult={(text) => onLoad(text)} />}
        {!list.length && <EmptyState icon={ShoppingBag} title="Sin pedidos pendientes en esta sucursal" />}
        <div className="max-h-[440px] space-y-2 overflow-y-auto pr-1 scrollbar-thin">
          {list.map((o) => {
            return (
              <div key={o.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line p-3">
                <span className="whitespace-nowrap font-mono text-sm font-bold">{o.code}</span>
                <ChannelBadge channel={o.channel} />
                <span className="min-w-0 flex-1 truncate text-sm">{o.customerName}</span>
                <StatusPill status={o.status} />
                <span className="text-sm font-semibold">{formatMoney(o.total)}</span>
                <button
                  onClick={() => onLoad(o.code)}
                  className={`btn px-3 py-1.5 text-xs ${o.paid ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-brand-500 text-white hover:bg-brand-600'}`}
                >
                  {o.paid ? 'Entregar' : 'Cobrar'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}
