// Acciones que coordinan varios stores (cobro, alertas, reinicio del demo).
import { useAuthStore } from './useAuthStore'
import { useBranchStore } from './useBranchStore'
import { useCartStore } from './useCartStore'
import { mySessionNow } from './useCashStore'
import { useInventoryStore } from './useInventoryStore'
import { activePromotionsNow } from './usePromotionStore'
import { useSalesStore } from './useSalesStore'
import { useSettingsStore } from './useSettingsStore'
import { useCustomerStore } from './useCustomerStore'
import { closeOrderWithSale } from './orderActions'
import { notify, toast } from './useUiStore'
import { creditInfo } from '../utils/credit'
import { computeTicket } from '../utils/promotions'
import { stockStatus } from '../utils/stock'
import { CATEGORIES } from '../data/seed'
import type { AbonoMethod, CreditPayment, PaymentMethod, Sale, SaleItem } from '../types'
import { formatMoney } from '../utils/format'

interface PurchaseInput {
  payment: PaymentMethod
  cashReceived?: number | null
  cardRef?: string
}

export function completePurchase({ payment, cashReceived = null, cardRef }: PurchaseInput): Sale | null {
  const cart = useCartStore.getState()
  const inventory = useInventoryStore.getState()
  const settings = useSettingsStore.getState()
  const session = mySessionNow()
  if (!session) {
    toast({ type: 'error', title: 'Caja cerrada', message: 'Abre un turno de caja para poder cobrar.' })
    return null
  }

  const lines: (SaleItem & { unit: 'pz' | 'kg' })[] = []
  for (const item of cart.items) {
    const p = inventory.products.find((x) => x.id === item.productId)
    if (!p) continue
    if (p.stock < item.qty) {
      toast({ type: 'error', title: 'Stock insuficiente', message: `${p.name}: quedan ${p.stock}.` })
      return null
    }
    lines.push({ productId: p.id, name: p.name, category: p.category, emoji: p.emoji, price: p.price, qty: item.qty, unit: p.unit })
  }
  if (!lines.length) return null

  const ticket = computeTicket(lines, activePromotionsNow(), settings.taxPct, inventory.products)

  // Venta a crédito: solo clientes con fiado autorizado y con disponible suficiente
  let creditBalanceAfter: number | undefined
  if (payment === 'credit') {
    const customer = useCustomerStore.getState().customers.find((c) => c.id === cart.customerId)
    if (!customer?.creditEnabled) {
      toast({ type: 'error', title: 'Sin crédito', message: 'Asigna un cliente con crédito autorizado.' })
      return null
    }
    const info = creditInfo(customer, useSalesStore.getState().sales, useCustomerStore.getState().payments)
    if (ticket.total > info.available + 0.001) {
      toast({ type: 'error', title: 'Crédito insuficiente', message: `Disponible ${formatMoney(info.available)}.` })
      return null
    }
    creditBalanceAfter = Math.round((info.balance + ticket.total) * 100) / 100
  }
  const sale = useSalesStore.getState().addSale({
    date: new Date().toISOString(),
    customerId: cart.customerId,
    cashierId: useAuthStore.getState().userId,
    storeId: useBranchStore.getState().activeBranchId,
    sessionId: session.id,
    register: session.register,
    payment,
    cashReceived,
    change: cashReceived != null ? Math.max(0, Math.round((cashReceived - ticket.total) * 100) / 100) : null,
    cardRef,
    creditBalanceAfter,
    orderId: cart.orderId,
    items: lines.map(({ unit: _unit, ...item }) => item),
    promotions: ticket.promotions,
    subtotal: ticket.subtotal,
    discount: ticket.discount,
    tax: ticket.tax,
    total: ticket.total,
  })

  // Descontar inventario y avisar cuando un producto cruza al umbral de stock bajo
  for (const line of lines) {
    const before = inventory.products.find((p) => p.id === line.productId)
    inventory.adjustStock(line.productId, -line.qty)
    const after = useInventoryStore.getState().products.find((p) => p.id === line.productId)
    if (after && settings.lowStockAlerts && stockStatus(before) !== stockStatus(after) && stockStatus(after) !== 'ok') {
      notify({
        type: 'warning',
        title: stockStatus(after) === 'out' ? `${after.name} agotado` : `Stock bajo: ${after.name}`,
        message: `Quedan ${after.stock}. Considera generar una orden de compra.`,
      })
    }
  }

  if (cart.orderId) closeOrderWithSale(cart.orderId, sale)
  cart.clear()
  return sale
}

/** Registra un abono a la cuenta de crédito; si hay turno abierto queda ligado a la caja. */
export function registerCreditPayment(customerId: string, amount: number, method: AbonoMethod): CreditPayment | null {
  const store = useCustomerStore.getState()
  const customer = store.customers.find((c) => c.id === customerId)
  if (!customer || amount <= 0) return null
  const { balance } = creditInfo(customer, useSalesStore.getState().sales, store.payments)
  if (amount > balance + 0.001) {
    toast({ type: 'error', title: 'El abono supera el saldo', message: `El cliente debe ${formatMoney(balance)}.` })
    return null
  }
  const session = mySessionNow()
  return store.addPayment({
    customerId,
    amount,
    method,
    sessionId: session?.id ?? null,
    register: session?.register ?? null,
    by: useAuthStore.getState().userId,
    balanceAfter: Math.round((balance - amount) * 100) / 100,
  })
}

/** Muestra un aviso de la categoría con más productos en stock bajo. */
export function announceLowStock() {
  const products = useInventoryStore.getState().products
  const low = products.filter((p) => stockStatus(p) !== 'ok')
  if (!low.length) return
  const byCat = low.reduce<Record<string, number>>((acc, p) => ({ ...acc, [p.category]: (acc[p.category] ?? 0) + 1 }), {})
  const [catId, count] = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0]
  const cat = CATEGORIES.find((c) => c.id === catId)
  notify({
    type: 'warning',
    title: `Stock bajo en ${cat?.name ?? catId}`,
    message: `${count} productos por debajo del mínimo. Haz el pedido hoy por la tarde.`,
    toast: true,
  })
}

export function resetDemo() {
  Object.keys(localStorage)
    .filter((k) => k.startsWith('tiendita-'))
    .forEach((k) => localStorage.removeItem(k))
  window.location.href = '/'
}
