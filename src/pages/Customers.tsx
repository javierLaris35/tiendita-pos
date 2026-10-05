import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import type { Customer, CustomerWithStats, OfferChannel, Option, Period, Segment } from '../types'
import { useSearchParams } from 'react-router-dom'
import { Download, Gift, Megaphone, Search, Trash2, UserPlus, UsersRound } from 'lucide-react'
import StripedBarChart from '../components/charts/StripedBarChart'
import SmoothLineChart from '../components/charts/SmoothLineChart'
import { Dropdown, KebabMenu } from '../components/ui/Dropdown'
import Avatar from '../components/ui/Avatar'
import Modal, { ConfirmDialog, Field } from '../components/ui/Modal'
import { SearchSelect } from '../components/ui/Select'
import { textOptions } from '../components/ui/selectOptions'
import { EmptyState, KeyValue, PanelHeader, Toggle } from '../components/ui/Misc'
import { AbonoModal, CreditPanel, CreditStatus } from '../components/credit/Credit'
import { useCustomerStats } from '../hooks'
import { useCustomerStore, loyaltyFor } from '../store/useCustomerStore'
import { useSalesStore } from '../store/useSalesStore'
import { useBranchStore } from '../store/useBranchStore'
import { useUiStore, toast } from '../store/useUiStore'
import { SEGMENTS } from '../data/seed'
import { periodRange, inRange } from '../utils/period'
import { downloadCSV, formatDateTime, formatMoney, timeAgo } from '../utils/format'

const RETENTION_SEGMENTS = ['VIP', 'Recurrente', 'Cazaofertas', 'Ocasional', 'Suscriptor']
const RET_PERIODS: Option<Period>[] = [
  { value: 'year', label: 'Este año' },
  { value: 'month', label: 'Este mes' },
  { value: 'all', label: 'Todo' },
]

const customerCode = (c: Pick<Customer, 'id'>) => {
  const n = Number(c.id.replace(/\D/g, ''))
  return c.id.length <= 4 && n ? `#CUS${11000 + n}` : `#CUS${c.id.slice(-5).toUpperCase()}`
}

