import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import type { Employee, EmployeeStatus } from '../types'
import { Clock, PencilLine, Phone, Trash2, UserCheck, UserCog, UserPlus, Users } from 'lucide-react'
import Avatar from '../components/ui/Avatar'
import { Dropdown, KebabMenu } from '../components/ui/Dropdown'
import Modal, { ConfirmDialog, Field } from '../components/ui/Modal'
import { SearchSelect } from '../components/ui/Select'
import { branchOptions, textOptions } from '../components/ui/selectOptions'
import { KeyValue, PanelHeader } from '../components/ui/Misc'
import { useEmployeeStore, EMPLOYEE_STATUS, ROLES } from '../store/useEmployeeStore'
import { useBranchStore } from '../store/useBranchStore'
import { useSalesStore } from '../store/useSalesStore'
import { useCurrentUser } from '../store/useAuthStore'
import { toast } from '../store/useUiStore'
import { filterByPeriod } from '../utils/period'
import { formatMoney } from '../utils/format'

const STATUS_OPTIONS = (Object.keys(EMPLOYEE_STATUS) as EmployeeStatus[]).map((value) => ({ value, label: EMPLOYEE_STATUS[value].label }))
const fmtHours = (h: number) => `${Math.floor(h)}h ${String(Math.round((h % 1) * 60)).padStart(2, '0')}m`

function EmployeeModal({ employee, onClose }: { employee: Partial<Employee>; onClose: () => void }) {
  const { addEmployee, updateEmployee } = useEmployeeStore()
  const branches = useBranchStore((s) => s.branches)
  const isNew = !employee.id
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'Cajero', counter: 'Caja 1', storeId: branches[0]?.id ?? '', password: 'demo123', ...employee })
  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value })
  const save = (e: FormEvent) => {
    e.preventDefault()
    if (employee.id) updateEmployee(employee.id, form)
    else addEmployee(form)
    toast({ title: isNew ? 'Empleado registrado' : 'Empleado actualizado', message: form.name })
    onClose()
  }
  return (
    <Modal
      open
      onClose={onClose}
      icon={isNew ? UserPlus : PencilLine}
      title={isNew ? 'Nuevo empleado' : 'Editar empleado'}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button form="emp-form" className="btn-primary">Guardar</button>
        </>
      }
    >
      <form id="emp-form" onSubmit={save} className="grid gap-3 sm:grid-cols-2">
        <Field label="Nombre" className="sm:col-span-2">
          <input className="input" required autoFocus value={form.name} onChange={set('name')} />
        </Field>
        <Field label="Correo (inicio de sesión)">
          <input className="input" type="email" required value={form.email} onChange={set('email')} />
        </Field>
        <Field label="Teléfono">
          <input className="input" value={form.phone} onChange={set('phone')} />
        </Field>
        <Field label="Puesto">
          <SearchSelect value={form.role} options={textOptions(ROLES)} onChange={(role) => setForm({ ...form, role })} />
        </Field>
        <Field label="Área / Caja">
          <SearchSelect value={form.counter} options={textOptions(['Caja 1', 'Caja 2', 'Caja 3', 'Almacén', 'Oficina'])} onChange={(counter) => setForm({ ...form, counter })} />
        </Field>
        <Field label="Sucursal">
          <SearchSelect value={form.storeId} options={branchOptions(branches)} onChange={(storeId) => setForm({ ...form, storeId })} />
        </Field>
        <Field label="Contraseña" hint="Usada para iniciar sesión en el POS">
          <input className="input" value={form.password} onChange={set('password')} minLength={6} />
        </Field>
      </form>
    </Modal>
  )
}

