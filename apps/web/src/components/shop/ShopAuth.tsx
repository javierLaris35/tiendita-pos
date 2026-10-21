import { useState, type FormEvent } from 'react'
import { Lock, Mail, Phone, UserRound } from 'lucide-react'
import { useShopperStore } from '../../store/useShopperStore'
import { toast } from '../../store/useUiStore'

/** Inicio de sesión / registro del cliente para pedir en línea o usar Escanea y paga. */
export default function ShopAuth({ title = 'Entra para hacer tu pedido', onDone }: { title?: string; onDone?: () => void }) {
  const login = useShopperStore((s) => s.login)
  const register = useShopperStore((s) => s.register)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', identifier: '' })
  const [error, setError] = useState('')
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    const res = mode === 'login' ? login(form.identifier, form.password) : register({ name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), password: form.password })
    if (!res.ok) return setError(res.error)
    toast({ title: `¡Hola, ${res.customer.name.split(' ')[0]}!`, message: mode === 'login' ? 'Sesión iniciada.' : 'Tu cuenta quedó lista.' })
    onDone?.()
  }

  const Input = ({ icon: Icon, ...props }: { icon: typeof Mail } & React.InputHTMLAttributes<HTMLInputElement>) => (
    <div className="relative">
      <Icon className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-mute" />
      <input {...props} className="input py-3 pl-10" />
    </div>
  )

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-sm space-y-3">
      <div className="text-center">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-xs text-ink-soft">{mode === 'login' ? 'Con tu correo o teléfono' : 'Solo te toma un minuto'}</p>
      </div>
      <div className="grid grid-cols-2 rounded-xl bg-tile p-1 text-xs">
        {(['login', 'register'] as const).map((m) => (
          <button key={m} type="button" onClick={() => (setMode(m), setError(''))} className={`rounded-lg py-2 ${mode === m ? 'bg-white font-semibold shadow-sm' : 'text-ink-soft'}`}>
            {m === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </button>
        ))}
      </div>
      {mode === 'login' ? (
        Input({ icon: Mail, placeholder: 'Correo o teléfono', value: form.identifier, onChange: set('identifier'), required: true, autoComplete: 'username' })
      ) : (
        <>
          {Input({ icon: UserRound, placeholder: 'Nombre completo', value: form.name, onChange: set('name'), required: true })}
          {Input({ icon: Mail, type: 'email', placeholder: 'Correo electrónico', value: form.email, onChange: set('email'), required: true, autoComplete: 'email' })}
          {Input({ icon: Phone, type: 'tel', placeholder: 'Teléfono (10 dígitos)', value: form.phone, onChange: set('phone'), required: true, pattern: '[\\d\\s+()-]{10,}' })}
        </>
      )}
      {Input({ icon: Lock, type: 'password', placeholder: 'Contraseña', value: form.password, onChange: set('password'), required: true, autoComplete: mode === 'login' ? 'current-password' : 'new-password' })}
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
      <button className="btn-primary w-full py-3">{mode === 'login' ? 'Entrar' : 'Crear mi cuenta'}</button>
      {mode === 'login' && (
        <p className="rounded-xl bg-canvas p-2.5 text-center text-[11px] text-ink-soft">
          Demo: <b className="text-ink">juan.perez@correo.mx</b> · contraseña <b className="text-ink">cliente123</b>
        </p>
      )}
    </form>
  )
}
