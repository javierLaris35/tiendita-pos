// Comandos ESC/POS (sin dependencias nativas: se arman los bytes a mano).
const ESC = 0x1b
const GS = 0x1d

const INIT = Buffer.from([ESC, 0x40])
const CENTER = Buffer.from([ESC, 0x61, 0x01])
const LEFT = Buffer.from([ESC, 0x61, 0x00])
const BOLD_ON = Buffer.from([ESC, 0x45, 0x01])
const BOLD_OFF = Buffer.from([ESC, 0x45, 0x00])
const LF = Buffer.from('\n', 'latin1')
const RULE = '--------------------------------'

/** Corte de papel (GS V 0). */
export const CUT = Buffer.from([GS, 0x56, 0x00])
/** Apertura de cajón (ESC p 0 25 250). */
export const OPEN_DRAWER = Buffer.from([ESC, 0x70, 0x00, 0x19, 0xfa])

/** Página de código por defecto: WPC1252 (compatible con 'latin1'/Windows-1252),
 * para que los acentos del español salgan bien. El valor correcto depende de la
 * impresora y se parametriza en el instalador (Plan 8). */
export const DEFAULT_CODEPAGE = 16

/** ESC t n — selecciona la página de código de la impresora. */
function codePageCmd(n: number): Buffer {
  return Buffer.from([ESC, 0x74, n])
}

function line(text = ''): Buffer {
  return Buffer.concat([Buffer.from(text, 'latin1'), LF])
}

export function money(n: number): string {
  const sign = n < 0 ? '-' : ''
  return sign + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const METHOD_LABEL: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
}

export interface SaleTicketData {
  businessName: string
  footer?: string
  items: { name: string; quantity: number; lineTotal: number }[]
  total: number
  taxTotal: number
  change: number
  payments: { method: string; amount: number }[]
  codepage?: number
}

export function buildSaleTicket(d: SaleTicketData): Buffer {
  const parts: Buffer[] = [
    INIT,
    codePageCmd(d.codepage ?? DEFAULT_CODEPAGE),
    CENTER,
    BOLD_ON,
    line(d.businessName),
    BOLD_OFF,
    line(new Date().toLocaleString('es-MX')),
    LEFT,
    line(RULE),
  ]
  for (const it of d.items) {
    parts.push(line(`${it.quantity} x ${it.name}`))
    parts.push(line(`   ${money(it.lineTotal)}`))
  }
  parts.push(line(RULE))
  parts.push(line(`IVA/IEPS: ${money(d.taxTotal)}`))
  parts.push(BOLD_ON, line(`TOTAL: ${money(d.total)}`), BOLD_OFF)
  for (const p of d.payments) {
    parts.push(line(`${METHOD_LABEL[p.method] ?? p.method}: ${money(p.amount)}`))
  }
  parts.push(line(`Cambio: ${money(d.change)}`))
  if (d.footer) {
    parts.push(LF, CENTER, line(d.footer), LEFT)
  }
  parts.push(LF, LF, CUT)
  return Buffer.concat(parts)
}

export interface CorteTicketData {
  businessName: string
  openingAmount: number
  expectedCash: number
  countedCash: number
  difference: number
  codepage?: number
}

export function buildCorteTicket(d: CorteTicketData): Buffer {
  const parts: Buffer[] = [
    INIT,
    codePageCmd(d.codepage ?? DEFAULT_CODEPAGE),
    CENTER,
    BOLD_ON,
    line(d.businessName),
    BOLD_OFF,
    line('CORTE DE CAJA'),
    LEFT,
    line(RULE),
    line(`Fondo: ${money(d.openingAmount)}`),
    line(`Esperado: ${money(d.expectedCash)}`),
    line(`Contado: ${money(d.countedCash)}`),
    BOLD_ON,
    line(`Diferencia: ${money(d.difference)}`),
    BOLD_OFF,
    LF,
    LF,
    CUT,
  ]
  return Buffer.concat(parts)
}
