import { useMemo } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useInventoryStore } from './useInventoryStore'
import { useOrderStore } from './useOrderStore'
import { availableOf, reservedByProduct } from '../utils/orders'
import { useActivePromotions } from './usePromotionStore'
import { useSettingsStore } from './useSettingsStore'
import { toast } from './useUiStore'
import { computeTicket } from '../utils/promotions'
import { uid } from '../utils/format'
import type { Product, Ticket } from '../types'

export interface CartItem {
  productId: string
  /** Piezas, o kilos para productos a granel */
  qty: number
}

export type CartLine = Product & CartItem

export interface ParkedTicket {
  id: string
  items: CartItem[]
  customerId: string | null
  parkedAt: string
}

interface CartState {
  items: CartItem[]
  customerId: string | null
  /** Pedido (web/WhatsApp/QR) que se está cobrando en este ticket */
  orderId: string | null
  parked: ParkedTicket[]
  add: (productId: string, qty?: number) => boolean
  setQty: (productId: string, qty: number) => void
  inc: (productId: string) => boolean
  dec: (productId: string) => void
  remove: (productId: string) => void
  clear: () => void
  setCustomer: (customerId: string | null) => void
  park: () => boolean
  resume: (id: string) => void
  discardParked: (id: string) => void
}

const productById = (id: string) => useInventoryStore.getState().products.find((p) => p.id === id)
/** Existencia vendible en caja: lo apartado por pedidos no se puede vender, salvo el pedido que se está cobrando. */
const sellable = (id: string) => {
  const p = productById(id)
  return p ? availableOf(p, reservedByProduct(useOrderStore.getState().orders, useCartStore.getState().orderId)) : 0
}
const round3 = (n: number) => Math.round(n * 1000) / 1000

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      customerId: null,
      orderId: null,
      parked: [],

      add: (productId, qty = 1) => {
        const product = productById(productId)
        if (!product) return false
        const current = get().items.find((i) => i.productId === productId)?.qty ?? 0
        const available = sellable(productId)
        if (round3(current + qty) > available) {
          const reserved = available < product.stock
          toast({
            type: 'error',
            title: available ? 'Stock insuficiente' : reserved ? 'Apartado para pedidos' : 'Producto agotado',
            message: available
              ? `Solo hay ${available} ${product.unit === 'kg' ? 'kg' : 'unidades'} disponibles de ${product.name}.`
              : reserved
                ? `Las existencias de ${product.name} están apartadas para pedidos en línea.`
                : `${product.name} no tiene existencias.`,
          })
          return false
        }
        set((s) => ({
          items: current
            ? s.items.map((i) => (i.productId === productId ? { ...i, qty: round3(i.qty + qty) } : i))
            : [...s.items, { productId, qty: round3(qty) }],
        }))
        return true
      },
      setQty: (productId, qty) => {
        if (qty <= 0) return get().remove(productId)
        const product = productById(productId)
        const available = sellable(productId)
        if (product && qty > available) {
          toast({ type: 'error', title: 'Stock insuficiente', message: `Solo hay ${available} disponibles.` })
          qty = available
        }
        set((s) => ({ items: s.items.map((i) => (i.productId === productId ? { ...i, qty: round3(qty) } : i)) }))
      },
      inc: (productId) => get().add(productId, 1),
      dec: (productId) => {
        const item = get().items.find((i) => i.productId === productId)
        if (item) get().setQty(productId, item.qty - 1)
      },
      remove: (productId) => set((s) => ({ items: s.items.filter((i) => i.productId !== productId) })),
      clear: () => set({ items: [], customerId: null, orderId: null }),
      setCustomer: (customerId) => set({ customerId }),

      park: () => {
        const { items, customerId } = get()
        if (!items.length) return false
        set((s) => ({ parked: [{ id: uid('tk'), items, customerId, parkedAt: new Date().toISOString() }, ...s.parked], items: [], customerId: null, orderId: null }))
        return true
      },
      resume: (id) => {
        const ticket = get().parked.find((t) => t.id === id)
        if (!ticket) return
        // Si hay una venta en curso, se pone en espera para no perderla
        get().park()
        set((s) => ({ items: ticket.items, customerId: ticket.customerId, parked: s.parked.filter((t) => t.id !== id) }))
      },
      discardParked: (id) => set((s) => ({ parked: s.parked.filter((t) => t.id !== id) })),
    }),
    { name: 'tiendita-cart' },
  ),
)

/** Une las líneas del carrito con los datos actuales del producto. */
export function useCartLines(): CartLine[] {
  const items = useCartStore((s) => s.items)
  const products = useInventoryStore((s) => s.products)
  return useMemo(
    () =>
      items.flatMap((i) => {
        const p = products.find((x) => x.id === i.productId)
        return p ? [{ ...p, productId: p.id, qty: i.qty }] : []
      }),
    [items, products],
  )
}

/** Ticket en curso con ofertas aplicadas y sugerencias. */
export function useTicket(): { lines: CartLine[]; ticket: Ticket } {
  const lines = useCartLines()
  const promos = useActivePromotions()
  const products = useInventoryStore((s) => s.products)
  const taxPct = useSettingsStore((s) => s.taxPct)
  const ticket = useMemo(() => computeTicket(lines, promos, taxPct, products), [lines, promos, taxPct, products])
  return { lines, ticket }
}
