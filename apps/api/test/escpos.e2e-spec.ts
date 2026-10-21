import { OPEN_DRAWER, buildCorteTicket, buildSaleTicket, money } from '../src/printing/escpos'

describe('escpos (ESC/POS builder)', () => {
  it('money formatea pesos con 2 decimales y miles', () => {
    expect(money(1234.5)).toBe('$1,234.50')
    expect(money(0)).toBe('$0.00')
  })

  it('el ticket de venta incluye negocio, producto, total y cambio, y termina en corte', () => {
    const buf = buildSaleTicket({
      businessName: 'Mi Tiendita',
      footer: 'Gracias por su compra',
      items: [{ name: 'Refresco', quantity: 2, lineTotal: 124 }],
      total: 124,
      taxTotal: 24,
      change: 38,
      payments: [{ method: 'cash', amount: 162 }],
    })
    const s = buf.toString('latin1')
    expect(s).toContain('Mi Tiendita')
    expect(s).toContain('Refresco')
    expect(s).toContain('124.00')
    expect(s).toContain('38.00')
    expect(s).toContain('Gracias por su compra')
    expect(buf.subarray(-3).equals(Buffer.from([0x1d, 0x56, 0x00]))).toBe(true) // termina en corte de papel
  })

  it('el ticket de corte incluye esperado, contado y diferencia', () => {
    const buf = buildCorteTicket({
      businessName: 'Mi Tiendita',
      openingAmount: 500,
      expectedCash: 562,
      countedCash: 600,
      difference: 38,
    })
    const s = buf.toString('latin1')
    expect(s).toContain('562.00')
    expect(s).toContain('600.00')
    expect(s).toContain('38.00')
    expect(buf.subarray(-3).equals(Buffer.from([0x1d, 0x56, 0x00]))).toBe(true)
  })

  it('el comando de apertura de cajón es la secuencia estándar', () => {
    expect(OPEN_DRAWER.equals(Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa]))).toBe(true)
  })
})
