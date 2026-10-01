import { useMemo, useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, ClipboardCheck, FileClock, PauseCircle, Printer, Trash2 } from 'lucide-react'
import Modal, { Field } from '../ui/Modal'
import { CashCounter, MoneyPiece } from '../money/Money'
import { useCashStore } from '../../store/useCashStore'
import { useCartStore, type ParkedTicket } from '../../store/useCartStore'
import { useSalesStore } from '../../store/useSalesStore'
import { useInventoryStore } from '../../store/useInventoryStore'
import { useEmployeeStore } from '../../store/useEmployeeStore'
import { useBranchStore } from '../../store/useBranchStore'
import { useCustomerStore } from '../../store/useCustomerStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import { useCurrentUser } from '../../store/useAuthStore'
import { toast } from '../../store/useUiStore'
import { countTotal, registerLabel, sessionSummary } from '../../utils/cash'
import { formatDateTime, formatMoney, formatTime, timeAgo } from '../../utils/format'
import type { CashCount, CashSession } from '../../types'

const Row = ({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: 'good' | 'bad' }) => (
  <div className={`flex justify-between gap-3 py-1 ${strong ? 'text-sm font-semibold' : 'text-xs'}`}>
    <span className={strong ? '' : 'text-ink-soft'}>{label}</span>
    <span className={tone === 'good' ? 'text-emerald-600' : tone === 'bad' ? 'text-red-500' : ''}>{value}</span>
  </div>
)

/** Reporte de corte (X = parcial con el turno abierto, Z = cierre). Imprimible. */
export function CorteReport({ session }: { session: CashSession }) {
  const sales = useSalesStore((s) => s.sales)
  const employees = useEmployeeStore((s) => s.employees)
  const branches = useBranchStore((s) => s.branches)
  const businessName = useSettingsStore((s) => s.businessName)
  const payments = useCustomerStore((s) => s.payments)
  const sum = useMemo(() => sessionSummary(session, sales, payments), [session, sales, payments])
  const cashier = employees.find((e) => e.id === session.cashierId)
  const branch = branches.find((b) => b.id === session.branchId)
  const closed = session.status === 'closed'
  const expected = closed ? (session.expectedAmount ?? sum.expected) : sum.expected
  const diff = closed && session.countedAmount != null ? Math.round((session.countedAmount - expected) * 100) / 100 : null

  return (
    <div className="print-area space-y-3 rounded-2xl border border-dashed border-line bg-tile p-4">
      <div className="text-center">
        <p className="text-sm font-bold">{businessName}</p>
        <p className="text-xs">{branch?.name}</p>
        <p className="mt-1 inline-block rounded-full bg-ink px-3 py-0.5 text-[10px] font-semibold text-white">{closed ? 'CORTE Z · CIERRE DE TURNO' : 'CORTE X · PARCIAL'}</p>
      </div>
      <div className="grid grid-cols-2 gap-x-4 border-y border-dashed border-line py-2">
        <Row label="Caja" value={registerLabel(session.register)} />
        <Row label="Cajero" value={cashier?.name ?? '—'} />
        <Row label="Apertura" value={formatDateTime(session.openedAt)} />
        <Row label={closed ? 'Cierre' : 'Generado'} value={formatDateTime(session.closedAt ?? new Date().toISOString())} />
      </div>
      <div>
        <Row label="Fondo inicial" value={formatMoney(session.openingAmount)} />
        <Row label={`Ventas en efectivo`} value={formatMoney(sum.cashSales)} />
        <Row label="Ventas con tarjeta" value={formatMoney(sum.cardSales)} />
        <Row label="Transferencias" value={formatMoney(sum.transferSales)} />
        {sum.creditSales > 0 && <Row label="Ventas a crédito (fiado)" value={formatMoney(sum.creditSales)} />}
        <Row label={`Total vendido (${sum.tickets} tickets)`} value={formatMoney(sum.totalSales)} strong />
        {sum.savings > 0 && <Row label="Ahorro entregado en ofertas" value={formatMoney(sum.savings)} />}
      </div>
      {sum.abonosCash + sum.abonosOther > 0 && (
        <div className="border-t border-dashed border-line pt-2">
          <Row label="Abonos de crédito en efectivo" value={`+${formatMoney(sum.abonosCash)}`} tone="good" />
          {sum.abonosOther > 0 && <Row label="Abonos con tarjeta / transferencia" value={formatMoney(sum.abonosOther)} />}
        </div>
      )}
      {session.movements.length > 0 && (
        <div className="border-t border-dashed border-line pt-2">
          <p className="mb-1 text-[11px] font-semibold">Movimientos de efectivo</p>
          {session.movements.map((m) => (
            <Row key={m.id} label={`${formatTime(m.date)} · ${m.reason}`} value={`${m.type === 'in' ? '+' : '−'}${formatMoney(m.amount)}`} tone={m.type === 'in' ? 'good' : 'bad'} />
          ))}
        </div>
      )}
      <div className="border-t border-dashed border-line pt-2">
        <Row label="Efectivo esperado en caja" value={formatMoney(expected)} strong />
        {closed && session.countedAmount != null && (
          <>
            <Row label="Efectivo contado" value={formatMoney(session.countedAmount)} strong />
            <Row label={diff === 0 ? 'Caja cuadrada' : diff! > 0 ? 'Sobrante' : 'Faltante'} value={formatMoney(Math.abs(diff ?? 0))} strong tone={diff === 0 ? 'good' : 'bad'} />
          </>
        )}
      </div>
      {session.countedBreakdown && Object.values(session.countedBreakdown).some(Boolean) && (
        <div className="flex flex-wrap gap-2 border-t border-dashed border-line pt-2">
          {Object.entries(session.countedBreakdown)
            .filter(([, n]) => n > 0)
            .sort((a, b) => Number(b[0]) - Number(a[0]))
            .map(([v, n]) => (
              <span key={v} className="flex items-center gap-1 text-[10px] font-semibold">
                {n}× <MoneyPiece value={Number(v)} size="xs" />
              </span>
            ))}
        </div>
      )}
      {session.notes && <p className="text-[11px] italic text-ink-soft">Nota: {session.notes}</p>}
      <div className="grid grid-cols-2 gap-6 pt-6 text-center text-[10px] text-ink-soft">
        <p className="border-t border-ink-mute pt-1">Firma cajero</p>
        <p className="border-t border-ink-mute pt-1">Firma encargado</p>
      </div>
    </div>
  )
}

