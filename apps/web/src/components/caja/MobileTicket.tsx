import { useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Receipt } from 'lucide-react'
import PosTicket, { type PosTicketProps } from './PosTicket'
import { useTicket } from '../../store/useCartStore'
import { formatMoney } from '../../utils/format'

/**
 * Ticket para teléfono: barra fija abajo con el total y el botón Cobrar; al tocarla se abre
 * el ticket completo como hoja deslizable. En tableta y escritorio el ticket va a un lado del catálogo.
 */
export default function MobileTicket(props: PosTicketProps) {
  const { ticket } = useTicket()
  const [open, setOpen] = useState(false)
  const empty = ticket.units === 0

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white px-3 py-2.5 shadow-[0_-8px_24px_rgba(15,58,92,0.1)] md:hidden">
        <div className="flex items-center gap-2">
          <button onClick={() => setOpen(true)} className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl bg-tile px-3 py-2 text-left">
            <Receipt className="size-5 shrink-0 text-brand-500" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[11px] text-ink-soft">
                Ticket · {ticket.units} {ticket.units === 1 ? 'artículo' : 'artículos'}
              </span>
              <span className="flex items-baseline gap-2">
                <span className="whitespace-nowrap text-lg font-bold leading-tight">{formatMoney(ticket.total)}</span>
                {ticket.discount > 0 && <span className="truncate whitespace-nowrap text-[11px] font-medium text-emerald-700">ahorra {formatMoney(ticket.discount)}</span>}
              </span>
            </span>
            <span className="whitespace-nowrap text-[11px] font-medium text-brand-600">Ver</span>
          </button>
          <button disabled={empty} onClick={() => props.onPay('cash')} className="btn-primary px-5 py-3.5">
            Cobrar
          </button>
        </div>
      </div>
      {open &&
        createPortal(
          <div className="animate-fade fixed inset-0 z-40 flex flex-col justify-end bg-ink/40 md:hidden" onClick={() => setOpen(false)}>
            <div className="animate-pop flex h-[88dvh] flex-col" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setOpen(false)} className="mx-auto mb-2 flex items-center gap-1 rounded-full bg-white px-4 py-1.5 text-xs font-medium text-ink shadow">
                <ChevronDown className="size-4" /> Seguir agregando
              </button>
              <PosTicket
                {...props}
                className="min-h-0 flex-1 rounded-b-none"
                onPay={(m) => {
                  setOpen(false)
                  props.onPay(m)
                }}
                onCustomer={() => {
                  setOpen(false)
                  props.onCustomer()
                }}
                onParked={() => {
                  setOpen(false)
                  props.onParked()
                }}
                onEditWeight={(l) => {
                  setOpen(false)
                  props.onEditWeight(l)
                }}
              />
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
