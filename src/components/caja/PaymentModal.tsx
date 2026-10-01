import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Banknote as BanknoteIcon, CheckCircle2, CreditCard, HandCoins, Landmark, Printer, RotateCcw, X } from 'lucide-react'
import Avatar from '../ui/Avatar'
import { CreditMeter } from '../credit/Credit'
import { useCustomerStats } from '../../hooks'
import { useCartStore } from '../../store/useCartStore'
import { Banknote, Coin, PiecesRow } from '../money/Money'
import { BILLS, COINS } from '../../data/money'
import { useTicket } from '../../store/useCartStore'
import { useUiStore } from '../../store/useUiStore'
import { completePurchase } from '../../store/actions'
import { breakdown, paymentSuggestions } from '../../utils/cash'
import { formatMoney } from '../../utils/format'
import type { PaymentMethod, Sale } from '../../types'

const METHODS: { id: PaymentMethod; label: string; icon: typeof CreditCard; key: string }[] = [
  { id: 'cash', label: 'Efectivo', icon: BanknoteIcon, key: 'F4' },
  { id: 'card', label: 'Tarjeta', icon: CreditCard, key: 'F6' },
  { id: 'transfer', label: 'Transferencia', icon: Landmark, key: '' },
  { id: 'credit', label: 'Crédito', icon: HandCoins, key: '' },
]

const round2 = (n: number) => Math.round(n * 100) / 100

interface PaymentModalProps {
  method: PaymentMethod
  onClose: () => void
  /** Se llama al cerrar la pantalla de éxito para iniciar la siguiente venta */
  onFinished: () => void
}

