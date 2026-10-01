import { useMemo, useState } from 'react'
import { PackageSearch, Star, Tag } from 'lucide-react'
import { CategoryIcon, EmptyState } from '../ui/Misc'
import StockTag from '../ui/StockTag'
import { CATEGORIES } from '../../data/seed'
import { useInventoryStore } from '../../store/useInventoryStore'
import { useCartStore } from '../../store/useCartStore'
import { useActivePromotions } from '../../store/usePromotionStore'
import { useBranchSales } from '../../hooks'
import { promoBadge, promoColor, promoDescription, promoProductIds } from '../../utils/promotions'
import { formatMoney } from '../../utils/format'
import { availableOf, reservedByProduct } from '../../utils/orders'
import { useOrderStore } from '../../store/useOrderStore'
import type { CategoryId, Product, Promotion } from '../../types'

type Tab = 'top' | 'offers' | CategoryId

function Tile({ product, available, qty, promo, onPick }: { product: Product; available: number; qty: number; promo?: Promotion; onPick: () => void }) {
  const out = available <= 0
  return (
    <button
      onClick={onPick}
      disabled={out}
      className={`group relative flex flex-col rounded-2xl border bg-white p-2.5 text-left transition active:scale-[0.97] disabled:cursor-not-allowed ${
        qty ? 'border-brand-500 ring-2 ring-brand-200' : out ? 'border-line' : 'border-line hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg hover:shadow-brand-900/5'
      }`}
    >
      <div className={`relative mb-2 grid aspect-[4/3] w-full place-items-center rounded-xl ${out ? 'bg-slate-100' : 'bg-tile'}`}>
        <span className={`text-[44px] leading-none transition ${out ? 'grayscale' : 'group-hover:scale-110'}`}>{product.emoji}</span>
        {promo && !out && (
          <span className={`absolute left-1.5 right-1.5 top-1.5 w-fit max-w-[calc(100%-0.75rem)] truncate rounded-full bg-gradient-to-r px-2 py-0.5 text-[10px] font-bold text-white shadow ${promoColor(promo)}`}>
            {promoBadge(promo)}
          </span>
        )}
        <span className="absolute bottom-1.5 left-1.5">
          <StockTag available={available} unit={product.unit} minStock={product.minStock} />
        </span>
      </div>
      <p className={`line-clamp-2 min-h-8 text-xs font-medium leading-tight ${out ? 'text-ink-soft' : 'text-ink'}`}>{product.name}</p>
      <div className="mt-1 flex items-center justify-between gap-1">
        <p className={`whitespace-nowrap text-sm font-semibold ${out ? 'text-ink-soft line-through decoration-1' : 'text-ink'}`}>
          {formatMoney(product.price)}
          {product.unit === 'kg' && <span className="text-[10px] font-normal text-ink-soft"> /kg</span>}
        </p>
        {/* Cuántas lleva ya en el ticket */}
        {qty > 0 && (
          <span className="shrink-0 whitespace-nowrap rounded-full bg-brand-500 px-2 py-0.5 text-[11px] font-bold text-white">
            ×{product.unit === 'kg' ? Number(qty.toFixed(3)) : qty}
          </span>
        )}
      </div>
    </button>
  )
}

