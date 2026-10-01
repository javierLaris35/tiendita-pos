import type { Option, Period } from '../types'

export const PERIODS: Option<Period>[] = [
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: 'Esta semana' },
  { value: 'month', label: 'Este mes' },
  { value: 'year', label: 'Este año' },
  { value: 'all', label: 'Todo' },
]

export const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
export const WEEKDAYS_LONG = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

/** Returns { start, end, prevStart, prevEnd } as timestamps for a period. */
export function periodRange(period: Period, now = new Date()) {
  const end = now.getTime()
  const today = startOfDay(now)
  let start: number
  let prevStart: number
  switch (period) {
    case 'today':
      start = today.getTime()
      prevStart = start - 86400000
      break
    case 'week': {
      const s = new Date(today)
      s.setDate(s.getDate() - s.getDay())
      start = s.getTime()
      prevStart = start - 7 * 86400000
      break
    }
    case 'month': {
      start = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime()
      break
    }
    case 'year':
      start = new Date(now.getFullYear(), 0, 1).getTime()
      prevStart = new Date(now.getFullYear() - 1, 0, 1).getTime()
      break
    default:
      start = 0
      prevStart = 0
  }
  // previous window has the same elapsed length as the current one
  const prevEnd = period === 'all' ? 0 : prevStart + (end - start)
  return { start, end, prevStart, prevEnd }
}

export const inRange = (iso: string, start: number, end: number) => {
  const t = new Date(iso).getTime()
  return t >= start && t <= end
}

export function filterByPeriod<T extends { date: string }>(list: T[], period: Period): T[] {
  const { start, end } = periodRange(period)
  return list.filter((x) => inRange(x.date, start, end))
}

export function pctChange(curr: number, prev: number) {
  if (!prev) return curr ? 100 : 0
  return ((curr - prev) / prev) * 100
}