export function CorteXModal({ session, onClose }: { session: CashSession; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} icon={FileClock} title="Corte X" subtitle="Resumen parcial sin cerrar el turno" width="max-w-md" footer={<button className="btn-primary" onClick={() => window.print()}><Printer className="size-4" /> Imprimir</button>}>
      <CorteReport session={session} />
    </Modal>
  )
}

/** Cierre de turno: arqueo por denominación, diferencia contra lo esperado y corte Z. */
export function CloseRegisterModal({ session, onClose, onClosed }: { session: CashSession; onClose: () => void; onClosed: () => void }) {
  const sales = useSalesStore((s) => s.sales)
  const closeSession = useCashStore((s) => s.closeSession)
  const sessionNow = useCashStore((s) => s.sessions.find((x) => x.id === session.id)) ?? session
  const payments = useCustomerStore((s) => s.payments)
  const sum = useMemo(() => sessionSummary(session, sales, payments), [session, sales, payments])
  const [count, setCount] = useState<CashCount>({})
  const [notes, setNotes] = useState('')
  const [closed, setClosed] = useState(false)
  const counted = countTotal(count)
  const diff = Math.round((counted - sum.expected) * 100) / 100

  if (closed) {
    return (
      <Modal
        open
        onClose={onClosed}
        icon={ClipboardCheck}
        title="Turno cerrado"
        subtitle={registerLabel(session.register)}
        width="max-w-md"
        footer={
          <>
            <button className="btn-ghost" onClick={() => window.print()}><Printer className="size-4" /> Imprimir corte</button>
            <button className="btn-primary" onClick={onClosed}>Terminar</button>
          </>
        }
      >
        <CorteReport session={sessionNow} />
      </Modal>
    )
  }

  return (
    <Modal
      open
      onClose={onClose}
      icon={ClipboardCheck}
      title={`Cerrar ${registerLabel(session.register)}`}
      subtitle="Cuenta el efectivo que hay en el cajón"
      width="max-w-4xl"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button
            className="btn-primary"
            onClick={() => {
              closeSession(session.id, { expectedAmount: sum.expected, countedAmount: counted, countedBreakdown: count, notes })
              setClosed(true)
              toast({ title: 'Turno cerrado', message: diff === 0 ? 'La caja cuadró perfecto.' : `${diff > 0 ? 'Sobrante' : 'Faltante'} de ${formatMoney(Math.abs(diff))}` })
            }}
          >
            Cerrar turno e imprimir corte Z
          </button>
        </>
      }
    >
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_260px]">
        <CashCounter value={count} onChange={setCount} />
        <div className="space-y-3">
          <div className="rounded-2xl bg-tile p-3">
            <Row label="Fondo inicial" value={formatMoney(session.openingAmount)} />
            <Row label="Ventas en efectivo" value={formatMoney(sum.cashSales)} />
            {sum.abonosCash > 0 && <Row label="Abonos en efectivo" value={`+${formatMoney(sum.abonosCash)}`} />}
            <Row label="Entradas" value={`+${formatMoney(sum.cashIn)}`} />
            <Row label="Retiros" value={`−${formatMoney(sum.cashOut)}`} />
            <div className="mt-1 border-t border-dashed border-line pt-1">
              <Row label="Esperado" value={formatMoney(sum.expected)} strong />
            </div>
          </div>
          <div className="rounded-2xl bg-tile p-3">
            <Row label="Tarjeta" value={formatMoney(sum.cardSales)} />
            <Row label="Transferencia" value={formatMoney(sum.transferSales)} />
            <Row label="A crédito" value={formatMoney(sum.creditSales)} />
            <Row label="Tickets" value={String(sum.tickets)} />
          </div>
          <div className={`rounded-2xl p-4 text-white ${counted === 0 ? 'bg-ink-soft' : diff === 0 ? 'bg-emerald-500' : 'bg-orange-500'}`}>
            <p className="text-xs text-white/85">{counted === 0 ? 'Cuenta el efectivo' : diff === 0 ? 'Caja cuadrada' : diff > 0 ? 'Sobrante' : 'Faltante'}</p>
            <p className="text-3xl font-semibold">{formatMoney(Math.abs(counted ? diff : sum.expected))}</p>
          </div>
          <Field label="Observaciones">
            <textarea className="input min-h-20" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej. faltante por error de cambio" />
          </Field>
        </div>
      </div>
    </Modal>
  )
}