export default function PaymentModal({ method: initialMethod, onClose, onFinished }: PaymentModalProps) {
  const { ticket } = useTicket()
  const openReceipt = useUiStore((s) => s.openReceipt)
  const customerId = useCartStore((s) => s.customerId)
  const customer = useCustomerStats().find((c) => c.id === customerId)
  const [method, setMethod] = useState<PaymentMethod>(initialMethod)
  const [received, setReceived] = useState(0)
  const [reference, setReference] = useState('')
  const [done, setDone] = useState<Sale | null>(null)
  const newSaleRef = useRef<HTMLButtonElement>(null)

  const total = ticket.total
  const change = round2(received - total)
  const suggestions = useMemo(() => paymentSuggestions(total), [total])
  const changeBreakdown = useMemo(() => breakdown(Math.max(0, change)), [change])
  const creditOk = Boolean(customer?.creditEnabled) && total <= (customer?.available ?? 0) + 0.001
  const canPay = total > 0 && (method === 'cash' ? received >= total - 0.001 : method === 'credit' ? creditOk : true)

  const pay = () => {
    if (!canPay) return
    const sale = completePurchase({
      payment: method,
      cashReceived: method === 'cash' ? received : null,
      cardRef: method !== 'cash' && reference ? reference : undefined,
    })
    if (sale) setDone(sale)
  }

  // Enter cobra; en la pantalla de éxito, Enter inicia la siguiente venta
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (useUiStore.getState().receiptId) return // el ticket impreso está encima
      if (e.key === 'Escape' && !done) onClose()
      if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault()
        if (done) onFinished()
        else pay()
      }
      const shortcut = { F4: 'cash', F6: 'card' }[e.key] as PaymentMethod | undefined
      if (!done && shortcut) {
        e.preventDefault()
        setMethod(shortcut)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  useEffect(() => {
    if (done) newSaleRef.current?.focus()
  }, [done])

  const add = (v: number) => setReceived((r) => round2(r + v))

  return createPortal(
    <div className="animate-fade fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-[2px] sm:items-center sm:p-4">
      <div className="animate-pop flex max-h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        {done ? (
          <SuccessView sale={done} onPrint={() => openReceipt(done.id)} onNew={onFinished} buttonRef={newSaleRef} />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
              <div>
                <p className="text-xs text-ink-soft">Total a cobrar</p>
                <p className="text-3xl font-semibold tracking-tight">{formatMoney(total)}</p>
              </div>
              {ticket.discount > 0 && (
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Ahorró {formatMoney(ticket.discount)} en ofertas</span>
              )}
              <div className="ml-auto flex rounded-2xl bg-tile p-1">
                {METHODS.map(({ id, label, icon: Icon, key }) => (
                  <button
                    key={id}
                    disabled={id === 'credit' && !customer?.creditEnabled}
                    title={id === 'credit' && !customer?.creditEnabled ? 'Asigna un cliente con crédito' : undefined}
                    onClick={() => setMethod(id)}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition sm:px-4 ${method === id ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30' : 'text-ink hover:bg-white'}`}
                  >
                    <Icon className="size-4" />
                    <span className="hidden sm:inline">{label}</span>
                    {key && <kbd className={`hidden rounded px-1 text-[9px] md:inline ${method === id ? 'bg-white/25' : 'bg-white text-ink-soft'}`}>{key}</kbd>}
                  </button>
                ))}
              </div>
              <button onClick={onClose} className="grid size-9 place-items-center rounded-xl text-ink-soft hover:bg-brand-50" aria-label="Cerrar">
                <X className="size-5" />
              </button>
            </div>

            {method === 'cash' ? (
              <div className="grid min-h-0 flex-1 gap-0 overflow-y-auto md:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-4 p-5">
                  <div>
                    <p className="mb-2 text-xs font-medium text-ink-soft">El cliente paga con…</p>
                    <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
                      {suggestions.map((s) => (
                        <button
                          key={s.amount}
                          onClick={() => setReceived(s.amount)}
                          className={`flex flex-col items-start gap-1.5 rounded-2xl border p-3 text-left transition hover:border-brand-400 hover:bg-brand-50 ${received === s.amount ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-200' : 'border-line'}`}
                        >
                          <span className="flex w-full items-center justify-between text-sm font-semibold">
                            {formatMoney(s.amount)}
                            {s.exact && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700">Exacto</span>}
                          </span>
                          <PiecesRow pieces={s.pieces} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-medium text-ink-soft">O toca los billetes y monedas que recibes</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {BILLS.map((b) => (
                        <button key={b.value} onClick={() => add(b.value)} className="grid place-items-center rounded-2xl border border-line p-2 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md active:scale-95" title={`${b.theme} · ${b.motifName}`}>
                          <Banknote spec={b} width={118} />
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
                      {COINS.map((c) => (
                        <button key={c.value} onClick={() => add(c.value)} className="grid size-16 place-items-center rounded-2xl border border-line transition hover:border-brand-300 hover:shadow-md active:scale-95">
                          <Coin spec={c} size={46} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-line bg-tile p-5 md:border-l md:border-t-0">
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-ink-soft">Recibido</p>
                      <button onClick={() => setReceived(0)} className="flex items-center gap-1 text-[11px] text-ink-soft hover:text-ink">
                        <RotateCcw className="size-3" /> Borrar
                      </button>
                    </div>
                    <input
                      autoFocus
                      inputMode="decimal"
                      value={received ? String(received) : ''}
                      placeholder="0.00"
                      onChange={(e) => setReceived(Number(e.target.value.replace(/[^\d.]/g, '')) || 0)}
                      className="w-full bg-transparent text-3xl font-semibold outline-none placeholder:text-ink-mute"
                    />
                  </div>
                  <div className={`rounded-2xl p-4 ${change >= 0 && received > 0 ? 'bg-emerald-500 text-white' : 'bg-white'}`}>
                    <p className={`text-xs ${change >= 0 && received > 0 ? 'text-white/85' : 'text-ink-soft'}`}>{change >= 0 ? 'Cambio' : 'Faltan'}</p>
                    <p className={`text-4xl font-semibold tracking-tight ${change < 0 ? 'text-red-500' : ''}`}>{formatMoney(Math.abs(received ? change : total))}</p>
                  </div>
                  {change > 0 && (
                    <div className="rounded-2xl bg-white p-3">
                      <p className="mb-2 text-[11px] font-medium text-ink-soft">Entrega de cambio</p>
                      <PiecesRow pieces={changeBreakdown.pieces} size="sm" />
                      {changeBreakdown.remainder > 0 && <p className="mt-2 text-[10px] text-ink-soft">+ {Math.round(changeBreakdown.remainder * 100)}¢ en morralla</p>}
                    </div>
                  )}
                  <button onClick={pay} disabled={!canPay} className="btn-primary mt-auto py-4 text-base">
                    Cobrar {formatMoney(total)} <kbd className="rounded bg-white/25 px-1.5 text-[10px]">Enter</kbd>
                  </button>
                </div>
              </div>
            ) : method === 'credit' && customer ? (
              <div className="mx-auto flex w-full max-w-md flex-col gap-4 p-6">
                <div className="flex items-center gap-3 rounded-2xl bg-tile p-4">
                  <Avatar src={customer.avatar} name={customer.name} size="size-12" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{customer.name}</p>
                    <p className="text-xs text-ink-soft">Plazo de {customer.creditDays} días · límite {formatMoney(customer.creditLimit)}</p>
                  </div>
                </div>
                <div className="space-y-1.5 rounded-2xl border border-line p-4 text-sm">
                  <div className="flex justify-between"><span className="text-ink-soft">Saldo actual</span><span>{formatMoney(customer.balance)}</span></div>
                  <div className="flex justify-between"><span className="text-ink-soft">Este ticket</span><span>+{formatMoney(total)}</span></div>
                  <div className="flex justify-between border-t border-dashed border-line pt-1.5 text-base font-semibold"><span>Nuevo saldo</span><span>{formatMoney(customer.balance + total)}</span></div>
                  <CreditMeter balance={Math.min(customer.balance + total, customer.creditLimit)} limit={customer.creditLimit} />
                </div>
                {customer.overdueDays > 0 && (
                  <p className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
                    <AlertTriangle className="size-4 shrink-0" /> Tiene {customer.overdueDays} días de atraso. Considera pedir un abono antes de fiar.
                  </p>
                )}
                {!creditOk && (
                  <p className="rounded-xl bg-red-50 p-3 text-xs text-red-600">
                    El ticket rebasa su crédito disponible ({formatMoney(customer.available)}). Cobra una parte en efectivo o pide un abono.
                  </p>
                )}
                <button onClick={pay} disabled={!canPay} className="btn py-4 text-base text-white bg-amber-500 hover:bg-amber-600">
                  <HandCoins className="size-5" /> Cargar {formatMoney(total)} a su cuenta
                </button>
              </div>
            ) : (
              <div className="mx-auto flex w-full max-w-md flex-col gap-4 p-6">
                <div className="grid place-items-center gap-2 rounded-3xl bg-tile py-8">
                  {method === 'card' ? <CreditCard className="size-12 text-brand-500" /> : <Landmark className="size-12 text-brand-500" />}
                  <p className="text-sm text-ink-soft">{method === 'card' ? 'Cobra en la terminal bancaria' : 'Espera la confirmación del SPEI'}</p>
                  <p className="text-3xl font-semibold">{formatMoney(total)}</p>
                  {method === 'transfer' && <p className="font-mono text-xs text-ink-soft">CLABE 0121 8000 1234 5678 90</p>}
                </div>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-ink-soft">{method === 'card' ? 'Autorización o últimos 4 dígitos (opcional)' : 'Folio de rastreo (opcional)'}</span>
                  <input autoFocus className="input" value={reference} onChange={(e) => setReference(e.target.value)} />
                </label>
                <button onClick={pay} disabled={!canPay} className="btn-primary py-4 text-base">
                  {method === 'card' ? 'Pago aprobado' : 'Transferencia recibida'} · {formatMoney(total)}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}

function SuccessView({ sale, onPrint, onNew, buttonRef }: { sale: Sale; onPrint: () => void; onNew: () => void; buttonRef: React.RefObject<HTMLButtonElement | null> }) {
  const change = sale.change ?? 0
  const pieces = breakdown(change).pieces
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
      <div className="grid size-20 place-items-center rounded-full bg-emerald-50 text-emerald-500">
        <CheckCircle2 className="size-12" />
      </div>
      <div>
        <p className="text-sm text-ink-soft">Venta #{sale.number} cobrada</p>
        <p className="text-2xl font-semibold">{formatMoney(sale.total)}</p>
        {sale.discount > 0 && <p className="text-xs text-emerald-600">El cliente ahorró {formatMoney(sale.discount)}</p>}
      </div>
      {sale.payment === 'credit' && sale.creditBalanceAfter != null && (
        <div className="w-full max-w-md rounded-3xl bg-amber-500 p-5 text-white">
          <p className="text-sm text-white/85">Cargado a la cuenta del cliente</p>
          <p className="text-4xl font-semibold tracking-tight">Saldo {formatMoney(sale.creditBalanceAfter)}</p>
          <p className="mt-1 text-xs text-white/85">Imprime el ticket para que lo firme de conformidad.</p>
        </div>
      )}
      {sale.payment === 'cash' && (
        <div className="w-full max-w-md rounded-3xl bg-emerald-500 p-5 text-white">
          <p className="text-sm text-white/85">Entrega de cambio</p>
          <p className="text-5xl font-semibold tracking-tight">{formatMoney(change)}</p>
          {pieces.length > 0 && (
            <div className="mt-3 flex justify-center rounded-2xl bg-white p-3 text-ink">
              <PiecesRow pieces={pieces} size="sm" className="justify-center" />
            </div>
          )}
        </div>
      )}
      <div className="flex w-full max-w-md gap-2">
        <button onClick={onPrint} className="btn-ghost flex-1 py-3">
          <Printer className="size-4" /> Ticket
        </button>
        <button ref={buttonRef} onClick={onNew} className="btn-primary flex-[2] py-3">
          Nueva venta <kbd className="rounded bg-white/25 px-1.5 text-[10px]">Enter</kbd>
        </button>
      </div>
    </div>
  )
}
