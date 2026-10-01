import { CATEGORIES } from '../data/seed'
import { formatMoney } from './format'
import type { AppliedPromotion, LineDiscount, Product, PromoSuggestion, Promotion, Ticket } from '../types'

const round2 = (n: number) => Math.round(n * 100) / 100
const DAY = 86400000

export interface TicketLine {
  productId: string
  price: number
  qty: number
  category: Product['category']
  unit?: Product['unit']
}

export function isPromoActive(p: Promotion, branchId: string, now = Date.now()) {
  const start = new Date(p.startDate + 'T00:00:00').getTime()
  const end = new Date(p.endDate + 'T00:00:00').getTime() + DAY - 1
  return p.active && (!p.branchIds.length || p.branchIds.includes(branchId)) && now >= start && now <= end
}

export type PromoState = 'active' | 'scheduled' | 'expired' | 'paused'

export function promoState(p: Promotion, now = Date.now()): PromoState {
  if (!p.active) return 'paused'
  if (now < new Date(p.startDate + 'T00:00:00').getTime()) return 'scheduled'
  if (now > new Date(p.endDate + 'T00:00:00').getTime() + DAY - 1) return 'expired'
  return 'active'
}

const PROMO_COLORS: Record<Promotion['type'], string> = {
  nxm: 'from-orange-500 to-red-500',
  bundle: 'from-violet-500 to-fuchsia-500',
  gift: 'from-emerald-500 to-teal-500',
  percent: 'from-sky-500 to-blue-600',
}

/** Clases de degradado de Tailwind según el tipo de oferta. */
export const promoColor = (p: Pick<Promotion, 'type'>) => PROMO_COLORS[p.type]

export function promoBadge(p: Promotion): string {
  switch (p.type) {
    case 'nxm':
      return `${p.buyQty}x${p.payQty}`
    case 'gift':
      // "Gratis" solo cuando de verdad lo es; si no, es un descuento al combinar productos
      return p.giftDiscountPct >= 100 ? 'Combo gratis' : `Combo -${p.giftDiscountPct}%`
    case 'percent':
      return `-${p.percent}%`
    case 'bundle':
      return `${p.bundleQty} x ${formatMoney(p.bundlePrice).replace('.00', '')}`
  }
}

const listNames = (ids: string[], byId: Map<string, Product>) => {
  const names = ids.map((id) => byId.get(id)?.name).filter(Boolean) as string[]
  if (names.length <= 2) return names.join(' y ')
  return `${names.slice(0, 2).join(', ')} y ${names.length - 2} más`
}

export function promoDescription(p: Promotion, byId: Map<string, Product>): string {
  const targets = p.productIds.length
    ? listNames(p.productIds, byId)
    : (CATEGORIES.find((c) => c.id === p.categoryId)?.name ?? 'productos seleccionados')
  switch (p.type) {
    case 'nxm':
      return `Lleva ${p.buyQty} y paga ${p.payQty} en ${targets}`
    case 'gift': {
      const gift = p.giftProductId ? byId.get(p.giftProductId)?.name : 'otro producto'
      const how = p.giftDiscountPct >= 100 ? 'gratis' : `con ${p.giftDiscountPct}% de descuento`
      return `En la compra de ${p.buyQty > 1 ? `${p.buyQty} ` : ''}${targets}, llévate ${p.giftQty > 1 ? `${p.giftQty} ` : ''}${gift} ${how}`
    }
    case 'percent':
      return `${p.percent}% de descuento en ${targets}`
    case 'bundle':
      return `${p.bundleQty} piezas por ${formatMoney(p.bundlePrice)} en ${targets}`
  }
}

/** Productos que disparan la oferta (para badges en el catálogo). */
export function promoProductIds(p: Promotion, products: Product[]): string[] {
  if (p.productIds.length) return p.productIds
  if (p.type === 'percent' && p.categoryId) return products.filter((x) => x.category === p.categoryId).map((x) => x.id)
  return []
}

const appliesTo = (p: Promotion, line: TicketLine) =>
  p.productIds.length ? p.productIds.includes(line.productId) : p.type === 'percent' && line.category === p.categoryId

const ORDER: Record<Promotion['type'], number> = { nxm: 0, bundle: 1, gift: 2, percent: 3 }

/**
 * Calcula el ticket aplicando ofertas. Cada unidad se usa en una sola oferta:
 * primero NxM y paquetes (la unidad más barata del grupo es la gratis), luego combos
 * y al final descuentos porcentuales sobre lo que quede.
 */
