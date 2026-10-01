import { useMemo, useState } from 'react'
import { CalendarRange, Copy, MonitorPlay, PencilLine, Plus, Store, Tag, Trash2 } from 'lucide-react'
import PromotionFormModal from '../components/promos/PromotionFormModal'
import { KebabMenu } from '../components/ui/Dropdown'
import { ConfirmDialog } from '../components/ui/Modal'
import { EmptyState, Toggle } from '../components/ui/Misc'
import { usePromotionStore } from '../store/usePromotionStore'
import { useInventoryStore } from '../store/useInventoryStore'
import { useBranchStore } from '../store/useBranchStore'
import { useSalesStore } from '../store/useSalesStore'
import { toast } from '../store/useUiStore'
import { promoBadge, promoColor, promoDescription, promoProductIds, promoState, type PromoState } from '../utils/promotions'
import { formatDate, formatMoney } from '../utils/format'
import { filterByPeriod } from '../utils/period'
import type { Promotion } from '../types'

const STATE_LABEL: Record<PromoState, { label: string; cls: string }> = {
  active: { label: 'Activa', cls: 'bg-emerald-50 text-emerald-700' },
  scheduled: { label: 'Programada', cls: 'bg-sky-50 text-sky-700' },
  paused: { label: 'Pausada', cls: 'bg-slate-100 text-slate-600' },
  expired: { label: 'Vencida', cls: 'bg-red-50 text-red-600' },
}

const FILTERS: { value: PromoState | 'all'; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'active', label: 'Activas' },
  { value: 'scheduled', label: 'Programadas' },
  { value: 'paused', label: 'Pausadas' },
  { value: 'expired', label: 'Vencidas' },
]

