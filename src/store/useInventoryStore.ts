import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SEED_PRODUCTS, SEED_SUPPLIER_ORDERS, SEED_WASTE } from '../data/seed'
import { uid } from '../utils/format'
import type { OrderStatus, Product, SupplierOrder, WasteItem, WasteLogEntry } from '../types'

export const ORDER_STATUS: Record<OrderStatus, { label: string; next: OrderStatus | null; nextLabel?: string }> = {
  approval: { label: 'Aprobación', next: 'transit', nextLabel: 'Aprobar' },
  transit: { label: 'En tránsito', next: 'delivered', nextLabel: 'Marcar recibido' },
  delivered: { label: 'Entregado', next: null },
  cancelled: { label: 'Cancelado', next: null },
}

export type ProductInput = Omit<Product, 'id' | 'barcode' | 'lastRestocked'> & Partial<Pick<Product, 'barcode'>>
export type OrderInput = Pick<SupplierOrder, 'supplier' | 'productId' | 'qty' | 'expected'>

interface InventoryState {
  products: Product[]
  supplierOrders: SupplierOrder[]
  waste: WasteItem[]
  wasteLog: WasteLogEntry[]
  addProduct: (data: ProductInput) => Product
  updateProduct: (id: string, patch: Partial<Product>) => void
  deleteProduct: (id: string) => void
  adjustStock: (id: string, delta: number) => void
  restock: (id: string, qty: number) => void
  createOrder: (data: OrderInput) => SupplierOrder
  advanceOrder: (id: string) => OrderStatus | null
  cancelOrder: (id: string) => void
  addWaste: (data: Omit<WasteItem, 'id'>) => void
  removeWaste: (id: string) => void
}

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set, get) => ({
      products: SEED_PRODUCTS,
      supplierOrders: SEED_SUPPLIER_ORDERS,
      waste: SEED_WASTE,
      wasteLog: [],

      addProduct: (data) => {
        const product: Product = {
          id: uid('p'),
          barcode: `750${Date.now().toString().slice(-10)}`,
          lastRestocked: new Date().toISOString(),
          ...data,
        }
        set((s) => ({ products: [product, ...s.products] }))
        return product
      },
      updateProduct: (id, patch) =>
        set((s) => ({ products: s.products.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      deleteProduct: (id) =>
        set((s) => ({
          products: s.products.filter((p) => p.id !== id),
          waste: s.waste.filter((w) => w.productId !== id),
        })),

      adjustStock: (id, delta) =>
        set((s) => ({
          products: s.products.map((p) => (p.id === id ? { ...p, stock: Math.max(0, p.stock + delta) } : p)),
        })),
      restock: (id, qty) =>
        set((s) => ({
          products: s.products.map((p) =>
            p.id === id ? { ...p, stock: p.stock + qty, lastRestocked: new Date().toISOString() } : p,
          ),
        })),

      createOrder: ({ supplier, productId, qty, expected }) => {
        const max = Math.max(2450, ...get().supplierOrders.map((o) => Number(o.code.replace(/\D/g, '')) || 0))
        const order: SupplierOrder = {
          id: uid('o'),
          code: `#ORD${max + 1}`,
          supplier,
          productId,
          qty,
          expected,
          status: 'approval',
          createdAt: new Date().toISOString(),
        }
        set((s) => ({ supplierOrders: [order, ...s.supplierOrders] }))
        return order
      },
      advanceOrder: (id) => {
        const order = get().supplierOrders.find((o) => o.id === id)
        const next = order ? ORDER_STATUS[order.status].next : null
        if (!order || !next) return null
        set((s) => ({ supplierOrders: s.supplierOrders.map((o) => (o.id === id ? { ...o, status: next } : o)) }))
        if (next === 'delivered') get().restock(order.productId, order.qty)
        return next
      },
      cancelOrder: (id) =>
        set((s) => ({ supplierOrders: s.supplierOrders.map((o) => (o.id === id ? { ...o, status: 'cancelled' } : o)) })),

      addWaste: ({ productId, qty, expiry }) =>
        set((s) => ({ waste: [...s.waste, { id: uid('w'), productId, qty, expiry }] })),
      removeWaste: (id) => {
        const item = get().waste.find((w) => w.id === id)
        if (!item) return
        get().adjustStock(item.productId, -item.qty)
        set((s) => ({
          waste: s.waste.filter((w) => w.id !== id),
          wasteLog: [{ ...item, removedAt: new Date().toISOString() }, ...s.wasteLog],
        }))
      },
    }),
    { name: 'tiendita-inventory' },
  ),
)
