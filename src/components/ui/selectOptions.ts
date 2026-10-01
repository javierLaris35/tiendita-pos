// Opciones listas para <SearchSelect>: se buscan por nombre, marca, código de barras, categoría…
import { CATEGORIES } from '../../data/seed'
import { formatMoney, formatQty } from '../../utils/format'
import type { SelectOption } from './Select'
import type { Branch, CategoryId, Product } from '../../types'

export const productOptions = (products: Product[], withStock = true): SelectOption<string>[] =>
  products.map((p) => ({
    value: p.id,
    label: p.name,
    icon: p.emoji,
    hint: `${p.brand} · ${formatMoney(p.price)}${p.unit === 'kg' ? '/kg' : ''}${withStock ? ` · ${formatQty(p.stock, p.unit)} en stock` : ''}`,
    keywords: `${p.barcode} ${p.brand} ${CATEGORIES.find((c) => c.id === p.category)?.name ?? ''} ${p.subcategory}`,
  }))

export const categoryOptions = (): SelectOption<CategoryId>[] => CATEGORIES.map((c) => ({ value: c.id, label: c.name, hint: c.subcategories.join(', ') }))

export const branchOptions = (branches: Branch[]): SelectOption<string>[] => branches.map((b) => ({ value: b.id, label: b.name, hint: b.address }))

export const textOptions = (values: readonly string[]): SelectOption<string>[] => values.map((v) => ({ value: v, label: v }))
