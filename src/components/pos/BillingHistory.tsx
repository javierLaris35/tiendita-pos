import { useMemo, useState } from 'react'
import { ChevronDown, Receipt, ReceiptText, UserRound } from 'lucide-react'
import Avatar from '../ui/Avatar'
import { Dropdown } from '../ui/Dropdown'
import { EmptyState, KeyValue, PanelHeader } from '../ui/Misc'
import { useBranchSales } from '../../hooks'
import { useCustomerStore } from '../../store/useCustomerStore'
import { PAYMENT_METHODS } from '../../store/useSalesStore'
import { useUiStore } from '../../store/useUiStore'
import { PERIODS, filterByPeriod } from '../../utils/period'
import { formatMoney, formatQty, formatTime } from '../../utils/format'
import type { Period } from '../../types'

export default function BillingHistory() {
  const sales = useBranchSales()
  const customers = useCustomerStore((s) => s.customers)
  const openReceipt = useUiStore((s) => s.openReceipt)
  const [period, setPeriod] = useState<Period>('today')
  // undefined = abrir el más reciente por defecto; null = todos cerrados
  const [expanded, setExpanded] = useState<string | null | undefined>(undefined)
  const list = useMemo(() => filterByPeriod(sales, period).slice(0, 60), [sales, period])
  const openId = expanded === undefined ? list[0]?.id : expanded

  return (
    <section className="card flex min-h-[320px] flex-1 flex-col gap-3 p-3 sm:p-4 xl:min-h-0">
      <PanelHeader icon={ReceiptText} title="Historial de ventas">
        <span className="hidden text-[11px] text-ink-soft sm:inline">{list.length} tickets</span>
        <Dropdown value={period} onChange={setPeriod} options={PERIODS} />
      </PanelHeader>
      <div className="-mr-1 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 scrollbar-thin">
        {!list.length && <EmptyState icon={Receipt} title="Sin ventas en este periodo" message="Las ventas que completes aparecerán aquí." />}
        {list.map((sale) => {
          const c = customers.find((x) => x.id === sale.customerId)
          const open = sale.id === openId
          const units = sale.items.reduce((a, i) => a + (Number.isInteger(i.qty) ? i.qty : 1), 0) // granel cuenta como 1 artículo
          return (
            <div key={sale.id} className={`row-card ${open ? 'row-card-active shadow-md shadow-brand-500/20' : 'hover:border-brand-200'}`}>
              <button onClick={() => setExpanded(open ? null : sale.id)} className="grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 p-2.5 text-left sm:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,1fr)_auto]">
                <div className="flex min-w-0 items-center gap-3">
                  {c ? (
                    <Avatar src={c.avatar} name={c.name} />
                  ) : (
                    <div className={`grid size-10 shrink-0 place-items-center rounded-lg ${open ? 'bg-white/20' : 'bg-canvas text-ink-soft'}`}>
                      <UserRound className="size-5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">{c?.name ?? 'Público general'}</p>
                    <p className={`text-[10px] ${open ? 'text-white/80' : 'text-ink-soft'}`}>
                      #{sale.number} · {formatTime(sale.date)}
                    </p>
                  </div>
                </div>
                <div className="hidden sm:block"><KeyValue light={open} label="Artículos" value={units} /></div>
                <KeyValue light={open} label="Total" value={formatMoney(sale.total)} />
                <span className={`grid size-8 place-items-center rounded-full ${open ? 'bg-white/20' : 'bg-canvas'}`}>
                  <ChevronDown className={`size-4 transition ${open ? 'rotate-180' : ''}`} />
                </span>
              </button>
              {open && (
                <div className="animate-fade px-3 pb-3">
                  <div className="space-y-1 rounded-lg bg-white/15 p-2.5 text-[11px]">
                    {sale.items.map((i) => (
                      <div key={i.productId} className="flex justify-between gap-2">
                        <span className="truncate">
                          {i.emoji} {Number.isInteger(i.qty) ? `${i.qty} ×` : formatQty(i.qty, 'kg')} {i.name}
                        </span>
                        <span>{formatMoney(i.price * i.qty)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="text-white/85">Pago: {PAYMENT_METHODS[sale.payment]}</span>
                    <button onClick={() => openReceipt(sale.id)} className="rounded-lg bg-white px-3 py-1.5 font-medium text-brand-600 hover:bg-brand-50">
                      Ver ticket
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
