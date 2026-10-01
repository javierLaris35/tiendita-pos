import { useMemo, useState } from 'react'
import { Minus, Plus, Search, Tag } from 'lucide-react'
import ShopLayout from '../../components/shop/ShopLayout'
import StockTag from '../../components/ui/StockTag'
import { CategoryIcon } from '../../components/ui/Misc'
import { CATEGORIES } from '../../data/seed'
import { useInventoryStore } from '../../store/useInventoryStore'
import { useOrderStore } from '../../store/useOrderStore'
import { usePromotionStore } from '../../store/usePromotionStore'
import { useWebCart } from '../../store/useShopperStore'
import { toast } from '../../store/useUiStore'
import { availableOf, reservedByProduct } from '../../utils/orders'
import { isPromoActive, promoBadge, promoColor, promoDescription, promoProductIds } from '../../utils/promotions'
import { formatMoney, formatQty } from '../../utils/format'
import type { CategoryId, Product, Promotion } from '../../types'

function ProductCard({ product, available, promo, qty }: { product: Product; available: number; promo?: Promotion; qty: number }) {
  const cart = useWebCart()
  const step = product.unit === 'kg' ? 0.5 : 1
  const out = available <= 0
  const add = () => {
    const r = cart.add(product.id, step)
    if (!r.ok) toast({ type: 'error', title: 'Ya no hay más', message: `Disponibles: ${formatQty(r.available, product.unit)}` })
  }
  return (
    <div className={`card relative flex flex-col p-3 transition ${out ? '' : 'hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-900/5'}`}>
      <div className={`relative mb-2 grid aspect-square place-items-center rounded-2xl text-6xl ${out ? 'bg-slate-100' : 'bg-tile'}`}>
        <span className={out ? 'grayscale' : ''}>{product.emoji}</span>
        {promo && !out && <span className={`absolute left-2 top-2 rounded-full bg-gradient-to-r px-2 py-0.5 text-[10px] font-bold text-white shadow ${promoColor(promo)}`}>{promoBadge(promo)}</span>}
        <span className="absolute bottom-2 left-2 text-base">
          <StockTag available={available} unit={product.unit} minStock={Math.min(product.minStock, 5)} />
        </span>
      </div>
      <p className={`line-clamp-2 min-h-10 text-sm font-medium leading-tight ${out ? 'text-ink-soft' : ''}`}>{product.name}</p>
      <p className="text-[11px] text-ink-soft">{product.brand}</p>
      <p className={`mt-2 whitespace-nowrap text-lg font-bold ${out ? 'text-ink-soft' : ''}`}>
        {formatMoney(product.price)}
        {product.unit === 'kg' && <span className="text-xs font-normal text-ink-soft"> /kg</span>}
      </p>
      {out ? (
        <p className="mt-2 rounded-xl bg-slate-100 py-2 text-center text-xs font-medium text-ink-soft">Sin existencia por ahora</p>
      ) : qty ? (
        <div className="mt-2 flex items-center justify-between rounded-xl bg-brand-500 text-white">
          <button onClick={() => cart.setQty(product.id, qty - step)} className="grid size-9 place-items-center" aria-label="Quitar">
            <Minus className="size-4" />
          </button>
          <span className="text-sm font-semibold">{product.unit === 'kg' ? formatQty(qty, 'kg') : qty}</span>
          <button onClick={add} className="grid size-9 place-items-center" aria-label="Agregar">
            <Plus className="size-4" />
          </button>
        </div>
      ) : (
        <button onClick={add} className="btn-primary mt-2 py-2">
          <Plus className="size-4" /> Agregar
        </button>
      )}
    </div>
  )
}

export default function Shop() {
  const products = useInventoryStore((s) => s.products)
  const orders = useOrderStore((s) => s.orders)
  const promotions = usePromotionStore((s) => s.promotions)
  const items = useWebCart((s) => s.items)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<CategoryId | 'all' | 'offers'>('all')
  const reserved = useMemo(() => reservedByProduct(orders), [orders])
  // En línea mostramos las ofertas que aplican en todas las sucursales o en la matriz
  const promos = useMemo(() => promotions.filter((p) => isPromoActive(p, 's1')), [promotions])
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])
  const promoOf = useMemo(() => {
    const m = new Map<string, Promotion>()
    promos.forEach((p) => promoProductIds(p, products).forEach((id) => !m.has(id) && m.set(id, p)))
    return m
  }, [promos, products])

  const list = products.filter((p) => {
    if (q.trim()) return `${p.name} ${p.brand}`.toLowerCase().includes(q.toLowerCase())
    if (cat === 'offers') return promoOf.has(p.id)
    return cat === 'all' || p.category === cat
  })

  return (
    <ShopLayout>
      <section className="mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 to-brand-700 p-6 text-white sm:p-8">
        <p className="text-sm text-white/80">Súper a tu puerta o listo para recoger</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Haz tu pedido en minutos</h1>
        <div className="relative mt-4 max-w-lg">
          <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-mute" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="¿Qué necesitas hoy?" className="w-full rounded-2xl bg-white py-3.5 pl-12 pr-4 text-ink outline-none" />
        </div>
      </section>

      {promos.length > 0 && !q && (
        <div className="-mx-1 mb-4 flex gap-3 overflow-x-auto px-1 pb-1 scrollbar-thin">
          {promos.map((p) => (
            <button key={p.id} onClick={() => setCat('offers')} className={`flex w-72 shrink-0 items-center gap-3 rounded-2xl bg-gradient-to-r p-4 text-left text-white shadow-md ${promoColor(p)}`}>
              <span className="rounded-xl bg-white/25 px-2.5 py-1 text-base font-black">{promoBadge(p)}</span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{p.name}</span>
                <span className="line-clamp-2 text-[11px] text-white/90">{promoDescription(p, byId)}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {!q && (
        <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar">
          {[
            { id: 'all' as const, name: 'Todo', icon: null },
            { id: 'offers' as const, name: 'Ofertas', icon: null },
            ...CATEGORIES.map((c) => ({ id: c.id, name: c.name, icon: c.icon })),
          ].map((c) => (
            <button key={c.id} onClick={() => setCat(c.id)} className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-4 py-2 text-sm transition ${cat === c.id ? 'border-brand-500 bg-brand-500 text-white' : 'border-line bg-white hover:bg-brand-50'}`}>
              {c.icon ? <CategoryIcon name={c.icon} className="size-4" /> : c.id === 'offers' ? <Tag className="size-4" /> : null}
              {c.name}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {list.map((p) => (
          <ProductCard key={p.id} product={p} available={availableOf(p, reserved)} promo={promoOf.get(p.id)} qty={items.find((i) => i.productId === p.id)?.qty ?? 0} />
        ))}
      </div>
      {!list.length && <p className="py-16 text-center text-sm text-ink-soft">No encontramos productos con esa búsqueda.</p>}
    </ShopLayout>
  )
}
