import { useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import type { Branch, Sale } from '../types'
import { CheckCircle2, MapPin, MonitorSmartphone, PencilLine, Phone, Plus, Store, Trash2, UserRound } from 'lucide-react'
import Modal, { ConfirmDialog, Field } from '../components/ui/Modal'
import { KebabMenu } from '../components/ui/Dropdown'
import { useBranchStore } from '../store/useBranchStore'
import { useSalesStore } from '../store/useSalesStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { toast } from '../store/useUiStore'
import { filterByPeriod } from '../utils/period'
import { formatMoney } from '../utils/format'

function BranchModal({ branch, onClose }: { branch: Partial<Branch>; onClose: () => void }) {
  const { addBranch, updateBranch } = useBranchStore()
  const isNew = !branch.id
  const [form, setForm] = useState<Omit<Branch, 'id' | 'counters'> & { counters: number | string }>({ name: '', address: '', phone: '', manager: '', counters: 1, ...branch })
  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value })
  const save = (e: FormEvent) => {
    e.preventDefault()
    const data = { ...form, counters: Number(form.counters) || 1 }
    if (branch.id) updateBranch(branch.id, data)
    else addBranch(data)
    toast({ title: isNew ? 'Sucursal creada' : 'Sucursal actualizada', message: data.name })
    onClose()
  }
  return (
    <Modal
      open
      onClose={onClose}
      icon={Store}
      title={isNew ? 'Nueva sucursal' : 'Editar sucursal'}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button form="branch-form" className="btn-primary">Guardar</button>
        </>
      }
    >
      <form id="branch-form" onSubmit={save} className="grid gap-3 sm:grid-cols-2">
        <Field label="Nombre" className="sm:col-span-2"><input className="input" required autoFocus value={form.name} onChange={set('name')} /></Field>
        <Field label="Dirección" className="sm:col-span-2"><input className="input" required value={form.address} onChange={set('address')} /></Field>
        <Field label="Teléfono"><input className="input" value={form.phone} onChange={set('phone')} /></Field>
        <Field label="Encargado"><input className="input" value={form.manager} onChange={set('manager')} /></Field>
        <Field label="Número de cajas"><input className="input" type="number" min="1" value={form.counters} onChange={set('counters')} /></Field>
      </form>
    </Modal>
  )
}

export default function Branches() {
  const { branches, activeBranchId, setActive, removeBranch } = useBranchStore()
  const sales = useSalesStore((s) => s.sales)
  const plan = useSettingsStore((s) => s.plan)
  const [editing, setEditing] = useState<Partial<Branch> | null>(null)
  const [deleting, setDeleting] = useState<Branch | null>(null)
  const limit = { basic: 1, pro: 3, enterprise: Infinity }[plan]

  const stats = useMemo(() => {
    const today = filterByPeriod(sales, 'today')
    const month = filterByPeriod(sales, 'month')
    const agg = (list: Sale[]) => list.reduce<Record<string, number>>((m, s) => ({ ...m, [s.storeId]: (m[s.storeId] ?? 0) + (s.refunded ? 0 : s.total) }), {})
    return { today: agg(today), month: agg(month) }
  }, [sales])

  return (
    <div className="space-y-3">
      <section className="card flex flex-wrap items-center gap-3 p-4">
        <div className="icon-box"><Store className="size-5" /></div>
        <div className="mr-auto">
          <h1 className="text-lg font-medium">Administrar sucursales</h1>
          <p className="text-xs text-ink-soft">
            {branches.length} de {limit === Infinity ? '∞' : limit} sucursales incluidas en tu plan
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => (branches.length >= limit ? toast({ type: 'error', title: 'Límite del plan alcanzado', message: 'Mejora tu suscripción para agregar más sucursales.' }) : setEditing({}))}
        >
          <Plus className="size-4" /> Nueva sucursal
        </button>
      </section>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {branches.map((b) => {
          const active = b.id === activeBranchId
          return (
            <div key={b.id} className={`card flex flex-col gap-4 p-4 ${active ? 'border-brand-500 ring-4 ring-brand-100' : ''}`}>
              <div className="flex items-start gap-3">
                <div className={`grid size-12 place-items-center rounded-xl ${active ? 'bg-brand-500 text-white' : 'bg-canvas text-brand-600'}`}><Store className="size-6" /></div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-medium">
                    {b.name} {active && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] text-brand-700">Activa</span>}
                  </p>
                  <p className="flex items-center gap-1 text-[11px] text-ink-soft"><MapPin className="size-3" /> {b.address}</p>
                </div>
                <KebabMenu
                  items={[
                    { label: 'Editar', icon: PencilLine, onClick: () => setEditing(b) },
                    ...(branches.length > 1 ? [{ label: 'Eliminar', icon: Trash2, danger: true, onClick: () => setDeleting(b) }] : []),
                  ]}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <Info icon={UserRound} label="Encargado" value={b.manager || '—'} />
                <Info icon={Phone} label="Teléfono" value={b.phone || '—'} />
                <Info icon={MonitorSmartphone} label="Cajas" value={b.counters} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-canvas p-3"><p className="label-xs">Ventas hoy</p><p className="text-sm font-semibold">{formatMoney(stats.today[b.id])}</p></div>
                <div className="rounded-xl bg-canvas p-3"><p className="label-xs">Ventas del mes</p><p className="text-sm font-semibold">{formatMoney(stats.month[b.id])}</p></div>
              </div>
              <button
                disabled={active}
                onClick={() => {
                  setActive(b.id)
                  toast({ type: 'info', title: 'Sucursal cambiada', message: `Ahora operas en ${b.name}.` })
                }}
                className={active ? 'btn bg-emerald-50 text-emerald-700 disabled:border-transparent! disabled:bg-emerald-50! disabled:text-emerald-700!' : 'btn-ghost'}
              >
                {active ? <><CheckCircle2 className="size-4" /> Operando aquí</> : 'Cambiar a esta sucursal'}
              </button>
            </div>
          )
        })}
      </div>
      {editing && <BranchModal branch={editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return
          removeBranch(deleting.id)
          toast({ type: 'info', title: 'Sucursal eliminada', message: deleting.name })
        }}
        title="Eliminar sucursal"
        message={`¿Eliminar ${deleting?.name}? Las ventas históricas se conservarán.`}
        confirmLabel="Eliminar"
      />
    </div>
  )
}

const Info = ({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: ReactNode }) => (
  <div className="min-w-0 rounded-xl border border-line p-2">
    <p className="flex items-center gap-1 text-[10px] text-ink-soft"><Icon className="size-3" /> {label}</p>
    <p className="truncate font-medium">{value}</p>
  </div>
)
