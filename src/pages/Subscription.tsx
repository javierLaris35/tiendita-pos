import { useState } from 'react'
import { Check, CreditCard, Crown, Download, Sparkles } from 'lucide-react'
import { ConfirmDialog } from '../components/ui/Modal'
import { PanelHeader } from '../components/ui/Misc'
import { useSettingsStore } from '../store/useSettingsStore'
import { toast } from '../store/useUiStore'
import { PLANS } from '../data/seed'
import { formatDate, formatMoney } from '../utils/format'
import type { Plan } from '../types'

export default function Subscription() {
  const plan = useSettingsStore((s) => s.plan)
  const update = useSettingsStore((s) => s.update)
  const [yearly, setYearly] = useState(false)
  const [pending, setPending] = useState<Plan | null>(null)
  const current = PLANS.find((p) => p.id === plan) ?? PLANS[0]
  const price = (p: Plan) => (yearly ? p.price * 10 : p.price)
  const invoices = Array.from({ length: 5 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - i, 1)
    return { id: `FAC-${2026}${String(d.getMonth() + 1).padStart(2, '0')}`, date: d.toISOString(), amount: current.price * 1.16 }
  })

  return (
    <div className="space-y-3">
      <section className="card flex flex-wrap items-center gap-4 bg-gradient-to-r from-brand-500 to-brand-600 p-5 text-white">
        <div className="grid size-12 place-items-center rounded-xl bg-white/20"><Crown className="size-6" /></div>
        <div className="mr-auto">
          <p className="text-xs text-white/80">Plan actual</p>
          <p className="text-xl font-semibold">{current.name} · {formatMoney(current.price)}/mes</p>
          <p className="text-xs text-white/80">Próxima renovación: {formatDate(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1))}</p>
        </div>
        <div className="flex rounded-xl bg-white/15 p-1 text-xs">
          <button onClick={() => setYearly(false)} className={`rounded-lg px-4 py-2 ${!yearly ? 'bg-white text-brand-700' : ''}`}>Mensual</button>
          <button onClick={() => setYearly(true)} className={`rounded-lg px-4 py-2 ${yearly ? 'bg-white text-brand-700' : ''}`}>Anual (2 meses gratis)</button>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {PLANS.map((p) => {
          const isCurrent = p.id === plan
          const featured = p.id === 'pro'
          return (
            <div key={p.id} className={`card relative flex flex-col gap-4 p-5 ${featured ? 'border-brand-500 shadow-xl shadow-brand-500/10' : ''}`}>
              {featured && <span className="absolute -top-3 left-5 flex items-center gap-1 rounded-full bg-brand-500 px-3 py-1 text-[10px] font-medium text-white"><Sparkles className="size-3" /> Más popular</span>}
              <div>
                <p className="text-lg font-semibold">{p.name}</p>
                <p className="mt-1"><span className="text-3xl font-semibold">{formatMoney(price(p))}</span><span className="text-xs text-ink-soft"> / {yearly ? 'año' : 'mes'} + IVA</span></p>
              </div>
              <ul className="flex-1 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs"><span className="grid size-5 place-items-center rounded-full bg-brand-50 text-brand-600"><Check className="size-3" /></span>{f}</li>
                ))}
              </ul>
              <button disabled={isCurrent} onClick={() => setPending(p)} className={isCurrent ? 'btn bg-emerald-50 text-emerald-700 disabled:border-transparent! disabled:bg-emerald-50! disabled:text-emerald-700!' : featured ? 'btn-primary' : 'btn-ghost'}>
                {isCurrent ? 'Plan actual' : p.price > current.price ? 'Mejorar plan' : 'Cambiar a este plan'}
              </button>
            </div>
          )
        })}
      </div>

      <section className="card space-y-3 p-4">
        <PanelHeader icon={CreditCard} title="Historial de facturación" />
        <div className="space-y-2">
          {invoices.map((inv) => (
            <div key={inv.id} className="row-card flex items-center gap-3 p-3 text-xs">
              <span className="font-medium">{inv.id}</span>
              <span className="text-ink-soft">{formatDate(inv.date)}</span>
              <span className="ml-auto font-semibold">{formatMoney(inv.amount)}</span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-700">Pagada</span>
              <button onClick={() => toast({ type: 'info', title: 'Factura generada', message: `${inv.id}.pdf (demo)` })} className="grid size-8 place-items-center rounded-lg hover:bg-brand-50" aria-label="Descargar factura">
                <Download className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      <ConfirmDialog
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        danger={false}
        onConfirm={() => {
          if (!pending) return
          update({ plan: pending.id })
          toast({ title: `¡Listo! Ahora tienes el plan ${pending.name}` })
        }}
        title={`Cambiar a ${pending?.name}`}
        message={`Se aplicará el cargo prorrateado de ${formatMoney(price(pending ?? current))} ${yearly ? 'anuales' : 'mensuales'} a la tarjeta registrada. (Demo: no se realizará ningún cobro.)`}
        confirmLabel="Confirmar cambio"
      />
    </div>
  )
}
