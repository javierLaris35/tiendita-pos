import { computeLine, computeLineTax, computeTotals, pickUnitPrice, round2 } from '../src/sales/sale-math'

describe('sale-math', () => {
  it('round2 redondea a centavos', () => {
    expect(round2(1.236)).toBe(1.24)
  })

  it('mayoreo: usa wholesalePrice cuando qty >= min', () => {
    expect(pickUnitPrice({ price: 10, wholesalePrice: 8, wholesaleMinQty: 3 }, 3)).toEqual({
      unitPrice: 8,
      usedWholesale: true,
    })
  })

  it('mayoreo: precio normal cuando qty < min o sin precio de mayoreo', () => {
    expect(pickUnitPrice({ price: 10, wholesalePrice: 8, wholesaleMinQty: 3 }, 2).unitPrice).toBe(10)
    expect(pickUnitPrice({ price: 10 }, 99).unitPrice).toBe(10)
  })

  it('impuesto contenido IVA16+IEPS8 de 124 → 24', () => {
    expect(computeLineTax(124, 0.16, 0.08)).toBe(24)
  })

  it('computeLine congela total/impuesto/utilidad', () => {
    const l = computeLine({ quantity: 2, unitPrice: 62, unitCost: 40, ivaRate: 0.16, iepsRate: 0.08 })
    expect(l.lineTotal).toBe(124)
    expect(l.lineTax).toBe(24)
    expect(l.lineProfit).toBe(20)
  })

  it('computeTotals suma las líneas', () => {
    const totals = computeTotals([
      { lineTotal: 124, lineTax: 24, lineProfit: 20 },
      { lineTotal: 10, lineTax: 0, lineProfit: 4 },
    ])
    expect(totals.total).toBe(134)
    expect(totals.taxTotal).toBe(24)
    expect(totals.subtotal).toBe(110)
    expect(totals.profitTotal).toBe(24)
  })
})
