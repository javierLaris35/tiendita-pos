// Bot de pedidos por WhatsApp. Recibe el texto del cliente y responde según la etapa de la conversación.
// La misma función serviría detrás del webhook de la API de WhatsApp Business.
import { useBranchStore } from './useBranchStore'
import { useCustomerStore } from './useCustomerStore'
import { useInventoryStore } from './useInventoryStore'
import { emptyThread, phoneKey, useOrderStore, type WaThread } from './useOrderStore'
import { useSettingsStore } from './useSettingsStore'
import { availableNow } from './useShopperStore'
import { placeOrder, quoteOrder } from './orderActions'
import { matchList, norm } from '../utils/matcher'
import { samePhone, STATUS_META } from '../utils/orders'
import { formatMoney, formatQty } from '../utils/format'
import type { Product } from '../types'

const NUMS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣']
const YES = ['si', 'sí', 'ok', 'va', 'sale', 'correcto', 'confirmo', 'esta bien', 'asi', 'listo', 'dale']
const isYes = (t: string) => YES.includes(norm(t)) || /^s[ií]+\b/.test(norm(t))
const choice = (t: string) => {
  const n = Number(norm(t).replace(/[^\d]/g, ''))
  return Number.isFinite(n) && norm(t).replace(/[^\d]/g, '').length > 0 ? n : NaN
}

const products = () => useInventoryStore.getState().products
const productOf = (id: string) => products().find((p) => p.id === id)

/** Ajusta la cantidad: piezas enteras, kilos con decimales. */
const fixQty = (p: Product, qty: number) => (p.unit === 'kg' ? Math.round(qty * 1000) / 1000 : Math.max(1, Math.round(qty)))

function mergeItems(items: WaThread['items'], add: WaThread['items']) {
  const out = [...items]
  for (const a of add) {
    const i = out.findIndex((x) => x.productId === a.productId)
    if (i >= 0) out[i] = { ...out[i], qty: out[i].qty + a.qty }
    else out.push(a)
  }
  return out
}

function ambiguityQuestion(t: WaThread) {
  const p = t.pending[0]
  const options = p.candidates.map((id, i) => {
    const prod = productOf(id)!
    return `${NUMS[i]} ${prod.name} — ${formatMoney(prod.price)}${prod.unit === 'kg' ? '/kg' : ''}`
  })
  return `Con “${p.raw}” encontré varias opciones, ¿cuál quieres?\n${options.join('\n')}\n0️⃣ Ninguna`
}

/** Revisa existencias y arma el resumen con ofertas y total. */
function reviewMessage(t: WaThread): { text: string; items: WaThread['items'] } {
  const notes: string[] = []
  const items = t.items.flatMap((i) => {
    const p = productOf(i.productId)
    if (!p) return []
    const available = availableNow(p.id)
    if (available <= 0) {
      notes.push(`😕 ${p.name} se nos agotó.`)
      return []
    }
    if (i.qty > available) {
      notes.push(`Solo tenemos ${formatQty(available, p.unit)} de ${p.name}; te aparté eso.`)
      return [{ ...i, qty: available }]
    }
    return [i]
  })
  if (!items.length) return { text: `${notes.join('\n')}\nNo me quedó ningún producto en el pedido. Mándame tu lista de nuevo 🙏`, items }
  const { lines, ticket } = quoteOrder(items, t.branchId ?? 's1', 'pickup')
  const rows = lines.map(({ product: p, qty }) => `• ${p.unit === 'kg' ? formatQty(qty, 'kg') + ' ×' : `${qty} ×`} ${p.name} — ${formatMoney(p.price * qty)}`)
  const promos = ticket.promotions.map((p) => `🏷️ ${p.badge} ${p.name}: −${formatMoney(p.discount)}`)
  const missing = t.notFound.length ? `\nNo encontré: ${t.notFound.map((n) => `“${n}”`).join(', ')}. Puedes escribirlo de otra forma.` : ''
  return {
    items,
    text: [
      'Esto es lo que entendí:',
      ...rows,
      ...(promos.length ? ['', ...promos] : []),
      '',
      `Total: *${formatMoney(ticket.total)}*${ticket.discount ? ` (ahorras ${formatMoney(ticket.discount)})` : ''}`,
      ...(notes.length ? ['', ...notes] : []),
      missing,
      '¿Está bien? Responde *sí* para continuar, mándame más productos para agregar, o *cancelar*.',
    ]
      .filter((l) => l !== undefined)
      .join('\n')
      .replace(/\n{3,}/g, '\n\n'),
  }
}

