import { round2 } from '../sales/sale-math'

/** Arqueo: suma el efectivo contado a partir del conteo por denominación. */
export function countCash(breakdown: Record<string, number>): number {
  let total = 0
  for (const [denom, count] of Object.entries(breakdown)) {
    total += Number(denom) * count
  }
  return round2(total)
}