export default function Promotions() {
  const promotions = usePromotionStore((s) => s.promotions)
  const { updatePromotion, removePromotion, addPromotion } = usePromotionStore()
  const products = useInventoryStore((s) => s.products)
  const branches = useBranchStore((s) => s.branches)
  const sales = useSalesStore((s) => s.sales)
  const [filter, setFilter] = useState<PromoState | 'all'>('all')
  const [editing, setEditing] = useState<Promotion | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Promotion | null>(null)
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])

  // Uso y ahorro de cada oferta en el mes
  const usage = useMemo(() => {
    const m = new Map<string, { uses: number; savings: number }>()
    for (const s of filterByPeriod(sales, 'month')) {
      if (s.refunded) continue
      for (const p of s.promotions ?? []) {
        const u = m.get(p.promoId) ?? { uses: 0, savings: 0 }
        m.set(p.promoId, { uses: u.uses + 1, savings: u.savings + p.discount })
      }
    }
    return m
  }, [sales])

  const list = promotions.filter((p) => filter === 'all' || promoState(p) === filter)
  const count = (st: PromoState) => promotions.filter((p) => promoState(p) === st).length
  const monthSavings = [...usage.values()].reduce((a, u) => a + u.savings, 0)
  const monthUses = [...usage.values()].reduce((a, u) => a + u.uses, 0)

  return (
    <div className="space-y-3">
      <section className="card flex flex-wrap items-center gap-3 p-4">
        <div className="icon-box"><Tag className="size-5" /></div>
        <div className="mr-auto">
          <h1 className="text-lg font-medium">Ofertas y promociones</h1>
          <p className="text-xs text-ink-soft">Se aplican automáticamente en caja y se muestran en la pantalla de la tienda.</p>
        </div>
        <button className="btn-ghost" onClick={() => window.open('/pantalla-ofertas', '_blank')}>
          <MonitorPlay className="size-4" /> Pantalla de ofertas
        </button>
        <button className="btn-primary" onClick={() => setEditing('new')}>
          <Plus className="size-4" /> Nueva oferta
        </button>
      </section>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: 'Activas', value: String(count('active')) },
          { label: 'Programadas', value: String(count('scheduled')) },
          { label: 'Veces aplicadas (mes)', value: String(monthUses) },
          { label: 'Ahorro entregado (mes)', value: formatMoney(monthSavings) },
        ].map((k, i) => (
          <div key={k.label} className={`card p-4 ${i === 0 ? 'border-brand-500 bg-brand-500 text-white' : ''}`}>
            <p className={`text-xs ${i === 0 ? 'text-white/85' : 'text-ink-soft'}`}>{k.label}</p>
            <p className="text-2xl font-semibold">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {FILTERS.map((f) => (
          <button key={f.value} onClick={() => setFilter(f.value)} className={`shrink-0 rounded-xl border px-4 py-2 text-xs ${filter === f.value ? 'border-brand-500 bg-brand-500 text-white' : 'border-line bg-white hover:bg-brand-50'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {!list.length && (
        <div className="card">
          <EmptyState icon={Tag} title="Sin ofertas aquí" message="Crea una oferta y se aplicará sola en caja." action={<button className="btn-primary mt-2" onClick={() => setEditing('new')}><Plus className="size-4" /> Nueva oferta</button>} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {list.map((p) => {
          const st = STATE_LABEL[promoState(p)]
          const u = usage.get(p.id)
          const ids = [...promoProductIds(p, products), ...(p.giftProductId ? [p.giftProductId] : [])]
          return (
            <div key={p.id} className={`card flex flex-col overflow-hidden ${promoState(p) === 'active' ? '' : 'saturate-[0.35]'}`}>
              <div className={`flex items-start gap-3 bg-gradient-to-r p-4 text-white ${promoColor(p)}`}>
                <span className="rounded-xl bg-white/25 px-2.5 py-1 text-lg font-black">{promoBadge(p)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{p.name}</p>
                  <p className="line-clamp-2 text-[11px] text-white/90">{promoDescription(p, byId)}</p>
                </div>
                <KebabMenu
                  light
                  items={[
                    { label: 'Editar', icon: PencilLine, onClick: () => setEditing(p) },
                    {
                      label: 'Duplicar',
                      icon: Copy,
                      onClick: () => {
                        const { id: _id, createdAt: _c, ...rest } = p
                        addPromotion({ ...rest, name: `${p.name} (copia)`, active: false })
                        toast({ type: 'info', title: 'Oferta duplicada', message: 'Quedó pausada para que la ajustes.' })
                      },
                    },
                    { label: 'Eliminar', icon: Trash2, danger: true, onClick: () => setDeleting(p) },
                  ]}
                />
              </div>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex gap-1 text-2xl">
                  {ids.slice(0, 7).map((id) => (
                    <span key={id} title={byId.get(id)?.name}>{byId.get(id)?.emoji}</span>
                  ))}
                  {ids.length > 7 && <span className="self-center text-xs text-ink-soft">+{ids.length - 7}</span>}
                </div>
                <div className="space-y-1 text-[11px] text-ink-soft">
                  <p className="flex items-center gap-1.5"><CalendarRange className="size-3.5" /> {formatDate(p.startDate + 'T12:00:00')} — {formatDate(p.endDate + 'T12:00:00')}</p>
                  <p className="flex items-center gap-1.5"><Store className="size-3.5" /> {p.branchIds.length ? p.branchIds.map((id) => branches.find((b) => b.id === id)?.name).join(', ') : 'Todas las sucursales'}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-tile p-2"><p className="text-[10px] text-ink-soft">Aplicada (mes)</p><p className="font-semibold">{u?.uses ?? 0} veces</p></div>
                  <div className="rounded-xl bg-tile p-2"><p className="text-[10px] text-ink-soft">Ahorro entregado</p><p className="font-semibold">{formatMoney(u?.savings ?? 0)}</p></div>
                </div>
                <div className="mt-auto flex items-center justify-between border-t border-line pt-3">
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${st.cls}`}>{st.label}</span>
                  <span className="flex items-center gap-2 text-xs text-ink-soft">
                    {p.active ? 'Encendida' : 'Apagada'}
                    <Toggle checked={p.active} onChange={(active) => updatePromotion(p.id, { active })} label={`Activar ${p.name}`} />
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {editing && <PromotionFormModal promotion={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return
          removePromotion(deleting.id)
          toast({ type: 'info', title: 'Oferta eliminada', message: deleting.name })
        }}
        title="Eliminar oferta"
        message={`¿Eliminar “${deleting?.name}”? Los tickets anteriores conservan el descuento aplicado.`}
        confirmLabel="Eliminar"
      />
    </div>
  )
}
