import { useEffect, useMemo, useState } from 'react'
import { Maximize, Tag } from 'lucide-react'
import { Logo } from '../components/ui/Misc'
import { useActivePromotions } from '../store/usePromotionStore'
import { useInventoryStore } from '../store/useInventoryStore'
import { useActiveBranch } from '../store/useBranchStore'
import { promoBadge, promoColor, promoDescription, promoProductIds } from '../utils/promotions'
import { formatDate, formatMoney } from '../utils/format'

/** Pantalla para la TV de la tienda: rota las ofertas vigentes de la sucursal. */
export default function PromoDisplay() {
  const promos = useActivePromotions()
  const products = useInventoryStore((s) => s.products)
  const branch = useActiveBranch()
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (promos.length < 2) return
    const t = setInterval(() => setIndex((i) => (i + 1) % promos.length), 7000)
    return () => clearInterval(t)
  }, [promos.length])

  const current = promos[index % Math.max(1, promos.length)]
  const featured = current ? [...promoProductIds(current, products), ...(current.giftProductId ? [current.giftProductId] : [])].map((id) => byId.get(id)).filter(Boolean).slice(0, 4) : []

  return (
    <div className="flex min-h-full flex-col gap-6 bg-gradient-to-br from-ink via-[#123f63] to-brand-700 p-6 text-white lg:h-full lg:p-10">
      <header className="flex items-center justify-between">
        <div className="rounded-2xl bg-white px-4 py-2">
          <Logo textClass="text-xl" />
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold">Ofertas de hoy</p>
          <p className="text-sm text-white/70">{branch?.name}</p>
        </div>
        <button onClick={() => document.documentElement.requestFullscreen?.()} className="rounded-xl bg-white/10 p-3 hover:bg-white/20" aria-label="Pantalla completa">
          <Maximize className="size-5" />
        </button>
      </header>

      {!current ? (
        <div className="grid flex-1 place-items-center text-center">
          <div>
            <Tag className="mx-auto mb-4 size-16 text-white/40" />
            <p className="text-3xl font-semibold">Pronto tendremos nuevas ofertas</p>
          </div>
        </div>
      ) : (
        <>
          <section key={current.id} className={`animate-pop grid flex-1 items-center gap-8 rounded-[2rem] bg-gradient-to-br p-8 shadow-2xl lg:grid-cols-[1.1fr_1fr] lg:p-12 ${promoColor(current)}`}>
            <div className="space-y-5">
              <span className="inline-block rounded-3xl bg-white/25 px-6 py-3 text-5xl font-black tracking-tight lg:text-7xl">{promoBadge(current)}</span>
              <h1 className="text-4xl font-bold leading-tight lg:text-6xl">{current.name}</h1>
              <p className="text-xl text-white/90 lg:text-2xl">{promoDescription(current, byId)}</p>
              <p className="text-sm text-white/75">Válido hasta el {formatDate(current.endDate + 'T12:00:00')} o hasta agotar existencias.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {featured.map((p) => (
                <div key={p!.id} className="rounded-3xl bg-white p-5 text-center text-ink shadow-xl">
                  <span className="block text-7xl lg:text-8xl">{p!.emoji}</span>
                  <p className="mt-2 line-clamp-2 text-sm font-medium">{p!.name}</p>
                  <p className="text-lg font-bold">{formatMoney(p!.price)}</p>
                </div>
              ))}
            </div>
          </section>
          <div className="flex justify-center gap-2">
            {promos.map((p, i) => (
              <button key={p.id} onClick={() => setIndex(i)} className={`h-2 rounded-full transition-all ${i === index % promos.length ? 'w-10 bg-white' : 'w-2 bg-white/40'}`} aria-label={p.name} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
