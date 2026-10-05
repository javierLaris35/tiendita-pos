import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import PosHeader, { type PosAction } from '../components/caja/PosHeader'
import PosCatalog from '../components/caja/PosCatalog'
import PosTicket from '../components/caja/PosTicket'
import MobileTicket from '../components/caja/MobileTicket'
import PaymentModal from '../components/caja/PaymentModal'
import WeightModal from '../components/caja/WeightModal'
import OpenRegister from '../components/caja/OpenRegister'
import { CashMovementModal, CloseRegisterModal, CorteXModal, ParkedTicketsModal } from '../components/caja/CashModals'
import { CustomersModal, PosOrdersModal, PriceCheckModal, TicketSearchModal } from '../components/caja/PosTools'
import OrderVerifyModal from '../components/orders/OrderVerifyModal'
import { useOrderStore } from '../store/useOrderStore'
import ReceiptModal from '../components/pos/ReceiptModal'
import { useMySession } from '../store/useCashStore'
import { useCartStore, type CartLine } from '../store/useCartStore'
import { useInventoryStore } from '../store/useInventoryStore'
import { useSalesStore } from '../store/useSalesStore'
import { useAuthStore } from '../store/useAuthStore'
import { useUiStore, toast } from '../store/useUiStore'
import { beep } from '../utils/sound'
import { deliverPaidOrder, findOrderByCode, loadOrderIntoCart } from '../store/orderActions'
import { parseOrderCode, parseProductCode } from '../utils/orders'
import type { CashSession, PaymentMethod, Product } from '../types'

type ModalState =
  | { kind: 'pay'; method: PaymentMethod }
  | { kind: 'weight'; product: Product; current?: number }
  | { kind: 'close'; session: CashSession } // se conserva para mostrar el corte Z ya cerrado
  | { kind: 'verify'; orderId: string }
  | { kind: 'movement' | 'corteX' | 'parked' | 'customers' | 'price' | 'tickets' | 'orders' }
  | null

