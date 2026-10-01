import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, CreditCard, Minus, Plus, ScanLine, ShoppingBasket, Store, Trash2, UserRound, Wallet, X } from 'lucide-react'
import { Logo } from '../components/ui/Misc'
import { CameraScanner, QrCode } from '../components/qr/Qr'
import ShopAuth from '../components/shop/ShopAuth'
import PromoLine from '../components/ui/PromoLine'
import LinePrice from '../components/ui/LinePrice'
import { SearchSelect } from '../components/ui/Select'
import { branchOptions } from '../components/ui/selectOptions'
import { useShopper, useScanCart, useShopTicket } from '../store/useShopperStore'
import { useInventoryStore } from '../store/useInventoryStore'
import { useBranchStore } from '../store/useBranchStore'
import { useOrderStore } from '../store/useOrderStore'
import { toast } from '../store/useUiStore'
import { placeOrder } from '../store/orderActions'
import { orderQrValue, parseProductCode } from '../utils/orders'
import { beep } from '../utils/sound'
import { formatMoney, formatQty } from '../utils/format'

/**
 * Escanea y paga: el cliente recorre la tienda escaneando los QR de los anaqueles con su teléfono
 * y al final paga en línea o genera un código para pagar en caja sin volver a pasar producto por producto.
 */