function OfferModal({ open, onClose, recipients }: { open: boolean; onClose: () => void; recipients: Customer[] }) {
  const sendOffer = useCustomerStore((s) => s.sendOffer)
  const [form, setForm] = useState<{ title: string; channel: OfferChannel; message: string }>({ title: '10% en lácteos este fin de semana', channel: 'whatsapp', message: '¡Hola! Tenemos una oferta especial para ti en Tiendita. Preséntate en caja con este mensaje.' })
  const send = (e: FormEvent) => {
    e.preventDefault()
    sendOffer(recipients.map((r) => r.id), form)
    toast({ title: 'Oferta enviada', message: `${recipients.length === 1 ? recipients[0].name : `${recipients.length} clientes`} vía ${form.channel === 'whatsapp' ? 'WhatsApp' : form.channel === 'sms' ? 'SMS' : 'correo'}.` })
    onClose()
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={Gift}
      title="Enviar oferta"
      subtitle={recipients.length === 1 ? recipients[0].name : `${recipients.length} destinatarios`}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button form="offer-form" className="btn-primary">
            <Megaphone className="size-4" /> Enviar
          </button>
        </>
      }
    >
      <form id="offer-form" onSubmit={send} className="space-y-3">
        <Field label="Título de la oferta">
          <input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>
        <Field label="Canal">
          <div className="grid grid-cols-3 gap-2">
            {([['whatsapp', 'WhatsApp'], ['sms', 'SMS'], ['email', 'Correo']] as const).map(([v, l]) => (
              <button type="button" key={v} onClick={() => setForm({ ...form, channel: v })} className={`rounded-xl border py-2 text-xs ${form.channel === v ? 'border-brand-500 bg-brand-500 text-white' : 'border-line hover:bg-brand-50'}`}>
                {l}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Mensaje">
          <textarea className="input min-h-24" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
        </Field>
      </form>
    </Modal>
  )
}

function CustomerModal({ customer: input, onClose }: { customer: Partial<CustomerWithStats>; onClose: () => void }) {
  // Con id es un cliente existente con estadísticas; sin id es un alta nueva
  const customer = input as CustomerWithStats
  const { addCustomer, updateCustomer, removeCustomer } = useCustomerStore()
  const sales = useSalesStore((s) => s.sales)
  const openReceipt = useUiStore((s) => s.openReceipt)
  const isNew = !input.id
  const [form, setForm] = useState<{ name: string; phone: string; email: string; segment: Segment; creditEnabled: boolean; creditLimit: number; creditDays: number }>({
    name: '',
    phone: '',
    email: '',
    segment: 'Ocasional',
    creditEnabled: false,
    creditLimit: 0,
    creditDays: 15,
    ...input,
  })
  const [abono, setAbono] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const history = useMemo(() => (isNew ? [] : sales.filter((s) => s.customerId === customer.id).slice(0, 25)), [sales, customer.id, isNew])
  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value })

  const save = (e: FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    const data = {
      name: form.name.trim(),
      phone: form.phone,
      email: form.email,
      segment: form.segment,
      creditEnabled: form.creditEnabled,
      creditLimit: form.creditEnabled ? Number(form.creditLimit) || 0 : form.creditLimit,
      creditDays: Number(form.creditDays) || 15,
    }
    if (isNew) addCustomer(data)
    else updateCustomer(customer.id, data)
    toast({ title: isNew ? 'Cliente agregado' : 'Cliente actualizado', message: data.name })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      icon={UsersRound}
      title={isNew ? 'Nuevo cliente' : customer.name}
      subtitle={isNew ? 'Registra un cliente en el programa de lealtad' : `${customerCode(customer)} · ${loyaltyFor(customer.total).label} · ${customer.orders} compras`}
      width="max-w-4xl"
      footer={
        <>
          {!isNew && (
            <button className="btn-ghost mr-auto text-red-500" onClick={() => setConfirm(true)}>
              <Trash2 className="size-4" /> Eliminar
            </button>
          )}
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button form="customer-form" className="btn-primary">Guardar</button>
        </>
      }
    >
      <div className={`grid gap-5 ${isNew ? '' : 'md:grid-cols-2'}`}>
        <form id="customer-form" onSubmit={save} className="space-y-3">
          <Field label="Nombre completo">
            <input className="input" autoFocus required value={form.name} onChange={set('name')} />
          </Field>
          <Field label="Teléfono">
            <input className="input" value={form.phone} onChange={set('phone')} placeholder="+52 55 0000 0000" />
          </Field>
          <Field label="Correo electrónico">
            <input className="input" type="email" value={form.email} onChange={set('email')} />
          </Field>
          <Field label="Segmento">
            <SearchSelect value={form.segment} options={textOptions(SEGMENTS)} onChange={(segment) => setForm({ ...form, segment: segment as Segment })} />
          </Field>
          <div className="space-y-3 rounded-xl border border-line p-3">
            <div className="flex items-center gap-2 text-xs font-medium">
              <Toggle checked={form.creditEnabled} onChange={(v) => setForm({ ...form, creditEnabled: v, creditLimit: v && !form.creditLimit ? 500 : form.creditLimit })} label="Crédito autorizado" />
              Crédito (fiado) autorizado
            </div>
            {form.creditEnabled && (
              <div className="grid grid-cols-2 gap-2">
                <Field label="Límite de crédito">
                  <input className="input" type="number" min="0" step="50" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: Number(e.target.value) })} />
                </Field>
                <Field label="Plazo para abonar (días)">
                  <input className="input" type="number" min="1" value={form.creditDays} onChange={(e) => setForm({ ...form, creditDays: Number(e.target.value) })} />
                </Field>
              </div>
            )}
          </div>
        </form>
        {!isNew && (
          <div>
            <div className="mb-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-canvas p-3">
                <p className="label-xs">Total comprado</p>
                <p className="text-sm font-semibold">{formatMoney(customer.total)}</p>
              </div>
              <div className="rounded-xl bg-canvas p-3">
                <p className="label-xs">Ticket promedio</p>
                <p className="text-sm font-semibold">{formatMoney(customer.orders ? customer.total / customer.orders : 0)}</p>
              </div>
            </div>
            {(customer.creditEnabled || customer.balance > 0) && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-medium text-ink-soft">Crédito</p>
                <CreditPanel customer={customer} onAbono={() => setAbono(true)} maxRows={6} />
              </div>
            )}
            <p className="mb-2 text-xs font-medium text-ink-soft">Compras recientes</p>
            <div className="max-h-48 space-y-1 overflow-y-auto pr-1 scrollbar-thin">
              {!history.length && <p className="text-xs text-ink-soft">Sin compras registradas.</p>}
              {history.map((s) => (
                <button key={s.id} onClick={() => openReceipt(s.id)} className="flex w-full justify-between rounded-lg bg-tile px-3 py-2 text-left text-[11px] hover:bg-brand-50">
                  <span>
                    #{s.number} · {formatDateTime(s.date)}
                  </span>
                  <span className="font-semibold">{formatMoney(s.total)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      {abono && <AbonoModal customer={customer} onClose={() => setAbono(false)} />}
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          removeCustomer(customer.id)
          toast({ type: 'info', title: 'Cliente eliminado' })
          onClose()
        }}
        title="Eliminar cliente"
        message={`¿Eliminar a ${customer.name}? Sus tickets históricos se conservarán como “Público general”.`}
        confirmLabel="Eliminar"
      />
    </Modal>
  )
}

export default function Customers() {
  const customers = useCustomerStats()
  const sales = useSalesStore((s) => s.sales)
  const branchId = useBranchStore((s) => s.activeBranchId)
  const [params, setParams] = useSearchParams()
  const [retPeriod, setRetPeriod] = useState<Period>('year')
  const [aovScope, setAovScope] = useState('all')
  const [q, setQ] = useState('')
  const [creditFilter, setCreditFilter] = useState<'all' | 'credit' | 'debt'>(params.get('filtro') === 'saldo' ? 'debt' : 'all')
  const [offerTo, setOfferTo] = useState<Customer[] | null>(null)
  const [detail, setDetail] = useState<Partial<CustomerWithStats> | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  // Abrir detalle si venimos de la búsqueda global (?id=...)
  const paramId = params.get('id')
  useEffect(() => {
    if (!paramId) return
    const c = customers.find((x) => x.id === paramId)
    if (c) {
      setSelected(c.id)
      setDetail(c)
    }
    setParams({}, { replace: true })
  }, [paramId, customers, setParams])

  const segmentOf = useMemo(() => Object.fromEntries(customers.map((c) => [c.id, c.segment])), [customers])

  // Compras repetidas por segmento (a partir de la segunda compra del periodo) como % del total
  const retention = useMemo(() => {
    const { start, end } = periodRange(retPeriod)
    const counts: Record<string, number> = {}
    for (const s of sales) if (s.customerId && !s.refunded && inRange(s.date, start, end)) counts[s.customerId] = (counts[s.customerId] ?? 0) + 1
    const repeat = Object.fromEntries(RETENTION_SEGMENTS.map((seg) => [seg, 0]))
    let total = 0
    for (const [id, n] of Object.entries(counts)) {
      const seg = segmentOf[id]
      if (n > 1 && seg) {
        total += n - 1
        if (seg in repeat) repeat[seg] += n - 1
      }
    }
    return RETENTION_SEGMENTS.map((seg) => ({ label: seg, value: total ? Math.round((repeat[seg] / total) * 1000) / 10 : 0 }))
  }, [sales, retPeriod, segmentOf])

  const aov = useMemo(() => {
    const agg = Object.fromEntries(SEGMENTS.map((s) => [s, { sum: 0, n: 0 }]))
    for (const s of sales) {
      if (!s.customerId || s.refunded || (aovScope === 'branch' && s.storeId !== branchId)) continue
      const seg = segmentOf[s.customerId]
      if (!agg[seg]) continue
      agg[seg].sum += s.total
      agg[seg].n += 1
    }
    return SEGMENTS.map((s) => Math.round(agg[s].n ? agg[s].sum / agg[s].n : 0))
  }, [sales, aovScope, branchId, segmentOf])

  const list = customers
    .filter((c) => `${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(q.toLowerCase()))
    .filter((c) => (creditFilter === 'credit' ? c.creditEnabled : creditFilter === 'debt' ? c.balance > 0 : true))
    .sort((a, b) => (creditFilter === 'debt' ? b.balance - a.balance : b.total - a.total))

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <section className="card space-y-4 p-4">
          <PanelHeader title="Tasa de retención de clientes">
            <Dropdown value={retPeriod} onChange={setRetPeriod} options={RET_PERIODS} />
          </PanelHeader>
          <StripedBarChart data={retention} height="h-44" formatValue={(v) => `${v.toFixed(1)}% de recompras`} />
        </section>
        <section className="card space-y-3 p-4">
          <PanelHeader title="Ticket promedio por segmento">
            <Dropdown
              value={aovScope}
              onChange={setAovScope}
              options={[
                { value: 'all', label: 'Todas las sucursales' },
                { value: 'branch', label: 'Sucursal actual' },
              ]}
            />
          </PanelHeader>
          <SmoothLineChart labels={SEGMENTS} series={[{ name: 'Ticket promedio', values: aov }]} formatY={(v) => `$${Math.round(v)}`} highlightLabel="Ticket promedio" height={196} />
        </section>
      </div>

      <section className="card flex min-h-[420px] flex-1 flex-col gap-3 p-3 sm:p-4 xl:min-h-0">
        <PanelHeader icon={UsersRound} title="Clientes y detalles">
          <Dropdown
            value={creditFilter}
            onChange={setCreditFilter}
            options={[
              { value: 'all', label: 'Todos' },
              { value: 'credit', label: 'Con crédito' },
              { value: 'debt', label: 'Con saldo pendiente' },
            ]}
          />
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-mute" />
            <input className="input w-56 py-2 pl-9" placeholder="Buscar cliente…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <KebabMenu
            items={[
              { label: 'Nuevo cliente', icon: UserPlus, onClick: () => setDetail({}) },
              { label: 'Enviar oferta a todos', icon: Megaphone, onClick: () => setOfferTo(list) },
              {
                label: 'Exportar CSV',
                icon: Download,
                onClick: () =>
                  downloadCSV('clientes.csv', [
                    ['ID', 'Nombre', 'Teléfono', 'Correo', 'Segmento', 'Total', 'Compras', 'Última compra', 'Lealtad'],
                    ...list.map((c) => [customerCode(c), c.name, c.phone, c.email, c.segment, c.total.toFixed(2), c.orders, c.last ?? '', loyaltyFor(c.total).label]),
                  ]),
              },
            ]}
          />
        </PanelHeader>
        <input className="input py-2 sm:hidden" placeholder="Buscar cliente…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="-mr-1 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 scrollbar-thin">
          {!list.length && <EmptyState icon={UsersRound} title="Sin clientes" />}
          {list.map((c, i) => {
            const isSel = selected ? selected === c.id : i === 0
            return (
              <div
                key={c.id}
                onClick={() => {
                  setSelected(c.id)
                  setDetail(c)
                }}
                className="row-card grid cursor-pointer grid-cols-[minmax(0,1.3fr)_auto] items-center gap-3 p-2 hover:border-brand-200 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_auto]"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar src={c.avatar} name={c.name} />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{c.name}</p>
                    <p className="text-[10px] text-ink-soft">{customerCode(c)}</p>
                  </div>
                </div>
                <div className="hidden md:block"><KeyValue label="Teléfono" value={c.phone || '—'} /></div>
                <div className="hidden md:block"><KeyValue label="Crédito" value={<CreditStatus customer={c} />} /></div>
                <div className="hidden md:block"><KeyValue label="Total comprado" value={formatMoney(c.total)} /></div>
                <div className="hidden md:block"><KeyValue label="Última compra" value={timeAgo(c.last)} /></div>
                <div className="hidden md:block"><KeyValue label="Lealtad" value={`Miembro ${loyaltyFor(c.total).label}`} /></div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelected(c.id)
                    setOfferTo([c])
                  }}
                  className={`rounded-full border px-4 py-1.5 text-[11px] transition ${isSel ? 'border-brand-500 bg-brand-500 text-white shadow-sm shadow-brand-500/30' : 'border-line hover:bg-brand-50'}`}
                >
                  Enviar oferta
                </button>
              </div>
            )
          })}
        </div>
      </section>
      {offerTo && <OfferModal open onClose={() => setOfferTo(null)} recipients={offerTo} />}
      {detail && <CustomerModal customer={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}
