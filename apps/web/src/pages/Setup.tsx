import { useState, type ChangeEvent, type FormEvent } from 'react'
import { submitSetup } from '../api'

type Fields = {
  businessName: string
  rfc: string
  ticketHeader: string
  ticketFooter: string
  defaultIvaRate: string
  printerType: 'none' | 'network' | 'serial'
  printerTarget: string
  adminName: string
  adminEmail: string
  adminPassword: string
}

const initial: Fields = {
  businessName: '',
  rfc: '',
  ticketHeader: '',
  ticketFooter: '',
  defaultIvaRate: '0.16',
  printerType: 'none',
  printerTarget: '',
  adminName: '',
  adminEmail: '',
  adminPassword: '',
}

export default function Setup() {
  const [form, setForm] = useState<Fields>(initial)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const set =
    (key: keyof Fields) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const iva = Number(form.defaultIvaRate)
      await submitSetup({
        businessName: form.businessName.trim(),
        rfc: form.rfc.trim() || undefined,
        ticketHeader: form.ticketHeader.trim() || undefined,
        ticketFooter: form.ticketFooter.trim() || undefined,
        defaultIvaRate: Number.isFinite(iva) ? iva : undefined,
        printerType: form.printerType,
        printerTarget: form.printerTarget.trim() || undefined,
        admin: {
          name: form.adminName.trim(),
          email: form.adminEmail.trim(),
          password: form.adminPassword,
        },
      })
      // Recarga completa: reinicia el SetupGate, que ya verá el setup completo
      // y dejará pasar al login (en Electron no hay recarga natural).
      window.location.assign('/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error')
      setSaving(false)
    }
  }

  const input = 'w-full rounded-lg border border-black/10 px-3 py-2 text-sm'

  return (
    <div className="mx-auto grid min-h-full max-w-md place-items-center p-4">
      <form onSubmit={onSubmit} className="w-full space-y-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">Configuración inicial</h1>
          <p className="text-sm text-ink-soft">Datos de tu tienda y del administrador.</p>
        </div>

        <input className={input} placeholder="Nombre de la tienda" value={form.businessName} onChange={set('businessName')} required />
        <input className={input} placeholder="RFC (opcional)" value={form.rfc} onChange={set('rfc')} />
        <input className={input} placeholder="Encabezado del ticket (opcional)" value={form.ticketHeader} onChange={set('ticketHeader')} />
        <input className={input} placeholder="Pie del ticket (opcional)" value={form.ticketFooter} onChange={set('ticketFooter')} />
        <input className={input} placeholder="IVA por defecto (ej. 0.16)" value={form.defaultIvaRate} onChange={set('defaultIvaRate')} />

        <select className={input} value={form.printerType} onChange={set('printerType')}>
          <option value="none">Sin impresora</option>
          <option value="network">Impresora de red</option>
          <option value="serial">Impresora serial/USB</option>
        </select>
        {form.printerType !== 'none' && (
          <input
            className={input}
            placeholder={form.printerType === 'network' ? 'IP:puerto (ej. 192.168.1.50:9100)' : 'Puerto (ej. COM1)'}
            value={form.printerTarget}
            onChange={set('printerTarget')}
          />
        )}

        <div className="pt-2">
          <p className="text-sm font-medium text-ink">Administrador</p>
        </div>
        <input className={input} placeholder="Nombre" value={form.adminName} onChange={set('adminName')} required />
        <input className={input} type="email" placeholder="Correo" value={form.adminEmail} onChange={set('adminEmail')} required />
        <input className={input} type="password" placeholder="Contraseña (mín. 6)" value={form.adminPassword} onChange={set('adminPassword')} required minLength={6} />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-ink px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {saving ? 'Guardando…' : 'Completar configuración'}
        </button>
      </form>
    </div>
  )
}
