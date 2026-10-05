import type { Fulfillment, Order, OrderChannel, PedidoStatus, Product } from '../types'

export const STATUS_META: Record<PedidoStatus, { label: string; short: string; tone: string; dot: string }> = {
  received: { label: 'Nuevo', short: 'Recibido', tone: 'bg-sky-50 text-sky-700', dot: 'bg-sky-500' },
  confirmed: { label: 'Confirmado', short: 'Confirmado', tone: 'bg-indigo-50 text-indigo-700', dot: 'bg-indigo-500' },
  preparing: { label: 'Armando', short: 'Armando', tone: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  ready: { label: 'Listo', short: 'Listo', tone: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  on_the_way: { label: 'En camino', short: 'En camino', tone: 'bg-violet-50 text-violet-700', dot: 'bg-violet-500' },
  delivered: { label: 'Entregado', short: 'Entregado', tone: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  picked_up: { label: 'Recogido', short: 'Recogido', tone: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  awaiting_payment: { label: 'Por cobrar en caja', short: 'Por cobrar', tone: 'bg-orange-50 text-orange-700', dot: 'bg-orange-500' },
  completed: { label: 'Pagado', short: 'Pagado', tone: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  cancelled: { label: 'Cancelado', short: 'Cancelado', tone: 'bg-red-50 text-red-600', dot: 'bg-red-500' },
}

export const CHANNEL_META: Record<OrderChannel, { label: string; emoji: string; tone: string }> = {
  web: { label: 'Tienda en línea', emoji: '🌐', tone: 'bg-brand-50 text-brand-700' },
  whatsapp: { label: 'WhatsApp', emoji: '💬', tone: 'bg-emerald-50 text-emerald-700' },
  scan: { label: 'Escanea y paga', emoji: '📱', tone: 'bg-fuchsia-50 text-fuchsia-700' },
}

export const FULFILLMENT_LABEL: Record<Fulfillment, string> = {
  delivery: 'A domicilio',
  pickup: 'Recoger en tienda',
  instore: 'En tienda',
}

/** Secuencia de estatus según el tipo de entrega. */
export const FLOW: Record<Fulfillment, PedidoStatus[]> = {
  delivery: ['received', 'confirmed', 'preparing', 'ready', 'on_the_way', 'delivered'],
  pickup: ['received', 'confirmed', 'preparing', 'ready', 'picked_up'],
  instore: ['awaiting_payment', 'completed'],
}

export const FINAL: PedidoStatus[] = ['delivered', 'picked_up', 'completed', 'cancelled']
export const isActive = (o: Pick<Order, 'status'>) => !FINAL.includes(o.status)

export function nextStatus(o: Order): PedidoStatus | null {
  const flow = FLOW[o.fulfillment]
  const i = flow.indexOf(o.status)
  return i >= 0 && i < flow.length - 1 ? flow[i + 1] : null
}

/** Texto del botón que avanza el pedido. */
export const NEXT_ACTION: Partial<Record<PedidoStatus, string>> = {
  confirmed: 'Confirmar pedido',
  preparing: 'Empezar a armar',
  ready: 'Marcar como listo',
  on_the_way: 'Enviar con repartidor',
  delivered: 'Marcar entregado',
  picked_up: 'Entregar al cliente',
  completed: 'Cobrar',
}

/** Mensaje que recibe el cliente en cada cambio de estatus. */
export function customerMessage(o: Pick<Order, 'code' | 'fulfillment' | 'paid'>, status: PedidoStatus, branchName = 'la sucursal', note?: string): string {
  switch (status) {
    case 'received':
      return `Recibimos tu pedido ${o.code}. En unos minutos lo confirmamos.`
    case 'confirmed':
      return `¡Confirmado! Tu pedido ${o.code} ya está en fila para armarse.`
    case 'preparing':
      return `Estamos armando tu pedido ${o.code} 🧺`
    case 'ready':
      return o.fulfillment === 'delivery'
        ? `Tu pedido ${o.code} está listo y pronto saldrá a tu domicilio.`
        : `Tu pedido ${o.code} está listo para recoger en ${branchName}. ${o.paid ? 'Ya está pagado, solo muestra tu código.' : 'Muestra tu código en caja para pagar.'}`
    case 'on_the_way':
      return `Tu pedido ${o.code} va en camino 🛵`
    case 'delivered':
      return `Pedido ${o.code} entregado. ¡Gracias por tu compra!`
    case 'picked_up':
      return `Recogiste tu pedido ${o.code}. ¡Gracias por tu compra!`
    case 'awaiting_payment':
      return `Muestra el código ${o.code} en caja para pagar tu compra.`
    case 'completed':
      return `Compra ${o.code} pagada. ¡Gracias por comprar con nosotros!`
    case 'cancelled':
      return `Tu pedido ${o.code} fue cancelado.${note ? ` Motivo: ${note}` : ''}`
  }
}

/** Unidades apartadas por pedidos activos que aún no se convierten en venta. */
export function reservedByProduct(orders: Order[], excludeOrderId?: string | null): Map<string, number> {
  const m = new Map<string, number>()
  for (const o of orders) {
    if (!isActive(o) || o.saleId || o.id === excludeOrderId) continue
    for (const i of o.items) m.set(i.productId, (m.get(i.productId) ?? 0) + i.qty)
  }
  return m
}

/** Existencia vendible = inventario menos lo apartado por pedidos. */
export const availableOf = (p: Pick<Product, 'id' | 'stock'>, reserved: Map<string, number>) =>
  Math.max(0, Math.round((p.stock - (reserved.get(p.id) ?? 0)) * 1000) / 1000)

// ---------- Contenido de los códigos QR

export const ORDER_QR_PREFIX = 'TPOS:PEDIDO:'
/** El QR del pedido lleva la liga de su seguimiento: el cliente lo abre con la cámara y la caja lo lee para verificarlo. */
export const orderQrValue = (code: string, origin = window.location.origin) => `${origin}/tienda/pedido/${code}`

/** Extrae un código de pedido de lo escaneado o escrito ("P-2001", "TPOS:PEDIDO:P-2001", "p2001"). */
export function parseOrderCode(raw: string): string | null {
  const m = raw.trim().toUpperCase().match(/(?:TPOS:PEDIDO:)?P-?(\d{3,6})$/)
  return m ? `P-${m[1]}` : null
}

/** URL que va dentro del QR de cada producto: con la cámara del teléfono abre "Escanea y paga". */
export const productQrValue = (barcode: string, origin = window.location.origin) => `${origin}/scan?p=${barcode}`

/** Extrae el código de barras de un QR de producto (URL) o de un código leído directamente. */
export function parseProductCode(raw: string): string {
  const text = raw.trim()
  try {
    const url = new URL(text)
    return url.searchParams.get('p') ?? text
  } catch {
    return text
  }
}

/** Compara teléfonos por sus últimos 10 dígitos. */
export const samePhone = (a = '', b = '') => {
  const d = (s: string) => s.replace(/\D/g, '').slice(-10)
  return d(a).length === 10 && d(a) === d(b)
}

/** Acción principal según estatus, pago y tipo de entrega (tablero y detalle). */
export function primaryAction(order: Order): { label: string; kind: 'advance' | 'collect' | 'register' | 'none'; disabled?: string } {
  const next = nextStatus(order)
  if (!next || !isActive(order)) return { label: '', kind: 'none' }
  const allPicked = order.items.every((i) => i.picked)
  if (next === 'ready' && !allPicked) return { label: NEXT_ACTION.ready!, kind: 'advance', disabled: 'Marca todos los productos como armados' }
  // Recoger en tienda / en tienda sin pagar: se cobra en caja escaneando el código
  if ((next === 'picked_up' || next === 'completed') && !order.paid) return { label: 'Cobrar en caja', kind: 'register' }
  if (next === 'delivered' && !order.paid) return { label: 'Entregado y cobrado', kind: 'collect' }
  return { label: NEXT_ACTION[next] ?? 'Avanzar', kind: 'advance' }
}
