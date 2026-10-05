import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useOrderStore } from '../../store/useOrderStore'
import { toast } from '../../store/useUiStore'
import { CHANNEL_META } from '../../utils/orders'
import { beep } from '../../utils/sound'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import ReceiptModal from '../pos/ReceiptModal'
import { useCurrentUser } from '../../store/useAuthStore'
import { useUiStore } from '../../store/useUiStore'

export default function AppLayout() {
  const user = useCurrentUser()
  const receiptId = useUiStore((s) => s.receiptId)
  const closeReceipt = useUiStore((s) => s.closeReceipt)

  useEffect(
    () =>
      useOrderStore.subscribe((state, prev) => {
        const known = new Set(prev.orders.map((o) => o.id))
        state.orders
          .filter((o) => !known.has(o.id) && (o.status === 'received' || o.status === 'awaiting_payment'))
          .forEach((o) => {
            beep(880, 120)
            toast({ type: 'info', title: `🛎️ Nuevo pedido ${o.code}`, message: `${CHANNEL_META[o.channel].label} · ${o.customerName}`, duration: 6000 })
          })
      }),
    [],
  )
  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="flex min-h-full items-start gap-3 p-2.5 sm:p-3">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {/* Barra superior fija: el fondo tapa el contenido que pasa por debajo al hacer scroll */}
        <div className="sticky top-0 z-30 -mt-2.5 bg-canvas pt-2.5 sm:-mt-3 sm:pt-3">
          <Topbar />
        </div>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
      {receiptId && <ReceiptModal saleId={receiptId} onClose={closeReceipt} />}
    </div>
  )
}
