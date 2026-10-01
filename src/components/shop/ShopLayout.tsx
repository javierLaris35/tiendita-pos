import { useState, type ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Bike, Check, CreditCard, Minus, Plus, ShoppingBag, Store, UserRound, Wallet, X } from 'lucide-react'
import { Logo } from '../ui/Misc'
import Modal from '../ui/Modal'
import ShopAuth from './ShopAuth'
import PromoLine from '../ui/PromoLine'
import LinePrice from '../ui/LinePrice'
import { useShopper, useShopTicket, useWebCart } from '../../store/useShopperStore'
import { useBranchStore } from '../../store/useBranchStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import { useCustomerStore } from '../../store/useCustomerStore'
import { toast } from '../../store/useUiStore'
import { payOrderOnline, placeOrder } from '../../store/orderActions'
import { formatMoney, formatQty } from '../../utils/format'
import type { Fulfillment } from '../../types'

function CartDrawer({ onClose, onCheckout }: { onClose: () => void; onCheckout: () => void }) {
  const cart = useWebCart()
  const { lines, ticket } = useShopTicket(cart.items, cart.branchId)
  return (
    <div className="animate-fade fixed inset-0 z-50 flex justify-end bg-ink/30" onClick={onClose}>
      <aside className="animate-pop flex h-full w-full max-w-md flex-col bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-line px-5 py-4">
          <ShoppingBag className="size-5 text-brand-500" />
          <p className="flex-1 font-semibold">Tu carrito</p>
          <button onClick={onClose} className="grid size-8 place-items-center rounded-lg hover:bg-brand-50" aria-label="Cerrar carrito">
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto p-4 scrollbar-thin">
          {!lines.length && <p className="py-16 text-center text-sm text-ink-soft">Tu carrito está vacío. ¡Agrega tus productos!</p>}
          {lines.map((l) => (
            <div key={l.id} className="flex items-center gap-3 rounded-2xl border border-line p-2.5">
              <span className="grid size-12 place-items-center rounded-xl bg-tile text-2xl">{l.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{l.name}</p>
                <LinePrice unitLabel={`${formatMoney(l.price)}${l.unit === 'kg' ? '/kg' : ''}`} gross={l.price * l.qty} saving={ticket.lineDiscounts[l.id]} />
              </div>
              <div className="flex items-center rounded-full border border-line">
                <button onClick={() => cart.setQty(l.id, l.qty - (l.unit === 'kg' ? 0.25 : 1))} className="grid size-8 place-items-center" aria-label="Quitar">
                  <Minus className="size-3.5" />
                </button>
                <span className="min-w-8 text-center text-xs font-semibold">{l.unit === 'kg' ? formatQty(l.qty, 'kg') : l.qty}</span>
                <button
                  onClick={() => {
                    const r = cart.add(l.id, l.unit === 'kg' ? 0.25 : 1)
                    if (!r.ok) toast({ type: 'error', title: 'Ya no hay más', message: `Disponibles: ${r.available}` })
                  }}
                  className="grid size-8 place-items-center"
                  aria-label="Agregar"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-1.5 border-t border-line p-5">
          {ticket.promotions.map((p) => (
            <PromoLine key={p.promoId} promo={p} />
          ))}
          <div className="flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span>{formatMoney(ticket.total)}</span>
          </div>
          <button disabled={!lines.length} onClick={onCheckout} className="btn-primary w-full py-3.5 text-base">
            Continuar con mi pedido
          </button>
        </div>
      </aside>
    </div>
  )
}

function CheckoutModal({ onClose }: { onClose: () => void }) {
  const shopper = useShopper()
  const cart = useWebCart()
  const branches = useBranchStore((s) => s.branches)
  const { deliveryFee, freeDeliveryFrom } = useSettingsStore()
  const updateCustomer = useCustomerStore((s) => s.updateCustomer)
  const navigate = useNavigate()
  const [fulfillment, setFulfillment] = useState<Fulfillment>('delivery')
  const [branchId, setBranchId] = useState(branches[0]?.id ?? 's1')
  const [address, setAddress] = useState(shopper?.address ?? '')
  const [payment, setPayment] = useState<'online' | 'on_delivery'>('on_delivery')
  const [notes, setNotes] = useState('')
  const [paying, setPaying] = useState<{ id: string; code: string; total: number } | null>(null)
  const { lines, ticket } = useShopTicket(cart.items, branchId)
  const fee = fulfillment === 'delivery' && ticket.total < freeDeliveryFrom ? deliveryFee : 0

  if (!shopper) {
    return (
      <Modal open onClose={onClose} icon={UserRound} title="Tu cuenta" width="max-w-md">
        <ShopAuth title="Inicia sesión para terminar tu pedido" />
      </Modal>
    )
  }

  const submit = () => {
    if (fulfillment === 'delivery' && address.trim().length < 8) return toast({ type: 'error', title: 'Escribe tu dirección completa' })
    const res = placeOrder({
      channel: 'web',
      fulfillment,
      customerId: shopper.id,
      branchId,
      address: fulfillment === 'delivery' ? address.trim() : undefined,
      items: cart.items,
      paymentMode: payment,
      paid: false,
      notes: notes.trim() || undefined,
    })
    if (!res.ok) {
      toast({ type: 'error', title: res.error, message: res.shortages.map((s) => `${s.name}: quedan ${s.available}`).join(' · ') })
      res.shortages.forEach((s) => {
        const item = cart.items.find((i) => lines.find((l) => l.name === s.name)?.id === i.productId)
        if (item) cart.setQty(item.productId, s.available)
      })
      return
    }
    if (fulfillment === 'delivery') updateCustomer(shopper.id, { address: address.trim() })
    cart.clear()
    if (payment === 'online') setPaying({ id: res.order.id, code: res.order.code, total: res.order.total })
    else {
      onClose()
      navigate(`/tienda/pedido/${res.order.code}`)
    }
  }

  if (paying) {
    return (
      <Modal open onClose={() => navigate(`/tienda/pedido/${paying.code}`)} icon={CreditCard} title="Pago en línea" subtitle={`Pedido ${paying.code}`} width="max-w-sm">
        <div className="space-y-4 text-center">
          <p className="text-3xl font-semibold">{formatMoney(paying.total)}</p>
          <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">Demo: aquí se abriría la pasarela de pago (Mercado Pago, Stripe, Conekta…). No captures datos reales de tarjeta.</p>
          <button
            className="btn-primary w-full py-3"
            onClick={() => {
              payOrderOnline(paying.id)
              toast({ title: 'Pago aprobado', message: `Pedido ${paying.code} pagado.` })
              navigate(`/tienda/pedido/${paying.code}`)
            }}
          >
            <Check className="size-4" /> Simular pago aprobado
          </button>
          <button className="text-xs text-ink-soft underline" onClick={() => navigate(`/tienda/pedido/${paying.code}`)}>
            Pagar después
          </button>
        </div>
      </Modal>
    )
  }

  const Option = ({ active, onClick, icon: Icon, title, desc }: { active: boolean; onClick: () => void; icon: typeof Bike; title: string; desc: string }) => (
    <button type="button" onClick={onClick} className={`flex items-start gap-3 rounded-2xl border p-3 text-left transition ${active ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-200' : 'border-line hover:bg-tile'}`}>
      <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${active ? 'bg-brand-500 text-white' : 'bg-tile text-ink-soft'}`}>
        <Icon className="size-4" />
      </span>
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="text-[11px] text-ink-soft">{desc}</span>
      </span>
    </button>
  )

  return (
    <Modal
      open
      onClose={onClose}
      icon={ShoppingBag}
      title="Terminar pedido"
      subtitle={`${shopper.name} · ${shopper.phone}`}
      width="max-w-3xl"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Seguir comprando</button>
          <button className="btn-primary min-w-48" onClick={submit}>
            {payment === 'online' ? 'Ir a pagar' : 'Hacer pedido'} · {formatMoney(ticket.total + fee)}
          </button>
        </>
      }
    >
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-medium text-ink-soft">1. ¿Cómo lo quieres?</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {Option({ active: fulfillment === 'delivery', onClick: () => setFulfillment('delivery'), icon: Bike, title: 'Envío a domicilio', desc: `${formatMoney(deliveryFee)} · gratis desde ${formatMoney(freeDeliveryFrom)}` })}
              {Option({ active: fulfillment === 'pickup', onClick: () => setFulfillment('pickup'), icon: Store, title: 'Paso a la tienda', desc: 'Sin costo, elige la sucursal' })}
            </div>
          </div>
          {fulfillment === 'delivery' ? (
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-ink-soft">Dirección de entrega</span>
              <textarea className="input min-h-20" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Calle, número, colonia y referencias" />
            </label>
          ) : (
            <div className="grid gap-2 sm:grid-cols-3">
              {branches.map((b) => (
                <button key={b.id} type="button" onClick={() => setBranchId(b.id)} className={`rounded-2xl border p-3 text-left text-xs ${branchId === b.id ? 'border-brand-500 bg-brand-50' : 'border-line hover:bg-tile'}`}>
                  <span className="block text-sm font-semibold">{b.name}</span>
                  <span className="text-[10px] text-ink-soft">{b.address}</span>
                </button>
              ))}
            </div>
          )}
          <div>
            <p className="mb-2 text-xs font-medium text-ink-soft">2. ¿Cómo pagas?</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {Option({ active: payment === 'on_delivery', onClick: () => setPayment('on_delivery'), icon: Wallet, title: fulfillment === 'delivery' ? 'Al recibir' : 'En caja al recoger', desc: 'Efectivo o tarjeta' })}
              {Option({ active: payment === 'online', onClick: () => setPayment('online'), icon: CreditCard, title: 'Pago en línea', desc: 'Tarjeta, de forma segura' })}
            </div>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-soft">Notas para quien arma tu pedido (opcional)</span>
            <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej. plátanos no tan maduros" />
          </label>
        </div>
        <aside className="space-y-2 rounded-2xl bg-tile p-4 text-xs">
          <p className="font-medium">Resumen</p>
          {lines.map((l) => (
            <div key={l.id} className="flex justify-between gap-2">
              <span className="truncate">{l.emoji} {l.unit === 'kg' ? formatQty(l.qty, 'kg') : `${l.qty} ×`} {l.name}</span>
              <span>{formatMoney(l.price * l.qty)}</span>
            </div>
          ))}
          {ticket.promotions.map((p) => (
            <PromoLine key={p.promoId} promo={p} icon={false} />
          ))}
          <div className="flex justify-between border-t border-dashed border-line pt-2">
            <span>Envío</span>
            <span>{fee ? formatMoney(fee) : 'Gratis'}</span>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <span>Total</span>
            <span>{formatMoney(ticket.total + fee)}</span>
          </div>
        </aside>
      </div>
    </Modal>
  )
}

/** Marco de la tienda pública: encabezado, carrito y checkout disponibles en todas sus páginas. */
export default function ShopLayout({ children }: { children: ReactNode }) {
  const shopper = useShopper()
  const count = useWebCart((s) => s.items.length)
  const whatsapp = useSettingsStore((s) => s.whatsappNumber)
  const [cartOpen, setCartOpen] = useState(false)
  const [checkout, setCheckout] = useState(false)
  const link = ({ isActive }: { isActive: boolean }) => `rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-brand-50 font-medium text-brand-700' : 'text-ink hover:bg-tile'}`

  return (
    <div className="min-h-full bg-canvas">
      <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link to="/tienda">
            <Logo textClass="text-base" />
          </Link>
          <nav className="ml-4 hidden gap-1 md:flex">
            <NavLink to="/tienda" end className={link}>Catálogo</NavLink>
            <NavLink to="/tienda/cuenta" className={link}>Mis pedidos</NavLink>
            <NavLink to="/scan" className={link}>Escanea y paga</NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/tienda/cuenta" className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm hover:bg-tile">
              <UserRound className="size-4" />
              <span className="hidden sm:inline">{shopper ? shopper.name.split(' ')[0] : 'Entrar'}</span>
            </Link>
            <button onClick={() => setCartOpen(true)} className="relative flex items-center gap-2 rounded-xl bg-brand-500 px-3 py-2 text-sm text-white shadow-md shadow-brand-500/30 hover:bg-brand-600">
              <ShoppingBag className="size-4" />
              <span className="hidden sm:inline">Carrito</span>
              {count > 0 && <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-orange-500 text-[10px] font-bold">{count}</span>}
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-5">{children}</main>
      <footer className="mx-auto max-w-6xl px-4 pb-8 text-center text-xs text-ink-soft">
        ¿Prefieres WhatsApp? Mándanos tu lista al{' '}
        <Link to="/whatsapp" className="font-medium text-emerald-700 underline">
          {whatsapp.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3')}
        </Link>
      </footer>
      {cartOpen && (
        <CartDrawer
          onClose={() => setCartOpen(false)}
          onCheckout={() => {
            setCartOpen(false)
            setCheckout(true)
          }}
        />
      )}
      {checkout && <CheckoutModal onClose={() => setCheckout(false)} />}
    </div>
  )
}
