import { Printer, Receipt, Undo2 } from 'lucide-react'
import Modal from '../ui/Modal'
import { useSalesStore, PAYMENT_METHODS } from '../../store/useSalesStore'
import { useCustomerStore } from '../../store/useCustomerStore'
import { useEmployeeStore } from '../../store/useEmployeeStore'
import { useBranchStore } from '../../store/useBranchStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import { useInventoryStore } from '../../store/useInventoryStore'
import { toast } from '../../store/useUiStore'
import { formatDateTime, formatMoney, formatQty } from '../../utils/format'
import { registerLabel } from '../../utils/cash'

export default function ReceiptModal({ saleId, onClose }: { saleId: string; onClose: () => void }) {
  const sale = useSalesStore((s) => s.sales.find((x) => x.id === saleId))
  const refundSale = useSalesStore((s) => s.refundSale)
  const customer = useCustomerStore((s) => s.customers.find((c) => c.id === sale?.customerId))
  const cashier = useEmployeeStore((s) => s.employees.find((e) => e.id === sale?.cashierId))
  const branch = useBranchStore((s) => s.branches.find((b) => b.id === sale?.storeId))
  const settings = useSettingsStore()
  const adjustStock = useInventoryStore((s) => s.adjustStock)

  if (!sale) return null

  const refund = () => {
    refundSale(sale.id)
    sale.items.forEach((i) => adjustStock(i.productId, i.qty))
    toast({ type: 'info', title: `Ticket #${sale.number} reembolsado`, message: 'El inventario fue repuesto.' })
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Ticket #${sale.number}`}
      subtitle={formatDateTime(sale.date)}
      icon={Receipt}
      width="max-w-sm"
      footer={
        <>
          {!sale.refunded && (
            <button className="btn-ghost mr-auto text-red-500" onClick={refund}>
              <Undo2 className="size-4" /> Reembolsar
            </button>
          )}
          <button className="btn-primary" onClick={() => window.print()}>
            <Printer className="size-4" /> Imprimir
          </button>
        </>
      }
    >
      <div className="print-area rounded-xl border border-dashed border-line bg-tile p-4 font-mono text-[11px] text-ink">
        <div className="mb-3 text-center">
          <p className="text-sm font-bold">{settings.businessName}</p>
          <p>{branch?.name}</p>
          <p className="text-ink-soft">{branch?.address}</p>
          <p className="text-ink-soft">RFC {settings.rfc}</p>
        </div>
        <div className="mb-2 border-y border-dashed border-line py-2">
          <p>Ticket: #{sale.number}{sale.register ? ` · ${registerLabel(sale.register)}` : ''}</p>
          <p>Fecha: {formatDateTime(sale.date)}</p>
          <p>Cliente: {customer?.name ?? 'Público general'}</p>
          <p>Atendió: {cashier?.name ?? '—'}</p>
        </div>
        {sale.items.map((i) => (
          <div key={i.productId} className="flex justify-between gap-2 py-0.5">
            <span className="truncate">
              {Number.isInteger(i.qty) ? `${i.qty} x` : formatQty(i.qty, 'kg')} {i.name}
            </span>
            <span>{formatMoney(i.price * i.qty)}</span>
          </div>
        ))}
        <div className="mt-2 space-y-0.5 border-t border-dashed border-line pt-2">
          <Row label="Subtotal" value={formatMoney(sale.subtotal)} />
          {(sale.promotions ?? []).map((p) => (
            <Row key={p.promoId} label={`${p.badge} ${p.name}`} value={`-${formatMoney(p.discount)}`} />
          ))}
          <Row label="TOTAL" value={formatMoney(sale.total)} bold />
          <Row label="IVA incluido" value={formatMoney(sale.tax)} />
          <Row label="Pago" value={PAYMENT_METHODS[sale.payment]} />
          {sale.cashReceived != null && (
            <>
              <Row label="Recibido" value={formatMoney(sale.cashReceived)} />
              <Row label="Cambio" value={formatMoney(sale.change)} />
            </>
          )}
        </div>
        {sale.payment === 'credit' && (
          <div className="mt-2 space-y-0.5 border-t border-dashed border-line pt-2">
            <Row label="VENTA A CRÉDITO" value="" bold />
            {sale.creditBalanceAfter != null && <Row label="Saldo del cliente" value={formatMoney(sale.creditBalanceAfter)} />}
            <p className="pt-6 text-center">______________________________</p>
            <p className="text-center text-ink-soft">Firma de conformidad · {customer?.name}</p>
          </div>
        )}
        {sale.discount > 0 && <p className="mt-2 text-center font-bold">¡Usted ahorró {formatMoney(sale.discount)}!</p>}
        {sale.refunded && <p className="mt-3 rounded bg-red-50 py-1 text-center font-bold text-red-500">REEMBOLSADO</p>}
        <p className="mt-3 text-center text-ink-soft">{settings.receiptFooter}</p>
      </div>
    </Modal>
  )
}

const Row = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => (
  <div className={`flex justify-between gap-2 ${bold ? 'text-xs font-bold' : ''}`}>
    <span className="min-w-0 truncate">{label}</span>
    <span className="shrink-0 whitespace-nowrap">{value}</span>
  </div>
)
