import type { CreditPayment, Customer, Sale } from '../types'

const round2 = (n: number) => Math.round(n * 100) / 100
const DAY = 86400000

export interface StatementEntry {
  id: string
  date: string
  kind: 'charge' | 'payment'
  amount: number
  /** Saldo después del movimiento */
  balance: number
  saleId?: string
  label: string
}

export interface CreditInfo {
  balance: number
  available: number
  lastPayment: string | null
  overdueDays: number
  statement: StatementEntry[]
}

/**
 * Saldo y estado de cuenta: los cargos salen de las ventas a crédito (no reembolsadas)
 * y los abonos del libro de pagos, así una devolución baja el saldo automáticamente.
 */
export function creditInfo(customer: Customer, sales: Sale[], payments: CreditPayment[]): CreditInfo {
  const charges = sales.filter((s) => s.customerId === customer.id && s.payment === 'credit' && !s.refunded)
  const abonos = payments.filter((p) => p.customerId === customer.id)
  const entries = [
    ...charges.map((s) => ({ id: s.id, date: s.date, kind: 'charge' as const, amount: s.total, saleId: s.id, label: `Compra ticket #${s.number}` })),
    ...abonos.map((p) => ({ id: p.id, date: p.date, kind: 'payment' as const, amount: p.amount, label: `Abono folio A-${p.folio}` })),
  ].sort((a, b) => a.date.localeCompare(b.date))

  let balance = 0
  const statement: StatementEntry[] = entries.map((e) => {
    balance = round2(balance + (e.kind === 'charge' ? e.amount : -e.amount))
    return { ...e, balance }
  })

  const lastPayment = abonos.reduce<string | null>((m, p) => (!m || p.date > m ? p.date : m), null)
  // Vencido: tiene saldo y lleva más días que su plazo sin abonar (o desde su primer cargo pendiente)
  const firstUnpaid = statement.findLast((e) => e.balance <= 0.004)
  const since = lastPayment ?? statement.find((e) => e.kind === 'charge' && (!firstUnpaid || e.date > firstUnpaid.date))?.date ?? null
  const days = since ? Math.floor((Date.now() - new Date(since).getTime()) / DAY) : 0
  const overdueDays = balance > 0.004 && days > customer.creditDays ? days - customer.creditDays : 0

  return {
    balance,
    available: customer.creditEnabled ? round2(Math.max(0, customer.creditLimit - balance)) : 0,
    lastPayment,
    overdueDays,
    statement: statement.reverse(),
  }
}
