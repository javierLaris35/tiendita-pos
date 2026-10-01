const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
const compact = new Intl.NumberFormat('es-MX', { notation: 'compact', maximumFractionDigits: 1 })
const number = new Intl.NumberFormat('es-MX')

export const formatMoney = (n: number | null | undefined) => money.format(Number(n) || 0)
export const formatCompact = (n: number) => compact.format(Number(n) || 0)
export const formatNumber = (n: number) => number.format(Number(n) || 0)
export const formatPct = (n: number, digits = 1) => `${(Number(n) || 0).toFixed(digits)}%`

/** Cantidad en piezas o kilos ("3", "0.750 kg"). */
export const formatQty = (qty: number, unit: 'pz' | 'kg' = 'pz') =>
  unit === 'kg' ? `${qty.toFixed(3)} kg` : String(Math.round(qty * 1000) / 1000)

/** Fecha local YYYY-MM-DD (toISOString usaría UTC y de noche daría el día siguiente). */
export const localIsoDate = (offsetDays = 0) => {
  const d = new Date(Date.now() + offsetDays * 86400000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const formatDate = (iso: string | number | Date) =>
  new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('es-MX', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.round(diff / 60000)
  if (min < 1) return 'Justo ahora'
  if (min < 60) return `Hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `Hace ${h} h`
  const d = Math.round(h / 24)
  if (d === 1) return 'Hace 1 día'
  if (d < 7) return `Hace ${d} días`
  const w = Math.round(d / 7)
  if (w < 5) return w === 1 ? 'Hace 1 semana' : `Hace ${w} semanas`
  const m = Math.round(d / 30)
  return m <= 1 ? 'Hace 1 mes' : `Hace ${m} meses`
}

export const initials = (name = ''): string =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')

export const uid = (prefix = ''): string => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

export function downloadCSV(filename: string, rows: (string | number | null | undefined)[][]) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
