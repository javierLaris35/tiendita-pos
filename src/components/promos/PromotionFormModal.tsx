import { useMemo, useState } from 'react'
import { Check, Layers, Package, Percent, Search, Tag, X } from 'lucide-react'
import Modal, { Field } from '../ui/Modal'
import { SearchSelect } from '../ui/Select'
import { categoryOptions } from '../ui/selectOptions'
import { CATEGORIES } from '../../data/seed'
import { useInventoryStore } from '../../store/useInventoryStore'
import { useBranchStore } from '../../store/useBranchStore'
import { usePromotionStore, type PromotionInput } from '../../store/usePromotionStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import { toast } from '../../store/useUiStore'
import { computeTicket, promoBadge, promoColor, promoDescription } from '../../utils/promotions'
import { formatMoney, localIsoDate } from '../../utils/format'
import type { Product, Promotion, PromotionType } from '../../types'

const TYPES: { id: PromotionType; title: string; example: string; icon: typeof Tag }[] = [
  { id: 'nxm', title: 'Lleva N, paga M', example: '2x1, 3x2…', icon: Tag },
  { id: 'gift', title: 'Combo', example: 'Compra uno y llévate otro con descuento', icon: Layers },
  { id: 'percent', title: 'Descuento %', example: '15% en frutas', icon: Percent },
  { id: 'bundle', title: 'Paquete', example: '3 por $50', icon: Package },
]


const blankPromotion = (): PromotionInput => ({
  name: '',
  type: 'nxm',
  productIds: [],
  categoryId: null,
  buyQty: 3,
  payQty: 2,
  giftProductId: null,
  giftQty: 1,
  giftDiscountPct: 100,
  percent: 10,
  bundleQty: 3,
  bundlePrice: 50,
  active: true,
  startDate: localIsoDate(),
  endDate: localIsoDate(30),
  branchIds: [],
})