export default function Pos() {
  const session = useMySession()
  const navigate = useNavigate()
  const products = useInventoryStore((s) => s.products)
  const cart = useCartStore()
  const logout = useAuthStore((s) => s.logout)
  const receiptId = useUiStore((s) => s.receiptId)
  const openReceipt = useUiStore((s) => s.openReceipt)
  const closeReceipt = useUiStore((s) => s.closeReceipt)
  const [query, setQuery] = useState('')
  const [modal, setModal] = useState<ModalState>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const focusSearch = useCallback(() => setTimeout(() => inputRef.current?.focus(), 30), [])
  const [params, setParams] = useSearchParams()

  // Pedido (web, WhatsApp o Escanea y paga): se cobra o se entrega con su código/QR
  const openOrder = useCallback((raw: string) => {
    const order = findOrderByCode(raw)
    if (!order) {
      beep(300, 160)
      toast({ type: 'error', title: 'Pedido no encontrado', message: 'Revisa el QR o el código del cliente.' })
      return
    }
    beep()
    setModal({ kind: 'verify', orderId: order.id })
  }, [])

  // Cobrar desde la verificación: carga el pedido al ticket y abre el cobro de una vez
  const chargeOrder = (orderId: string) => {
    const order = useOrderStore.getState().orders.find((o) => o.id === orderId)
    if (!order) return
    const res = loadOrderIntoCart(order.code)
    if (!res.ok) return toast({ type: 'error', title: 'Pedido', message: res.error })
    setModal({ kind: 'pay', method: 'cash' })
  }

  // Desde el tablero de pedidos: /caja?pedido=P-2002
  useEffect(() => {
    const code = params.get('pedido')
    if (code && session) {
      openOrder(code)
      setParams({}, { replace: true })
    }
  }, [params, session, openOrder, setParams])

  const pick = (p: Product, qty?: number) => {
    if (p.unit === 'kg' && qty == null) return setModal({ kind: 'weight', product: p })
    if (cart.add(p.id, qty ?? 1)) beep()
    focusSearch()
  }

  // Enter en el buscador: "3*7501..." agrega 3 piezas; código exacto o coincidencia única se agregan
  const submitSearch = () => {
    const raw = query.trim()
    if (!raw) return
    if (parseOrderCode(raw) && !products.some((p) => p.barcode === raw)) {
      setQuery('')
      return openOrder(raw)
    }
    const m = raw.match(/^(\d+(?:\.\d+)?)\*(.+)$/)
    const qty = m ? Number(m[1]) : undefined
    // Acepta también el QR de anaquel (liga con ?p=código)
    const term = parseProductCode(m ? m[2] : raw).toLowerCase()
    const exact = products.find((p) => p.barcode === term)
    const loose = products.filter((p) => `${p.name} ${p.brand} ${p.barcode}`.toLowerCase().includes(term))
    // Si varios coinciden por marca pero solo uno por nombre, ese es el que se busca
    const byName = loose.filter((p) => p.name.toLowerCase().includes(term))
    const matches = exact ? [exact] : loose.length > 1 && byName.length === 1 ? byName : loose
    if (matches.length === 1) {
      pick(matches[0], qty)
      setQuery('')
    } else if (!matches.length) {
      beep(300, 160)
      toast({ type: 'error', title: 'Producto no encontrado', message: raw })
    }
  }

  const onAction = (a: PosAction) => {
    if (a === 'panel') return navigate('/')
    if (a === 'logout') {
      logout()
      return navigate('/login')
    }
    if (a === 'reprint') {
      const last = useSalesStore.getState().sales.find((s) => s.sessionId === session?.id)
      return last ? openReceipt(last.id) : toast({ type: 'info', title: 'Aún no hay ventas en este turno' })
    }
    if (a === 'close') return session && setModal({ kind: 'close', session })
    setModal({ kind: a })
  }

  // Atajos de teclado de caja
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!session || modal || receiptId) return
      const hasItems = useCartStore.getState().items.length > 0
      const actions: Record<string, (() => void) | null> = {
        F2: () => inputRef.current?.focus(),
        F9: () => setModal({ kind: 'price' }),
        F10: () => setModal({ kind: 'customers' }),
        F11: () => setModal({ kind: 'tickets' }),
        F12: () => setModal({ kind: 'orders' }),
        F4: hasItems ? () => setModal({ kind: 'pay', method: 'cash' }) : null,
        F6: hasItems ? () => setModal({ kind: 'pay', method: 'card' }) : null,
        F8: hasItems
          ? () => {
              useCartStore.getState().park()
              toast({ type: 'info', title: 'Venta en espera' })
            }
          : null,
      }
      const action = actions[e.key]
      if (action) {
        e.preventDefault()
        action()
      }
      if (e.key === 'Escape') setQuery('')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [session, modal, receiptId])

  useEffect(() => {
    if (session) focusSearch()
  }, [session, focusSearch])

  const ticketProps = {
    onPay: (method: PaymentMethod) => setModal({ kind: 'pay', method }),
    onEditWeight: (l: CartLine) => setModal({ kind: 'weight', product: l, current: l.qty }),
    onCustomer: () => setModal({ kind: 'customers' }),
    onParked: () => setModal({ kind: 'parked' }),
  }

  const close = () => {
    setModal(null)
    focusSearch()
  }

  return (
    <div className={`flex min-h-full flex-col gap-3 p-2.5 sm:p-3 md:h-full ${session ? "pb-24 md:pb-3" : ""}`}>
      <PosHeader query={query} onQuery={setQuery} onSubmit={submitSearch} inputRef={inputRef} session={session} onAction={onAction} />

      {!session ? (
        <OpenRegister />
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(300px,340px)] lg:grid-cols-[minmax(0,1fr)_minmax(340px,400px)]">
          <PosCatalog query={query} onPick={(p) => pick(p)} />
          {/* Tableta y escritorio: ticket a un lado. Teléfono: barra fija abajo + hoja deslizable */}
          <div className="hidden min-h-0 md:flex md:flex-col">
            <PosTicket {...ticketProps} className="min-h-0 flex-1" />
          </div>
          <MobileTicket {...ticketProps} />
        </div>
      )}

      {modal?.kind === 'pay' && <PaymentModal method={modal.method} onClose={close} onFinished={close} />}
      {modal?.kind === 'weight' && (
        <WeightModal
          product={modal.product}
          initialKg={modal.current}
          onClose={close}
          onConfirm={(kg) => {
            if (modal.current != null) cart.setQty(modal.product.id, kg)
            else if (cart.add(modal.product.id, kg)) beep()
            close()
          }}
        />
      )}
      {session && modal?.kind === 'movement' && <CashMovementModal session={session} onClose={close} />}
      {session && modal?.kind === 'corteX' && <CorteXModal session={session} onClose={close} />}
      {modal?.kind === 'close' && <CloseRegisterModal session={modal.session} onClose={close} onClosed={() => setModal(null)} />}
      {modal?.kind === 'parked' && <ParkedTicketsModal onClose={close} />}
      {modal?.kind === 'customers' && <CustomersModal assignedId={cart.customerId} onAssign={cart.setCustomer} onClose={close} />}
      {modal?.kind === 'price' && <PriceCheckModal onAdd={(p) => pick(p)} onClose={close} />}
      {modal?.kind === 'tickets' && <TicketSearchModal onClose={close} />}
      {modal?.kind === 'orders' && <PosOrdersModal onLoad={openOrder} onClose={close} />}
      {modal?.kind === 'verify' && (
        <OrderVerifyModal
          orderId={modal.orderId}
          onClose={close}
          onCharge={() => chargeOrder(modal.orderId)}
          onDeliver={() => {
            deliverPaidOrder(modal.orderId)
            toast({ title: 'Pedido entregado', message: 'Se avisó al cliente.' })
            close()
          }}
        />
      )}
      {receiptId && <ReceiptModal saleId={receiptId} onClose={closeReceipt} />}
    </div>
  )
}
