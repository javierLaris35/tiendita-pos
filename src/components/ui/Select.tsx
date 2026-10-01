import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Search, X } from 'lucide-react'

export interface SelectOption<T extends string | number = string> {
  value: T
  label: string
  /** Texto secundario (p. ej. existencia, dirección) */
  hint?: string
  /** Ícono o emoji a la izquierda */
  icon?: ReactNode
  /** Palabras extra que también encuentran la opción (código de barras, marca…) */
  keywords?: string
  disabled?: boolean
}

/** Minúsculas y sin acentos: "Plátano" se encuentra escribiendo "platano". */
export const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

export function filterOptions<T extends string | number>(options: SelectOption<T>[], query: string) {
  const q = fold(query.trim())
  if (!q) return options
  const terms = q.split(/\s+/)
  return options
    .filter((o) => {
      const hay = fold(`${o.label} ${o.hint ?? ''} ${o.keywords ?? ''}`)
      return terms.every((t) => hay.includes(t))
    })
    .sort((a, b) => Number(fold(b.label).startsWith(q)) - Number(fold(a.label).startsWith(q)))
}

/** Resalta en negritas la parte que coincide con la búsqueda. */
function Highlight({ text, query }: { text: string; query: string }) {
  const q = fold(query.trim())
  if (!q) return <>{text}</>
  const i = fold(text).indexOf(q.split(/\s+/)[0])
  if (i < 0) return <>{text}</>
  const len = q.split(/\s+/)[0].length
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded bg-brand-100 px-0.5 font-semibold text-ink">{text.slice(i, i + len)}</mark>
      {text.slice(i + len)}
    </>
  )
}

interface PanelProps<T extends string | number> {
  anchorRef: RefObject<HTMLElement | null>
  options: SelectOption<T>[]
  value: T | null
  onSelect: (v: T) => void
  onClose: () => void
  searchable: boolean
  initialQuery?: string
  minWidth?: number
  emptyText?: string
  listId: string
}

/**
 * Lista desplegable con buscador. Se dibuja en un portal con posición fija para que no la corten
 * los modales con scroll, y se abre hacia arriba si no cabe abajo.
 */