export default function SelfScan() {
  const shopper = useShopper()
  const [params, setParams] = useSearchParams()
  const products = useInventoryStore((s) => s.products)
  const branches = useBranchStore((s) => s.branches)
  const cart = useScanCart()
  const branchId = cart.branchId ?? branches[0]?.id ?? 's1'
  const { lines, ticket } = useShopTicket(cart.items, branchId)
  const [scanning, setScanning] = useState(false)
  const [checkout, setCheckout] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)
  const order = useOrderStore((s) => s.orders.find((o) => o.id === orderId))

  const addCode = (raw: string) => {
    const code = parseProductCode(raw)
    const p = products.find((x) => x.barcode === code || x.id === code)
    if (!p) {
      beep(300, 160)
      return toast({ type: 'error', title: 'Código no reconocido', message: 'Escanea el QR del anaquel o el código de barras.' })
    }
    const r = cart.add(p.id, p.unit === 'kg' ? 0.5 : 1)
    if (!r.ok) return toast({ type: 'error', title: 'Sin existencia suficiente', message: `${p.name}: disponibles ${formatQty(r.available, p.unit)}` })
    beep()
    toast({ title: `${p.emoji} ${p.name}`, message: `${formatMoney(p.price)}${p.unit === 'kg' ? ' /kg · ajusta el peso en tu lista' : ''}`, duration: 1800 })
  }

  // Si el cliente escaneó un QR con la cámara normal del teléfono, llega aquí con ?p=<código>
  useEffect(() => {
    const p = params.get('p')
    if (p && shopper) {
      addCode(p)
      setParams({}, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, shopper])

  const finish = (paid: boolean) => {
    if (!shopper) return
    const res = placeOrder({ channel: 'scan', fulfillment: 'instore', customerId: shopper.id, branchId, items: cart.items, paymentMode: paid ? 'online' : 'on_delivery', paid })
    if (!res.ok) return toast({ type: 'error', title: res.error, message: res.shortages.map((s) => `${s.name}: quedan ${s.available}`).join(' · ') })
    cart.clear()
    setCheckout(false)
    setOrderId(res.order.id)
  }

  const simulate = () => {
    const pool = products.filter((p) => p.stock > 0 && p.unit === 'pz')
    addCode(pool[Math.floor(Math.random() * pool.length)].barcode)
  }

  return (
    <div className="min-h-full bg-canvas">
      <div className="mx-auto flex min-h-full max-w-md flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-white/90 px-4 py-3 backdrop-blur">
          <Link to="/tienda">
            <Logo textClass="text-sm" />
          </Link>
          <span className="ml-auto flex items-center gap-1 rounded-full bg-fuchsia-50 px-2.5 py-1 text-[11px] font-medium text-fuchsia-700">
            <ScanLine className="size-3.5" /> Escanea y paga
          </span>
        </header>

        {!shopper ? (
          <div className="p-5">
            <div className="card space-y-4 p-5">
              <div className="grid size-14 place-items-center rounded-2xl bg-fuchsia-50 text-fuchsia-600">
                <ScanLine className="size-7" />
              </div>
              <p className="text-sm text-ink-soft">Escanea los productos con tu teléfono mientras compras y evita la fila: paga en línea o solo muestra un código en caja.</p>
              <ShopAuth title="Inicia sesión para empezar" />
            </div>
          </div>
        ) : order ? (
          <div className="space-y-4 p-5 text-center">
            {order.status === 'completed' ? (
              <div className="card space-y-3 p-6">
                <CheckCircle2 className="mx-auto size-14 text-emerald-500" />
                <p className="text-xl font-bold">¡Compra pagada!</p>
                <p className="text-sm text-ink-soft">Pedido {order.code} · {formatMoney(order.total)}</p>
                <p className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">Muestra esta pantalla a la salida si te la piden. ¡Gracias!</p>
              </div>
            ) : (
              <div className="card space-y-3 p-6">
                <p className="text-sm font-semibold">Muestra este código en caja</p>
                <div className="flex justify-center">
                  <QrCode value={orderQrValue(order.code)} size={230} />
                </div>
                <p className="font-mono text-3xl font-black tracking-widest">{order.code}</p>
                <p className="text-sm">
                  Total a pagar <b>{formatMoney(order.total)}</b>
                </p>
                <p className="text-xs text-ink-soft">El cajero escanea el código y te cobra todo de una vez; esta pantalla se actualiza sola cuando pagues.</p>
              </div>
            )}
            <button
              className="btn-primary w-full py-3"
              onClick={() => {
                setOrderId(null)
                setScanning(true)
              }}
            >
              <ScanLine className="size-4" /> Nueva compra
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-3 p-4">
              <div className="flex items-center gap-2 rounded-2xl bg-white p-3 text-xs">
                <Store className="size-4 text-brand-500" />
                <span className="text-ink-soft">Estás en</span>
                <SearchSelect variant="ghost" className="flex-1" value={branchId} options={branchOptions(branches)} onChange={cart.setBranch} ariaLabel="Sucursal donde estás" />
                <span className="flex items-center gap-1 text-ink-soft">
                  <UserRound className="size-3.5" /> {shopper.name.split(' ')[0]}
                </span>
              </div>
              {scanning ? (
                <div className="card space-y-2 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Apunta al QR del producto</p>
                    <button onClick={() => setScanning(false)} className="grid size-8 place-items-center rounded-lg hover:bg-tile" aria-label="Cerrar cámara">
                      <X className="size-4" />
                    </button>
                  </div>
                  <CameraScanner onResult={addCode} onSimulate={simulate} />
                </div>
              ) : (
                <button onClick={() => setScanning(true)} className="flex w-full items-center justify-center gap-3 rounded-3xl bg-gradient-to-r from-fuchsia-500 to-brand-500 py-6 text-lg font-semibold text-white shadow-lg">
                  <ScanLine className="size-7" /> Escanear producto
                </button>
              )}
            </div>

            <div className="flex-1 space-y-2 px-4 pb-40">
              {!lines.length && (
                <div className="py-10 text-center text-sm text-ink-soft">
                  <ShoppingBasket className="mx-auto mb-2 size-10 text-ink-mute" />
                  Tu canasta está vacía. Escanea el primer producto.
                </div>
              )}
              {lines.map((l) => (
                <div key={l.id} className="animate-pop flex items-center gap-3 rounded-2xl bg-white p-3">
                  <span className="grid size-12 place-items-center rounded-xl bg-tile text-2xl">{l.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{l.name}</p>
                    <LinePrice gross={l.price * l.qty} saving={ticket.lineDiscounts[l.id]} />
                  </div>
                  <div className="flex items-center rounded-full border border-line">
                    <button onClick={() => cart.setQty(l.id, l.qty - (l.unit === 'kg' ? 0.25 : 1))} className="grid size-8 place-items-center" aria-label="Quitar">
                      {l.qty <= (l.unit === 'kg' ? 0.25 : 1) ? <Trash2 className="size-3.5 text-red-500" /> : <Minus className="size-3.5" />}
                    </button>
                    <span className="min-w-8 text-center text-xs font-semibold">{l.unit === 'kg' ? formatQty(l.qty, 'kg') : l.qty}</span>
                    <button onClick={() => cart.add(l.id, l.unit === 'kg' ? 0.25 : 1)} className="grid size-8 place-items-center" aria-label="Agregar">
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {ticket.promotions.map((p) => (
                <PromoLine key={p.promoId} promo={p} className="rounded-xl bg-emerald-50 px-3 py-2" />
              ))}
            </div>

            {lines.length > 0 && (
              <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-line bg-white p-4 shadow-[0_-8px_24px_rgba(15,58,92,0.08)]">
                <div className="mb-3 flex items-end justify-between">
                  <span className="text-sm text-ink-soft">{ticket.units} artículos</span>
                  <span className="text-2xl font-bold">{formatMoney(ticket.total)}</span>
                </div>
                {checkout ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => finish(true)} className="flex flex-col items-center gap-1 rounded-2xl bg-brand-500 py-3 text-white">
                      <CreditCard className="size-5" />
                      <span className="text-sm font-semibold">Pagar en línea</span>
                      <span className="text-[10px] text-white/80">Simulado en el demo</span>
                    </button>
                    <button onClick={() => finish(false)} className="flex flex-col items-center gap-1 rounded-2xl bg-ink py-3 text-white">
                      <Wallet className="size-5" />
                      <span className="text-sm font-semibold">Pagar en caja</span>
                      <span className="text-[10px] text-white/80">Te damos un código</span>
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setCheckout(true)} className="btn-primary w-full py-3.5 text-base">
                    Terminar compra
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
