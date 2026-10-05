import { useEffect, useState, type RefObject } from 'react'
import { ShoppingBag, ArrowLeftRight, FileClock, LayoutDashboard, Lock, LogOut, Printer, Receipt, ScanBarcode, ScanSearch, Search, UsersRound, X } from 'lucide-react'
import Avatar from '../ui/Avatar'
import { KebabMenu, type MenuItem } from '../ui/Dropdown'
import { Logo } from '../ui/Misc'
import { useCurrentUser } from '../../store/useAuthStore'
import { useActiveBranch } from '../../store/useBranchStore'
import { useOrderStore } from '../../store/useOrderStore'
import { registerLabel } from '../../utils/cash'
import type { CashSession } from '../../types'

export type PosAction = 'movement' | 'corteX' | 'close' | 'reprint' | 'panel' | 'logout' | 'price' | 'customers' | 'tickets' | 'orders'

const TOOLS: { action: PosAction; label: string; key: string; icon: typeof Search }[] = [
  { action: 'price', label: 'Precio', key: 'F9', icon: ScanSearch },
  { action: 'customers', label: 'Clientes', key: 'F10', icon: UsersRound },
  { action: 'tickets', label: 'Tickets', key: 'F11', icon: Receipt },
  { action: 'orders', label: 'Pedidos', key: 'F12', icon: ShoppingBag },
]

function Clock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15000)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="hidden text-right leading-tight xl:block">
      <p className="text-sm font-semibold tabular-nums">{now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</p>
      <p className="text-[10px] text-ink-soft">{now.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
    </div>
  )
}

interface PosHeaderProps {
  query: string
  onQuery: (q: string) => void
  onSubmit: () => void
  inputRef: RefObject<HTMLInputElement | null>
  session?: CashSession
  onAction: (a: PosAction) => void
}

export default function PosHeader({ query, onQuery, onSubmit, inputRef, session, onAction }: PosHeaderProps) {
  const user = useCurrentUser()
  const branch = useActiveBranch()
  // Pedidos listos para cobrar o entregar en esta sucursal
  const waiting = useOrderStore((s) => s.orders.filter((o) => o.branchId === branch?.id && o.fulfillment !== 'delivery' && ['ready', 'awaiting_payment'].includes(o.status)).length)
  const items: MenuItem[] = session
    ? [
        { label: 'Entrada / retiro de efectivo', icon: ArrowLeftRight, onClick: () => onAction('movement') },
        { label: 'Corte X (parcial)', icon: FileClock, onClick: () => onAction('corteX') },
        { label: 'Reimprimir último ticket', icon: Printer, onClick: () => onAction('reprint') },
        { label: 'Cerrar caja (corte Z)', icon: Lock, onClick: () => onAction('close') },
        { label: 'Ir al panel', icon: LayoutDashboard, onClick: () => onAction('panel') },
        { label: 'Cerrar sesión', icon: LogOut, danger: true, onClick: () => onAction('logout') },
      ]
    : [
        { label: 'Ir al panel', icon: LayoutDashboard, onClick: () => onAction('panel') },
        { label: 'Cerrar sesión', icon: LogOut, danger: true, onClick: () => onAction('logout') },
      ]

  return (
    <header className="flex flex-wrap items-stretch gap-2 md:flex-nowrap md:gap-3">
      <div className="card hidden items-center px-4 md:flex">
        <Logo textClass="text-sm" />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit()
        }}
        className={`card order-last flex min-w-0 basis-full items-center gap-3 px-4 py-3 transition md:order-none md:basis-auto md:flex-1 focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-100 ${session ? '' : 'pointer-events-none bg-tile [&_input]:placeholder:text-ink-mute'}`}
      >
        <ScanBarcode className="size-5 shrink-0 text-brand-500" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Escanea o busca un producto…"
          title="Tip: 3*código agrega varias piezas"
          className="w-full min-w-0 bg-transparent text-base text-ink outline-none placeholder:text-ink-mute"
          disabled={!session}
          autoComplete="off"
        />
        {query ? (
          <button type="button" onClick={() => onQuery('')} className="text-ink-mute hover:text-ink" aria-label="Limpiar búsqueda">
            <X className="size-4" />
          </button>
        ) : (
          <span className="hidden items-center gap-1 text-[10px] text-ink-mute sm:flex">
            <Search className="size-3" /> <kbd className="rounded border border-line px-1">F2</kbd>
          </span>
        )}
      </form>
      {session && (
        <div className="card flex min-w-0 flex-1 items-center justify-around gap-0.5 p-1 md:flex-none md:justify-start md:gap-1">
          {TOOLS.map(({ action, label, key, icon: Icon }) => (
            <button key={action} onClick={() => onAction(action)} title={`${label} (${key})`} className="relative flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1.5 text-ink transition hover:bg-brand-50 xl:flex-row xl:gap-2 xl:px-3">
              {action === 'orders' && waiting > 0 && <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-orange-500 text-[9px] font-bold text-white">{waiting}</span>}
              <Icon className="size-5 text-brand-600" />
              <span className="hidden text-[10px] font-medium sm:inline xl:text-xs">{label}</span>
              <kbd className="hidden rounded border border-line px-1 text-[9px] text-ink-mute 2xl:inline">{key}</kbd>
            </button>
          ))}
        </div>
      )}
      <div className={`flex shrink-0 flex-col justify-center rounded-2xl px-3 text-white sm:px-4 ${session ? 'bg-ink' : 'bg-ink-soft'} ${session ? '' : 'flex-1 md:flex-none'}`}>
        <p className="whitespace-nowrap text-sm font-bold leading-tight tracking-wide sm:text-lg">{session ? registerLabel(session.register).toUpperCase() : 'CAJA CERRADA'}</p>
        <p className="hidden truncate text-[10px] text-white/70 sm:block">{branch?.name}</p>
      </div>
      <div className="card flex shrink-0 items-center gap-3 py-1.5 pl-1.5 pr-1">
        <Avatar src={user?.avatar} name={user?.name} size="size-9" />
        <div className="hidden leading-tight lg:block">
          <p className="max-w-28 truncate text-[13px] font-medium">{user?.name}</p>
          <p className="text-[10px] text-ink-soft">{user?.role}</p>
        </div>
        <Clock />
        <KebabMenu items={items} />
      </div>
    </header>
  )
}
