import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SEED_PRODUCTS } from '../data/seed'
import { customerMessage } from '../utils/orders'
import { uid } from '../utils/format'
import type { ChatMessage, Fulfillment, Order, OrderChannel, OrderItem, PedidoStatus } from '../types'

export type WaStage = 'new' | 'ask_name' | 'idle' | 'disambiguate' | 'review' | 'fulfillment' | 'address' | 'branch' | 'payment' | 'done'

export interface WaPending {
  raw: string
  qty: number
  candidates: string[]
}

/** Conversación de WhatsApp con un cliente (clave: últimos 10 dígitos del teléfono). */
export interface WaThread {
  phone: string
  customerId: string | null
  messages: ChatMessage[]
  stage: WaStage
  items: { productId: string; qty: number }[]
  pending: WaPending[]
  notFound: string[]
  fulfillment?: Fulfillment
  branchId?: string
  address?: string
  orderId?: string
  /** Lista que mandó antes de registrarse */
  pendingText?: string
}

interface OrderState {
  orders: Order[]
  threads: Record<string, WaThread>
  addOrder: (o: Order) => void
  updateOrder: (id: string, fn: (o: Order) => Order) => void
  setThread: (phone: string, patch: Partial<WaThread>) => void
  pushChat: (phone: string, msgs: Omit<ChatMessage, 'id' | 'date'>[]) => void
}

export const phoneKey = (phone: string) => phone.replace(/\D/g, '').slice(-10)

export const emptyThread = (phone: string, customerId: string | null): WaThread => ({
  phone: phoneKey(phone),
  customerId,
  messages: [],
  stage: 'new',
  items: [],
  pending: [],
  notFound: [],
})

// ---------- Pedidos de ejemplo para que el tablero arranque con movimiento

const minsAgo = (m: number) => new Date(Date.now() - m * 60000).toISOString()

function seedOrder(
  code: string,
  channel: OrderChannel,
  fulfillment: Fulfillment,
  customer: { id: string; name: string; phone: string },
  lines: [string, number][],
  status: PedidoStatus,
  createdMins: number,
  extra: Partial<Order> = {},
): Order {
  const items: OrderItem[] = lines.map(([pid, qty]) => {
    const p = SEED_PRODUCTS.find((x) => x.id === pid)!
    return { productId: p.id, name: p.name, emoji: p.emoji, price: p.price, qty, unit: p.unit, category: p.category, picked: false }
  })
  const subtotal = Math.round(items.reduce((a, i) => a + i.price * i.qty, 0) * 100) / 100
  const deliveryFee = fulfillment === 'delivery' && subtotal < 400 ? 35 : 0
  const base: Order = {
    id: `ord-${code}`,
    code,
    channel,
    fulfillment,
    customerId: customer.id,
    customerName: customer.name,
    phone: customer.phone,
    branchId: 's1',
    items,
    promotions: [],
    subtotal,
    discount: 0,
    deliveryFee,
    total: subtotal + deliveryFee,
    paymentMode: 'on_delivery',
    paid: false,
    status,
    timeline: [],
    saleId: null,
    createdAt: minsAgo(createdMins),
    updatedAt: minsAgo(Math.max(1, createdMins - 10)),
    ...extra,
  }
  const flow: PedidoStatus[] =
    fulfillment === 'instore' ? ['awaiting_payment'] : ['received', 'confirmed', 'preparing', 'ready', 'on_the_way'].slice(0, ['received', 'confirmed', 'preparing', 'ready', 'on_the_way'].indexOf(status) + 1) as PedidoStatus[]
  base.timeline = flow.map((s, i) => ({ status: s, date: minsAgo(createdMins - i * 6), message: customerMessage(base, s, 'Tiendita Centro'), by: i === 0 ? null : 'e3' }))
  if (status === 'preparing') base.items = base.items.map((it, i) => ({ ...it, picked: i < 2 }))
  if (['ready', 'on_the_way'].includes(status)) base.items = base.items.map((it) => ({ ...it, picked: true }))
  return base
}