export function computeTicket(lines: TicketLine[], promos: Promotion[], taxPct: number, products: Product[] = []): Ticket {
  const byId = new Map(products.map((p) => [p.id, p]))
  const remaining = new Map(lines.map((l) => [l.productId, l.qty]))
  const priceOf = new Map(lines.map((l) => [l.productId, l.price]))
  const applied = new Map<string, AppliedPromotion>()
  const suggestions: PromoSuggestion[] = []
  const nameOf = (id: string) => byId.get(id)?.name ?? 'producto'

  const credit = (p: Promotion, amount: number) => {
    if (amount <= 0.004) return
    const prev = applied.get(p.id)
    applied.set(p.id, { promoId: p.id, name: p.name, badge: promoBadge(p), discount: round2((prev?.discount ?? 0) + amount) })
  }
  // Reparto del ahorro por producto (para mostrarlo en cada renglón del ticket)
  const lineDiscounts: Record<string, LineDiscount> = {}
  const onLine = (productId: string, amount: number, p: Promotion) => {
    if (amount <= 0) return
    const d = (lineDiscounts[productId] ??= { amount: 0, badges: [] })
    d.amount += amount
    if (!d.badges.includes(promoBadge(p))) d.badges.push(promoBadge(p))
  }

  // Unidades enteras disponibles de las líneas que aplican, ordenadas de mayor a menor precio
  const pool = (p: Promotion) => {
    const units: { productId: string; price: number }[] = []
    for (const l of lines) {
      if (l.unit === 'kg' || !appliesTo(p, l)) continue
      const n = Math.floor(remaining.get(l.productId) ?? 0)
      for (let i = 0; i < n; i++) units.push({ productId: l.productId, price: l.price })
    }
    return units.sort((a, b) => b.price - a.price)
  }
  const consume = (productId: string, n: number) => remaining.set(productId, (remaining.get(productId) ?? 0) - n)
  const mostCommon = (units: { productId: string }[]) => {
    const c = new Map<string, number>()
    units.forEach((u) => c.set(u.productId, (c.get(u.productId) ?? 0) + 1))
    return [...c.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
  }

  for (const p of [...promos].sort((a, b) => ORDER[a.type] - ORDER[b.type])) {
    if (p.type === 'nxm' || p.type === 'bundle') {
      const size = p.type === 'nxm' ? p.buyQty : p.bundleQty
      if (size < 2) continue
      const units = pool(p)
      const groups = Math.floor(units.length / size)
      let discount = 0
      for (let g = 0; g < groups; g++) {
        const group = units.slice(g * size, (g + 1) * size)
        group.forEach((u) => consume(u.productId, 1))
        if (p.type === 'nxm') {
          // las (buy - pay) unidades más baratas del grupo salen gratis
          group.slice(p.payQty).forEach((u) => {
            discount += u.price
            onLine(u.productId, u.price, p)
          })
        } else {
          const groupSum = group.reduce((a, u) => a + u.price, 0)
          const saved = Math.max(0, groupSum - p.bundlePrice)
          discount += saved
          // El ahorro del paquete se reparte en proporción al precio de cada pieza
          group.forEach((u) => onLine(u.productId, (saved * u.price) / groupSum, p))
        }
      }
      credit(p, discount)
      const leftover = units.slice(groups * size)
      if (leftover.length === size - 1 && leftover.length > 0) {
        const productId = mostCommon(leftover)!
        suggestions.push({ promoId: p.id, productId, qty: 1, message: `Agrega 1 más de ${nameOf(productId)} y aprovecha ${promoBadge(p)}` })
      }
    }

    if (p.type === 'gift' && p.giftProductId) {
      const triggers = lines.filter((l) => l.productId !== p.giftProductId && appliesTo(p, l))
      const triggerUnits = triggers.reduce((a, l) => a + Math.floor(remaining.get(l.productId) ?? 0), 0)
      const eligible = Math.floor(triggerUnits / Math.max(1, p.buyQty)) * p.giftQty
      const giftInCart = Math.floor(remaining.get(p.giftProductId) ?? 0)
      const rewarded = Math.min(eligible, giftInCart)
      if (rewarded > 0) {
        const giftPrice = priceOf.get(p.giftProductId) ?? 0
        credit(p, rewarded * giftPrice * (p.giftDiscountPct / 100))
        onLine(p.giftProductId, rewarded * giftPrice * (p.giftDiscountPct / 100), p)
        consume(p.giftProductId, rewarded)
        let toConsume = Math.ceil(rewarded / p.giftQty) * p.buyQty
        for (const t of triggers) {
          const n = Math.min(toConsume, Math.floor(remaining.get(t.productId) ?? 0))
          consume(t.productId, n)
          toConsume -= n
        }
      }
      const how = p.giftDiscountPct >= 100 ? 'gratis' : `con ${p.giftDiscountPct}% de descuento`
      if (eligible > giftInCart) {
        const qty = eligible - giftInCart
        suggestions.push({ promoId: p.id, productId: p.giftProductId, qty, message: `¡Llévate ${qty > 1 ? `${qty} ` : ''}${nameOf(p.giftProductId)} ${how}!` })
      } else if (p.buyQty > 1 && triggerUnits % p.buyQty === p.buyQty - 1 && triggers[0]) {
        suggestions.push({ promoId: p.id, productId: triggers[0].productId, qty: 1, message: `Agrega 1 ${nameOf(triggers[0].productId)} más y llévate ${nameOf(p.giftProductId)} ${how}` })
      }
    }

    if (p.type === 'percent') {
      let discount = 0
      for (const l of lines) {
        if (!appliesTo(p, l)) continue
        const qty = remaining.get(l.productId) ?? 0
        if (qty <= 0) continue
        discount += qty * l.price * (p.percent / 100)
        onLine(l.productId, qty * l.price * (p.percent / 100), p)
        remaining.set(l.productId, 0)
      }
      credit(p, discount)
    }
  }

  const subtotal = round2(lines.reduce((a, l) => a + l.price * l.qty, 0))
  const discount = round2([...applied.values()].reduce((a, x) => a + x.discount, 0))
  const total = round2(Math.max(0, subtotal - discount))
  return {
    subtotal,
    discount,
    total,
    tax: round2((total * taxPct) / (100 + taxPct)),
    units: lines.reduce((a, l) => a + (l.unit === 'kg' ? 1 : l.qty), 0),
    promotions: [...applied.values()],
    suggestions,
    lineDiscounts: Object.fromEntries(Object.entries(lineDiscounts).map(([id, d]) => [id, { ...d, amount: round2(d.amount) }])),
  }
}
