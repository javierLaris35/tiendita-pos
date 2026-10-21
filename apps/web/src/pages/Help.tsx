import { useState } from 'react'
import { BookOpen, ChevronDown, CircleHelp, Keyboard, LifeBuoy, Mail, MessageCircle, Phone } from 'lucide-react'
import { Field } from '../components/ui/Modal'
import { PanelHeader } from '../components/ui/Misc'
import { toast } from '../store/useUiStore'

const FAQ = [
  ['¿Cómo registro una venta?', 'En el Panel toca los productos (o búscalos / escanéalos) para agregarlos al carrito, ajusta cantidades y presiona “Completar compra”. Elige cliente y método de pago y se generará el ticket.'],
  ['¿Cómo escaneo un código de barras?', 'Presiona “Escanear” en la barra superior. Con un lector USB solo escanea el producto; también puedes escribir el código o usar “Simular escaneo” en el demo.'],
  ['¿Qué pasa con el inventario al vender?', 'Cada venta descuenta automáticamente las existencias. Si un producto cae por debajo de su mínimo recibirás una alerta naranja y una notificación.'],
  ['¿Cómo reabastezco un producto?', 'En Inventario usa “Ordenar stock” para crear una orden a proveedor. Aprueba la orden y márcala como recibida: el stock se suma automáticamente.'],
  ['¿Puedo reembolsar un ticket?', 'Sí. Abre el ticket desde el historial o reportes y presiona “Reembolsar”. El inventario se repone y la venta deja de contar en los indicadores.'],
  ['¿Dónde cambio el IVA o el descuento?', 'En Ajustes → Impuestos y cobros puedes configurar el % de IVA, el descuento general y el cargo por servicio.'],
  ['¿Los datos se guardan?', 'En este demo todo se guarda en tu navegador (localStorage). Puedes reiniciar los datos desde Ajustes.'],
]

const SHORTCUTS = [
  ['Esc', 'Cerrar ventanas'],
  ['Enter', 'Agregar código escaneado'],
  ['Tab', 'Moverse entre campos'],
]

export default function Help() {
  const [open, setOpen] = useState(0)
  const [form, setForm] = useState({ subject: '', message: '' })

  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.4fr_1fr]">
      <section className="card space-y-3 p-4">
        <PanelHeader icon={CircleHelp} title="Preguntas frecuentes" />
        {FAQ.map(([q, a], i) => (
          <div key={q} className={`rounded-xl border transition ${open === i ? 'border-brand-300 bg-brand-50/50' : 'border-line'}`}>
            <button onClick={() => setOpen(open === i ? -1 : i)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium">
              {q}
              <ChevronDown className={`size-4 shrink-0 transition ${open === i ? 'rotate-180' : ''}`} />
            </button>
            {open === i && <p className="animate-fade px-4 pb-4 text-xs leading-relaxed text-ink-soft">{a}</p>}
          </div>
        ))}
      </section>
      <div className="space-y-3">
        <section className="card space-y-3 p-4">
          <PanelHeader icon={LifeBuoy} title="Contactar a soporte" />
          <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
            {([[Phone, '55 1234 0000'], [MessageCircle, 'WhatsApp'], [Mail, 'soporte@tiendita.mx']] as const).map(([Icon, l]) => (
              <div key={l} className="rounded-xl bg-canvas p-3"><Icon className="mx-auto mb-1 size-4 text-brand-600" /><p className="truncate">{l}</p></div>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              toast({ title: 'Ticket de soporte creado', message: 'Te responderemos en menos de 2 horas hábiles.' })
              setForm({ subject: '', message: '' })
            }}
            className="space-y-3"
          >
            <Field label="Asunto"><input className="input" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></Field>
            <Field label="Mensaje"><textarea className="input min-h-28" required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></Field>
            <button className="btn-primary w-full">Enviar</button>
          </form>
        </section>
        <section className="card space-y-3 p-4">
          <PanelHeader icon={Keyboard} title="Atajos" />
          {SHORTCUTS.map(([k, d]) => (
            <div key={k} className="flex items-center justify-between text-xs">
              <span className="text-ink-soft">{d}</span>
              <kbd className="rounded-md border border-line bg-tile px-2 py-1 font-mono text-[11px]">{k}</kbd>
            </div>
          ))}
          <button onClick={() => toast({ type: 'info', title: 'Centro de ayuda', message: 'La guía completa estará disponible en la versión productiva.' })} className="btn-ghost w-full">
            <BookOpen className="size-4" /> Ver guía de usuario
          </button>
        </section>
      </div>
    </div>
  )
}
