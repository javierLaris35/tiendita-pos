import { useMemo, useState } from 'react'
import { ClipboardList, Printer } from 'lucide-react'
import { CorteReport } from '../components/caja/CashModals'
import { Dropdown } from '../components/ui/Dropdown'
import Modal from '../components/ui/Modal'
import { EmptyState } from '../components/ui/Misc'
import { useCashStore } from '../store/useCashStore'
import { useSalesStore } from '../store/useSalesStore'
import { useCustomerStore } from '../store/useCustomerStore'
import { useEmployeeStore } from '../store/useEmployeeStore'
import { useBranchStore } from '../store/useBranchStore'
import { registerLabel, sessionSummary } from '../utils/cash'
import { formatDateTime, formatMoney, formatTime } from '../utils/format'
import type { CashSession } from '../types'

export default function CashSessions() {
  const sessions = useCashStore((s) => s.sessions)
  const sales = useSalesStore((s) => s.sales)
  const employees = useEmployeeStore((s) => s.employees)
  const branchId = useBranchStore((s) => s.activeBranchId)
  const payments = useCustomerStore((s) => s.payments)
  const [status, setStatus] = useState<'all' | 'open' | 'closed'>('all')
  const [detail, setDetail] = useState<CashSession | null>(null)

  const rows = useMemo(
    () =>
      sessions
        .filter((s) => s.branchId === branchId && (status === 'all' || s.status === status))
        .map((s) => {
          const sum = sessionSummary(s, sales, payments)
          const expected = s.expectedAmount ?? sum.expected
          return { s, sum, expected, diff: s.countedAmount != null ? Math.round((s.countedAmount - expected) * 100) / 100 : null }
        }),
    [sessions, sales, payments, branchId, status],
  )
  const closed = rows.filter((r) => r.diff != null)
  const totalDiff = closed.reduce((a, r) => a + (r.diff ?? 0), 0)

  return (
    <div className="space-y-3">
      <section className="card flex flex-wrap items-center gap-3 p-4">
        <div className="icon-box"><ClipboardList className="size-5" /></div>
        <div className="mr-auto">
          <h1 className="text-lg font-medium">Cortes de caja</h1>
          <p className="text-xs text-ink-soft">Turnos abiertos y cerrados de la sucursal activa</p>
        </div>
        <Dropdown
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'Todos los turnos' },
            { value: 'open', label: 'Abiertos' },
            { value: 'closed', label: 'Cerrados' },
          ]}
        />
      </section>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="card border-brand-500 bg-brand-500 p-4 text-white"><p className="text-xs text-white/85">Turnos</p><p className="text-2xl font-semibold">{rows.length}</p></div>
        <div className="card p-4"><p className="text-xs text-ink-soft">Abiertos ahora</p><p className="text-2xl font-semibold">{rows.filter((r) => r.s.status === 'open').length}</p></div>
        <div className="card p-4"><p className="text-xs text-ink-soft">Cuadrados</p><p className="text-2xl font-semibold">{closed.filter((r) => r.diff === 0).length} / {closed.length}</p></div>
        <div className="card p-4"><p className="text-xs text-ink-soft">Diferencia acumulada</p><p className={`text-2xl font-semibold ${totalDiff < 0 ? 'text-red-500' : totalDiff > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{formatMoney(totalDiff)}</p></div>
      </div>

      <section className="card overflow-hidden">
        {!rows.length ? (
          <EmptyState icon={ClipboardList} title="Sin turnos" message="Los turnos aparecen cuando alguien abre una caja." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-xs">
              <thead className="bg-tile text-[11px] text-ink-soft">
                <tr>
                  {['Caja', 'Cajero', 'Apertura', 'Cierre', 'Fondo', 'Efectivo', 'Tarjeta / Transf.', 'Esperado', 'Contado', 'Diferencia'].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ s, sum, expected, diff }) => (
                  <tr key={s.id} onClick={() => setDetail(s)} className="cursor-pointer border-t border-line hover:bg-brand-50">
                    <td className="px-4 py-2.5 font-semibold">{registerLabel(s.register)}</td>
                    <td className="px-4 py-2.5">{employees.find((e) => e.id === s.cashierId)?.name ?? '—'}</td>
                    <td className="px-4 py-2.5">{formatDateTime(s.openedAt)}</td>
                    <td className="px-4 py-2.5">{s.closedAt ? formatTime(s.closedAt) : <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Abierta</span>}</td>
                    <td className="px-4 py-2.5">{formatMoney(s.openingAmount)}</td>
                    <td className="px-4 py-2.5">{formatMoney(sum.cashSales)}</td>
                    <td className="px-4 py-2.5">{formatMoney(sum.cardSales + sum.transferSales)}</td>
                    <td className="px-4 py-2.5 font-medium">{formatMoney(expected)}</td>
                    <td className="px-4 py-2.5">{s.countedAmount != null ? formatMoney(s.countedAmount) : '—'}</td>
                    <td className="px-4 py-2.5">
                      {diff == null ? (
                        '—'
                      ) : (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${diff === 0 ? 'bg-emerald-50 text-emerald-700' : diff < 0 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'}`}>
                          {diff === 0 ? 'Cuadrada' : `${diff > 0 ? '+' : '−'}${formatMoney(Math.abs(diff))}`}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {detail && (
        <Modal open onClose={() => setDetail(null)} icon={ClipboardList} title={`${registerLabel(detail.register)} · ${detail.status === 'open' ? 'Corte X' : 'Corte Z'}`} width="max-w-md" footer={<button className="btn-primary" onClick={() => window.print()}><Printer className="size-4" /> Imprimir</button>}>
          <CorteReport session={detail} />
        </Modal>
      )}
    </div>
  )
}
