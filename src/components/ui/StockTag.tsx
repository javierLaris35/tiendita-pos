import type { Product } from '../../types'

/** Etiqueta de existencia: sólida, en una sola línea y sobre la imagen del producto. */
export default function StockTag({ available, unit, minStock }: { available: number; unit: Product['unit']; minStock: number }) {
  if (available <= 0) return <span className="whitespace-nowrap rounded-md bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm">Agotado</span>
  if (available > minStock) return null
  // Kilos sin ceros de más: "12 kg", "0.75 kg"
  const qty = unit === 'kg' ? `${Number(available.toFixed(2))} kg` : String(available)
  return <span className="whitespace-nowrap rounded-md bg-amber-400 px-1.5 py-0.5 text-[10px] font-semibold text-amber-950 shadow-sm">Quedan {qty}</span>
}