const SEED_ORDERS: Order[] = [
  seedOrder('P-2001', 'web', 'delivery', { id: 'c1', name: 'Juan Pérez', phone: '+52 55 2345 6789' }, [['p6', 2], ['p13', 1], ['p36', 1], ['p63', 1], ['p54', 1]], 'preparing', 38, {
    address: 'Calle Roble 12, Col. Centro, CDMX',
    paymentMode: 'online',
    paid: true,
  }),
  seedOrder('P-2002', 'whatsapp', 'pickup', { id: 'c4', name: 'Emma Gutiérrez', phone: '+52 55 1333 2221' }, [['p47', 3], ['p52', 3], ['p40', 1]], 'ready', 64),
  seedOrder('P-2003', 'web', 'pickup', { id: 'c9', name: 'Fernanda Ruiz', phone: '+52 55 7123 9000' }, [['p16', 2], ['p29', 1], ['p60', 1]], 'received', 4),
  seedOrder('P-2004', 'scan', 'instore', { id: 'c8', name: 'Ricardo Vega', phone: '+52 55 6000 7777' }, [['p51', 2], ['p55', 3], ['p37', 2]], 'awaiting_payment', 2),
  seedOrder('P-2005', 'web', 'delivery', { id: 'c6', name: 'Luis Jiménez', phone: '+52 55 3111 0987' }, [['p57', 2], ['p58', 2], ['p59', 1], ['p68', 1]], 'on_the_way', 52, {
    address: 'Av. Insurgentes 845, int. 3, Col. Roma',
  }),
]

const at = (mins: number) => minsAgo(mins)
const SEED_THREADS: Record<string, WaThread> = {
  '5513332221': {
    ...emptyThread('+52 55 1333 2221', 'c4'),
    stage: 'done',
    orderId: 'ord-P-2002',
    messages: [
      { id: 'w1', from: 'customer', text: 'Hola buenas! me mandan\n3 cocas\n3 sabritas\n1 kilo de tortillas', date: at(66) },
      { id: 'w2', from: 'bot', text: '¡Hola Emma! 👋 Esto es lo que entendí:\n• 3 × Coca-Cola 600 ml — $57.00\n• 3 × Papas Original — $60.00\n• 1.000 kg × Tortillas de Maíz (kg) — $24.00\n\nTotal: $141.00\n¿Está bien? Responde *sí* para continuar o mándame más productos.', date: at(66) },
      { id: 'w3', from: 'customer', text: 'si', date: at(65) },
      { id: 'w4', from: 'bot', text: '¿Cómo lo quieres?\n1️⃣ Envío a domicilio ($35, gratis desde $400)\n2️⃣ Paso por él a la tienda', date: at(65) },
      { id: 'w5', from: 'customer', text: '2', date: at(65) },
      { id: 'w6', from: 'bot', text: '¿En qué sucursal lo recoges?\n1️⃣ Tiendita Centro\n2️⃣ Tiendita Norte\n3️⃣ Tiendita Sur', date: at(65) },
      { id: 'w7', from: 'customer', text: '1', date: at(64) },
      { id: 'w8', from: 'bot', text: '¿Cómo vas a pagar?\n1️⃣ En caja al recoger (efectivo o tarjeta)\n2️⃣ Pago en línea', date: at(64) },
      { id: 'w9', from: 'customer', text: '1', date: at(64) },
      { id: 'w10', from: 'bot', text: '✅ ¡Listo! Tu pedido *P-2002* quedó registrado. Te aviso por aquí cada cambio.', date: at(64) },
      ...SEED_ORDERS[1].timeline.slice(1).map((e, i) => ({ id: `w-t${i}`, from: 'bot' as const, text: e.message, date: e.date })),
    ],
  },
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set) => ({
      orders: SEED_ORDERS,
      threads: SEED_THREADS,
      addOrder: (o) => set((s) => ({ orders: [o, ...s.orders] })),
      updateOrder: (id, fn) => set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...fn(o), updatedAt: new Date().toISOString() } : o)) })),
      setThread: (phone, patch) =>
        set((s) => {
          const key = phoneKey(phone)
          return { threads: { ...s.threads, [key]: { ...(s.threads[key] ?? emptyThread(key, null)), ...patch } } }
        }),
      pushChat: (phone, msgs) =>
        set((s) => {
          const key = phoneKey(phone)
          const thread = s.threads[key] ?? emptyThread(key, null)
          const stamped = msgs.map((m) => ({ ...m, id: uid('wa'), date: new Date().toISOString() }))
          return { threads: { ...s.threads, [key]: { ...thread, messages: [...thread.messages, ...stamped] } } }
        }),
    }),
    { name: 'tiendita-orders' },
  ),
)

export const nextOrderCode = () => {
  const max = Math.max(2000, ...useOrderStore.getState().orders.map((o) => Number(o.code.replace(/\D/g, '')) || 0))
  return `P-${max + 1}`
}
