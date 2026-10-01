import { useMemo, useState } from 'react'
import { Download, FileText, Printer, Receipt, TrendingUp, Wallet, ShoppingCart, PiggyBank } from 'lucide-react'
import SmoothLineChart from '../components/charts/SmoothLineChart'
import { Dropdown } from '../components/ui/Dropdown'
import { PanelHeader } from '../components/ui/Misc'
import { useSalesStore, PAYMENT_METHODS } from '../store/useSalesStore'
import { useBranchStore } from '../store/useBranchStore'
import { useCustomerStore } from '../store/useCustomerStore'
import { useInventoryStore } from '../store/useInventoryStore'
import { useUiStore } from '../store/useUiStore'
import { CATEGORIES } from '../data/seed'
import { PERIODS, periodRange, inRange } from '../utils/period'
import { downloadCSV, formatDateTime, formatMoney, formatNumber } from '../utils/format'
import type { PaymentMethod, Period } from '../types'

export default function Reports() {
  const allSales = useSalesStore((s) => s.sales)
  const branches = useBranchStore((s) => s.branches)
  const activeBranch = useBranchStore((s) => s.activeBranchId)
  const customers = useCustomerStore((s) => s.customers)
  const products = useInventoryStore((s) => s.products)
  const openReceipt = useUiStore((s) => s.openReceipt)
  const [period, setPeriod] = useState<Period>('month')
  const [scope, setScope] = useState(activeBranch)
  const [page, setPage] = useState(1)

  const sales = useMemo(() => {
    const { start, end } = periodRange(period)
    return allSales.filter((s) => !s.refunded && (scope === 'all' || s.storeId === scope) && inRange(s.date, start, end))
  }, [allSales, period, scope])

  const report = useMemo(() => {
    const revenue = sales.reduce((a, s) => a + s.total, 0)
    const costMap = Object.fromEntries(products.map((p) => [p.id, p.cost]))
    let cost = 0
    let net = 0
    const byCat: Record<string, number> = {}
    const byPay: Partial<Record<PaymentMethod, number>> = {}
    const byDay: Record<string, number> = {}
    for (const s of sales) {
      byPay[s.payment] = (byPay[s.payment] ?? 0) + s.total
      const day = new Date(s.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
      byDay[day] = (byDay[day] ?? 0) + s.total
      net += s.total - s.tax
      for (const i of s.items) {
        byCat[i.category] = (byCat[i.category] ?? 0) + i.price * i.qty
        cost += (costMap[i.productId] ?? i.price * 0.68) * i.qty
      }
    }
    const days = Object.entries(byDay).reverse().slice(-31)
    return { revenue, profit: net - cost, byCat, byPay, days, avg: sales.length ? revenue / sales.length : 0 }
  }, [sales, products])

  const catMax = Math.max(...Object.values(report.byCat), 1)
  const PAGE = 12
  const pages = Math.max(1, Math.ceil(sales.length / PAGE))
  const rows = sales.slice((page - 1) * PAGE, page * PAGE)
  const customerName = (id: string | null) => customers.find((c) => c.id === id)?.name ?? 'Público general'
  const branchName = (id: string) => branches.find((b) => b.id === id)?.name ?? '—'

  const exportCSV = () =>
    downloadCSV(`reporte-ventas-${period}.csv`, [
      ['Ticket', 'Fecha', 'Sucursal', 'Cliente', 'Artículos', 'Subtotal', 'Descuento', 'IVA', 'Total', 'Pago'],
      ...sales.map((s) => [s.number, s.date, branchName(s.storeId), customerName(s.customerId), s.items.reduce((a, i) => a + (Number.isInteger(i.qty) ? i.qty : 1), 0), s.subtotal, s.discount, s.tax, s.total, PAYMENT_METHODS[s.payment]]),
    ])

  const kpis = [
    { icon: Wallet, label: 'Ventas totales', value: formatMoney(report.revenue) },
    { icon: Receipt, label: 'Tickets', value: formatNumber(sales.length) },
    { icon: ShoppingCart, label: 'Ticket promedio', value: formatMoney(report.avg) },
    { icon: PiggyBank, label: 'Utilidad bruta', value: formatMoney(report.profit) },
  ]

  return (
    <div className="space-y-3">
      <section className="card flex flex-wrap items-center gap-2 p-3 sm:p-4">
        <div className="icon-box"><FileText className="size-5" /></div>
        <h1 className="mr-auto text-lg font-medium">Reporte de ventas</h1>
        <Dropdown value={scope} onChange={(v) => (setScope(v), setPage(1))} options={[{ value: 'all', label: 'Todas las sucursales' }, ...branches.map((b) => ({ value: b.id, label: b.name }))]} />
        <Dropdown value={period} onChange={(v) => (setPeriod(v), setPage(1))} options={PERIODS} />
        <button className="btn-ghost py-2" onClick={() => window.print()}><Printer className="size-4" /> Imprimir</button>
        <button className="btn-primary py-2" onClick={exportCSV}><Download className="size-4" /> CSV</button>
      </section>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {kpis.map(({ icon: Icon, label, value }, i) => (
          <div key={label} className={`card p-4 ${i === 0 ? 'border-brand-500 bg-brand-500 text-white' : ''}`}>
            <div className="flex items-center gap-2">
              <Icon className={`size-4 ${i === 0 ? '' : 'text-brand-500'}`} />
              <p className={`text-xs ${i === 0 ? 'text-white/85' : 'text-ink-soft'}`}>{label}</p>
            </div>
            <p className="mt-2 text-xl font-semibold sm:text-2xl">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.4fr_1fr]">
        <section className="card space-y-3 p-4">
          <PanelHeader icon={TrendingUp} title="Ventas por día" />
          {report.days.length > 1 ? (
            <SmoothLineChart labels={report.days.map(([d]) => d)} series={[{ name: 'Ventas', values: report.days.map(([, v]) => Math.round(v)) }]} formatY={(v) => (v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${Math.round(v)}`)} highlightLabel="Ventas del día" height={220} />
          ) : (
            <p className="py-16 text-center text-xs text-ink-soft">Selecciona un periodo más amplio para ver la tendencia.</p>
          )}
        </section>
        <section className="card space-y-4 p-4">
          <PanelHeader title="Ventas por categoría" />
          <div className="space-y-2.5">
            {CATEGORIES.map((c) => ({ ...c, v: report.byCat[c.id] ?? 0 }))
              .sort((a, b) => b.v - a.v)
              .map((c) => (
                <div key={c.id}>
                  <div className="mb-1 flex justify-between text-[11px]"><span>{c.name}</span><span className="font-medium">{formatMoney(c.v)}</span></div>
                  <div className="h-2 rounded-full bg-brand-50"><div className="h-2 rounded-full bg-brand-500 transition-all" style={{ width: `${(c.v / catMax) * 100}%` }} /></div>
                </div>
              ))}
          </div>
          <div className="grid grid-cols-2 gap-2 border-t border-line pt-3 sm:grid-cols-4">
            {(Object.entries(PAYMENT_METHODS) as [PaymentMethod, string][]).map(([k, l]) => (
              <div key={k} className="rounded-xl bg-canvas p-2.5 text-center">
                <p className="label-xs">{l}</p>
                <p className="text-xs font-semibold">{formatMoney(report.byPay[k] ?? 0)}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="bg-tile text-[11px] text-ink-soft">
              <tr>
                {['Ticket', 'Fecha', 'Sucursal', 'Cliente', 'Artículos', 'Pago', 'Total'].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} onClick={() => openReceipt(s.id)} className="cursor-pointer border-t border-line hover:bg-brand-50">
                  <td className="px-4 py-2.5 font-medium">#{s.number}</td>
                  <td className="px-4 py-2.5">{formatDateTime(s.date)}</td>
                  <td className="px-4 py-2.5">{branchName(s.storeId)}</td>
                  <td className="px-4 py-2.5">{customerName(s.customerId)}</td>
                  <td className="px-4 py-2.5">{s.items.reduce((a, i) => a + (Number.isInteger(i.qty) ? i.qty : 1), 0)}</td>
                  <td className="px-4 py-2.5">{PAYMENT_METHODS[s.payment]}</td>
                  <td className="px-4 py-2.5 font-semibold">{formatMoney(s.total)}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={7} className="px-4 py-10 text-center text-ink-soft">Sin ventas en este periodo.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-line px-4 py-3 text-xs">
          <span className="text-ink-soft">{sales.length} tickets · página {page} de {pages}</span>
          <div className="flex gap-2">
            <button className="btn-ghost px-3 py-1.5" disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</button>
            <button className="btn-ghost px-3 py-1.5" disabled={page === pages} onClick={() => setPage(page + 1)}>Siguiente</button>
          </div>
        </div>
      </section>
    </div>
  )
}
