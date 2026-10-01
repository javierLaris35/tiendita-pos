// Interpreta listas de súper escritas a mano ("2 cocas, medio kilo de jitomate, pan bimbo")
// y las relaciona con el catálogo. Sin dependencias externas para que corra en el navegador.
import type { Product } from '../types'

export const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9.\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const NUM_WORDS: Record<string, number> = {
  un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  doce: 12, docena: 12, medio: 0.5, media: 0.5, cuarto: 0.25,
}
const STOP = new Set([
  'de', 'del', 'la', 'el', 'los', 'las', 'unos', 'unas', 'por', 'favor', 'porfa', 'quiero', 'me', 'das', 'manda', 'mandame',
  'y', 'con', 'pz', 'pza', 'pzas', 'pieza', 'piezas', 'paquete', 'paq', 'bolsa', 'lata', 'latas', 'botella', 'botellas',
  'gracias', 'tambien', 'necesito', 'ocupo', 'traeme', 'x', 'mandas', 'mandar', 'envias', 'pedido', 'lista', 'surtir', 'siguiente', 'puedes', 'podrias', 'hola', 'buenas', 'buen', 'dia', 'tarde', 'noche', 'grande', 'chico',
])
const KG = new Set(['kg', 'kgs', 'kilo', 'kilos', 'k'])
const GRAMS = new Set(['g', 'gr', 'grs', 'gramos'])
const SYNONYMS: Record<string, string> = {
  coca: 'coca cola', cocas: 'coca cola', refresco: 'refrescos', refrescos: 'refrescos', sabritas: 'papas original', papitas: 'papas',
  tomate: 'jitomate', tomates: 'jitomate', huevos: 'huevo', blanqueador: 'cloro', jabon: 'jabon', aceite: 'aceite',
  tortilla: 'tortillas', bimbo: 'pan bimbo', galletas: 'galletas', marias: 'galletas marias', agua: 'agua natural',
  limones: 'limon', platanos: 'platano', chiles: 'chile', papel: 'papel higienico', detergente: 'detergente', pollo: 'pollo',
}

export interface ParsedLine {
  raw: string
  qty: number
  /** El cliente dijo kilos/gramos explícitamente */
  byWeight: boolean
  terms: string[]
}

/** Separa la lista en renglones/productos. */
export function splitList(text: string): string[] {
  return text
    .split(/\n|,|;|•|·|\s-\s|\s+y\s+(?=\d|un|una|dos|tres|medio|media)/i)
    .map((l) => l.replace(/^\s*([-*]|\d+[.)])\s+/, '').trim())
    .filter((l) => norm(l).length > 1)
}

export function parseLine(raw: string): ParsedLine {
  const tokens = norm(raw).split(' ')
  let qty: number | null = null
  let byWeight = false
  const terms: string[] = []
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    const num = t.match(/^(\d+(?:\.\d+)?)(kg|k|g|gr|x)?$/)
    if (num && qty === null) {
      qty = Number(num[1])
      if (num[2] && ['kg', 'k'].includes(num[2])) byWeight = true
      if (num[2] && ['g', 'gr'].includes(num[2])) {
        qty = qty / 1000
        byWeight = true
      }
      continue
    }
    if (t in NUM_WORDS && qty === null) {
      qty = NUM_WORDS[t]
      continue
    }
    if (KG.has(t)) {
      byWeight = true
      continue
    }
    if (GRAMS.has(t)) {
      if (qty !== null) qty = qty / 1000
      byWeight = true
      continue
    }
    if (STOP.has(t) || t.length < 2) continue
    terms.push(...(SYNONYMS[t] ?? t).split(' '))
  }
  return { raw: raw.trim(), qty: qty ?? 1, byWeight, terms }
}

const singular = (w: string) => w.replace(/(es|s)$/, '')

function score(terms: string[], product: Product): { score: number; matched: number } {
  const words = norm(`${product.name} ${product.brand} ${product.subcategory}`).split(' ')
  let total = 0
  let matched = 0
  for (const t of terms) {
    let best = 0
    for (const w of words) {
      if (w === t || singular(w) === singular(t)) best = Math.max(best, 3)
      else if (t.length >= 3 && (w.startsWith(t) || t.startsWith(w)) && w.length >= 3) best = Math.max(best, 2)
    }
    // El nombre pesa más que la marca o subcategoría
    const name = norm(product.name)
    if (best && (name.includes(t) || name.includes(singular(t)))) best += 0.5
    if (best && (name.startsWith(t) || name.startsWith(singular(t)))) best += 1
    total += best
    if (best) matched++
  }
  return { score: total, matched }
}

export interface LineMatch {
  line: ParsedLine
  kind: 'found' | 'ambiguous' | 'not_found'
  candidates: Product[]
}

export function matchLine(line: ParsedLine, products: Product[]): LineMatch {
  if (!line.terms.length) return { line, kind: 'not_found', candidates: [] }
  const ranked = products
    .map((p) => ({ p, ...score(line.terms, p) }))
    .filter((r) => r.matched === line.terms.length || (line.terms.length > 2 && r.matched >= line.terms.length - 1))
    .sort((a, b) => b.score - a.score || a.p.price - b.p.price)
  if (!ranked.length) return { line, kind: 'not_found', candidates: [] }
  const top = ranked[0].score
  const close = ranked.filter((r) => r.score >= top - 0.6).slice(0, 4)
  return close.length === 1 ? { line, kind: 'found', candidates: [close[0].p] } : { line, kind: 'ambiguous', candidates: close.map((r) => r.p) }
}

/** Renglones como "Hola, me mandas:" no son productos: se ignoran. */
export const matchList = (text: string, products: Product[]) =>
  splitList(text)
    .filter((l) => !l.trim().endsWith(':'))
    .map(parseLine)
    .filter((l) => l.terms.length > 0)
    .map((l) => matchLine(l, products))
