import { useState, type FormEvent } from 'react'
import type { Settings as SettingsData } from '../types'

// Los campos numéricos se editan como texto y se convierten al guardar
type BizForm = Pick<SettingsData, 'businessName' | 'rfc' | 'receiptFooter'> & { taxPct: number | string }
import { BadgePercent, Bell, Building2, RotateCcw, ShoppingBag, UserRound } from 'lucide-react'
import Avatar from '../components/ui/Avatar'
import { ConfirmDialog, Field } from '../components/ui/Modal'
import { PanelHeader, Toggle } from '../components/ui/Misc'
import { useSettingsStore } from '../store/useSettingsStore'
import { useCurrentUser } from '../store/useAuthStore'
import { useEmployeeStore } from '../store/useEmployeeStore'
import { resetDemo } from '../store/actions'
import { toast } from '../store/useUiStore'

export default function Settings() {
  const settings = useSettingsStore()
  const user = useCurrentUser()
  const updateEmployee = useEmployeeStore((s) => s.updateEmployee)
  const [biz, setBiz] = useState<BizForm>({
    businessName: settings.businessName,
    rfc: settings.rfc,
    receiptFooter: settings.receiptFooter,
    taxPct: settings.taxPct,
  })
  const [profile, setProfile] = useState({ name: user?.name ?? '', phone: user?.phone ?? '', avatar: user?.avatar ?? '', password: '' })
  const [confirmReset, setConfirmReset] = useState(false)
  const [orders, setOrders] = useState<{ whatsappNumber: string; deliveryFee: number | string; freeDeliveryFrom: number | string }>({
    whatsappNumber: settings.whatsappNumber,
    deliveryFee: settings.deliveryFee,
    freeDeliveryFrom: settings.freeDeliveryFrom,
  })

  const saveBiz = (e: FormEvent) => {
    e.preventDefault()
    settings.update({ ...biz, taxPct: Number(biz.taxPct) || 0, whatsappNumber: orders.whatsappNumber, deliveryFee: Number(orders.deliveryFee) || 0, freeDeliveryFrom: Number(orders.freeDeliveryFrom) || 0 })
    toast({ title: 'Configuración guardada' })
  }

  const saveProfile = (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (profile.password && profile.password.length < 6) return toast({ type: 'error', title: 'La contraseña debe tener al menos 6 caracteres' })
    const { password, ...rest } = profile
    updateEmployee(user.id, password ? { ...rest, password } : rest)
    setProfile({ ...profile, password: '' })
    toast({ title: 'Perfil actualizado' })
  }

  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
      <form onSubmit={saveBiz} className="card space-y-4 p-4">
        <PanelHeader icon={Building2} title="Negocio" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nombre comercial"><input className="input" value={biz.businessName} onChange={(e) => setBiz({ ...biz, businessName: e.target.value })} /></Field>
          <Field label="RFC"><input className="input uppercase" value={biz.rfc} onChange={(e) => setBiz({ ...biz, rfc: e.target.value })} /></Field>
          <Field label="Pie del ticket" className="sm:col-span-2"><input className="input" value={biz.receiptFooter} onChange={(e) => setBiz({ ...biz, receiptFooter: e.target.value })} /></Field>
        </div>
        <PanelHeader icon={BadgePercent} title="Impuestos" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="IVA incluido en precios (%)" hint="Los precios de anaquel ya incluyen IVA; el ticket lo desglosa como informativo."><input className="input" type="number" min="0" step="0.5" value={biz.taxPct} onChange={(e) => setBiz({ ...biz, taxPct: e.target.value })} /></Field>
          <div className="rounded-xl bg-tile p-3 text-[11px] text-ink-soft">Los descuentos ahora se manejan desde <b className="text-ink">Ofertas</b> (2x1, combos, % y paquetes) y se aplican solos en caja.</div>
        </div>
        <PanelHeader icon={ShoppingBag} title="Pedidos en línea y WhatsApp" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="WhatsApp para pedidos"><input className="input" inputMode="numeric" value={orders.whatsappNumber} onChange={(e) => setOrders({ ...orders, whatsappNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })} /></Field>
          <Field label="Costo de envío ($)"><input className="input" type="number" min="0" value={orders.deliveryFee} onChange={(e) => setOrders({ ...orders, deliveryFee: e.target.value })} /></Field>
          <Field label="Envío gratis desde ($)"><input className="input" type="number" min="0" value={orders.freeDeliveryFrom} onChange={(e) => setOrders({ ...orders, freeDeliveryFrom: e.target.value })} /></Field>
        </div>
        <div className="flex justify-end"><button className="btn-primary">Guardar cambios</button></div>
      </form>

      <div className="space-y-3">
        <form onSubmit={saveProfile} className="card space-y-4 p-4">
          <PanelHeader icon={UserRound} title="Mi perfil" />
          <div className="flex items-center gap-3">
            <Avatar src={profile.avatar} name={profile.name} size="size-14" />
            <div>
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-ink-soft">{user?.role} · {user?.email}</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nombre"><input className="input" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></Field>
            <Field label="Teléfono"><input className="input" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></Field>
            <Field label="URL de foto"><input className="input" value={profile.avatar} onChange={(e) => setProfile({ ...profile, avatar: e.target.value })} /></Field>
            <Field label="Nueva contraseña"><input className="input" type="password" placeholder="••••••" value={profile.password} onChange={(e) => setProfile({ ...profile, password: e.target.value })} autoComplete="new-password" /></Field>
          </div>
          <div className="flex justify-end"><button className="btn-primary">Actualizar perfil</button></div>
        </form>

        <section className="card space-y-3 p-4">
          <PanelHeader icon={Bell} title="Preferencias" />
          <Pref label="Alertas de stock bajo" desc="Aviso naranja cuando un producto cae por debajo del mínimo" checked={settings.lowStockAlerts} onChange={(v) => settings.update({ lowStockAlerts: v })} />
          <Pref label="Sonido al escanear" desc="Reproduce un bip al agregar productos con el lector" checked={settings.soundOnScan} onChange={(v) => settings.update({ soundOnScan: v })} />
        </section>

        <section className="card flex flex-wrap items-center gap-3 border-red-100 p-4">
          <div className="mr-auto">
            <p className="text-sm font-medium">Reiniciar datos del demo</p>
            <p className="text-xs text-ink-soft">Restaura productos, ventas, clientes y ajustes a su estado inicial.</p>
          </div>
          <button className="btn-danger" onClick={() => setConfirmReset(true)}><RotateCcw className="size-4" /> Reiniciar</button>
        </section>
      </div>

      <ConfirmDialog open={confirmReset} onClose={() => setConfirmReset(false)} onConfirm={resetDemo} title="Reiniciar demo" message="Se borrarán todos los cambios guardados en este navegador y se cerrará la sesión." confirmLabel="Reiniciar" />
    </div>
  )
}

const Pref = ({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <div className="flex items-center justify-between gap-4 rounded-xl border border-line p-3">
    <div>
      <p className="text-xs font-medium">{label}</p>
      <p className="text-[11px] text-ink-soft">{desc}</p>
    </div>
    <Toggle checked={checked} onChange={onChange} label={label} />
  </div>
)
