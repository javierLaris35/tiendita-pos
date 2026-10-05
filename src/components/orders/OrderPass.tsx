import QRCode from 'qrcode'
import { CheckCircle2, Clock, Download, MapPin, Share2 } from 'lucide-react'
import { QrCode } from '../qr/Qr'
import { useBranchStore } from '../../store/useBranchStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import { toast } from '../../store/useUiStore'
import { STATUS_META, isActive, orderQrValue } from '../../utils/orders'
import { formatMoney } from '../../utils/format'
import type { Order } from '../../types'

/** Dibuja el pase en un canvas para descargarlo como imagen (para mostrarlo sin conexión). */
async function passImage(order: Order, branchName: string, business: string): Promise<string> {
  const W = 600
  const H = 900
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#52b4e6'
  ctx.fillRect(0, 0, W, 130)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 34px Poppins, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(business, W / 2, 62)
  ctx.font = '22px Poppins, sans-serif'
  ctx.fillText('Pase de recolección', W / 2, 100)
  const qr = await QRCode.toDataURL(orderQrValue(order.code), { margin: 1, width: 380, color: { dark: '#0f3a5c', light: '#ffffff' } })
  const img = new Image()
  await new Promise((res) => {
    img.onload = res
    img.src = qr
  })
  ctx.drawImage(img, (W - 380) / 2, 165, 380, 380)
  ctx.fillStyle = '#0f3a5c'
  ctx.font = 'bold 54px monospace'
  ctx.fillText(order.code, W / 2, 615)
  ctx.font = '24px Poppins, sans-serif'
  ctx.fillText(order.customerName, W / 2, 665)
  ctx.fillStyle = '#5b7891'
  ctx.fillText(`Recoger en ${branchName}`, W / 2, 705)
  ctx.fillText(`${order.items.length} productos · ${formatMoney(order.total)}`, W / 2, 745)
  ctx.fillStyle = order.paid ? '#059669' : '#ea580c'
  ctx.font = 'bold 30px Poppins, sans-serif'
  ctx.fillText(order.paid ? 'PAGADO' : `PAGAR EN CAJA ${formatMoney(order.total)}`, W / 2, 815)
  return c.toDataURL('image/png')
}

/**
 * Pase con el QR del pedido para recogerlo en tienda. El QR lleva la liga del seguimiento:
 * el cliente lo abre con su cámara y la caja lo lee para verificar, cobrar o entregar.
 */
export default function OrderPass({ order, compact = false }: { order: Order; compact?: boolean }) {
  const branch = useBranchStore((s) => s.branches.find((b) => b.id === order.branchId))
  const business = useSettingsStore((s) => s.businessName)
  const active = isActive(order)

  const download = async () => {
    const url = await passImage(order, branch?.name ?? '', business)
    const a = document.createElement('a')
    a.href = url
    a.download = `pase-${order.code}.png`
    a.click()
  }
  const share = async () => {
    const url = orderQrValue(order.code)
    try {
      if (navigator.share) await navigator.share({ title: `Pedido ${order.code}`, text: `Mi pedido ${order.code} en ${business}`, url })
      else {
        await navigator.clipboard.writeText(url)
        toast({ type: 'info', title: 'Liga copiada', message: url })
      }
    } catch {
      /* el cliente canceló el menú de compartir */
    }
  }

  return (
    <div className={`overflow-hidden rounded-2xl border border-line bg-white text-center ${compact ? 'w-64' : ''}`}>
      <div className="bg-brand-500 px-4 py-2 text-white">
        <p className="text-[11px] text-white/85">Pase de recolección</p>
        <p className="font-mono text-lg font-bold tracking-widest">{order.code}</p>
      </div>
      <div className="flex flex-col items-center gap-2 p-4">
        {active ? (
          <QrCode value={orderQrValue(order.code)} size={compact ? 150 : 200} />
        ) : (
          <div className="grid size-36 place-items-center rounded-2xl bg-slate-100 text-xs text-ink-soft">Pedido {STATUS_META[order.status].label.toLowerCase()}</div>
        )}
        <p className="text-sm font-semibold">{order.customerName}</p>
        <p className="flex items-center justify-center gap-1 text-[11px] text-ink-soft">
          <MapPin className="size-3.5 shrink-0" /> Recoger en {branch?.name}
        </p>
        <p className="text-[11px] text-ink-soft">
          {order.items.length} productos · <b className="text-ink">{formatMoney(order.total)}</b>
        </p>
        {order.paid ? (
          <span className="flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white">
            <CheckCircle2 className="size-3.5" /> PAGADO
          </span>
        ) : (
          <span className="flex items-center gap-1 rounded-full bg-orange-500 px-3 py-1 text-xs font-bold text-white">
            <Clock className="size-3.5" /> Paga en caja {formatMoney(order.total)}
          </span>
        )}
        {active && (
          <p className={`text-[11px] font-medium ${order.status === 'ready' ? 'text-emerald-700' : 'text-ink-soft'}`}>
            {order.status === 'ready' ? '¡Ya está listo! Pasa a recogerlo.' : `Estatus: ${STATUS_META[order.status].label}. Te avisamos cuando esté listo.`}
          </p>
        )}
        {active && (
          <div className="flex w-full gap-2 pt-1">
            <button onClick={download} className="btn-ghost flex-1 px-2 py-2 text-xs">
              <Download className="size-3.5" /> Guardar
            </button>
            <button onClick={share} className="btn-ghost flex-1 px-2 py-2 text-xs">
              <Share2 className="size-3.5" /> Compartir
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
