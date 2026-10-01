import { useMemo, useState } from 'react'
import { Printer, QrCode as QrIcon } from 'lucide-react'
import Modal from '../ui/Modal'
import { QrCode } from './Qr'
import { CATEGORIES } from '../../data/seed'
import { useInventoryStore } from '../../store/useInventoryStore'
import { productQrValue } from '../../utils/orders'
import { formatMoney } from '../../utils/format'
import type { CategoryId, Product } from '../../types'

/** Etiqueta de anaquel: precio grande y QR que abre "Escanea y paga" en el teléfono del cliente. */
export function ShelfLabel({ product }: { product: Product }) {
  return (
    <div className="flex break-inside-avoid items-center gap-3 rounded-xl border border-dashed border-ink-mute bg-white p-3">
      <QrCode value={productQrValue(product.barcode)} size={92} />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-semibold leading-tight text-ink">{product.name}</p>
        <p className="text-[10px] text-ink-soft">{product.brand}</p>
        <p className="mt-1 text-2xl font-black text-ink">
          {formatMoney(product.price)}
          {product.unit === 'kg' && <span className="text-xs font-medium">/kg</span>}
        </p>
        <p className="text-[9px] text-ink-soft">📱 Escanea y paga sin hacer fila</p>
      </div>
    </div>
  )
}

export default function QrLabelsModal({ onClose, productIds }: { onClose: () => void; productIds?: string[] }) {
  const products = useInventoryStore((s) => s.products)
  const [cat, setCat] = useState<CategoryId | 'all'>('all')
  const list = useMemo(
    () => (productIds ? products.filter((p) => productIds.includes(p.id)) : products.filter((p) => cat === 'all' || p.category === cat)),
    [products, cat, productIds],
  )

  return (
    <Modal
      open
      onClose={onClose}
      icon={QrIcon}
      title="Etiquetas QR para anaquel"
      subtitle="El cliente las escanea con su teléfono para armar su compra"
      width="max-w-4xl"
      footer={
        <button className="btn-primary" onClick={() => window.print()}>
          <Printer className="size-4" /> Imprimir {list.length} etiquetas
        </button>
      }
    >
      {!productIds && (
        <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {[{ id: 'all' as const, name: 'Todas' }, ...CATEGORIES].map((c) => (
            <button key={c.id} onClick={() => setCat(c.id)} className={`shrink-0 rounded-lg px-3 py-1.5 text-xs ${cat === c.id ? 'bg-brand-500 text-white' : 'bg-tile hover:bg-brand-50'}`}>
              {c.name}
            </button>
          ))}
        </div>
      )}
      <div className="print-area grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((p) => (
          <ShelfLabel key={p.id} product={p} />
        ))}
      </div>
    </Modal>
  )
}
