/** Aritmética pura del ticket. Sin dependencias de BD, para poder probarla sola. */

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export function pickUnitPrice(
  p: { price: number; wholesalePrice?: number | null; wholesaleMinQty?: number | null },
  qty: number,
): { unitPrice: number; usedWholesale: boolean } {
  if (p.wholesalePrice != null && p.wholesaleMinQty != null && qty >= p.wholesaleMinQty) {
    return { unitPrice: p.wholesalePrice, usedWholesale: true }
  }
  return { unitPrice: p.price, usedWholesale: false }
}

/** Impuesto contenido en un precio que YA incluye impuesto. */
export function computeLineTax(lineTotal: number, ivaRate: number, iepsRate: number): number {
  const rate = ivaRate + iepsRate
  return round2(lineTotal - lineTotal / (1 + rate))
}

export interface LineInput {
  quantity: number
  unitPrice: number
  unitCost: number
  ivaRate: number
  iepsRate: number
}

export interface LineResult {
  lineTotal: number
  lineTax: number
  lineProfit: number
}

export function computeLine(i: LineInput): LineResult {
  const lineTotal = round2(i.quantity * i.unitPrice)
  const lineTax = computeLineTax(lineTotal, i.ivaRate, i.iepsRate)
  const base = lineTotal - lineTax
  const lineProfit = round2(base - i.quantity * i.unitCost)
  return { lineTotal, lineTax, lineProfit }
}

export interface Totals {
  subtotal: number
  taxTotal: number
  total: number
  profitTotal: number
}

export function computeTotals(lines: LineResult[]): Totals {
  const total = round2(lines.reduce((s, l) => s + l.lineTotal, 0))
  const taxTotal = round2(lines.reduce((s, l) => s + l.lineTax, 0))
  const profitTotal = round2(lines.reduce((s, l) => s + l.lineProfit, 0))
  const subtotal = round2(total - taxTotal)
  return { subtotal, taxTotal, total, profitTotal }
}