/** Interpreta una lista y avanza a desambiguación o resumen. */
function processList(t: WaThread, text: string): { patch: Partial<WaThread>; replies: string[] } {
  const matches = matchList(text, products())
  if (!matches.length) {
    return { patch: {}, replies: ['No identifiqué productos en tu mensaje 🤔 Escríbeme uno por renglón, por ejemplo:\n2 coca cola\n1 kg de jitomate\npan bimbo'] }
  }
  const found = matches.filter((m) => m.kind === 'found').map((m) => ({ productId: m.candidates[0].id, qty: fixQty(m.candidates[0], m.line.qty) }))
  const pending = matches.filter((m) => m.kind === 'ambiguous').map((m) => ({ raw: m.line.raw, qty: m.line.qty, candidates: m.candidates.map((c) => c.id) }))
  const notFound = matches.filter((m) => m.kind === 'not_found').map((m) => m.line.raw)
  const next: WaThread = { ...t, items: mergeItems(t.items, found), pending: [...t.pending, ...pending], notFound: [...t.notFound, ...notFound] }
  if (next.pending.length) return { patch: { ...next, stage: 'disambiguate' }, replies: [ambiguityQuestion(next)] }
  const review = reviewMessage(next)
  return { patch: { ...next, items: review.items, stage: review.items.length ? 'review' : 'idle' }, replies: [review.text] }
}

const greeting = (name: string) =>
  `¡Hola ${name.split(' ')[0]}! 👋 Soy el asistente de *${useSettingsStore.getState().businessName}*.\nMándame tu lista de compras (un producto por renglón) y te la armo. Ejemplo:\n2 coca cola\nmedio kilo de jitomate\n1 pan bimbo`

function branchList() {
  return useBranchStore
    .getState()
    .branches.map((b, i) => `${NUMS[i] ?? `${i + 1}.`} ${b.name}`)
    .join('\n')
}

/**
 * Procesa un mensaje entrante del cliente. Guarda el mensaje y el nuevo estado de la conversación
 * y devuelve las respuestas del bot (la UI las muestra con un pequeño retraso de "escribiendo…").
 */
/** Respuesta del bot: texto, o texto con el pase de recolección adjunto. */
export type BotReply = string | { text: string; orderPass: string }

