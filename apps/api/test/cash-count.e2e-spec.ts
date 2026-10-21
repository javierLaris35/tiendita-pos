import { countCash } from '../src/cash/cash-count'

describe('countCash (arqueo)', () => {
  it('suma denominación × cantidad', () => {
    expect(countCash({ '500': 2, '100': 3, '0.5': 4 })).toBe(1302) // 1000 + 300 + 2
  })

  it('conteo vacío → 0', () => {
    expect(countCash({})).toBe(0)
  })
})
