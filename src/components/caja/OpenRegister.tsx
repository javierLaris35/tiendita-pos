import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Lock, MonitorCheck, Unlock } from 'lucide-react'
import { CashCounter } from '../money/Money'
import Avatar from '../ui/Avatar'
import { useActiveBranch } from '../../store/useBranchStore'
import { useCashStore } from '../../store/useCashStore'
import { useCurrentUser } from '../../store/useAuthStore'
import { useEmployeeStore } from '../../store/useEmployeeStore'
import { toast } from '../../store/useUiStore'
import { countTotal, registerLabel } from '../../utils/cash'
import { formatMoney, formatTime } from '../../utils/format'
import type { CashCount } from '../../types'

const STANDARD_FLOAT: CashCount = { '200': 2, '100': 2, '50': 4, '20': 5, '10': 5, '5': 6, '1': 10, '0.5': 20 }

/** Pantalla de apertura de turno: elegir caja y contar el fondo inicial. */
export default function OpenRegister() {
  const branch = useActiveBranch()
  const user = useCurrentUser()
  const employees = useEmployeeStore((s) => s.employees)
  const sessions = useCashStore((s) => s.sessions)
  const openSession = useCashStore((s) => s.openSession)
  const openHere = sessions.filter((s) => s.status === 'open' && s.branchId === branch?.id)
  const registers = Array.from({ length: branch?.counters ?? 1 }, (_, i) => i + 1)
  const preferred = Number(user?.counter.replace(/\D/g, '')) || 1
  const firstFree = registers.find((r) => r === preferred && !openHere.some((s) => s.register === r)) ?? registers.find((r) => !openHere.some((s) => s.register === r))
  const [register, setRegister] = useState<number | undefined>(firstFree)
  const [count, setCount] = useState<CashCount>(STANDARD_FLOAT)
  const amount = countTotal(count)

  const open = () => {
    if (!branch || !user || !register) return
    const res = openSession({ branchId: branch.id, register, cashierId: user.id, openingAmount: amount })
    if ('error' in res) return toast({ type: 'error', title: 'No se pudo abrir', message: res.error })
    toast({ title: `${registerLabel(register)} abierta`, message: `Fondo inicial ${formatMoney(amount)}` })
  }

  return (
    <div className="grid min-h-0 flex-1 place-items-start overflow-y-auto lg:place-items-center">
      <div className="card grid w-full max-w-5xl gap-0 overflow-hidden lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="flex flex-col gap-4 bg-gradient-to-br from-brand-500 to-brand-700 p-6 text-white">
          <div className="grid size-12 place-items-center rounded-2xl bg-white/20">
            <Unlock className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Apertura de caja</h1>
            <p className="text-sm text-white/80">{branch?.name}</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-white/15 p-3">
            <Avatar src={user?.avatar} name={user?.name} />
            <div>
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-[11px] text-white/80">Responsable del turno</p>
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs text-white/80">Selecciona la caja</p>
            <div className="grid grid-cols-2 gap-2">
              {registers.map((r) => {
                const busy = openHere.find((s) => s.register === r)
                const who = busy && employees.find((e) => e.id === busy.cashierId)
                return (
                  <button
                    key={r}
                    disabled={Boolean(busy)}
                    onClick={() => setRegister(r)}
                    className={`rounded-2xl p-3 text-left transition disabled:cursor-not-allowed ${register === r ? 'bg-white text-brand-700 shadow-lg' : busy ? 'bg-white/10 text-white/60' : 'bg-white/20 hover:bg-white/30'}`}
                  >
                    <p className="flex items-center gap-1.5 text-sm font-semibold">
                      {busy ? <Lock className="size-3.5" /> : <MonitorCheck className="size-3.5" />}
                      {registerLabel(r)}
                    </p>
                    <p className="truncate text-[10px] opacity-80">{busy ? `${who?.name.split(' ')[0] ?? 'Ocupada'} · ${formatTime(busy.openedAt)}` : 'Disponible'}</p>
                  </button>
                )
              })}
            </div>
          </div>
          <Link to="/" className="mt-auto flex items-center gap-1.5 text-xs text-white/80 hover:text-white">
            <ArrowLeft className="size-3.5" /> Volver al panel
          </Link>
        </div>

        <div className="space-y-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-medium">Cuenta el fondo inicial</h2>
              <p className="text-xs text-ink-soft">Toca cada billete o moneda para sumarlo; también puedes escribir la cantidad.</p>
            </div>
            <div className="flex gap-2">
              <button className="btn-ghost py-2 text-xs" onClick={() => setCount({})}>Limpiar</button>
              <button className="btn-ghost py-2 text-xs" onClick={() => setCount(STANDARD_FLOAT)}>Fondo estándar $1,000</button>
            </div>
          </div>
          <CashCounter value={count} onChange={setCount} />
          <button className="btn-primary w-full py-4 text-base" disabled={!register || amount <= 0} onClick={open}>
            <Unlock className="size-5" /> Abrir {register ? registerLabel(register) : 'caja'} con {formatMoney(amount)}
          </button>
          {!register && <p className="text-center text-xs text-red-500">Todas las cajas de esta sucursal están ocupadas.</p>}
        </div>
      </div>
    </div>
  )
}
