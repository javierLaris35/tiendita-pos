import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, Banknote, CheckCircle2, CreditCard, HandCoins, Landmark, Printer } from 'lucide-react'
import Modal from '../ui/Modal'
import { useCustomerStore } from '../../store/useCustomerStore'
import { useSalesStore } from '../../store/useSalesStore'
import { useEmployeeStore } from '../../store/useEmployeeStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import { useUiStore, toast } from '../../store/useUiStore'
import { registerCreditPayment } from '../../store/actions'
import { creditInfo } from '../../utils/credit'
import { registerLabel } from '../../utils/cash'
import { formatDateTime, formatMoney, timeAgo } from '../../utils/format'
import type { AbonoMethod, CreditPayment, Customer, CustomerWithStats } from '../../types'

/** Barra de uso del crédito: verde → ámbar → rojo conforme se acerca al límite. */
export function CreditMeter({ balance, limit, compact = false }: { balance: number; limit: number; compact?: boolean }) {
  const pct = limit ? Math.min(100, (balance / limit) * 100) : 0
  const color = pct >= 90 ? 'bg-red-500' : pct >= 65 ? 'bg-amber-400' : 'bg-emerald-500'
  return (
    <div className="space-y-1">
      <div className={`overflow-hidden rounded-full bg-slate-100 ${compact ? 'h-1.5' : 'h-2.5'}`}>
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      {!compact && (
        <div className="flex justify-between text-[10px] text-ink-soft">
          <span>Usado {pct.toFixed(0)}%</span>
          <span>Límite {formatMoney(limit)}</span>
        </div>
      )}
    </div>
  )
}

export function CreditStatus({ customer }: { customer: Pick<CustomerWithStats, 'creditEnabled' | 'balance' | 'overdueDays'> }) {
  if (!customer.creditEnabled) return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">Sin crédito</span>
  if (customer.overdueDays > 0)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600">
        <AlertTriangle className="size-3" /> Vencido {customer.overdueDays} d
      </span>
    )
  if (customer.balance > 0) return <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">Debe {formatMoney(customer.balance)}</span>
  return <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Al corriente</span>
}

