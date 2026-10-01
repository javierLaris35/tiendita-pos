import { useCallback, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Box,
  ChartPie,
  ClipboardList,
  Check,
  ChevronDown,
  CircleHelp,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MonitorCheck,
  Settings,
  ShoppingBag,
  Store,
  Tag,
  UserCog,
  Users,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Logo } from '../ui/Misc'
import { useBranchStore, useActiveBranch } from '../../store/useBranchStore'
import { useUiStore, toast } from '../../store/useUiStore'
import { useAuthStore } from '../../store/useAuthStore'
import { useClickOutside } from '../../hooks'
import { useOrderStore } from '../../store/useOrderStore'

interface NavEntry {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

export const NAV: NavEntry[] = [
  { to: '/', label: 'Panel', icon: LayoutDashboard, end: true },
  { to: '/caja', label: 'Caja (POS)', icon: MonitorCheck },
  { to: '/pedidos', label: 'Pedidos', icon: ShoppingBag },
  { to: '/ofertas', label: 'Ofertas', icon: Tag },
  { to: '/cortes', label: 'Cortes de caja', icon: ClipboardList },
  { to: '/analisis', label: 'Análisis', icon: ChartPie },
  { to: '/inventario', label: 'Inventario', icon: Box },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/empleados', label: 'Empleados', icon: UserCog },
  { to: '/reportes', label: 'Reportes', icon: FileText },
  { to: '/sucursales', label: 'Sucursales', icon: Store },
  { to: '/suscripcion', label: 'Suscripción', icon: CreditCard },
  { to: '/ayuda', label: 'Ayuda', icon: CircleHelp },
]

function BranchSelector({ collapsed }: { collapsed: boolean }) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const ref = useClickOutside(close, open)
  const branches = useBranchStore((s) => s.branches)
  const setActive = useBranchStore((s) => s.setActive)
  const active = useActiveBranch()

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center gap-2 rounded-xl bg-canvas text-left transition hover:bg-brand-100 ${collapsed ? 'justify-center p-2.5' : 'px-3 py-2.5'}`}
        title={active?.name}
      >
        {collapsed ? (
          <Store className="size-5 text-ink" />
        ) : (
          <>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-ink">{active?.name}</p>
              <p className="truncate text-[9px] text-ink-soft">{active?.address}</p>
            </div>
            <ChevronDown className={`size-4 shrink-0 text-ink transition ${open ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>
      {open && (
        <div className={`animate-pop absolute z-40 mt-1.5 rounded-xl border border-line bg-white p-1 shadow-xl ${collapsed ? 'left-full top-0 ml-2 w-60' : 'inset-x-0'}`}>
          {branches.map((b) => (
            <button
              key={b.id}
              onClick={() => {
                setActive(b.id)
                setOpen(false)
                toast({ type: 'info', title: 'Sucursal cambiada', message: `Ahora operas en ${b.name}.` })
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-brand-50"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-ink">{b.name}</p>
                <p className="truncate text-[9px] text-ink-soft">{b.address}</p>
              </div>
              {b.id === active?.id && <Check className="size-3.5 text-brand-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function NavItem({ item, collapsed, onNavigate }: { item: NavEntry; collapsed?: boolean; onNavigate?: () => void }) {
  const Icon = item.icon
  // Pedidos nuevos sin confirmar en la sucursal activa
  const branchId = useBranchStore((s) => s.activeBranchId)
  const badge = useOrderStore((s) => (item.to === '/pedidos' ? s.orders.filter((o) => o.branchId === branchId && o.status === 'received').length : 0))
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl text-[13px] transition ${collapsed ? 'justify-center p-3' : 'px-3.5 py-2.5'} ${
          isActive ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30' : 'text-ink hover:bg-brand-50'
        }`
      }
    >
      <span className="relative">
        <Icon className="size-[18px] shrink-0" strokeWidth={1.6} />
        {badge > 0 && <span className="absolute -right-2 -top-2 grid size-4 place-items-center rounded-full bg-orange-500 text-[9px] font-bold text-white">{badge}</span>}
      </span>
      {!collapsed && item.label}
    </NavLink>
  )
}

interface SidebarContentProps {
  collapsed?: boolean
  onNavigate?: () => void
  onToggle: () => void
  mobile?: boolean
}

function SidebarContent({ collapsed = false, onNavigate, onToggle, mobile }: SidebarContentProps) {
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  return (
    <div className="flex h-full flex-col gap-5 p-3.5">
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between pl-1'}`}>
        {!collapsed && <Logo textClass="text-base" />}
        <button onClick={onToggle} className="grid size-8 place-items-center rounded-lg text-ink-soft hover:bg-brand-50" aria-label="Contraer menú">
          {mobile ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      <BranchSelector collapsed={collapsed} />
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto no-scrollbar">
        {NAV.map((item) => (
          <NavItem key={item.to} item={item} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
      </nav>
      <div className="flex flex-col gap-1">
        <NavItem item={{ to: '/ajustes', label: 'Ajustes', icon: Settings }} collapsed={collapsed} onNavigate={onNavigate} />
        <button
          onClick={() => {
            logout()
            navigate('/login')
          }}
          title={collapsed ? 'Cerrar sesión' : undefined}
          className={`flex items-center gap-3 rounded-xl text-[13px] text-ink transition hover:bg-red-50 hover:text-red-500 ${collapsed ? 'justify-center p-3' : 'px-3.5 py-2.5'}`}
        >
          <LogOut className="size-[18px]" strokeWidth={1.6} />
          {!collapsed && 'Cerrar sesión'}
        </button>
      </div>
    </div>
  )
}

export default function Sidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed)
  const toggle = useUiStore((s) => s.toggleSidebar)
  const mobileOpen = useUiStore((s) => s.mobileNavOpen)
  const setMobile = useUiStore((s) => s.setMobileNav)

  return (
    <>
      <aside className={`card hidden shrink-0 transition-all duration-200 lg:block ${collapsed ? 'w-[76px]' : 'w-[218px]'}`}>
        <SidebarContent collapsed={collapsed} onToggle={toggle} />
      </aside>
      {mobileOpen && (
        <div className="animate-fade fixed inset-0 z-50 bg-ink/30 lg:hidden" onClick={() => setMobile(false)}>
          <aside className="animate-pop h-full w-64 bg-white" onClick={(e) => e.stopPropagation()}>
            <SidebarContent mobile onToggle={() => setMobile(false)} onNavigate={() => setMobile(false)} />
          </aside>
        </div>
      )}
    </>
  )
}
