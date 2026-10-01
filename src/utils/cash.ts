import { BILLS, MONEY } from '../data/money'
import type { CashCount, CashSession, CreditPayment, Sale } from '../types'

const round2 = (n: number) => Math.round(n * 100) / 100

export interface Piece {
  value: number
  count: number
}

/** Desglose mínimo de un importe en billetes y monedas (greedy, a múltiplos de 50¢). */
export function breakdown(amount: number, values: number[] = MONEY.map((m) => m.value)): { pieces: Piece[]; remainder: number } {
  let rest = Math.round(amount * 100)
  const pieces: Piece[] = []
  for (const v of values) {
    const cents = Math.round(v * 100)
    const count = Math.floor(rest / cents)
    if (count > 0) {
      pieces.push({ value: v, count })
      rest -= count * cents
    }
  }
  return { pieces, remainder: rest / 100 }
}

/**
 * Importes con los que probablemente pagará el cliente: exacto y los siguientes
 * redondeos naturales a billetes ($150, $200, $500...).
 */
export function paymentSuggestions(total: number): { amount: number; pieces: Piece[]; exact: boolean }[] {
  if (total <= 0) return []
  const exact = Math.ceil(total * 2) / 2 // efectivo a múltiplos de 50¢
  const candidates = new Set<number>([exact])
  for (const step of [10, 20, 50, 100, 200, 500, 1000]) {
    const c = Math.ceil(total / step) * step
    if (c > exact) candidates.add(c)
  }
  return [...candidates]
    .sort((a, b) => a - b)
    .slice(0, 5)
    .map((amount) => {
      // Para el exacto se usan monedas; para redondeos, solo billetes
      const values = amount === exact ? MONEY.map((m) => m.value) : BILLS.map((b) => b.value)
      const { pieces, remainder } = breakdown(amount, values)
      return remainder ? null : { amount, pieces, exact: amount === exact }
    })
    .filter((x): x is { amount: number; pieces: Piece[]; exact: boolean } => x !== null)
}

export const countTotal = (count: CashCount) => round2(Object.entries(count).reduce((a, [v, n]) => a + Number(v) * n, 0))

export interface SessionSummary {
  sales: Sale[]
  tickets: number
  cashSales: number
  cardSales: number
  transferSales: number
  creditSales: number
  totalSales: number
  /** Abonos a crédito recibidos en el turno (el efectivo entra al esperado) */
  abonosCash: number
  abonosOther: number
  cashIn: number
  cashOut: number
  expected: number
  savings: number
}

export function sessionSummary(session: CashSession, allSales: Sale[], payments: CreditPayment[] = []): SessionSummary {
  const sales = allSales.filter((s) => s.sessionId === session.id && !s.refunded)
  const by = (m: Sale['payment']) => round2(sales.filter((s) => s.payment === m).reduce((a, s) => a + s.total, 0))
  const cashSales = by('cash')
  const cashIn = round2(session.movements.filter((m) => m.type === 'in').reduce((a, m) => a + m.amount, 0))
  const cashOut = round2(session.movements.filter((m) => m.type === 'out').reduce((a, m) => a + m.amount, 0))
  const abonos = payments.filter((p) => p.sessionId === session.id)
  const abonosCash = round2(abonos.filter((p) => p.method === 'cash').reduce((a, p) => a + p.amount, 0))
  const abonosOther = round2(abonos.filter((p) => p.method !== 'cash').reduce((a, p) => a + p.amount, 0))
  return {
    sales,
    tickets: sales.length,
    cashSales,
    cardSales: by('card'),
    transferSales: by('transfer'),
    creditSales: by('credit'),
    abonosCash,
    abonosOther,
    totalSales: round2(sales.reduce((a, s) => a + s.total, 0)),
    cashIn,
    cashOut,
    expected: round2(session.openingAmount + cashSales + abonosCash + cashIn - cashOut),
    savings: round2(sales.reduce((a, s) => a + s.discount, 0)),
  }
}

export const registerLabel = (n: number | null | undefined) => `Caja ${String(n ?? 0).padStart(2, '0')}`