/** Resumen del crédito + estado de cuenta con saldo acumulado. */
export function CreditPanel({ customer, onAbono, maxRows = 12 }: { customer: Customer; onAbono?: () => void; maxRows?: number }) {
  const sales = useSalesStore((s) => s.sales)
  const payments = useCustomerStore((s) => s.payments)
  const openReceipt = useUiStore((s) => s.openReceipt)
  const info = useMemo(() => creditInfo(customer, sales, payments), [customer, sales, payments])

  if (!customer.creditEnabled && info.balance <= 0) {
    return <p className="rounded-xl bg-tile p-3 text-xs text-ink-soft">Este cliente no tiene crédito autorizado.</p>
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-tile p-2.5">
          <p className="text-[10px] text-ink-soft">Saldo</p>
          <p className={`text-base font-semibold ${info.balance > 0 ? 'text-amber-700' : ''}`}>{formatMoney(info.balance)}</p>
        </div>
        <div className="rounded-xl bg-tile p-2.5">
          <p className="text-[10px] text-ink-soft">Disponible</p>
          <p className="text-base font-semibold text-emerald-700">{formatMoney(info.available)}</p>
        </div>
        <div className="rounded-xl bg-tile p-2.5">
          <p className="text-[10px] text-ink-soft">Plazo</p>
          <p className="text-base font-semibold">{customer.creditDays} días</p>
        </div>
      </div>
      <CreditMeter balance={info.balance} limit={customer.creditLimit} />
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-soft">
        <span>Último abono: {info.lastPayment ? timeAgo(info.lastPayment) : 'nunca'}</span>
        {info.overdueDays > 0 && (
          <span className="flex items-center gap-1 font-medium text-red-600">
            <AlertTriangle className="size-3.5" /> {info.overdueDays} días vencido
          </span>
        )}
        {onAbono && (
          <button onClick={onAbono} disabled={info.balance <= 0} className="btn-primary px-3 py-1.5 text-xs">
            <HandCoins className="size-3.5" /> Registrar abono
          </button>
        )}
      </div>
      <div>
        <p className="mb-1.5 text-xs font-medium">Estado de cuenta</p>
        {!info.statement.length && <p className="text-xs text-ink-soft">Sin movimientos.</p>}
        <div className="max-h-56 space-y-1 overflow-y-auto pr-1 scrollbar-thin">
          {info.statement.slice(0, maxRows).map((e) => (
            <button
              key={e.id}
              onClick={() => e.saleId && openReceipt(e.saleId)}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] ${e.saleId ? 'hover:bg-brand-50' : 'cursor-default'}`}
            >
              <span className={`grid size-6 shrink-0 place-items-center rounded-full ${e.kind === 'charge' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                {e.kind === 'charge' ? <ArrowUpRight className="size-3.5" /> : <ArrowDownLeft className="size-3.5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{e.label}</span>
                <span className="text-[10px] text-ink-soft">{formatDateTime(e.date)}</span>
              </span>
              <span className={e.kind === 'charge' ? 'text-amber-700' : 'text-emerald-700'}>
                {e.kind === 'charge' ? '+' : '−'}
                {formatMoney(e.amount)}
              </span>
              <span className="w-20 text-right font-semibold">{formatMoney(e.balance)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

const METHODS: { id: AbonoMethod; label: string; icon: typeof Banknote }[] = [
  { id: 'cash', label: 'Efectivo', icon: Banknote },
  { id: 'card', label: 'Tarjeta', icon: CreditCard },
  { id: 'transfer', label: 'Transferencia', icon: Landmark },
]

/** Captura de abono con comprobante imprimible. */
export function AbonoModal({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const sales = useSalesStore((s) => s.sales)
  const payments = useCustomerStore((s) => s.payments)
  const employees = useEmployeeStore((s) => s.employees)
  const businessName = useSettingsStore((s) => s.businessName)
  const { balance } = useMemo(() => creditInfo(customer, sales, payments), [customer, sales, payments])
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<AbonoMethod>('cash')
  const [done, setDone] = useState<CreditPayment | null>(null)
  const value = Number(amount) || 0
  const quick = [...new Set([balance, Math.round(balance / 2 / 10) * 10, 100, 200, 500])].filter((v) => v > 0 && v <= balance).sort((a, b) => b - a)

  const save = () => {
    const p = registerCreditPayment(customer.id, value, method)
    if (!p) return
    setDone(p)
    toast({ title: 'Abono registrado', message: `${formatMoney(p.amount)} · nuevo saldo ${formatMoney(p.balanceAfter)}` })
  }

  if (done) {
    return (
      <Modal
        open
        onClose={onClose}
        icon={CheckCircle2}
        title="Abono registrado"
        subtitle={customer.name}
        width="max-w-sm"
        footer={
          <>
            <button className="btn-ghost" onClick={() => window.print()}><Printer className="size-4" /> Imprimir</button>
            <button className="btn-primary" onClick={onClose}>Listo</button>
          </>
        }
      >
        <div className="print-area space-y-1 rounded-xl border border-dashed border-line bg-tile p-4 font-mono text-[11px]">
          <p className="text-center text-sm font-bold">{businessName}</p>
          <p className="mb-2 text-center">COMPROBANTE DE ABONO</p>
          <Line l="Folio" v={`A-${done.folio}`} />
          <Line l="Fecha" v={formatDateTime(done.date)} />
          <Line l="Cliente" v={customer.name} />
          {done.register && <Line l="Caja" v={registerLabel(done.register)} />}
          <Line l="Atendió" v={employees.find((e) => e.id === done.by)?.name ?? '—'} />
          <div className="my-2 border-t border-dashed border-line" />
          <Line l="Saldo anterior" v={formatMoney(done.balanceAfter + done.amount)} />
          <Line l={`Abono (${METHODS.find((m) => m.id === done.method)?.label})`} v={`-${formatMoney(done.amount)}`} />
          <Line l="SALDO ACTUAL" v={formatMoney(done.balanceAfter)} bold />
          <p className="pt-3 text-center text-ink-soft">¡Gracias por su pago!</p>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      open
      onClose={onClose}
      icon={HandCoins}
      title="Registrar abono"
      subtitle={`${customer.name} · debe ${formatMoney(balance)}`}
      width="max-w-md"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={value <= 0 || value > balance + 0.001} onClick={save}>
            Abonar {formatMoney(value)}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="mb-1.5 text-xs font-medium text-ink-soft">Importe</p>
          <input
            autoFocus
            inputMode="decimal"
            className="input text-2xl font-semibold"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && value > 0 && save()}
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {quick.map((q) => (
              <button key={q} onClick={() => setAmount(String(q))} className="rounded-lg border border-line px-2.5 py-1.5 text-xs hover:bg-brand-50">
                {q === balance ? `Liquidar ${formatMoney(q)}` : formatMoney(q)}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {METHODS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setMethod(id)} className={`flex flex-col items-center gap-1 rounded-xl border py-2.5 text-xs ${method === id ? 'border-brand-500 bg-brand-500 text-white' : 'border-line hover:bg-brand-50'}`}>
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>
        <div className="flex justify-between rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <span>Saldo después del abono</span>
          <span className="font-semibold">{formatMoney(Math.max(0, balance - value))}</span>
        </div>
      </div>
    </Modal>
  )
}

const Line = ({ l, v, bold }: { l: string; v: string; bold?: boolean }) => (
  <div className={`flex justify-between gap-2 ${bold ? 'text-xs font-bold' : ''}`}>
    <span>{l}</span>
    <span className="text-right">{v}</span>
  </div>
)
