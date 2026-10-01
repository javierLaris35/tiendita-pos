import { useState } from 'react'
import { Delete, Scale } from 'lucide-react'
import Modal from '../ui/Modal'
import { formatMoney } from '../../utils/format'
import type { Product } from '../../types'

const KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', 'del']

/** Captura de peso para productos a granel: en kilos o por importe ("dame $20 de jitomate"). */
export default function WeightModal({ product, initialKg, onConfirm, onClose }: { product: Product; initialKg?: number; onConfirm: (kg: number) => void; onClose: () => void }) {
  const [mode, setMode] = useState<'kg' | 'money'>('kg')
  const [input, setInput] = useState(initialKg ? String(initialKg) : '')
  const value = Number(input) || 0
  const kg = Math.round((mode === 'kg' ? value : value / product.price) * 1000) / 1000
  const price = Math.round(kg * product.price * 100) / 100

  const press = (k: string) => {
    if (k === 'del') return setInput((s) => s.slice(0, -1))
    if (k === '.' && input.includes('.')) return
    setInput((s) => (s + k).slice(0, 7))
  }

  return (
    <Modal
      open
      onClose={onClose}
      icon={Scale}
      title={product.name}
      subtitle={`${formatMoney(product.price)} por kg · ${product.stock} kg disponibles`}
      width="max-w-sm"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary min-w-36" disabled={kg <= 0 || kg > product.stock} onClick={() => onConfirm(kg)}>
            Agregar {formatMoney(price)}
          </button>
        </>
      }
    >
      <div
        className="space-y-3"
        onKeyDown={(e) => {
          if (/^[\d.]$/.test(e.key)) press(e.key)
          if (e.key === 'Backspace') press('del')
          if (e.key === 'Enter' && kg > 0) onConfirm(kg)
        }}
        tabIndex={-1}
      >
        <div className="grid grid-cols-2 rounded-xl bg-tile p-1 text-xs">
          {(['kg', 'money'] as const).map((m) => (
            <button key={m} onClick={() => (setMode(m), setInput(''))} className={`rounded-lg py-2 ${mode === m ? 'bg-white font-semibold shadow-sm' : 'text-ink-soft'}`}>
              {m === 'kg' ? 'Por peso (kg)' : 'Por importe ($)'}
            </button>
          ))}
        </div>
        <div className="rounded-2xl bg-ink p-4 text-right text-white">
          <p className="text-3xl font-semibold tabular-nums">
            {mode === 'money' && '$'}
            {input || '0'}
            {mode === 'kg' && <span className="text-lg text-white/70"> kg</span>}
          </p>
          <p className="text-xs text-white/70">
            {kg.toFixed(3)} kg = {formatMoney(price)}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(mode === 'kg' ? ['0.250', '0.500', '0.750', '1', '1.5', '2'] : ['10', '20', '30', '50', '100']).map((q) => (
            <button key={q} onClick={() => setInput(q)} className="rounded-lg border border-line px-2.5 py-1.5 text-xs hover:bg-brand-50">
              {mode === 'kg' ? `${q} kg` : `$${q}`}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {KEYS.map((k) => (
            <button key={k} onClick={() => press(k)} className="grid h-12 place-items-center rounded-xl border border-line text-lg font-medium hover:bg-brand-50 active:scale-95">
              {k === 'del' ? <Delete className="size-5" /> : k}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  )
}
