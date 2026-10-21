import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, HandCoins, Lock, MonitorCheck, PackageOpen, Receipt, ShoppingCart, Store, Tag, Wallet } from 'lucide-react'
import BillingHistory from '../components/pos/BillingHistory'
import Avatar from '../components/ui/Avatar'
import { PanelHeader, ProductThumb } from '../components/ui/Misc'
import { useBranchSales, useCustomerStats } from '../hooks'
import { useCustomerStore } from '../store/useCustomerStore'
import { CreditStatus } from '../components/credit/Credit'
import { useActiveBranch } from '../store/useBranchStore'
import { useCashStore, useMySession } from '../store/useCashStore'
import { useCurrentUser } from '../store/useAuthStore'
import { useEmployeeStore } from '../store/useEmployeeStore'
import { useInventoryStore } from '../store/useInventoryStore'
import { useActivePromotions } from '../store/usePromotionStore'
import { useSalesStore } from '../store/useSalesStore'
import { registerLabel, sessionSummary } from '../utils/cash'
import { formatMoney, formatQty, formatTime, timeAgo } from '../utils/format'
import { pctChange, periodRange, inRange } from '../utils/period'
import { promoBadge, promoColor } from '../utils/promotions'
import { stockStatus } from '../utils/stock'

function ChangePill({ change, accent, className = '' }: { change: number; accent?: boolean; className?: string }) {
  return (
    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold ${accent ? 'bg-white text-emerald-600' : change >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'} ${className}`}>
      {change >= 0 ? '+' : ''}
      {change.toFixed(0)}%
    </span>
  )
}

function Kpi({ icon: Icon, label, value, change, accent }: { icon: typeof Wallet; label: string; value: string; change?: number; accent?: boolean }) {
  return (
    <div className={`card flex items-center gap-3 p-3 sm:p-4 ${accent ? 'border-brand-500 bg-brand-500 text-white shadow-lg shadow-brand-500/20' : ''}`}>
      <div className={`hidden size-11 shrink-0 place-items-center rounded-xl sm:grid ${accent ? 'bg-white text-brand-600' : 'border border-line bg-tile text-ink-soft'}`}>
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-[11px] sm:text-xs ${accent ? 'text-white/85' : 'text-ink-soft'}`}>{label}</p>
        <p className="truncate text-lg font-semibold sm:text-xl">{value}</p>
        {/* En teléfono la variación va debajo para no apretar el importe */}
        {change != null && <ChangePill change={change} accent={accent} className="mt-1 inline-block sm:hidden" />}
      </div>
      {change != null && <ChangePill change={change} accent={accent} className="hidden shrink-0 sm:inline-block" />}
    </div>
  )
}

export default function Overview() {
  const user = useCurrentUser()
  const branch = useActiveBranch()
  const sales = useBranchSales()
  const allSales = useSalesStore((s) => s.sales)
  const payments = useCustomerStore((s) => s.payments)
  const debtors = useCustomerStats().filter((c) => c.balance > 0).sort((a, b) => b.overdueDays - a.overdueDays || b.balance - a.balance)
  const receivable = debtors.reduce((a, c) => a + c.balance, 0)
  const sessions = useCashStore((s) => s.sessions)
  const employees = useEmployeeStore((s) => s.employees)
  const products = useInventoryStore((s) => s.products)
  const promos = useActivePromotions()
  const mySession = useMySession()

  const stats = useMemo(() => {
    const { start, end, prevStart, prevEnd } = periodRange('today')
    const today = sales.filter((s) => inRange(s.date, start, end))
    const yesterday = sales.filter((s) => inRange(s.date, prevStart, prevEnd))
    const sum = (l: typeof sales) => l.reduce((a, s) => a + s.total, 0)
    const promoUses = new Map<string, number>()
    for (const s of today) for (const p of s.promotions ?? []) promoUses.set(p.promoId, (promoUses.get(p.promoId) ?? 0) + 1)
    return {
      revenue: sum(today),
      revenueChange: pctChange(sum(today), sum(yesterday)),
      tickets: today.length,
      ticketsChange: pctChange(today.length, yesterday.length),
      avg: today.length ? sum(today) / today.length : 0,
      savings: today.reduce((a, s) => a + s.discount, 0),
      promoUses,
    }
  }, [sales])

  const registers = Array.from({ length: branch?.counters ?? 1 }, (_, i) => i + 1).map((r) => {
    const open = sessions.find((s) => s.status === 'open' && s.branchId === branch?.id && s.register === r)
    const last = sessions.find((s) => s.status === 'closed' && s.branchId === branch?.id && s.register === r)
    return { r, open, last, summary: open ? sessionSummary(open, allSales, payments) : null }
  })
  const lowStock = products.filter((p) => stockStatus(p) !== 'ok').sort((a, b) => a.stock - b.stock)
  const hour = new Date().getHours()

  return (
    <div className="space-y-3">
      <section className="card flex flex-wrap items-center gap-4 p-5">
        <div className="mr-auto">
          <p className="text-xs text-ink-soft">{new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1 className="text-xl font-semibold">
            {hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'}, {user?.name.split(' ')[0]}
          </h1>
          <p className="flex items-center gap-1.5 text-xs text-ink-soft">
            <Store className="size-3.5" /> {branch?.name}
          </p>
        </div>
        <Link to="/caja" className="btn-primary px-6 py-3.5 text-base">
          <MonitorCheck className="size-5" />
          {mySession ? `Ir a ${registerLabel(mySession.register)}` : 'Abrir punto de venta'}
          <ArrowRight className="size-4" />
        </Link>
      </section>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
        <Kpi accent icon={Wallet} label="Ventas de hoy" value={formatMoney(stats.revenue)} change={stats.revenueChange} />
        <Kpi icon={Receipt} label="Tickets" value={String(stats.tickets)} change={stats.ticketsChange} />
        <Kpi icon={ShoppingCart} label="Ticket promedio" value={formatMoney(stats.avg)} />
        <Kpi icon={Tag} label="Ahorro en ofertas hoy" value={formatMoney(stats.savings)} />
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <section className="card space-y-3 p-4">
            <PanelHeader icon={MonitorCheck} title="Cajas de la sucursal">
              <Link to="/cortes" className="text-xs text-brand-600 hover:underline">
                Ver cortes
              </Link>
            </PanelHeader>
            <div className="grid gap-2 md:grid-cols-2 2xl:grid-cols-3">
              {registers.map(({ r, open, last, summary }) => {
                const who = open && employees.find((e) => e.id === open.cashierId)
                return (
                  <div key={r} className={`rounded-2xl border p-3 ${open ? 'border-emerald-200 bg-emerald-50/50' : 'border-line bg-tile'}`}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold">{registerLabel(r)}</p>
                      <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${open ? 'bg-emerald-500 text-white' : 'bg-white text-ink-soft'}`}>
                        {open ? <MonitorCheck className="size-3" /> : <Lock className="size-3" />}
                        {open ? 'Abierta' : 'Cerrada'}
                      </span>
                    </div>
                    {open && summary ? (
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center gap-2">
                          <Avatar src={who?.avatar} name={who?.name} size="size-7" />
                          <p className="text-xs">
                            {who?.name ?? '—'} <span className="text-ink-soft">· desde {formatTime(open.openedAt)}</span>
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="rounded-lg bg-white p-2">
                            <p className="text-ink-soft">Vendido</p>
                            <p className="font-semibold">{formatMoney(summary.totalSales)}</p>
                          </div>
                          <div className="rounded-lg bg-white p-2">
                            <p className="text-ink-soft">Efectivo en caja</p>
                            <p className="font-semibold">{formatMoney(summary.expected)}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-2 text-[11px] text-ink-soft">{last ? `Último corte ${timeAgo(last.closedAt)}` : 'Sin turnos registrados'}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
          <div className="flex h-[420px] flex-col">
            <BillingHistory />
          </div>
        </div>

        <div className="space-y-3">
          <section className="card space-y-3 p-4">
            <PanelHeader icon={Tag} title="Ofertas activas">
              <Link to="/ofertas" className="text-xs text-brand-600 hover:underline">
                Administrar
              </Link>
            </PanelHeader>
            {!promos.length && <p className="py-4 text-center text-xs text-ink-soft">No hay ofertas vigentes en esta sucursal.</p>}
            {promos.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl border border-line p-2.5">
                <span className={`rounded-lg bg-gradient-to-r px-2 py-1 text-[11px] font-bold text-white ${promoColor(p)}`}>{promoBadge(p)}</span>
                <p className="min-w-0 flex-1 truncate text-xs font-medium">{p.name}</p>
                <span className="text-[10px] text-ink-soft">{stats.promoUses.get(p.id) ?? 0} hoy</span>
              </div>
            ))}
          </section>
          <section className="card space-y-3 p-4">
            <PanelHeader icon={HandCoins} title="Cuentas por cobrar">
              <Link to="/clientes?filtro=saldo" className="text-xs text-brand-600 hover:underline">
                Ver clientes
              </Link>
            </PanelHeader>
            <div className="flex items-end justify-between rounded-xl bg-amber-50 p-3">
              <div>
                <p className="text-[11px] text-amber-800">Fiado pendiente</p>
                <p className="text-xl font-semibold text-amber-900">{formatMoney(receivable)}</p>
              </div>
              <p className="text-[11px] text-amber-800">
                {debtors.length} clientes · {debtors.filter((d) => d.overdueDays > 0).length} vencidos
              </p>
            </div>
            {debtors.slice(0, 4).map((c) => (
              <div key={c.id} className="flex items-center gap-3">
                <Avatar src={c.avatar} name={c.name} size="size-8" />
                <p className="min-w-0 flex-1 truncate text-xs font-medium">{c.name}</p>
                <CreditStatus customer={c} />
              </div>
            ))}
          </section>
          <section className="card space-y-3 p-4">
            <PanelHeader icon={PackageOpen} title="Por surtir">
              <Link to="/inventario" className="text-xs text-brand-600 hover:underline">
                Inventario
              </Link>
            </PanelHeader>
            {lowStock.slice(0, 7).map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <ProductThumb product={p} size="size-9" text="text-lg" />
                <p className="min-w-0 flex-1 truncate text-xs font-medium">{p.name}</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${p.stock <= 0 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'}`}>
                  {p.stock <= 0 ? 'Agotado' : `${formatQty(p.stock, p.unit)}`}
                </span>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  )
}
