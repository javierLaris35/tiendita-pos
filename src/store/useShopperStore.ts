// Cuenta del cliente en la tienda en línea / escanea y paga, y sus carritos.
import { useMemo } from 'react'
import { create, type StateCreator } from 'zustand'
import { persist } from 'zustand/middleware'
import { useCustomerStore } from './useCustomerStore'
import { useInventoryStore } from './useInventoryStore'
import { useOrderStore } from './useOrderStore'
import { usePromotionStore } from './usePromotionStore'
import { useSettingsStore } from './useSettingsStore'
import { computeTicket, isPromoActive } from '../utils/promotions'
import { availableOf, reservedByProduct, samePhone } from '../utils/orders'
import type { Customer, Product, Ticket } from '../types'

export type ShopperResult = { ok: true; customer: Customer } | { ok: false; error: string }

interface ShopperState {
  customerId: string | null
  login: (identifier: string, password: string) => ShopperResult
  register: (data: { name: string; email: string; phone: string; password: string }) => ShopperResult
  logout: () => void
}

export const useShopperStore = create<ShopperState>()(
  persist(
    (set) => ({
      customerId: null,
      login: (identifier, password) => {
        const id = identifier.trim().toLowerCase()
        const c = useCustomerStore.getState().customers.find((x) => x.email.toLowerCase() === id || samePhone(x.phone, id))
        if (!c || !c.password) return { ok: false, error: 'No encontramos una cuenta con ese correo o teléfono.' }
        if (c.password !== password) return { ok: false, error: 'La contraseña no coincide.' }
        set({ customerId: c.id })
        return { ok: true, customer: c }
      },
      register: ({ name, email, phone, password }) => {
        const store = useCustomerStore.getState()
        if (password.length < 6) return { ok: false, error: 'La contraseña necesita al menos 6 caracteres.' }
        const existing = store.customers.find((x) => (email && x.email.toLowerCase() === email.toLowerCase()) || samePhone(x.phone, phone))
        if (existing?.password) return { ok: false, error: 'Ya existe una cuenta con ese correo o teléfono. Inicia sesión.' }
        // Si ya era cliente de la tienda (p. ej. por WhatsApp), se le activa la cuenta en línea
        let customer: Customer
        if (existing) {
          store.updateCustomer(existing.id, { name, email, phone, password })
          customer = { ...existing, name, email, phone, password }
        } else {
          customer = store.addCustomer({ name, email, phone, password, segment: 'Ocasional' })
        }
        set({ customerId: customer.id })
        return { ok: true, customer }
      },
      logout: () => set({ customerId: null }),
    }),
    { name: 'tiendita-shopper' },
  ),
)

export const useShopper = () => {
  const id = useShopperStore((s) => s.customerId)
  return useCustomerStore((s) => s.customers.find((c) => c.id === id))
}

// ---------- Carritos del cliente (tienda en línea y escanea-y-paga)

export interface ShopCartState {
  items: { productId: string; qty: number }[]
  branchId: string | null
  setQty: (productId: string, qty: number) => { ok: boolean; available: number }
  add: (productId: string, qty?: number) => { ok: boolean; available: number }
  clear: () => void
  setBranch: (id: string) => void
}

/** Disponible para venta en línea: inventario global menos lo apartado por otros pedidos. */
export function availableNow(productId: string): number {
  const p = useInventoryStore.getState().products.find((x) => x.id === productId)
  if (!p) return 0
  return availableOf(p, reservedByProduct(useOrderStore.getState().orders))
}

const cartSlice: StateCreator<ShopCartState> = (set, get) => ({
  items: [],
  branchId: null,
  setQty: (productId, qty) => {
    const available = availableNow(productId)
    const next = Math.min(Math.max(0, Math.round(qty * 1000) / 1000), available)
    set((s) => ({
      items: next <= 0 ? s.items.filter((i) => i.productId !== productId) : s.items.some((i) => i.productId === productId) ? s.items.map((i) => (i.productId === productId ? { ...i, qty: next } : i)) : [...s.items, { productId, qty: next }],
    }))
    return { ok: next >= qty, available }
  },
  add: (productId, qty = 1) => get().setQty(productId, (get().items.find((i) => i.productId === productId)?.qty ?? 0) + qty),
  clear: () => set({ items: [] }),
  setBranch: (branchId) => set({ branchId }),
})

export const useWebCart = create<ShopCartState>()(persist(cartSlice, { name: 'tiendita-webcart' }))
export const useScanCart = create<ShopCartState>()(persist(cartSlice, { name: 'tiendita-scancart' }))

/** Líneas + ticket con las ofertas vigentes en la sucursal indicada. */
export function useShopTicket(items: { productId: string; qty: number }[], branchId: string | null): { lines: (Product & { qty: number })[]; ticket: Ticket } {
  const products = useInventoryStore((s) => s.products)
  const promotions = usePromotionStore((s) => s.promotions)
  const taxPct = useSettingsStore((s) => s.taxPct)
  return useMemo(() => {
    const lines = items.flatMap((i) => {
      const p = products.find((x) => x.id === i.productId)
      return p ? [{ ...p, qty: i.qty }] : []
    })
    const promos = promotions.filter((p) => isPromoActive(p, branchId ?? 's1'))
    return { lines, ticket: computeTicket(lines.map((l) => ({ ...l, productId: l.id })), promos, taxPct, products) }
  }, [items, products, promotions, taxPct, branchId])
}
