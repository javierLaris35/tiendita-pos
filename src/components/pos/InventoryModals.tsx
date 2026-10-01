import { useState, type ChangeEvent, type FormEvent } from 'react'
import { PackagePlus, PencilLine, Printer, Recycle, Trash2, Truck } from 'lucide-react'
import { QrCode } from '../qr/Qr'
import QrLabelsModal from '../qr/QrLabelsModal'
import { productQrValue } from '../../utils/orders'
import Modal, { ConfirmDialog, Field } from '../ui/Modal'
import { ProductThumb } from '../ui/Misc'
import { SearchSelect } from '../ui/Select'
import { categoryOptions, productOptions, textOptions } from '../ui/selectOptions'
import { CATEGORIES, SUPPLIERS } from '../../data/seed'
import { useInventoryStore } from '../../store/useInventoryStore'
import { toast } from '../../store/useUiStore'
import { formatDate, timeAgo } from '../../utils/format'
import type { CategoryId, Product, ProductUnit } from '../../types'

type InputEvent = ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>

// Los campos numéricos se editan como texto y se convierten al guardar
interface ProductForm {
  name: string
  brand: string
  category: CategoryId
  subcategory: string
  price: number | string
  cost: number | string
  stock: number | string
  minStock: number | string
  emoji: string
  barcode: string
  unit: ProductUnit
}

const EMOJIS = ['📦', '🥛', '🧀', '🥚', '🍎', '🍌', '🥕', '🥦', '🍞', '🥩', '🍗', '🐟', '🥤', '🧃', '🍪', '🍫', '🍚', '🧴', '🧻', '🧼']
const toDateInput = (d: number | string | Date) => {
  const x = new Date(d)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}

