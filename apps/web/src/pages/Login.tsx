import { useState, type ChangeEvent, type FormEvent, type InputHTMLAttributes, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail, UserRound } from 'lucide-react'
import { Logo } from '../components/ui/Misc'
import Modal from '../components/ui/Modal'
import { useAuthStore, useCurrentUser } from '../store/useAuthStore'
import { announceLowStock } from '../store/actions'
import { toast } from '../store/useUiStore'

const HERO = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1400&q=80'

function IconInput({ icon: Icon, right, ...props }: { icon: LucideIcon; right?: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <input {...props} className="input py-3 pr-11 shadow-sm shadow-brand-900/5" />
      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-soft">{right ?? <Icon className="size-4" />}</div>
    </div>
  )
}

const homeFor = (role: string) => (/cajer/i.test(role) ? '/caja' : '/')

export default function Login() {
  const user = useCurrentUser()
  const login = useAuthStore((s) => s.login)
  const register = useAuthStore((s) => s.register)
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: 'admin@tiendita.mx', password: 'demo123' })
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)
  const [heroFailed, setHeroFailed] = useState(false)

  // Cajeros entran directo a la caja; administradores al panel
  if (user) return <Navigate to={homeFor(user.role)} replace />

  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (mode === 'register' && (!form.name.trim() || form.password.length < 6)) {
      setError('Ingresa tu nombre y una contraseña de al menos 6 caracteres.')
      return
    }
    setLoading(true)
    // Pequeña espera para que se sienta como una petición real
    setTimeout(() => {
      const res =
        mode === 'login'
          ? login(form.email, form.password)
          : register({ name: form.name.trim(), email: form.email.trim(), password: form.password, role: 'Cajero', counter: 'Caja 1', phone: '', storeId: 's1' })
      setLoading(false)
      if (!res.ok) return setError(res.error)
      toast({ title: `¡Bienvenido, ${res.employee.name.split(' ')[0]}!`, message: 'Sesión iniciada correctamente.' })
      if (homeFor(res.employee.role) === '/') setTimeout(announceLowStock, 900)
      navigate(homeFor(res.employee.role))
    }, 450)
  }

  return (
    <div className="grid min-h-full gap-6 p-3 sm:p-6 lg:grid-cols-[1.05fr_1fr] lg:p-10">
      <div className="relative hidden overflow-hidden rounded-3xl bg-gradient-to-br from-brand-400 to-brand-700 lg:block">
        {!heroFailed && <img src={HERO} alt="Cajera atendiendo en una tienda" onError={() => setHeroFailed(true)} className="absolute inset-0 size-full object-cover" />}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 to-transparent p-8 text-white">
          <p className="text-2xl font-semibold">Punto de venta inteligente para tu tiendita.</p>
          <p className="mt-1 text-sm text-white/80">Ventas, inventario, clientes y reportes en un solo lugar.</p>
        </div>
      </div>

      <div className="grid place-items-center">
        <form onSubmit={submit} className="card w-full max-w-sm space-y-4 px-6 py-8 shadow-xl shadow-brand-900/5 sm:px-8">
          <div className="text-center">
            <Logo className="justify-center" textClass="text-xl" />
            <p className="mt-2 text-sm text-ink">Punto de Venta</p>
            <h1 className="mt-3 text-xl font-semibold text-ink">{mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</h1>
          </div>

          {mode === 'register' && <IconInput icon={UserRound} placeholder="Nombre completo" value={form.name} onChange={set('name')} />}
          <IconInput icon={Mail} type="email" required placeholder="Correo del empleado" value={form.email} onChange={set('email')} autoComplete="username" />
          <div>
            <IconInput
              icon={Lock}
              type={showPw ? 'text' : 'password'}
              required
              placeholder="Contraseña"
              value={form.password}
              onChange={set('password')}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              right={
                <button type="button" onClick={() => setShowPw((s) => !s)} aria-label="Mostrar contraseña" className="grid place-items-center">
                  {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              }
            />
            {mode === 'login' && (
              <button type="button" onClick={() => setForgotOpen(true)} className="mt-1.5 block w-full text-right text-[11px] text-ink underline">
                ¿Olvidaste tu contraseña?
              </button>
            )}
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

          <button className="btn-primary w-full py-3 text-[15px]" disabled={loading}>
            {loading ? 'Verificando…' : mode === 'login' ? 'Entrar' : 'Registrarme'}
          </button>

          <p className="text-center text-xs text-ink">
            {mode === 'login' ? '¿Nuevo en la empresa? ' : '¿Ya tienes cuenta? '}
            <button
              type="button"
              className="font-semibold"
              onClick={() => {
                setError('')
                setMode(mode === 'login' ? 'register' : 'login')
                setForm(mode === 'login' ? { name: '', email: '', password: '' } : { name: '', email: 'admin@tiendita.mx', password: 'demo123' })
              }}
            >
              {mode === 'login' ? 'Crear una cuenta' : 'Inicia sesión'}
            </button>
          </p>

          {mode === 'login' && (
            <div className="rounded-xl bg-canvas p-3 text-[11px] text-ink-soft">
              <p className="font-semibold text-ink">Acceso demo</p>
              <p>admin@tiendita.mx · alicia@tiendita.mx</p>
              <p>Contraseña: demo123</p>
            </div>
          )}
        </form>
      </div>

      <Modal
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        title="Recuperar contraseña"
        icon={Lock}
        width="max-w-sm"
        footer={
          <button
            className="btn-primary"
            onClick={() => {
              setForgotOpen(false)
              toast({ type: 'info', title: 'Solicitud enviada', message: 'Tu gerente recibirá la solicitud para restablecer tu contraseña.' })
            }}
          >
            Enviar solicitud
          </button>
        }
      >
        <p className="mb-3 text-sm text-ink-soft">En el demo, todas las cuentas usan la contraseña <b className="text-ink">demo123</b>. En producción se notificaría al gerente de la sucursal.</p>
        <input className="input" type="email" placeholder="Correo del empleado" defaultValue={form.email} />
      </Modal>
    </div>
  )
}
