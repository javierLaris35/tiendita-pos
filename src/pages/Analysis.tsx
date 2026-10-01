import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDown, ArrowUp, Box, CalendarCheck2, PackageOpen, Phone, Tag, Trophy, Users, Wallet } from 'lucide-react'
import StripedBarChart from '../components/charts/StripedBarChart'
import SmoothLineChart from '../components/charts/SmoothLineChart'
import { Dropdown, KebabMenu } from '../components/ui/Dropdown'
import Avatar from '../components/ui/Avatar'
import { KeyValue, PanelHeader, ProductThumb, StatusDot, StockBadge } from '../components/ui/Misc'
import { useBranchSales } from '../hooks'
import { useInventoryStore } from '../store/useInventoryStore'
import { useEmployeeStore, EMPLOYEE_STATUS } from '../store/useEmployeeStore'
import { useBranchStore } from '../store/useBranchStore'
import { toast } from '../store/useUiStore'
import { CATEGORIES } from '../data/seed'
import { PERIODS, WEEKDAYS, WEEKDAYS_LONG, inRange, pctChange, periodRange } from '../utils/period'
import { formatMoney, formatNumber } from '../utils/format'
import { stockStatus } from '../utils/stock'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import type { CategoryId, Option, Period, Product, Sale } from '../types'

const KPI_PERIODS = PERIODS.filter((p) => p.value !== 'all')
const TREND_PERIODS: Option<number>[] = [
  { value: 7, label: 'Esta semana' },
  { value: 30, label: 'Este mes' },
  { value: 90, label: 'Últimos 90 días' },
]
const CAT_OPTIONS = CATEGORIES.map((c) => ({ value: c.id, label: c.name }))

const sumSales = (list: Sale[]) => list.reduce((a, s) => a + s.total, 0)

function windowStats(sales: Sale[], period: Period) {
  const { start, end, prevStart, prevEnd } = periodRange(period)
  const curr = sales.filter((s) => inRange(s.date, start, end))
  const prev = sales.filter((s) => inRange(s.date, prevStart, prevEnd))
  return { curr, prev }
}

function ChangeBadge({ value, light = false }: { value: number; light?: boolean }) {
  const up = value >= 0
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
        light ? 'border-white bg-white text-emerald-600' : up ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-red-200 bg-red-50 text-red-500'
      } ${light && !up ? 'text-red-500' : ''}`}
    >
      {up ? '+' : ''}
      {value.toFixed(1)}%{up ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
    </span>
  )
}

interface KpiCardProps {
  icon: LucideIcon
  title: string
  value: string
  change?: number
  active?: boolean
  control?: ReactNode
}

function KpiCard({ icon: Icon, title, value, change, active = false, control }: KpiCardProps) {
  return (
    <div className={`card flex flex-col justify-between gap-4 p-4 ${active ? 'border-brand-500 bg-brand-500 text-white shadow-lg shadow-brand-500/25' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className={`grid size-10 place-items-center rounded-xl ${active ? 'bg-white text-brand-600' : 'border border-line bg-tile text-ink-soft'}`}>
          <Icon className="size-5" />
        </div>
        {control}
      </div>
      <div>
        <p className={`text-sm sm:text-base ${active ? 'text-white' : 'text-ink'}`}>{title}</p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xl font-semibold sm:text-2xl">{value}</p>
          {change != null && <ChangeBadge value={change} light={active} />}
        </div>
      </div>
    </div>
  )
}