export default function PosCatalog({ query, onPick }: { query: string; onPick: (p: Product) => void }) {
  const products = useInventoryStore((s) => s.products)
  const items = useCartStore((s) => s.items)
  const orders = useOrderStore((s) => s.orders)
  const cartOrderId = useCartStore((s) => s.orderId)
  // Existencia vendible: sin lo apartado por pedidos (salvo el pedido que se está cobrando)
  const reserved = useMemo(() => reservedByProduct(orders, cartOrderId), [orders, cartOrderId])
  const promos = useActivePromotions()
  const sales = useBranchSales()
  const [tab, setTab] = useState<Tab>('top')
  const [promoFilter, setPromoFilter] = useState<string | null>(null)
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])

  const promoOf = useMemo(() => {
    const m = new Map<string, Promotion>()
    for (const p of promos) for (const id of promoProductIds(p, products)) if (!m.has(id)) m.set(id, p)
    return m
  }, [promos, products])

  // Los más vendidos de los últimos 30 días en esta sucursal
  const frequent = useMemo(() => {
    const since = Date.now() - 30 * 86400000
    const units = new Map<string, number>()
    for (const s of sales) {
      if (new Date(s.date).getTime() < since) continue
      for (const i of s.items) units.set(i.productId, (units.get(i.productId) ?? 0) + i.qty)
    }
    return [...units.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => byId.get(id))
      .filter((p): p is Product => Boolean(p))
      .slice(0, 24)
  }, [sales, byId])

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q) return products.filter((p) => `${p.name} ${p.brand} ${p.barcode}`.toLowerCase().includes(q.replace(/^\d+(\.\d+)?\*/, ''))).slice(0, 60)
    if (tab === 'top') return frequent
    if (tab === 'offers') {
      const ids = new Set(promos.filter((p) => !promoFilter || p.id === promoFilter).flatMap((p) => [...promoProductIds(p, products), ...(p.giftProductId ? [p.giftProductId] : [])]))
      return products.filter((p) => ids.has(p.id))
    }
    return products.filter((p) => p.category === tab)
  }, [query, tab, products, frequent, promos, promoFilter])

  const qtyOf = (id: string) => items.find((i) => i.productId === id)?.qty ?? 0
  const chip = (active: boolean) =>
    `flex shrink-0 items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-medium transition ${active ? 'border-brand-500 bg-brand-500 text-white shadow-md shadow-brand-500/25' : 'border-line bg-white text-ink hover:bg-brand-50'}`

  return (
    <section className="card flex min-h-[480px] flex-col gap-3 p-3 lg:min-h-0">
      {promos.length > 0 && !query && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-thin">
          {promos.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setTab('offers')
                setPromoFilter(promoFilter === p.id ? null : p.id)
              }}
              className={`flex w-64 shrink-0 items-center gap-3 rounded-2xl bg-gradient-to-r p-3 text-left text-white shadow-md transition hover:brightness-105 ${promoColor(p)} ${promoFilter === p.id ? 'ring-4 ring-brand-200' : ''}`}
            >
              <span className="rounded-xl bg-white/25 px-2 py-1 text-sm font-bold">{promoBadge(p)}</span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold">{p.name}</span>
                <span className="line-clamp-2 text-[10px] leading-tight text-white/90">{promoDescription(p, byId)}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {!query && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar">
          <button className={chip(tab === 'top')} onClick={() => setTab('top')}>
            <Star className="size-3.5" /> Frecuentes
          </button>
          <button className={chip(tab === 'offers')} onClick={() => (setTab('offers'), setPromoFilter(null))}>
            <Tag className="size-3.5" /> Ofertas
          </button>
          {CATEGORIES.map((c) => (
            <button key={c.id} className={chip(tab === c.id)} onClick={() => setTab(c.id)}>
              <CategoryIcon name={c.icon} className="size-3.5" /> {c.name}
            </button>
          ))}
        </div>
      )}
      {query && <p className="px-1 text-xs text-ink-soft">{list.length} resultados para “{query}” · Enter agrega si hay una sola coincidencia</p>}

      <div className="min-h-0 flex-1 overflow-y-auto pr-1 scrollbar-thin">
        {!list.length ? (
          <EmptyState icon={PackageSearch} title="Sin productos" message={query ? 'Revisa el nombre o el código de barras.' : 'No hay productos en esta sección.'} />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(128px,1fr))] gap-2.5">
            {list.map((p) => (
              <Tile key={p.id} product={p} available={availableOf(p, reserved)} qty={qtyOf(p.id)} promo={promoOf.get(p.id)} onPick={() => onPick(p)} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
