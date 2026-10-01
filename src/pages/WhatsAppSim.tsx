import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CheckCheck, Info, MessageCircle, Send, Smartphone } from 'lucide-react'
import { Logo } from '../components/ui/Misc'
import { useOrderStore, phoneKey } from '../store/useOrderStore'
import { useCustomerStore } from '../store/useCustomerStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { handleWhatsAppMessage } from '../store/whatsappBot'
import { formatTime } from '../utils/format'

const EXAMPLES = [
  'Hola',
  'Me mandas:\n2 cocas\nmedio kilo de jitomate\nleche\n3 sabritas\nhuevo\nunas chelas',
  'estatus',
  'cancelar',
]

/** Formato estilo WhatsApp: *negritas* y ligas clicables. */
function Rich({ text }: { text: string }) {
  const parts: ReactNode[] = []
  text.split(/(https?:\/\/\S+|\*[^*\n]+\*)/g).forEach((chunk, i) => {
    if (/^https?:\/\//.test(chunk)) {
      const path = chunk.replace(window.location.origin, '')
      parts.push(
        <Link key={i} to={path} target="_blank" className="break-all text-sky-700 underline">
          {chunk}
        </Link>,
      )
    } else if (/^\*[^*]+\*$/.test(chunk)) parts.push(<b key={i}>{chunk.slice(1, -1)}</b>)
    else parts.push(chunk)
  })
  return <>{parts}</>
}

export default function WhatsAppSim() {
  const [params] = useSearchParams()
  const customers = useCustomerStore((s) => s.customers)
  const storeNumber = useSettingsStore((s) => s.whatsappNumber)
  const threads = useOrderStore((s) => s.threads)
  const pushChat = useOrderStore((s) => s.pushChat)
  const [phone, setPhone] = useState(params.get('tel') ?? '+52 55 1333 2221')
  const [text, setText] = useState('')
  const [typing, setTyping] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const thread = threads[phoneKey(phone)]
  const customer = customers.find((c) => phoneKey(c.phone) === phoneKey(phone))
  const messages = useMemo(() => thread?.messages ?? [], [thread])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, typing])

  const send = (body = text) => {
    const msg = body.trim()
    if (!msg || phoneKey(phone).length !== 10) return
    setText('')
    const replies = handleWhatsAppMessage(phone, msg)
    setTyping(true)
    // Respuestas con un pequeño retraso, como un chat real
    replies.forEach((r, i) => {
      setTimeout(() => {
        pushChat(phone, [{ from: 'bot', text: r }])
        if (i === replies.length - 1) setTyping(false)
      }, 700 + i * 650)
    })
    if (!replies.length) setTyping(false)
  }

  const formatted = storeNumber.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3')

  return (
    <div className="min-h-full bg-canvas p-3 sm:p-6">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <section className="space-y-4">
          <Link to="/pedidos" className="inline-flex items-center gap-1 text-xs text-ink-soft hover:text-ink">
            <ArrowLeft className="size-3.5" /> Volver a pedidos
          </Link>
          <div className="card space-y-4 p-5">
            <Logo />
            <div>
              <h1 className="text-xl font-semibold">Pedidos por WhatsApp</h1>
              <p className="text-sm text-ink-soft">
                Los clientes escriben al <b className="text-emerald-700">{formatted}</b> su lista de compras. El asistente identifica los productos, pregunta cuando hay varias opciones, confirma total, entrega y pago, y crea el pedido. Cada cambio de estatus le llega por el mismo chat.
              </p>
            </div>
            <div className="flex gap-3 rounded-2xl bg-amber-50 p-3 text-xs text-amber-900">
              <Info className="size-4 shrink-0" />
              Simulador del demo. En producción este chat se conecta a la API de WhatsApp Business (Meta) mediante un webhook que llama al mismo asistente.
            </div>
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-ink-soft">
                <Smartphone className="size-3.5" /> Escribir como el cliente con el número…
              </span>
              <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+52 55 0000 0000" />
            </label>
            <div className="flex flex-wrap gap-1.5">
              {customers.slice(0, 6).map((c) => (
                <button key={c.id} onClick={() => setPhone(c.phone)} className={`rounded-full border px-2.5 py-1 text-[11px] ${phoneKey(c.phone) === phoneKey(phone) ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-line bg-white hover:bg-emerald-50'}`}>
                  {c.name.split(' ')[0]}
                </button>
              ))}
              <button onClick={() => setPhone(`+52 55 ${Math.floor(1000 + Math.random() * 8999)} ${Math.floor(1000 + Math.random() * 8999)}`)} className="rounded-full border border-dashed border-line px-2.5 py-1 text-[11px] hover:bg-tile">
                + Número nuevo
              </button>
            </div>
            <p className="text-xs text-ink-soft">{customer ? `Cliente registrado: ${customer.name}` : 'Número no registrado: el asistente le pedirá su nombre y lo dará de alta.'}</p>
            <div>
              <p className="mb-1.5 text-xs font-medium text-ink-soft">Mensajes de ejemplo</p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLES.map((e) => (
                  <button key={e} onClick={() => send(e)} className="max-w-full truncate rounded-xl border border-line bg-white px-3 py-1.5 text-left text-xs hover:bg-emerald-50">
                    {e.split('\n')[0]}
                    {e.includes('\n') ? '…' : ''}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto flex h-[78vh] max-h-[760px] w-full max-w-[400px] flex-col overflow-hidden rounded-[2.5rem] border-[10px] border-ink bg-[#efeae2] shadow-2xl">
          <header className="flex items-center gap-3 bg-[#075e54] px-4 py-3 text-white">
            <span className="grid size-10 place-items-center rounded-full bg-white text-xl">🛒</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">Tiendita POS</p>
              <p className="text-[11px] text-white/80">{typing ? 'escribiendo…' : `+52 ${formatted}`}</p>
            </div>
            <MessageCircle className="size-5" />
          </header>
          <div className="flex-1 space-y-1.5 overflow-y-auto px-3 py-3" style={{ backgroundImage: 'radial-gradient(rgba(0,0,0,0.035) 1px, transparent 1px)', backgroundSize: '14px 14px' }}>
            {!messages.length && <p className="mx-auto mt-6 max-w-[80%] rounded-lg bg-[#fff5c4] px-3 py-2 text-center text-[11px] text-ink-soft">Escribe “Hola” o manda tu lista de compras para empezar.</p>}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.from === 'customer' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-2.5 py-1.5 text-[13px] leading-snug shadow-sm ${m.from === 'customer' ? 'rounded-tr-none bg-[#d9fdd3]' : 'rounded-tl-none bg-white'}`}>
                  <Rich text={m.text} />
                  <span className="float-right ml-2 mt-1 flex items-center gap-0.5 text-[9px] text-ink-mute">
                    {formatTime(m.date)}
                    {m.from === 'customer' && <CheckCheck className="size-3 text-sky-500" />}
                  </span>
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex">
                <span className="rounded-lg rounded-tl-none bg-white px-3 py-2 text-ink-mute shadow-sm">•••</span>
              </div>
            )}
            <div ref={endRef} />
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              send()
            }}
            className="flex items-end gap-2 bg-[#f0f2f5] p-2"
          >
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              rows={Math.min(4, text.split('\n').length)}
              placeholder="Mensaje (Shift+Enter: nuevo renglón)"
              className="flex-1 resize-none rounded-2xl bg-white px-4 py-2.5 text-sm outline-none"
            />
            <button className="grid size-11 shrink-0 place-items-center rounded-full bg-[#00a884] text-white" aria-label="Enviar">
              <Send className="size-5" />
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}