export default function Analysis() {
  const navigate = useNavigate()
  const sales = useBranchSales()
  const products = useInventoryStore((s) => s.products)
  const branchId = useBranchStore((s) => s.activeBranchId)
  const employees = useEmployeeStore((s) => s.employees)
  const [revPeriod, setRevPeriod] = useState<Period>('month')
  const [ordPeriod, setOrdPeriod] = useState<Period>('today')
  const [trendDays, setTrendDays] = useState(30)
  const [trendCat, setTrendCat] = useState<CategoryId>('verduras')
  const [cmpA, setCmpA] = useState<CategoryId>('verduras')
  const [cmpB, setCmpB] = useState<CategoryId>('carnes')
  const [topPeriod, setTopPeriod] = useState<Period>('month')

  const revenue = useMemo(() => windowStats(sales, revPeriod), [sales, revPeriod])
  const daily = useMemo(() => windowStats(sales, 'today'), [sales])
  const orders = useMemo(() => windowStats(sales, ordPeriod), [sales, ordPeriod])
  const lowStock = products.filter((p) => stockStatus(p) !== 'ok')

  // % de ventas de la categoría por día de la semana
  const trend = useMemo(() => {
    const since = Date.now() - trendDays * 86400000
    const byDay = Array(7).fill(0)
    for (const s of sales) {
      if (new Date(s.date).getTime() < since) continue
      for (const i of s.items) if (i.category === trendCat) byDay[new Date(s.date).getDay()] += i.price * i.qty
    }
    const total = byDay.reduce((a, b) => a + b, 0) || 1
    return WEEKDAYS.map((label, d) => ({ label, value: Math.round((byDay[d] / total) * 1000) / 10 }))
  }, [sales, trendDays, trendCat])

  // Participación de cada categoría sobre la venta total de cada día (últimos 60 días)
  const comparison = useMemo(() => {
    const since = Date.now() - 60 * 86400000
    const total = Array(7).fill(0)
    const a = Array(7).fill(0)
    const b = Array(7).fill(0)
    for (const s of sales) {
      if (new Date(s.date).getTime() < since) continue
      const d = new Date(s.date).getDay()
      for (const i of s.items) {
        const v = i.price * i.qty
        total[d] += v
        if (i.category === cmpA) a[d] += v
        if (i.category === cmpB) b[d] += v
      }
    }
    const pct = (arr: number[]) => arr.map((v, d) => Math.round((v / (total[d] || 1)) * 1000) / 10)
    return { a: pct(a), b: pct(b) }
  }, [sales, cmpA, cmpB])

  const topProducts = useMemo(() => {
    const { curr, prev } = windowStats(sales, topPeriod)
    const agg = (list: Sale[]) => {
      const m: Record<string, { units: number; revenue: number }> = {}
      for (const s of list) for (const i of s.items) {
        m[i.productId] ??= { units: 0, revenue: 0 }
        m[i.productId].units += i.qty
        m[i.productId].revenue += i.price * i.qty
      }
      return m
    }
    const now = agg(curr)
    const before = agg(prev)
    return Object.entries(now)
      .map(([id, v]) => ({ product: products.find((p) => p.id === id), ...v, change: pctChange(v.units, before[id]?.units ?? 0) }))
      .flatMap((x) => (x.product ? [{ ...x, product: x.product as Product }] : []))
      .sort((x, y) => y.units - x.units)
      .slice(0, 6)
  }, [sales, topPeriod, products])

  const branchStaff = employees.filter((e) => e.storeId === branchId)
  const staff = branchStaff.length ? branchStaff : employees

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          active
          icon={Wallet}
          title="Ingresos totales"
          value={formatMoney(sumSales(revenue.curr))}
          change={pctChange(sumSales(revenue.curr), sumSales(revenue.prev))}
          control={<Dropdown size="sm" active value={revPeriod} onChange={setRevPeriod} options={KPI_PERIODS} />}
        />
        <KpiCard
          icon={Tag}
          title="Ventas del día"
          value={formatMoney(sumSales(daily.curr))}
          change={pctChange(sumSales(daily.curr), sumSales(daily.prev))}
          control={<span className="rounded-lg border border-line px-2.5 py-1 text-[10px] text-ink">Hoy</span>}
        />
        <KpiCard
          icon={Box}
          title="Órdenes procesadas"
          value={formatNumber(orders.curr.length)}
          change={pctChange(orders.curr.length, orders.prev.length)}
          control={<Dropdown size="sm" value={ordPeriod} onChange={setOrdPeriod} options={KPI_PERIODS} />}
        />
        <KpiCard
          icon={PackageOpen}
          title="Stock bajo"
          value={`${lowStock.length} productos`}
          control={<KebabMenu items={[{ label: 'Ver inventario', icon: Box, onClick: () => navigate('/inventario') }]} />}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <section className="card space-y-4 p-4">
          <PanelHeader title="Tendencia de ventas">
            <Dropdown value={trendDays} onChange={setTrendDays} options={TREND_PERIODS} />
            <Dropdown value={trendCat} onChange={setTrendCat} options={CAT_OPTIONS} />
          </PanelHeader>
          <StripedBarChart data={trend} formatValue={(v) => `${v.toFixed(1)}% de la semana`} />
        </section>

        <section className="card flex flex-col gap-3 p-4">
          <PanelHeader icon={Trophy} title="Productos más vendidos">
            <Dropdown value={topPeriod} onChange={setTopPeriod} options={KPI_PERIODS} />
          </PanelHeader>
          <div className="max-h-[236px] space-y-2 overflow-y-auto pr-1 scrollbar-thin">
            {!topProducts.length && <p className="py-10 text-center text-xs text-ink-soft">Sin ventas en este periodo.</p>}
            {topProducts.map(({ product, units, revenue: rev, change }, i) => {
              const active = i === 0
              return (
                <div key={product.id} className={`row-card grid grid-cols-[minmax(0,1.6fr)_repeat(2,minmax(0,0.8fr))_auto_auto] items-center gap-3 p-2 ${active ? 'row-card-active' : ''}`}>
                  <div className="flex min-w-0 items-center gap-2.5">
                    <ProductThumb product={product} />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">{product.name}</p>
                      <p className={`text-[10px] ${active ? 'text-white/80' : 'text-ink-soft'}`}>{CATEGORIES.find((c) => c.id === product.category)?.name}</p>
                    </div>
                  </div>
                  <KeyValue light={active} label="Unidades" value={`${units} u`} />
                  <KeyValue light={active} label="Ingresos" value={formatMoney(rev)} />
                  <StockBadge product={product} className="hidden bg-white sm:inline-flex" />
                  <ChangeBadge value={change} light={active} />
                </div>
              )
            })}
          </div>
        </section>

        <section className="card space-y-3 p-4">
          <PanelHeader title="Comparativa">
            <Dropdown value={cmpA} onChange={setCmpA} options={CAT_OPTIONS} />
            <Dropdown value={cmpB} onChange={setCmpB} options={CAT_OPTIONS} />
          </PanelHeader>
          <SmoothLineChart
            labels={WEEKDAYS_LONG}
            series={[
              { name: CATEGORIES.find((c) => c.id === cmpA)?.name ?? '', values: comparison.a },
              { name: CATEGORIES.find((c) => c.id === cmpB)?.name ?? '', values: comparison.b },
            ]}
            formatY={(v) => `${Math.round(v * 10) / 10}%`}
            highlightLabel="Tasa de venta"
            height={210}
          />
        </section>

        <section className="card flex flex-col gap-3 p-4">
          <PanelHeader icon={Users} title="Empleados">
            <span className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs">
              <CalendarCheck2 className="size-3.5" /> Hoy
            </span>
            <KebabMenu items={[{ label: 'Administrar empleados', icon: Users, onClick: () => navigate('/empleados') }]} />
          </PanelHeader>
          <div className="max-h-[236px] space-y-2 overflow-y-auto pr-1 scrollbar-thin">
            {staff.map((e, i) => {
              const st = EMPLOYEE_STATUS[e.status]
              const active = i === 1
              const h = Math.floor(e.hoursToday)
              const m = Math.round((e.hoursToday - h) * 60)
              return (
                <div key={e.id} className={`row-card grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_auto] items-center gap-3 p-2 ${active ? 'row-card-active' : ''}`}>
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar src={e.avatar} name={e.name} />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">{e.name}</p>
                      <p className={`text-[10px] ${active ? 'text-white/80' : 'text-ink-soft'}`}>{e.counter}</p>
                    </div>
                  </div>
                  <KeyValue light={active} label="Horas trabajadas" value={`${h}h ${String(m).padStart(2, '0')}m`} />
                  <StatusDot dot={st.dot} label={st.label} className="hidden border border-line bg-white text-ink sm:inline-flex" />
                  <button
                    onClick={() => toast({ type: 'info', title: `Llamando a ${e.name}…`, message: e.phone })}
                    className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] transition ${active ? 'border-white/40 bg-white/20 hover:bg-white/30' : 'border-line hover:bg-brand-50'}`}
                  >
                    <Phone className="size-3.5" /> Llamar
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
