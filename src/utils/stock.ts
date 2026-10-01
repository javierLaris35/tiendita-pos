import type { Product, StockStatus } from '../types'

export const STOCK_STATUS: Record<StockStatus, { label: string; dot: string; text: string; pill: string }> = {
  ok: { label: 'En stock', dot: 'bg-emerald-500', text: 'text-emerald-600', pill: 'bg-emerald-50 text-emerald-700' },
  low: { label: 'Stock bajo', dot: 'bg-amber-400', text: 'text-amber-600', pill: 'bg-amber-50 text-amber-700' },
  out: { label: 'Agotado', dot: 'bg-red-500', text: 'text-red-500', pill: 'bg-red-50 text-red-600' },
}

export function stockStatus(p: Product | null | undefined): StockStatus {
  if (!p || p.stock <= 0) return 'out'
  if (p.stock <= p.minStock) return 'low'
  return 'ok'
}