export default function Employees() {
  const employees = useEmployeeStore((s) => s.employees)
  const updateEmployee = useEmployeeStore((s) => s.updateEmployee)
  const removeEmployee = useEmployeeStore((s) => s.removeEmployee)
  const branches = useBranchStore((s) => s.branches)
  const sales = useSalesStore((s) => s.sales)
  const me = useCurrentUser()
  const [editing, setEditing] = useState<Partial<Employee> | null>(null)
  const [deleting, setDeleting] = useState<Employee | null>(null)
  const [branchFilter, setBranchFilter] = useState('all')

  const todaySales = useMemo(() => {
    const m: Record<string, { n: number; total: number }> = {}
    for (const s of filterByPeriod(sales, 'today')) {
      if (!s.cashierId) continue
      m[s.cashierId] ??= { n: 0, total: 0 }
      m[s.cashierId].n += 1
      m[s.cashierId].total += s.total
    }
    return m
  }, [sales])

  const list = employees.filter((e) => branchFilter === 'all' || e.storeId === branchFilter)
  const stats = [
    { icon: Users, label: 'Empleados', value: list.length },
    { icon: UserCheck, label: 'Activos ahora', value: list.filter((e) => e.status === 'active').length },
    { icon: Clock, label: 'En descanso', value: list.filter((e) => e.status === 'break').length },
    { icon: UserCog, label: 'Horas hoy', value: fmtHours(list.reduce((a, e) => a + e.hoursToday, 0)) },
  ]

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map(({ icon: Icon, label, value }, i) => (
          <div key={label} className={`card flex items-center gap-3 p-4 ${i === 0 ? 'border-brand-500 bg-brand-500 text-white' : ''}`}>
            <div className={`grid size-11 place-items-center rounded-xl ${i === 0 ? 'bg-white text-brand-600' : 'border border-line bg-tile text-ink-soft'}`}>
              <Icon className="size-5" />
            </div>
            <div>
              <p className={`text-xs ${i === 0 ? 'text-white/85' : 'text-ink-soft'}`}>{label}</p>
              <p className="text-xl font-semibold">{value}</p>
            </div>
          </div>
        ))}
      </div>
      <section className="card flex min-h-[420px] flex-1 flex-col gap-3 p-3 sm:p-4 xl:min-h-0">
        <PanelHeader icon={Users} title="Equipo de trabajo">
          <Dropdown value={branchFilter} onChange={setBranchFilter} options={[{ value: 'all', label: 'Todas las sucursales' }, ...branches.map((b) => ({ value: b.id, label: b.name }))]} />
          <button className="btn-primary py-2" onClick={() => setEditing({})}>
            <UserPlus className="size-4" /> <span className="hidden sm:inline">Nuevo</span>
          </button>
        </PanelHeader>
        <div className="-mr-1 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 scrollbar-thin">
          {list.map((e) => {
            const st = EMPLOYEE_STATUS[e.status]
            const ts = todaySales[e.id]
            return (
              <div key={e.id} className="row-card grid grid-cols-[minmax(0,1.3fr)_auto] items-center gap-3 p-2.5 hover:border-brand-200 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_auto]">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar src={e.avatar} name={e.name} />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">
                      {e.name} {e.id === me?.id && <span className="ml-1 rounded bg-brand-50 px-1.5 py-0.5 text-[9px] text-brand-700">Tú</span>}
                    </p>
                    <p className="text-[10px] text-ink-soft">{e.role} · {e.counter}</p>
                  </div>
                </div>
                <div className="hidden md:block"><KeyValue label="Correo" value={e.email} /></div>
                <div className="hidden md:block"><KeyValue label="Horas hoy" value={fmtHours(e.hoursToday)} /></div>
                <div className="hidden md:block"><KeyValue label="Ventas hoy" value={ts ? `${ts.n} · ${formatMoney(ts.total)}` : '—'} /></div>
                <div className="hidden items-center gap-1.5 md:flex">
                  <span className={`size-2 rounded-full ${st.dot}`} />
                  <Dropdown size="sm" align="left" value={e.status} onChange={(status) => updateEmployee(e.id, { status })} options={STATUS_OPTIONS} />
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => toast({ type: 'info', title: `Llamando a ${e.name}…`, message: e.phone || 'Sin teléfono' })} className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[11px] hover:bg-brand-50">
                    <Phone className="size-3.5" /> <span className="hidden sm:inline">Llamar</span>
                  </button>
                  <KebabMenu
                    items={[
                      { label: 'Editar', icon: PencilLine, onClick: () => setEditing(e) },
                      ...STATUS_OPTIONS.map((o) => ({ label: `Marcar: ${o.label}`, icon: UserCheck, onClick: () => updateEmployee(e.id, { status: o.value }) })),
                      ...(e.id !== me?.id ? [{ label: 'Eliminar', icon: Trash2, danger: true, onClick: () => setDeleting(e) }] : []),
                    ]}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </section>
      {editing && <EmployeeModal employee={editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return
          removeEmployee(deleting.id)
          toast({ type: 'info', title: 'Empleado eliminado', message: deleting.name })
        }}
        title="Eliminar empleado"
        message={`¿Eliminar a ${deleting?.name}? Ya no podrá iniciar sesión.`}
        confirmLabel="Eliminar"
      />
    </div>
  )
}
