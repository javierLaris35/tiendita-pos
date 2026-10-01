// Ciclo de vida de los pedidos (web, WhatsApp y escanea-y-paga) y su conexión con caja e inventario.
import { useAuthStore } from './useAuthStore'
import { useBranchStore } from './useBranchStore'
import { useCartStore } from './useCartStore'
import { mySessionNow } from './useCashStore'
import { useCustomerStore } from './useCustomerStore'
import { useInventoryStore } from './useInventoryStore'
import { nextOrderCode, useOrderStore } from './useOrderStore'
import { usePromotionStore } from './usePromotionStore'
import { useSalesStore } from './useSalesStore'
import { useSettingsStore } from './useSettingsStore'
import { availableNow } from './useShopperStore'
import { notify } from './useUiStore'
import { computeTicket, isPromoActive } from '../utils/promotions'
import { customerMessage, isActive, parseOrderCode } from '../utils/orders'
import { uid } from '../utils/format'
import type { Fulfillment, Order, OrderChannel, OrderItem, PaymentMethod, PedidoStatus, Sale } from '../types'

const round2 = (n: number) => Math.round(n * 100) / 100
const branchName = (id: string) => useBranchStore.getState().branches.find((b) => b.id === id)?.name ?? 'la sucursal'

export interface PlaceOrderInput {
  channel: OrderChannel
  fulfillment: Fulfillment
  customerId: string
  branchId: string
  address?: string
  items: { productId: string; qty: number }[]
  paymentMode: Order['paymentMode']
  paid: boolean
  notes?: string
}

export type PlaceOrderResult = { ok: true; order: Order } | { ok: false; error: string; shortages: { name: string; requested: number; available: number }[] }

/** Calcula el ticket del pedido (ofertas de la sucursal + envío). */
export function quoteOrder(items: { productId: string; qty: number }[], branchId: string, fulfillment: Fulfillment) {
  const products = useInventoryStore.getState().products
  const settings = useSettingsStore.getState()
  const promos = usePromotionStore.getState().promotions.filter((p) => isPromoActive(p, branchId))
  const lines = items.flatMap((i) => {
    const p = products.find((x) => x.id === i.productId)
    return p ? [{ product: p, qty: i.qty }] : []
  })
  const ticket = computeTicket(lines.map(({ product: p, qty }) => ({ productId: p.id, price: p.price, qty, category: p.category, unit: p.unit })), promos, settings.taxPct, products)
  const deliveryFee = fulfillment === 'delivery' && ticket.total < settings.freeDeliveryFrom ? settings.deliveryFee : 0
  return { lines, ticket, deliveryFee, total: round2(ticket.total + deliveryFee) }
}

export function placeOrder(input: PlaceOrderInput): PlaceOrderResult {
  const customer = useCustomerStore.getState().customers.find((c) => c.id === input.customerId)
  if (!customer) return { ok: false, error: 'Cliente no encontrado.', shortages: [] }
  if (!input.items.length) return { ok: false, error: 'El pedido está vacío.', shortages: [] }

  // No se vende lo que no hay: se valida contra el inventario menos lo apartado por otros pedidos
  const products = useInventoryStore.getState().products
  const shortages = input.items.flatMap((i) => {
    const available = availableNow(i.productId)
    const p = products.find((x) => x.id === i.productId)
    return i.qty > available + 0.0001 ? [{ name: p?.name ?? i.productId, requested: i.qty, available }] : []
  })
  if (shortages.length) return { ok: false, error: 'Algunos productos ya no tienen existencia suficiente.', shortages }

  const { lines, ticket, deliveryFee, total } = quoteOrder(input.items, input.branchId, input.fulfillment)
  const now = new Date().toISOString()
  const status: PedidoStatus = input.fulfillment === 'instore' ? (input.paid ? 'completed' : 'awaiting_payment') : 'received'
  const items: OrderItem[] = lines.map(({ product: p, qty }) => ({ productId: p.id, name: p.name, emoji: p.emoji, price: p.price, qty, unit: p.unit, category: p.category, picked: false }))
  const order: Order = {
    id: uid('ord'),
    code: nextOrderCode(),
    channel: input.channel,
    fulfillment: input.fulfillment,
    customerId: customer.id,
    customerName: customer.name,
    phone: customer.phone,
    branchId: input.branchId,
    address: input.address,
    items,
    promotions: ticket.promotions,
    subtotal: ticket.subtotal,
    discount: ticket.discount,
    deliveryFee,
    total,
    paymentMode: input.paymentMode,
    paid: input.paid,
    status,
    timeline: [],
    notes: input.notes,
    saleId: null,
    createdAt: now,
    updatedAt: now,
  }
  order.timeline = [{ status, date: now, message: customerMessage(order, status, branchName(order.branchId)), by: null }]
  useOrderStore.getState().addOrder(order)

  // Compra en tienda pagada en línea: se registra la venta en ese momento
  if (status === 'completed') {
    const sale = recordOrderSale(order, 'online')
    useOrderStore.getState().updateOrder(order.id, (o) => ({ ...o, saleId: sale.id }))
    order.saleId = sale.id
  } else {
    notify({ type: 'info', title: `Nuevo pedido ${order.code}`, message: `${customer.name} · ${input.channel === 'whatsapp' ? 'WhatsApp' : input.channel === 'scan' ? 'Escanea y paga' : 'Tienda en línea'}` })
  }
  return { ok: true, order }
}

