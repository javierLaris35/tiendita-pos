import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { seedHistory } from '../data/seed'
import type { PaymentMethod, Sale } from '../types'

export const PAYMENT_METHODS: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  credit: 'Crédito',
  online: 'Pago en línea',
}

interface SalesState {
  sales: Sale[]
  addSale: (sale: Omit<Sale, 'id' | 'number'>) => Sale
  refundSale: (id: string) => void
}

export const useSalesStore = create<SalesState>()(
  persist(
    (set, get) => ({
      sales: seedHistory().sales,
      addSale: (sale) => {
        const number = Math.max(1000, ...get().sales.map((s) => s.number)) + 1
        const full: Sale = { ...sale, id: `sale-${number}`, number }
        set((s) => ({ sales: [full, ...s.sales] }))
        return full
      },
      refundSale: (id) => set((s) => ({ sales: s.sales.map((x) => (x.id === id ? { ...x, refunded: true } : x)) })),
    }),
    { name: 'tiendita-sales' },
  ),
)

export const nextSaleNumber = () => Math.max(1000, ...useSalesStore.getState().sales.map((s) => s.number)) + 1