const REASONS = {
  in: ['Cambio adicional', 'Reposición de fondo', 'Otro ingreso'],
  out: ['Pago a proveedor', 'Retiro a caja fuerte', 'Gastos de tienda', 'Otro retiro'],
}

export function CashMovementModal({ session, onClose }: { session: CashSession; onClose: () => void }) {
  const addMovement = useCashStore((s) => s.addMovement)
  const user = useCurrentUser()
  const [type, setType] = useState<'in' | 'out'>('out')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState(REASONS.out[0])

  const save = () => {
    const value = Number(amount)
    if (value <= 0) return
    addMovement(session.id, { type, amount: value, reason, by: user?.id ?? null })
    toast({ title: type === 'in' ? 'Entrada registrada' : 'Retiro registrado', message: `${formatMoney(value)} · ${reason}` })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      icon={type === 'in' ? ArrowDownToLine : ArrowUpFromLine}
      title="Movimiento de efectivo"
      subtitle={registerLabel(session.register)}
      width="max-w-md"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={!(Number(amount) > 0)} onClick={save}>Registrar</button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {(['out', 'in'] as const).map((t) => (
            <button
              key={t}
              onClick={() => (setType(t), setReason(REASONS[t][0]))}
              className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-sm ${type === t ? (t === 'in' ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-orange-500 bg-orange-500 text-white') : 'border-line hover:bg-tile'}`}
            >
              {t === 'in' ? <ArrowDownToLine className="size-4" /> : <ArrowUpFromLine className="size-4" />}
              {t === 'in' ? 'Entrada' : 'Retiro'}
            </button>
          ))}
        </div>
        <Field label="Importe">
          <input autoFocus className="input text-2xl font-semibold" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} onKeyDown={(e) => e.key === 'Enter' && save()} />
        </Field>
        <Field label="Motivo">
          <div className="flex flex-wrap gap-2">
            {REASONS[type].map((r) => (
              <button key={r} onClick={() => setReason(r)} className={`rounded-full border px-3 py-1.5 text-xs ${reason === r ? 'border-brand-500 bg-brand-500 text-white' : 'border-line hover:bg-brand-50'}`}>
                {r}
              </button>
            ))}
          </div>
        </Field>
      </div>
    </Modal>
  )
}

export function ParkedTicketsModal({ onClose }: { onClose: () => void }) {
  const parked = useCartStore((s) => s.parked)
  const resume = useCartStore((s) => s.resume)
  const discard = useCartStore((s) => s.discardParked)
  const products = useInventoryStore((s) => s.products)
  const customers = useCustomerStore((s) => s.customers)
  const totalOf = (t: ParkedTicket) => t.items.reduce((a, i) => a + (products.find((p) => p.id === i.productId)?.price ?? 0) * i.qty, 0)

  return (
    <Modal open onClose={onClose} icon={PauseCircle} title="Ventas en espera" subtitle="Recupera un ticket para seguir cobrando" width="max-w-md">
      {!parked.length && <p className="py-8 text-center text-sm text-ink-soft">No hay ventas en espera.</p>}
      <div className="space-y-2">
        {parked.map((t) => (
          <div key={t.id} className="row-card flex items-center gap-3 p-3">
            <div className="flex -space-x-1 text-xl">
              {t.items.slice(0, 3).map((i) => (
                <span key={i.productId}>{products.find((p) => p.id === i.productId)?.emoji}</span>
              ))}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{customers.find((c) => c.id === t.customerId)?.name ?? 'Público general'}</p>
              <p className="text-[11px] text-ink-soft">
                {t.items.length} productos · {timeAgo(t.parkedAt)}
              </p>
            </div>
            <span className="text-sm font-semibold">{formatMoney(totalOf(t))}</span>
            <button onClick={() => discard(t.id)} className="grid size-8 place-items-center rounded-lg text-ink-soft hover:bg-red-50 hover:text-red-500" aria-label="Descartar">
              <Trash2 className="size-4" />
            </button>
            <button
              onClick={() => {
                resume(t.id)
                onClose()
              }}
              className="btn-primary px-3 py-1.5 text-xs"
            >
              Recuperar
            </button>
          </div>
        ))}
      </div>
    </Modal>
  )
}