/** Convierte un pedido entregado/pagado en venta y descuenta inventario. */
export function recordOrderSale(order: Order, payment: PaymentMethod): Sale {
  const settings = useSettingsStore.getState()
  const session = payment === 'cash' || payment === 'card' ? mySessionNow() : undefined
  const net = round2(order.total - order.deliveryFee)
  const sale = useSalesStore.getState().addSale({
    date: new Date().toISOString(),
    customerId: order.customerId,
    cashierId: useAuthStore.getState().userId,
    storeId: order.branchId,
    sessionId: session?.id ?? null,
    register: session?.register ?? null,
    payment,
    items: order.items.map(({ picked: _p, unit: _u, ...i }) => i),
    promotions: order.promotions,
    subtotal: order.subtotal,
    discount: order.discount,
    tax: round2((net * settings.taxPct) / (100 + settings.taxPct)),
    deliveryFee: order.deliveryFee,
    total: order.total,
    orderId: order.id,
  })
  const inventory = useInventoryStore.getState()
  order.items.forEach((i) => inventory.adjustStock(i.productId, -i.qty))
  return sale
}

interface StatusOptions {
  note?: string
  /** Pedidos contra entrega: cómo se cobró al entregar */
  collected?: 'cash' | 'card'
}

export function setOrderStatus(orderId: string, status: PedidoStatus, opts: StatusOptions = {}) {
  const store = useOrderStore.getState()
  const order = store.orders.find((o) => o.id === orderId)
  if (!order || order.status === status) return
  let saleId = order.saleId ?? null
  let paid = order.paid
  if ((status === 'delivered' || status === 'picked_up' || status === 'completed') && !saleId) {
    const sale = recordOrderSale(order, order.paid ? 'online' : (opts.collected ?? 'cash'))
    saleId = sale.id
    paid = true
  }
  const message = customerMessage({ ...order, paid }, status, branchName(order.branchId), opts.note)
  store.updateOrder(orderId, (o) => ({
    ...o,
    status,
    paid,
    saleId,
    timeline: [...o.timeline, { status, date: new Date().toISOString(), message, by: useAuthStore.getState().userId, note: opts.note }],
  }))
  if (order.channel === 'whatsapp') store.pushChat(order.phone, [{ from: 'bot', text: message }])
}

export function togglePicked(orderId: string, productId: string) {
  useOrderStore.getState().updateOrder(orderId, (o) => ({ ...o, items: o.items.map((i) => (i.productId === productId ? { ...i, picked: !i.picked } : i)) }))
}

/** Pago en línea simulado desde la liga del pedido. */
export function payOrderOnline(orderId: string) {
  const store = useOrderStore.getState()
  const order = store.orders.find((o) => o.id === orderId)
  if (!order || order.paid) return
  const message = `Recibimos tu pago en línea de ${order.code}. ¡Gracias!`
  store.updateOrder(orderId, (o) => ({ ...o, paid: true, paymentMode: 'online', timeline: [...o.timeline, { status: o.status, date: new Date().toISOString(), message, by: null, note: 'Pago en línea' }] }))
  if (order.channel === 'whatsapp') store.pushChat(order.phone, [{ from: 'bot', text: `💳 ${message}` }])
}

// ---------- Caja: cobrar o entregar pedidos con su código / QR

export type LoadOrderResult = { ok: true; order: Order; mode: 'charge' | 'deliver' } | { ok: false; error: string }

export function findOrderByCode(raw: string): Order | undefined {
  const code = parseOrderCode(raw)
  return code ? useOrderStore.getState().orders.find((o) => o.code === code) : undefined
}

/** Carga un pedido en el ticket de la caja (si está por cobrar) o indica que solo hay que entregarlo. */
export function loadOrderIntoCart(raw: string): LoadOrderResult {
  const order = findOrderByCode(raw)
  if (!order) return { ok: false, error: 'No existe un pedido con ese código.' }
  if (!isActive(order)) return { ok: false, error: `El pedido ${order.code} ya está ${order.status === 'cancelled' ? 'cancelado' : 'cerrado'}.` }
  if (order.branchId !== useBranchStore.getState().activeBranchId) return { ok: false, error: `El pedido ${order.code} es para ${branchName(order.branchId)}.` }
  if (order.paid) return { ok: true, order, mode: 'deliver' }
  const cart = useCartStore.getState()
  if (cart.items.length && cart.orderId !== order.id) cart.park()
  useCartStore.setState({ items: order.items.map((i) => ({ productId: i.productId, qty: i.qty })), customerId: order.customerId, orderId: order.id })
  return { ok: true, order, mode: 'charge' }
}

/** Entrega un pedido ya pagado (en línea) al cliente que llega a la caja. */
export function deliverPaidOrder(orderId: string) {
  const order = useOrderStore.getState().orders.find((o) => o.id === orderId)
  if (!order) return
  setOrderStatus(orderId, order.fulfillment === 'instore' ? 'completed' : order.fulfillment === 'delivery' ? 'delivered' : 'picked_up')
}

/** Llamado por la caja al cobrar un ticket que venía de un pedido. */
export function closeOrderWithSale(orderId: string, sale: Sale) {
  const store = useOrderStore.getState()
  const order = store.orders.find((o) => o.id === orderId)
  if (!order) return
  const status: PedidoStatus = order.fulfillment === 'instore' ? 'completed' : order.fulfillment === 'delivery' ? 'delivered' : 'picked_up'
  const message = customerMessage({ ...order, paid: true }, status, branchName(order.branchId))
  store.updateOrder(orderId, (o) => ({
    ...o,
    paid: true,
    saleId: sale.id,
    status,
    total: sale.total,
    timeline: [...o.timeline, { status, date: sale.date, message, by: sale.cashierId, note: `Cobrado en caja · ticket #${sale.number}` }],
  }))
  if (order.channel === 'whatsapp') store.pushChat(order.phone, [{ from: 'bot', text: message }])
}