function SelectPanel<T extends string | number>({ anchorRef, options, value, onSelect, onClose, searchable, initialQuery = '', minWidth = 180, emptyText = 'Sin resultados', listId }: PanelProps<T>) {
  const [query, setQuery] = useState(initialQuery)
  const filtered = useMemo(() => filterOptions(options, query), [options, query])
  // Al abrir tecleando se resalta la primera coincidencia; si no, la opción actual
  const [active, setActive] = useState(() => (initialQuery ? 0 : Math.max(0, filtered.findIndex((o) => o.value === value))))
  const [pos, setPos] = useState<{ top: number; left: number; width: number; maxHeight: number; up: boolean } | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const place = useCallback(() => {
    const r = anchorRef.current?.getBoundingClientRect()
    if (!r) return
    const below = window.innerHeight - r.bottom - 12
    const above = r.top - 12
    const up = below < 260 && above > below
    const width = Math.max(r.width, minWidth)
    setPos({
      top: up ? r.top - 6 : r.bottom + 6,
      left: Math.min(Math.max(8, r.left), window.innerWidth - width - 8),
      width,
      maxHeight: Math.min(360, up ? above : below),
      up,
    })
  }, [anchorRef, minWidth])

  useLayoutEffect(place, [place])
  useEffect(() => {
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (!panelRef.current?.contains(t) && !anchorRef.current?.contains(t)) onClose()
    }
    document.addEventListener('mousedown', onDown)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
      document.removeEventListener('mousedown', onDown)
    }
  }, [place, onClose, anchorRef])

  useEffect(() => {
    if (searchable) searchRef.current?.focus()
  }, [searchable])

  // Mantener visible la opción activa al navegar con flechas
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(filtered.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const o = filtered[active]
      if (o && !o.disabled) onSelect(o.value)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      onClose()
      anchorRef.current?.focus()
    } else if (e.key === 'Tab') onClose()
  }

  if (!pos) return null
  return createPortal(
    <div
      ref={panelRef}
      onKeyDown={onKey}
      className="animate-pop fixed z-[70] flex flex-col overflow-hidden rounded-xl border border-line bg-white shadow-xl shadow-brand-900/10"
      style={{ left: pos.left, width: pos.width, maxHeight: pos.maxHeight, ...(pos.up ? { bottom: window.innerHeight - pos.top } : { top: pos.top }) }}
    >
      {searchable && (
        <div className="flex items-center gap-2 border-b border-line px-3 py-2">
          <Search className="size-4 shrink-0 text-ink-mute" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
            placeholder="Buscar…"
            className="w-full min-w-0 bg-transparent text-sm text-ink outline-none placeholder:text-ink-mute"
            role="searchbox"
            aria-controls={listId}
            aria-activedescendant={filtered[active] ? `${listId}-${active}` : undefined}
          />
          {query && (
            <button type="button" onClick={() => (setQuery(''), searchRef.current?.focus())} className="text-ink-mute hover:text-ink" aria-label="Limpiar búsqueda">
              <X className="size-3.5" />
            </button>
          )}
        </div>
      )}
      <div ref={listRef} id={listId} role="listbox" tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto p-1 scrollbar-thin">
        {!filtered.length && <p className="px-3 py-4 text-center text-xs text-ink-soft">{emptyText}</p>}
        {filtered.map((o, i) => {
          const selected = o.value === value
          return (
            <button
              type="button"
              key={String(o.value)}
              id={`${listId}-${i}`}
              data-index={i}
              role="option"
              aria-selected={selected}
              disabled={o.disabled}
              onMouseEnter={() => setActive(i)}
              onClick={() => onSelect(o.value)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs text-ink transition disabled:text-ink-mute ${i === active ? 'bg-brand-50' : ''} ${selected ? 'font-semibold text-brand-700' : ''}`}
            >
              {o.icon && <span className="shrink-0 text-base leading-none">{o.icon}</span>}
              <span className="min-w-0 flex-1">
                <span className="block truncate">
                  <Highlight text={o.label} query={query} />
                </span>
                {o.hint && <span className="block truncate text-[10px] font-normal text-ink-soft">{o.hint}</span>}
              </span>
              {selected && <Check className="size-3.5 shrink-0" />}
            </button>
          )
        })}
      </div>
      {searchable && filtered.length > 0 && query && (
        <p className="border-t border-line px-3 py-1.5 text-[10px] text-ink-mute">
          {filtered.length} de {options.length} · ↑↓ para moverte, Enter para elegir
        </p>
      )}
    </div>,
    document.body,
  )
}

/** Abre la lista también al teclear con el selector enfocado (filtra con esa letra). */
function useTypeToOpen(open: boolean, setOpen: (q: string) => void) {
  return (e: React.KeyboardEvent) => {
    if (open) return
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setOpen('')
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault()
      setOpen(e.key)
    }
  }
}

/** Con pocas opciones el buscador estorba; desde 5 se muestra. Teclear filtra siempre. */
const SEARCH_FROM = 5

interface SearchSelectProps<T extends string | number> {
  value: T | null
  options: SelectOption<T>[]
  onChange: (v: T) => void
  placeholder?: string
  emptyText?: string
  className?: string
  /** 'field' = estilo de campo de formulario; 'ghost' = sin borde, para barras compactas */
  variant?: 'field' | 'ghost'
  disabled?: boolean
  ariaLabel?: string
}

/** Selector de formulario con búsqueda (reemplaza al <select> nativo). */
export function SearchSelect<T extends string | number>({ value, options, onChange, placeholder = 'Selecciona…', emptyText, className = '', variant = 'field', disabled, ariaLabel }: SearchSelectProps<T>) {
  const [open, setOpen] = useState<{ q: string } | null>(null)
  const ref = useRef<HTMLButtonElement>(null)
  const listId = useId()
  const current = options.find((o) => o.value === value)
  const close = useCallback(() => setOpen(null), [])
  const onKeyDown = useTypeToOpen(Boolean(open), (q) => setOpen({ q }))

  return (
    <>
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        role="combobox"
        aria-expanded={Boolean(open)}
        aria-controls={listId}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => (o ? null : { q: '' }))}
        onKeyDown={onKeyDown}
        className={
          variant === 'field'
            ? `input flex items-center gap-2 text-left disabled:bg-tile disabled:text-ink-mute ${open ? 'border-brand-400 ring-4 ring-brand-100' : ''} ${className}`
            : `flex min-w-0 items-center gap-1.5 text-left font-medium outline-none ${className}`
        }
      >
        {current?.icon && <span className="shrink-0 leading-none">{current.icon}</span>}
        <span className={`min-w-0 flex-1 truncate ${current ? '' : 'text-ink-mute'}`}>{current?.label ?? placeholder}</span>
        <ChevronDown className={`size-4 shrink-0 text-ink-soft transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <SelectPanel
          anchorRef={ref}
          options={options}
          value={value}
          initialQuery={open.q}
          searchable={options.length >= SEARCH_FROM || Boolean(open.q)}
          emptyText={emptyText}
          listId={listId}
          onClose={close}
          onSelect={(v) => {
            onChange(v)
            setOpen(null)
            ref.current?.focus()
          }}
        />
      )}
    </>
  )
}

interface PillSelectProps<T extends string | number> {
  value: T
  options: SelectOption<T>[]
  onChange: (v: T) => void
  className?: string
  size?: 'sm' | 'md'
  active?: boolean
}

/** Filtro tipo "pastilla" (Este mes ▾, Verduras ▾…) con la misma lista buscable. */
export function PillSelect<T extends string | number>({ value, options, onChange, className = '', size = 'md', active = false }: PillSelectProps<T>) {
  const [open, setOpen] = useState<{ q: string } | null>(null)
  const ref = useRef<HTMLButtonElement>(null)
  const listId = useId()
  const current = options.find((o) => o.value === value)
  const close = useCallback(() => setOpen(null), [])
  const onKeyDown = useTypeToOpen(Boolean(open), (q) => setOpen({ q }))
  const pad = size === 'sm' ? 'px-2.5 py-1 text-[10px]' : 'px-3.5 py-2 text-xs'

  return (
    <div className={className}>
      <button
        ref={ref}
        type="button"
        role="combobox"
        aria-expanded={Boolean(open)}
        aria-controls={listId}
        aria-haspopup="listbox"
        onClick={() => setOpen((o) => (o ? null : { q: '' }))}
        onKeyDown={onKeyDown}
        className={`flex items-center gap-2 whitespace-nowrap rounded-lg border transition ${pad} ${
          active ? 'border-white/40 bg-white/20 text-white' : 'border-line bg-white text-ink hover:border-brand-300 hover:bg-brand-50'
        }`}
      >
        {current?.icon && <span className="leading-none">{current.icon}</span>}
        {current?.label ?? 'Seleccionar'}
        <ChevronDown className={`size-3.5 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <SelectPanel
          anchorRef={ref}
          options={options}
          value={value}
          initialQuery={open.q}
          searchable={options.length >= SEARCH_FROM || Boolean(open.q)}
          listId={listId}
          onClose={close}
          minWidth={200}
          onSelect={(v) => {
            onChange(v)
            setOpen(null)
            ref.current?.focus()
          }}
        />
      )}
    </div>
  )
}
