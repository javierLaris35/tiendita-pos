import { useCallback, useState } from 'react'
import { EllipsisVertical } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useClickOutside } from '../../hooks'
import { PillSelect, type SelectOption } from './Select'

interface DropdownProps<T extends string | number> {
  value: T
  options: SelectOption<T>[]
  onChange: (value: T) => void
  className?: string
  size?: 'sm' | 'md'
  /** Conservado por compatibilidad; la lista se posiciona sola */
  align?: 'left' | 'right'
  active?: boolean
}

export interface MenuItem {
  label: string
  icon?: LucideIcon
  onClick: () => void
  danger?: boolean
}

/** Selector tipo "pill" como los del diseño (Este mes ▾, Verduras ▾, ...), con búsqueda. */
export function Dropdown<T extends string | number>({ value, options, onChange, className = '', size = 'md', active = false }: DropdownProps<T>) {
  return <PillSelect value={value} options={options} onChange={onChange} className={className} size={size} active={active} />
}

/** Menú de tres puntos con acciones. items: [{ label, icon, onClick, danger }] */
export function KebabMenu({ items, light = false }: { items: MenuItem[]; light?: boolean }) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const ref = useClickOutside(close, open)
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((o) => !o)
        }}
        className={`grid size-8 place-items-center rounded-lg transition ${light ? 'text-white hover:bg-white/20' : 'text-ink hover:bg-brand-50'}`}
        aria-label="Más opciones"
      >
        <EllipsisVertical className="size-4" />
      </button>
      {open && (
        <div className="animate-pop absolute right-0 z-30 mt-1 min-w-48 rounded-xl border border-line bg-white p-1 shadow-xl shadow-brand-900/5">
          {items.map(({ label, icon: Icon, onClick, danger }) => (
            <button
              key={label}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setOpen(false)
                onClick()
              }}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs hover:bg-brand-50 ${
                danger ? 'text-red-500 hover:bg-red-50' : 'text-ink'
              }`}
            >
              {Icon && <Icon className="size-4" />}
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