export function ProductFormModal({ open, onClose, product }: { open: boolean; onClose: () => void; product: Product | null }) {
  const { addProduct, updateProduct, deleteProduct, restock } = useInventoryStore()
  const editing = product !== null
  const blank: ProductForm = { name: '', brand: '', category: 'abarrotes', subcategory: CATEGORIES.find((c) => c.id === 'abarrotes')!.subcategories[0], price: '', cost: '', stock: '', minStock: 15, emoji: '📦', barcode: '', unit: 'pz' }
  const [form, setForm] = useState<ProductForm>(product ?? blank)
  const [restockQty, setRestockQty] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [label, setLabel] = useState(false)
  const cat = CATEGORIES.find((c) => c.id === form.category)
  const set = (k: keyof ProductForm) => (e: InputEvent) => setForm({ ...form, [k]: e.target.value })

  const save = (e: FormEvent) => {
    e.preventDefault()
    const data = {
      brand: form.brand,
      unit: form.unit,
      category: form.category,
      subcategory: form.subcategory,
      emoji: form.emoji,
      name: form.name.trim(),
      price: Number(form.price),
      cost: Number(form.cost) || Math.round(Number(form.price) * 0.68 * 100) / 100,
      stock: Number(form.stock) || 0,
      minStock: Number(form.minStock) || 0,
    }
    if (!data.name || !data.price) return toast({ type: 'error', title: 'Completa nombre y precio' })
    const barcode = form.barcode.trim()
    if (product) {
      // El stock solo cambia vía reabasto/ventas; no sobrescribir con la copia del formulario
      const { stock: _stock, ...patch } = data
      updateProduct(product.id, barcode ? { ...patch, barcode } : patch)
      toast({ title: 'Producto actualizado', message: data.name })
    } else {
      addProduct(barcode ? { ...data, barcode } : data)
      toast({ title: 'Producto agregado', message: data.name })
    }
    onClose()
  }

  const doRestock = () => {
    const qty = Number(restockQty)
    if (!product || qty <= 0) return
    restock(product.id, qty)
    setForm((f) => ({ ...f, stock: Number(f.stock) + qty }))
    setRestockQty('')
    toast({ title: 'Stock actualizado', message: `+${qty} unidades de ${product.name}` })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar producto' : 'Nuevo producto'}
      subtitle={product ? `Último reabasto: ${timeAgo(product.lastRestocked)}` : 'Agrega un artículo al catálogo'}
      icon={editing ? PencilLine : PackagePlus}
      width="max-w-xl"
      footer={
        <>
          {editing && (
            <button type="button" className="btn-ghost mr-auto text-red-500" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="size-4" /> Eliminar
            </button>
          )}
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button form="product-form" className="btn-primary">
            Guardar
          </button>
        </>
      }
    >
      <form id="product-form" onSubmit={save} className="grid gap-3 sm:grid-cols-2">
        <Field label="Nombre" className="sm:col-span-2">
          <input className="input" autoFocus value={form.name} onChange={set('name')} placeholder="Ej. Leche Entera 1L" />
        </Field>
        <Field label="Marca">
          <input className="input" value={form.brand} onChange={set('brand')} placeholder="Ej. Lala" />
        </Field>
        <Field label="Código de barras" hint={editing ? undefined : 'Se genera automáticamente si lo dejas vacío'}>
          <input className="input font-mono" value={form.barcode ?? ''} onChange={set('barcode')} />
        </Field>
        <Field label="Se vende por" className="sm:col-span-2">
          <div className="grid grid-cols-2 gap-2">
            {(['pz', 'kg'] as const).map((u) => (
              <button type="button" key={u} onClick={() => setForm({ ...form, unit: u })} className={`rounded-xl border py-2 text-xs ${form.unit === u ? 'border-brand-500 bg-brand-500 text-white' : 'border-line hover:bg-brand-50'}`}>
                {u === 'pz' ? 'Pieza' : 'Peso (kg, a granel)'}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Categoría">
          <SearchSelect
            value={form.category}
            options={categoryOptions()}
            onChange={(id) => {
              const c = CATEGORIES.find((x) => x.id === id)!
              setForm({ ...form, category: c.id, subcategory: c.subcategories[0] })
            }}
          />
        </Field>
        <Field label="Subcategoría">
          <SearchSelect value={form.subcategory} options={textOptions(cat?.subcategories ?? [])} onChange={(subcategory) => setForm({ ...form, subcategory })} />
        </Field>
        <Field label="Precio de venta">
          <input className="input" type="number" step="0.01" min="0" value={form.price} onChange={set('price')} />
        </Field>
        <Field label="Costo">
          <input className="input" type="number" step="0.01" min="0" value={form.cost} onChange={set('cost')} />
        </Field>
        <Field label="Existencia">
          <input className="input" type="number" min="0" value={form.stock} onChange={set('stock')} disabled={editing} />
        </Field>
        <Field label="Stock mínimo">
          <input className="input" type="number" min="0" value={form.minStock} onChange={set('minStock')} />
        </Field>
        <Field label="Ícono" className="sm:col-span-2">
          <div className="flex flex-wrap gap-1.5">
            {EMOJIS.map((em) => (
              <button type="button" key={em} onClick={() => setForm({ ...form, emoji: em })} className={`grid size-9 place-items-center rounded-lg border text-lg ${form.emoji === em ? 'border-brand-500 bg-brand-50' : 'border-line hover:bg-tile'}`}>
                {em}
              </button>
            ))}
            <input className="input w-16 text-center text-lg" value={form.emoji} onChange={set('emoji')} maxLength={4} />
          </div>
        </Field>
      </form>
      {product && (
        <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-line p-3">
          <QrCode value={productQrValue(product.barcode)} size={96} />
          <div className="min-w-0 flex-1 text-xs">
            <p className="text-sm font-semibold">QR de anaquel</p>
            <p className="text-ink-soft">El cliente lo escanea con su teléfono para agregarlo a su compra en “Escanea y paga”.</p>
            <p className="mt-1 break-all font-mono text-[10px] text-ink-mute">{productQrValue(product.barcode)}</p>
          </div>
          <button type="button" className="btn-ghost py-2 text-xs" onClick={() => setLabel(true)}>
            <Printer className="size-4" /> Imprimir etiqueta
          </button>
        </div>
      )}
      {label && product && <QrLabelsModal productIds={[product.id]} onClose={() => setLabel(false)} />}
      {editing && (
        <div className="mt-4 flex flex-wrap items-end gap-2 rounded-xl bg-canvas p-3">
          <Field label={`Reabastecer (actual: ${form.stock})`} className="flex-1">
            <input className="input" type="number" min="1" placeholder="Cantidad recibida" value={restockQty} onChange={(e) => setRestockQty(e.target.value)} />
          </Field>
          <button type="button" className="btn-primary" onClick={doRestock}>
            Agregar stock
          </button>
        </div>
      )}
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (!product) return
          deleteProduct(product.id)
          toast({ type: 'info', title: 'Producto eliminado', message: product.name })
          onClose()
        }}
        title="Eliminar producto"
        message={`¿Eliminar “${product?.name}” del catálogo? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
      />
    </Modal>
  )
}

export function OrderStockModal({ open, onClose, productId }: { open: boolean; onClose: () => void; productId?: string | null }) {
  const products = useInventoryStore((s) => s.products)
  const createOrder = useInventoryStore((s) => s.createOrder)
  const [form, setForm] = useState<{ productId: string; supplier: string; qty: number | string; expected: string }>({
    productId: productId ?? products.find((p) => p.stock <= p.minStock)?.id ?? products[0]?.id ?? '',
    supplier: SUPPLIERS[0],
    qty: 50,
    expected: toDateInput(Date.now() + 3 * 86400000),
  })
  const product = products.find((p) => p.id === form.productId)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const order = createOrder({ ...form, qty: Number(form.qty), expected: new Date(form.expected + 'T12:00:00').toISOString() })
    toast({ title: `Orden ${order.code} creada`, message: `${form.qty} × ${product?.name} con ${form.supplier}` })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ordenar stock"
      subtitle="Genera una orden de compra a proveedor"
      icon={Truck}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button form="order-form" className="btn-primary">Crear orden</button>
        </>
      }
    >
      <form id="order-form" onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <Field label="Producto" className="sm:col-span-2">
          <SearchSelect value={form.productId} options={productOptions(products)} onChange={(productId) => setForm({ ...form, productId })} placeholder="Busca por nombre, marca o código…" />
        </Field>
        {product && (
          <div className="flex items-center gap-3 rounded-xl bg-canvas p-3 sm:col-span-2">
            <ProductThumb product={product} />
            <p className="text-xs text-ink-soft">
              Existencia actual <b className="text-ink">{product.stock}</b> · Mínimo <b className="text-ink">{product.minStock}</b>
            </p>
          </div>
        )}
        <Field label="Proveedor">
          <SearchSelect value={form.supplier} options={textOptions(SUPPLIERS)} onChange={(supplier) => setForm({ ...form, supplier })} />
        </Field>
        <Field label="Cantidad">
          <input className="input" type="number" min="1" required value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
        </Field>
        <Field label="Entrega estimada" className="sm:col-span-2">
          <input className="input" type="date" required value={form.expected} onChange={(e) => setForm({ ...form, expected: e.target.value })} />
        </Field>
      </form>
    </Modal>
  )
}

export function WasteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const products = useInventoryStore((s) => s.products)
  const addWaste = useInventoryStore((s) => s.addWaste)
  const wasteLog = useInventoryStore((s) => s.wasteLog)
  const [form, setForm] = useState<{ productId: string; qty: number | string; expiry: string }>({ productId: products[0]?.id ?? '', qty: 1, expiry: toDateInput(Date.now() + 86400000) })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    addWaste({ ...form, qty: Number(form.qty), expiry: new Date(form.expiry + 'T12:00:00').toISOString() })
    toast({ title: 'Lote registrado', message: 'Se agregó a caducidad y merma.' })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar lote por caducar"
      icon={Recycle}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button form="waste-form" className="btn-primary">Registrar</button>
        </>
      }
    >
      <form id="waste-form" onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <Field label="Producto" className="sm:col-span-2">
          <SearchSelect value={form.productId} options={productOptions(products)} onChange={(productId) => setForm({ ...form, productId })} placeholder="Busca por nombre, marca o código…" />
        </Field>
        <Field label="Cantidad">
          <input className="input" type="number" min="1" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
        </Field>
        <Field label="Fecha de caducidad">
          <input className="input" type="date" value={form.expiry} onChange={(e) => setForm({ ...form, expiry: e.target.value })} />
        </Field>
      </form>
      {wasteLog.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-ink-soft">Historial de merma retirada</p>
          <div className="max-h-40 space-y-1 overflow-y-auto scrollbar-thin">
            {wasteLog.map((w) => {
              const p = products.find((x) => x.id === w.productId)
              return (
                <div key={w.id + w.removedAt} className="flex justify-between rounded-lg bg-tile px-3 py-1.5 text-[11px]">
                  <span>{p?.emoji} {p?.name ?? 'Producto eliminado'} × {w.qty}</span>
                  <span className="text-ink-soft">{formatDate(w.removedAt)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </Modal>
  )
}