export function handleWhatsAppMessage(phone: string, text: string): BotReply[] {
  const store = useOrderStore.getState()
  const key = phoneKey(phone)
  const customers = useCustomerStore.getState().customers
  const known = customers.find((c) => samePhone(c.phone, key))
  const t: WaThread = store.threads[key] ?? emptyThread(key, known?.id ?? null)
  store.pushChat(key, [{ from: 'customer', text }])
  const say = (patch: Partial<WaThread>, replies: BotReply[]) => {
    // El historial lo administra pushChat; el estado de la conversación nunca debe sobrescribirlo
    const { messages: _ignored, ...state } = patch
    store.setThread(key, { ...state, customerId: patch.customerId ?? t.customerId ?? known?.id ?? null })
    return replies
  }
  const n = norm(text)
  const customer = customers.find((c) => c.id === (t.customerId ?? known?.id))

  // Comandos disponibles en cualquier momento
  if (['cancelar', 'cancela', 'borrar'].includes(n)) {
    return say({ stage: 'idle', items: [], pending: [], notFound: [] }, ['Listo, borré tu lista. Cuando quieras mándame una nueva 🛒'])
  }
  if (/(estatus|status|mi pedido|como va|donde va)/.test(n)) {
    const last = store.orders.find((o) => samePhone(o.phone, key))
    return say({}, [last ? `Tu pedido *${last.code}* está: *${STATUS_META[last.status].label}*.\n${last.timeline[last.timeline.length - 1]?.message ?? ''}` : 'Aún no tienes pedidos con nosotros. ¡Mándame tu lista!'])
  }

  // Cliente nuevo: primero su nombre
  if (!customer) {
    if (t.stage !== 'ask_name') {
      return say({ stage: 'ask_name', pendingText: matchList(text, products()).length ? text : undefined }, ['¡Hola! 👋 Gracias por escribir. Para registrarte, ¿cómo te llamas?'])
    }
    const name = text.trim().replace(/^(soy|me llamo)\s+/i, '').slice(0, 60)
    const created = useCustomerStore.getState().addCustomer({ name, phone: `+52 ${key.slice(0, 2)} ${key.slice(2, 6)} ${key.slice(6)}`, segment: 'Ocasional' })
    const base: WaThread = { ...t, customerId: created.id, stage: 'idle' }
    if (t.pendingText) {
      const r = processList(base, t.pendingText)
      return say({ ...r.patch, customerId: created.id, pendingText: undefined }, [`¡Mucho gusto, ${name.split(' ')[0]}! Ya quedaste registrado ✅`, ...r.replies])
    }
    return say({ customerId: created.id, stage: 'idle' }, [greeting(name)])
  }

  switch (t.stage) {
    case 'disambiguate': {
      const pick = choice(text)
      const p = t.pending[0]
      if (Number.isNaN(pick) || pick < 0 || pick > p.candidates.length) return say({}, ['Respóndeme con el número de la opción 🙂\n\n' + ambiguityQuestion(t)])
      const chosen = pick > 0 ? productOf(p.candidates[pick - 1]) : undefined
      const next: WaThread = { ...t, pending: t.pending.slice(1), items: chosen ? mergeItems(t.items, [{ productId: chosen.id, qty: fixQty(chosen, p.qty) }]) : t.items }
      if (next.pending.length) return say(next, [ambiguityQuestion(next)])
      const review = reviewMessage(next)
      return say({ ...next, items: review.items, stage: review.items.length ? 'review' : 'idle' }, [review.text])
    }
    case 'review': {
      if (isYes(text)) {
        const { deliveryFee, freeDeliveryFrom } = useSettingsStore.getState()
        return say({ stage: 'fulfillment' }, [`¿Cómo lo quieres?\n1️⃣ Envío a domicilio (${formatMoney(deliveryFee)}, gratis desde ${formatMoney(freeDeliveryFrom)})\n2️⃣ Paso por él a la tienda`])
      }
      if (['no', 'nop', 'nel'].includes(n)) return say({}, ['Va. Dime qué cambio: mándame productos para agregar o escribe *cancelar* para empezar de nuevo.'])
      const r = processList(t, text)
      return say(r.patch, r.replies)
    }
    case 'fulfillment': {
      const c = choice(text)
      if (c === 1 || /domicilio|envio|casa/.test(n)) {
        return say({ stage: 'address', fulfillment: 'delivery' }, [customer.address ? `¿Te lo llevo a *${customer.address}*?\nResponde *sí* o escríbeme otra dirección.` : '¿A qué dirección te lo llevamos? (calle, número, colonia)'])
      }
      if (c === 2 || /tienda|paso|recoger|recojo/.test(n)) return say({ stage: 'branch', fulfillment: 'pickup' }, [`¿En qué sucursal lo recoges?\n${branchList()}`])
      return say({}, ['Respóndeme *1* para domicilio o *2* para recoger en tienda.'])
    }
    case 'address': {
      const address = isYes(text) && customer.address ? customer.address : text.trim()
      if (address.length < 6) return say({}, ['¿Me compartes la dirección completa? (calle, número y colonia)'])
      useCustomerStore.getState().updateCustomer(customer.id, { address })
      return say({ stage: 'payment', address, branchId: useBranchStore.getState().branches[0]?.id }, ['¿Cómo vas a pagar?\n1️⃣ Al recibir (efectivo o tarjeta)\n2️⃣ Pago en línea (te mando la liga)'])
    }
    case 'branch': {
      const branches = useBranchStore.getState().branches
      const b = branches[choice(text) - 1] ?? branches.find((x) => norm(x.name).includes(n))
      if (!b) return say({}, [`Elige una sucursal con su número:\n${branchList()}`])
      return say({ stage: 'payment', branchId: b.id }, [`Perfecto, en *${b.name}*.\n¿Cómo vas a pagar?\n1️⃣ En caja al recoger (efectivo o tarjeta)\n2️⃣ Pago en línea (te mando la liga)`])
    }
    case 'payment': {
      const c = choice(text)
      if (c !== 1 && c !== 2) return say({}, ['Respóndeme *1* para pagar al recibir o *2* para pagar en línea.'])
      const res = placeOrder({
        channel: 'whatsapp',
        fulfillment: t.fulfillment ?? 'pickup',
        customerId: customer.id,
        branchId: t.branchId ?? useBranchStore.getState().branches[0].id,
        address: t.fulfillment === 'delivery' ? t.address : undefined,
        items: t.items,
        paymentMode: c === 2 ? 'online' : 'on_delivery',
        paid: false,
      })
      if (!res.ok) {
        const lines = res.shortages.map((s) => `• ${s.name}: pediste ${s.requested}, quedan ${s.available}`)
        return say({ stage: 'review' }, [`Uy, mientras confirmabas se movió el inventario:\n${lines.join('\n')}\nMándame los cambios o escribe *sí* para continuar sin ellos.`])
      }
      const o = res.order
      const link = `${window.location.origin}/tienda/pedido/${o.code}`
      return say({ stage: 'done', items: [], pending: [], notFound: [], orderId: o.id }, [
        `✅ ¡Listo! Tu pedido *${o.code}* quedó registrado por *${formatMoney(o.total)}*${o.deliveryFee ? ` (incluye envío ${formatMoney(o.deliveryFee)})` : ''}.`,
        ...(o.fulfillment === 'pickup'
          ? [{ text: `🧾 Este es tu pase para recoger en tienda. Muéstralo en caja: ahí escanean el QR y ${c === 2 ? 'te entregan tu pedido (ya pagado)' : 'te cobran y entregan'}.`, orderPass: o.id }]
          : []),
        c === 2 ? `💳 Paga aquí en línea: ${link}` : `Puedes seguirlo aquí: ${link}`,
        'Te aviso por este chat cada vez que cambie de estatus 📲',
      ])
    }
    default: {
      // new / idle / done: saludo o lista nueva
      const matches = matchList(text, products())
      if (!matches.length) return say({ stage: 'idle' }, [greeting(customer.name)])
      const r = processList({ ...t, items: [], pending: [], notFound: [] }, text)
      return say(r.patch, r.replies)
    }
  }
}
