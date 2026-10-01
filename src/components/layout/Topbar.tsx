import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, BellRing, ChevronDown, ChevronRight, LogOut, Menu, MonitorCheck, Receipt, Search, Settings, Trash2, UserRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Avatar from '../ui/Avatar'
import { ProductThumb } from '../ui/Misc'
import { useClickOutside } from '../../hooks'
import { useInventoryStore } from '../../store/useInventoryStore'
import { useCustomerStore } from '../../store/useCustomerStore'
import { useSalesStore } from '../../store/useSalesStore'
import { useMySession } from '../../store/useCashStore'
import { registerLabel } from '../../utils/cash'
import { useAuthStore, useCurrentUser } from '../../store/useAuthStore'
import { useEmployeeStore } from '../../store/useEmployeeStore'
import { useUiStore } from '../../store/useUiStore'
import { formatMoney, timeAgo } from '../../utils/format'

function GlobalSearch() {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const ref = useClickOutside(close, open)
  const products = useInventoryStore((s) => s.products)
  const customers = useCustomerStore((s) => s.customers)
  const sales = useSalesStore((s) => s.sales)
  const openReceipt = useUiStore((s) => s.openReceipt)
  const navigate = useNavigate()

  const results = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return null
    const num = term.replace(/[#a-z]/g, '')
    return {
      products: products.filter((p) => `${p.name} ${p.brand} ${p.barcode}`.toLowerCase().includes(term)).slice(0, 5),
      customers: customers.filter((c) => `${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(term)).slice(0, 3),
      sales: num ? sales.filter((s) => String(s.number).startsWith(num)).slice(0, 3) : [],
    }
  }, [q, products, customers, sales])

  const empty = results && !results.products.length && !results.customers.length && !results.sales.length
  const pick = (fn: () => unknown) => () => {
    fn()
    setQ('')
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative min-w-0 flex-1">
      <div className="card flex h-full items-center gap-3 px-4 py-3">
        <Search className="size-[18px] shrink-0 text-ink-soft" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Busca productos, tickets o clientes..."
          className="w-full min-w-0 bg-transparent text-sm text-ink outline-none placeholder:text-ink-mute"
        />
      </div>
      {open && results && (
        <div className="animate-pop absolute inset-x-0 top-full z-40 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-line bg-white p-2 shadow-xl scrollbar-thin">
          {empty && <p className="p-4 text-center text-xs text-ink-soft">Sin resultados para “{q}”.</p>}
          {results.products.length > 0 && <Group title="Productos" />}
          {results.products.map((p) => (
            <button key={p.id} onClick={pick(() => navigate(`/inventario?q=${encodeURIComponent(p.name)}`))} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-brand-50">
              <ProductThumb product={p} size="size-9" text="text-lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{p.name}</p>
                <p className="text-[10px] text-ink-soft">
                  {p.brand} · {p.stock} en stock
                </p>
              </div>
              <span className="text-xs font-semibold">{formatMoney(p.price)}</span>
              <ChevronRight className="size-4 text-ink-mute" />
            </button>
          ))}
          {results.customers.length > 0 && <Group title="Clientes" />}
          {results.customers.map((c) => (
            <button key={c.id} onClick={pick(() => navigate(`/clientes?id=${c.id}`))} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-brand-50">
              <Avatar src={c.avatar} name={c.name} size="size-9" />
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">{c.name}</p>
                <p className="text-[10px] text-ink-soft">{c.phone}</p>
              </div>
            </button>
          ))}
          {results.sales.length > 0 && <Group title="Tickets" />}
          {results.sales.map((s) => (
            <button key={s.id} onClick={pick(() => openReceipt(s.id))} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-brand-50">
              <div className="icon-box size-9">
                <Receipt className="size-4" />
              </div>
              <p className="flex-1 text-xs font-medium">Ticket #{s.number}</p>
              <span className="text-[10px] text-ink-soft">{timeAgo(s.date)}</span>
              <span className="text-xs font-semibold">{formatMoney(s.total)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const Group = ({ title }: { title: string }) => <p className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-ink-mute">{title}</p>

function Notifications() {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const ref = useClickOutside(close, open)
  const notifications = useUiStore((s) => s.notifications)
  const markAllRead = useUiStore((s) => s.markAllRead)
  const markRead = useUiStore((s) => s.markRead)
  const clear = useUiStore((s) => s.clearNotifications)
  const unread = notifications.filter((n) => !n.read).length

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="card relative grid size-[50px] place-items-center hover:bg-brand-50" aria-label="Notificaciones">
        {unread ? <BellRing className="size-5 text-red-500" /> : <Bell className="size-5 text-ink" />}
        {unread > 0 && <span className="absolute right-2 top-2 grid min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[9px] font-semibold text-white">{unread}</span>}
      </button>
      {open && (
        <div className="animate-pop absolute right-0 z-40 mt-2 w-[min(90vw,22rem)] rounded-2xl border border-line bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold">Notificaciones</p>
            <div className="flex gap-1">
              <button onClick={markAllRead} className="rounded-lg px-2 py-1 text-[11px] text-brand-600 hover:bg-brand-50">
                Marcar leídas
              </button>
              <button onClick={clear} className="grid size-7 place-items-center rounded-lg text-ink-soft hover:bg-red-50 hover:text-red-500" aria-label="Limpiar">
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto p-2 scrollbar-thin">
            {!notifications.length && <p className="p-6 text-center text-xs text-ink-soft">No tienes notificaciones.</p>}
            {notifications.map((n) => (
              <button key={n.id} onClick={() => markRead(n.id)} className={`flex w-full gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-brand-50 ${n.read ? '[&_p]:text-ink-mute' : ''}`}>
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.type === 'warning' ? 'bg-orange-500' : n.type === 'error' ? 'bg-red-500' : 'bg-brand-500'}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium">{n.title}</p>
                  {n.message && <p className="text-[11px] text-ink-soft">{n.message}</p>}
                  <p className="mt-0.5 text-[10px] text-ink-mute">{timeAgo(n.date)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function UserMenu() {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const ref = useClickOutside(close, open)
  const user = useCurrentUser()
  const logout = useAuthStore((s) => s.logout)
  const updateEmployee = useEmployeeStore((s) => s.updateEmployee)
  const navigate = useNavigate()
  if (!user) return null

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="card flex h-[50px] items-center gap-2.5 py-1.5 pl-1.5 pr-3 hover:bg-brand-50">
        <Avatar src={user.avatar} name={user.name} size="size-9" />
        <div className="hidden text-left md:block">
          <p className="max-w-28 truncate text-[13px] font-medium leading-tight">{user.name}</p>
          <p className="text-[10px] text-ink-soft">{user.role}</p>
        </div>
        <ChevronDown className="size-4 text-ink" />
      </button>
      {open && (
        <div className="animate-pop absolute right-0 z-40 mt-2 w-56 rounded-2xl border border-line bg-white p-1.5 shadow-xl">
          <div className="px-3 py-2">
            <p className="text-xs font-semibold">{user.name}</p>
            <p className="text-[10px] text-ink-soft">
              {user.role} · {user.email}
            </p>
          </div>
          <MenuBtn icon={UserRound} label="Mi perfil" onClick={() => (setOpen(false), navigate('/ajustes'))} />
          <MenuBtn icon={Settings} label="Ajustes" onClick={() => (setOpen(false), navigate('/ajustes'))} />
          <MenuBtn
            icon={LogOut}
            label="Cerrar sesión"
            danger
            onClick={() => {
              updateEmployee(user.id, { status: 'offline' })
              logout()
              navigate('/login')
            }}
          />
        </div>
      )}
    </div>
  )
}

const MenuBtn = ({ icon: Icon, label, onClick, danger }: { icon: LucideIcon; label: string; onClick: () => void; danger?: boolean }) => (
  <button onClick={onClick} className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs ${danger ? 'text-red-500 hover:bg-red-50' : 'hover:bg-brand-50'}`}>
    <Icon className="size-4" /> {label}
  </button>
)

export default function Topbar() {
  const setMobileNav = useUiStore((s) => s.setMobileNav)
  const session = useMySession()

  return (
    <header className="flex items-stretch gap-2 sm:gap-3">
      <button onClick={() => setMobileNav(true)} className="card grid w-[50px] shrink-0 place-items-center lg:hidden" aria-label="Abrir menú">
        <Menu className="size-5" />
      </button>
      <GlobalSearch />
      <Link to="/caja" className="flex shrink-0 items-center gap-2 rounded-2xl bg-brand-500 px-3 text-sm text-white shadow-md shadow-brand-500/30 transition hover:bg-brand-600 sm:px-5">
        <MonitorCheck className="size-5" />
        <span className="hidden md:inline">{session ? `Ir a ${registerLabel(session.register)}` : 'Abrir caja'}</span>
      </Link>
      <Notifications />
      <UserMenu />
    </header>
  )
}
