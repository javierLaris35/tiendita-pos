import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useBranchStore } from '../store/useBranchStore'
import { useSalesStore } from '../store/useSalesStore'
import { useCustomerStore } from '../store/useCustomerStore'
import { creditInfo } from '../utils/credit'
import type { CustomerWithStats } from '../types'

export function useClickOutside<T extends HTMLElement = HTMLDivElement>(onOutside: () => void, active = true) {
  const ref = useRef<T>(null)
  useEffect(() => {
    if (!active) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onOutside, active])
  return ref
}

export function useElementSize<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  useLayoutEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ width, height })
    })
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, size] as const
}

/** Ventas (no reembolsadas) de la sucursal activa. */
export function useBranchSales() {
  const sales = useSalesStore((s) => s.sales)
  const branchId = useBranchStore((s) => s.activeBranchId)
  return useMemo(() => sales.filter((s) => s.storeId === branchId && !s.refunded), [sales, branchId])
}

/** Clientes enriquecidos con compras, última compra y estado de su crédito. */
export function useCustomerStats(): CustomerWithStats[] {
  const customers = useCustomerStore((s) => s.customers)
  const payments = useCustomerStore((s) => s.payments)
  const sales = useSalesStore((s) => s.sales)
  return useMemo(() => {
    const stats: Record<string, { total: number; orders: number; last: string | null }> = {}
    for (const sale of sales) {
      if (!sale.customerId || sale.refunded) continue
      const st = (stats[sale.customerId] ??= { total: 0, orders: 0, last: null })
      st.total += sale.total
      st.orders += 1
      if (!st.last || sale.date > st.last) st.last = sale.date
    }
    return customers.map((c) => {
      const { balance, available, lastPayment, overdueDays } = creditInfo(c, sales, payments)
      return { ...c, ...(stats[c.id] ?? { total: 0, orders: 0, last: null }), balance, available, lastPayment, overdueDays }
    })
  }, [customers, sales, payments])
}