function ProductPicker({ selected, onChange, single = false, placeholder }: { selected: string[]; onChange: (ids: string[]) => void; single?: boolean; placeholder: string }) {
  const products = useInventoryStore((s) => s.products)
  const [q, setQ] = useState('')
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])
  const results = q.trim() ? products.filter((p) => `${p.name} ${p.brand}`.toLowerCase().includes(q.toLowerCase())).slice(0, 8) : []
  const toggle = (id: string) => {
    if (single) onChange([id])
    else onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
    setQ('')
  }
  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((id) => (
            <span key={id} className="flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 py-1 pl-2 pr-1 text-xs">
              {byId.get(id)?.emoji} {byId.get(id)?.name}
              <button type="button" onClick={() => onChange(selected.filter((x) => x !== id))} className="grid size-4 place-items-center rounded-full hover:bg-brand-200" aria-label="Quitar">
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-mute" />
        <input className="input py-2 pl-9" placeholder={placeholder} value={q} onChange={(e) => setQ(e.target.value)} />
        {results.length > 0 && (
          <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-xl border border-line bg-white p-1 shadow-xl">
            {results.map((p) => (
              <button type="button" key={p.id} onClick={() => toggle(p.id)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-brand-50">
                <span className="text-lg">{p.emoji}</span>
                <span className="flex-1">{p.name}</span>
                <span className="text-ink-soft">{formatMoney(p.price)}</span>
                {selected.includes(p.id) && <Check className="size-3.5 text-brand-600" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const NumberInput = ({ value, onChange, min = 1, step = 1, prefix }: { value: number; onChange: (n: number) => void; min?: number; step?: number; prefix?: string }) => (
  <div className="relative">
    {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-soft">{prefix}</span>}
    <input type="number" min={min} step={step} className={`input ${prefix ? 'pl-7' : ''}`} value={value} onChange={(e) => onChange(Number(e.target.value))} />
  </div>
)

/** Ticket de ejemplo para que quien crea la oferta vea exactamente cuánto se ahorra. */
function examplePreview(draft: PromotionInput, products: Product[], taxPct: number) {
  const byId = new Map(products.map((p) => [p.id, p]))
  const first = draft.productIds.map((id) => byId.get(id)).find(Boolean) ?? (draft.type === 'percent' ? products.find((p) => p.category === draft.categoryId) : undefined)
  if (!first) return null
  const line = (p: Product, qty: number) => ({ productId: p.id, price: p.price, qty, category: p.category, unit: p.unit })
  const lines =
    draft.type === 'nxm'
      ? [line(first, draft.buyQty)]
      : draft.type === 'bundle'
        ? [line(first, draft.bundleQty)]
        : draft.type === 'gift'
          ? [line(first, draft.buyQty), ...(draft.giftProductId && byId.get(draft.giftProductId) ? [line(byId.get(draft.giftProductId)!, draft.giftQty)] : [])]
          : [line(first, first.unit === 'kg' ? 1 : 2)]
  const t = computeTicket(lines, [{ ...draft, id: 'preview', createdAt: '' }], taxPct, products)
  const label = lines.map((l) => `${l.qty}${byId.get(l.productId)?.unit === 'kg' ? ' kg' : ''} × ${byId.get(l.productId)?.name}`).join(' + ')
  return { label, subtotal: t.subtotal, total: t.total, discount: t.discount }
}

export default function PromotionFormModal({ promotion, onClose }: { promotion: Promotion | null; onClose: () => void }) {
  const products = useInventoryStore((s) => s.products)
  const branches = useBranchStore((s) => s.branches)
  const taxPct = useSettingsStore((s) => s.taxPct)
  const { addPromotion, updatePromotion } = usePromotionStore()
  const [draft, setDraft] = useState<PromotionInput>(() => {
    if (!promotion) return blankPromotion()
    const { id: _id, createdAt: _c, ...rest } = promotion
    return rest
  })
  const [nameTouched, setNameTouched] = useState(Boolean(promotion))
  const [scope, setScope] = useState<'products' | 'category'>(promotion?.categoryId && !promotion.productIds.length ? 'category' : 'products')
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])

  const set = (patch: Partial<PromotionInput>) =>
    setDraft((d) => {
      const next = { ...d, ...patch }
      if (!nameTouched) next.name = suggestName(next, byId)
      return next
    })

  const errors: string[] = []
  if (scope === 'category' && draft.type === 'percent' ? !draft.categoryId : !draft.productIds.length) errors.push('Elige los productos de la oferta')
  if (draft.type === 'nxm' && !(draft.buyQty > draft.payQty && draft.payQty >= 1)) errors.push('Debe pagar menos de lo que lleva')
  if (draft.type === 'gift' && !draft.giftProductId) errors.push('Elige el producto que lleva el descuento')
  if (draft.type === 'percent' && !(draft.percent > 0 && draft.percent < 100)) errors.push('El descuento debe estar entre 1% y 99%')
  if (draft.type === 'bundle' && !(draft.bundleQty >= 2 && draft.bundlePrice > 0)) errors.push('El paquete necesita al menos 2 piezas y un precio')
  if (draft.endDate < draft.startDate) errors.push('La fecha final es anterior a la inicial')
  if (!draft.name.trim()) errors.push('Ponle un nombre')

  const preview = examplePreview(draft, products, taxPct)
  const previewPromo: Promotion = { ...draft, id: 'preview', createdAt: '' }

  const save = () => {
    if (errors.length) return toast({ type: 'error', title: errors[0] })
    const data: PromotionInput = {
      ...draft,
      name: draft.name.trim(),
      productIds: draft.type === 'percent' && scope === 'category' ? [] : draft.productIds,
      categoryId: draft.type === 'percent' && scope === 'category' ? draft.categoryId : null,
    }
    if (promotion) updatePromotion(promotion.id, data)
    else addPromotion(data)
    toast({ title: promotion ? 'Oferta actualizada' : 'Oferta creada', message: `${data.name} ya se aplica en caja.` })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      icon={Tag}
      title={promotion ? 'Editar oferta' : 'Nueva oferta'}
      subtitle="Se aplica sola en caja cuando el ticket cumple la condición"
      width="max-w-4xl"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={save}>{promotion ? 'Guardar cambios' : 'Crear oferta'}</button>
        </>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-medium text-ink-soft">1. ¿Qué tipo de oferta?</p>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {TYPES.map(({ id, title, example, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => set({ type: id })}
                  className={`flex flex-col items-start gap-1 rounded-2xl border p-3 text-left transition ${draft.type === id ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-200' : 'border-line hover:bg-tile'}`}
                >
                  <span className={`grid size-8 place-items-center rounded-lg bg-gradient-to-br text-white ${promoColor({ type: id })}`}>
                    <Icon className="size-4" />
                  </span>
                  <span className="text-xs font-semibold">{title}</span>
                  <span className="text-[10px] text-ink-soft">{example}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-line p-4">
            <p className="text-xs font-medium text-ink-soft">2. Configúrala</p>

            {draft.type === 'percent' && (
              <div className="grid grid-cols-2 rounded-xl bg-tile p-1 text-xs">
                {(['products', 'category'] as const).map((s) => (
                  <button key={s} type="button" onClick={() => setScope(s)} className={`rounded-lg py-2 ${scope === s ? 'bg-white font-semibold shadow-sm' : 'text-ink-soft'}`}>
                    {s === 'products' ? 'Productos específicos' : 'Toda una categoría'}
                  </button>
                ))}
              </div>
            )}

            {draft.type === 'percent' && scope === 'category' ? (
              <Field label="Categoría">
                <SearchSelect value={draft.categoryId ?? null} options={categoryOptions()} onChange={(categoryId) => set({ categoryId })} placeholder="Elige una categoría…" />
              </Field>
            ) : (
              <Field label={draft.type === 'gift' ? 'Al comprar…' : 'Productos participantes'}>
                <ProductPicker selected={draft.productIds} onChange={(productIds) => set({ productIds })} placeholder="Busca y agrega productos…" />
              </Field>
            )}

            {draft.type === 'nxm' && (
              <>
                <div className="flex flex-wrap gap-2">
                  {[
                    [2, 1],
                    [3, 2],
                    [4, 3],
                  ].map(([b, p]) => (
                    <button key={b} type="button" onClick={() => set({ buyQty: b, payQty: p })} className={`rounded-full border px-3 py-1 text-xs font-semibold ${draft.buyQty === b && draft.payQty === p ? 'border-brand-500 bg-brand-500 text-white' : 'border-line hover:bg-brand-50'}`}>
                      {b}x{p}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Lleva"><NumberInput value={draft.buyQty} min={2} onChange={(buyQty) => set({ buyQty })} /></Field>
                  <Field label="Paga"><NumberInput value={draft.payQty} onChange={(payQty) => set({ payQty })} /></Field>
                </div>
                {draft.productIds.length > 1 && <p className="text-[11px] text-ink-soft">Se pueden combinar los productos; la pieza más barata del grupo es la gratis.</p>}
              </>
            )}

            {draft.type === 'gift' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Piezas a comprar"><NumberInput value={draft.buyQty} onChange={(buyQty) => set({ buyQty })} /></Field>
                  <Field label="Piezas con descuento"><NumberInput value={draft.giftQty} onChange={(giftQty) => set({ giftQty })} /></Field>
                </div>
                <Field label="…se lleva con descuento">
                  <ProductPicker single selected={draft.giftProductId ? [draft.giftProductId] : []} onChange={(ids) => set({ giftProductId: ids[0] ?? null })} placeholder="Producto con descuento…" />
                </Field>
                <Field label="Descuento en ese producto">
                  <div className="flex flex-wrap gap-2">
                    {[100, 50, 25].map((pct) => (
                      <button key={pct} type="button" onClick={() => set({ giftDiscountPct: pct })} className={`rounded-full border px-3 py-1.5 text-xs ${draft.giftDiscountPct === pct ? 'border-brand-500 bg-brand-500 text-white' : 'border-line hover:bg-brand-50'}`}>
                        {pct === 100 ? '100% (gratis)' : `${pct}% de descuento`}
                      </button>
                    ))}
                  </div>
                </Field>
              </>
            )}

            {draft.type === 'percent' && (
              <Field label="Descuento (%)"><NumberInput value={draft.percent} onChange={(percent) => set({ percent })} /></Field>
            )}

            {draft.type === 'bundle' && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Piezas del paquete"><NumberInput value={draft.bundleQty} min={2} onChange={(bundleQty) => set({ bundleQty })} /></Field>
                <Field label="Precio del paquete"><NumberInput value={draft.bundlePrice} step={0.5} prefix="$" onChange={(bundlePrice) => set({ bundlePrice })} /></Field>
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-2xl border border-line p-4">
            <p className="text-xs font-medium text-ink-soft">3. ¿Cuándo y dónde?</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Desde"><input type="date" className="input" value={draft.startDate} onChange={(e) => set({ startDate: e.target.value })} /></Field>
              <Field label="Hasta"><input type="date" className="input" value={draft.endDate} onChange={(e) => set({ endDate: e.target.value })} /></Field>
            </div>
            <Field label="Sucursales">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => set({ branchIds: [] })} className={`rounded-full border px-3 py-1.5 text-xs ${!draft.branchIds.length ? 'border-brand-500 bg-brand-500 text-white' : 'border-line hover:bg-brand-50'}`}>
                  Todas
                </button>
                {branches.map((b) => {
                  const on = draft.branchIds.includes(b.id)
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => set({ branchIds: on ? draft.branchIds.filter((x) => x !== b.id) : [...draft.branchIds, b.id] })}
                      className={`rounded-full border px-3 py-1.5 text-xs ${on ? 'border-brand-500 bg-brand-500 text-white' : 'border-line hover:bg-brand-50'}`}
                    >
                      {b.name}
                    </button>
                  )
                })}
              </div>
            </Field>
            <Field label="Nombre visible en caja y en la pantalla de ofertas">
              <input
                className="input"
                value={draft.name}
                onChange={(e) => {
                  setNameTouched(true)
                  setDraft((d) => ({ ...d, name: e.target.value }))
                }}
              />
            </Field>
          </div>
        </div>

        <aside className="space-y-3 lg:sticky lg:top-0 lg:self-start">
          <p className="text-xs font-medium text-ink-soft">Así se verá</p>
          <div className={`rounded-3xl bg-gradient-to-br p-5 text-white shadow-lg ${promoColor(draft)}`}>
            <span className="rounded-xl bg-white/25 px-3 py-1 text-xl font-black">{promoBadge(previewPromo)}</span>
            <p className="mt-3 text-base font-semibold leading-tight">{draft.name || 'Nombre de la oferta'}</p>
            <p className="mt-1 text-xs text-white/90">{promoDescription(previewPromo, byId)}</p>
            <div className="mt-3 flex gap-1 text-2xl">
              {[...draft.productIds, ...(draft.giftProductId ? [draft.giftProductId] : [])].slice(0, 5).map((id) => (
                <span key={id}>{byId.get(id)?.emoji}</span>
              ))}
            </div>
          </div>
          {preview && (
            <div className="space-y-1 rounded-2xl bg-tile p-4 text-xs">
              <p className="font-medium">Ejemplo en caja</p>
              <p className="text-ink-soft">{preview.label}</p>
              <div className="flex justify-between pt-1">
                <span>Precio normal</span>
                <span className="line-through">{formatMoney(preview.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold">
                <span>Con la oferta</span>
                <span>{formatMoney(preview.total)}</span>
              </div>
              <p className="text-right font-medium text-emerald-600">Ahorra {formatMoney(preview.discount)}</p>
            </div>
          )}
          {errors.length > 0 && <p className="rounded-xl bg-amber-50 p-3 text-[11px] text-amber-800">{errors[0]}</p>}
        </aside>
      </div>
    </Modal>
  )
}

function suggestName(d: PromotionInput, byId: Map<string, Product>): string {
  const first = d.productIds.map((id) => byId.get(id)?.name).find(Boolean)
  const target = first ? (d.productIds.length > 1 ? `${first} y más` : first) : (CATEGORIES.find((c) => c.id === d.categoryId)?.name ?? '')
  switch (d.type) {
    case 'nxm':
      return target ? `${d.buyQty}x${d.payQty} en ${target}` : ''
    case 'gift': {
      const gift = d.giftProductId ? byId.get(d.giftProductId)?.name : ''
      return target && gift ? `${target} + ${gift} ${d.giftDiscountPct >= 100 ? 'gratis' : `con ${d.giftDiscountPct}% de descuento`}` : ''
    }
    case 'percent':
      return target ? `${target} -${d.percent}%` : ''
    case 'bundle':
      return target ? `${d.bundleQty} ${target} por $${d.bundlePrice}` : ''
  }
}
