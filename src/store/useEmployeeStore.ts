import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SEED_EMPLOYEES } from '../data/seed'
import { uid } from '../utils/format'
import type { Employee, EmployeeStatus } from '../types'

export const EMPLOYEE_STATUS: Record<EmployeeStatus, { label: string; dot: string }> = {
  active: { label: 'Activo', dot: 'bg-emerald-500' },
  break: { label: 'Descanso', dot: 'bg-amber-400' },
  offline: { label: 'Fuera de línea', dot: 'bg-red-500' },
}

export const ROLES = ['Administrador', 'Gerente', 'Cajero', 'Cajera', 'Inventario']

export type EmployeeInput = Pick<Employee, 'name' | 'email' | 'role' | 'counter' | 'storeId'> & Partial<Employee>

interface EmployeeState {
  employees: Employee[]
  addEmployee: (data: EmployeeInput) => Employee
  updateEmployee: (id: string, patch: Partial<Employee>) => void
  removeEmployee: (id: string) => void
}

export const useEmployeeStore = create<EmployeeState>()(
  persist(
    (set) => ({
      employees: SEED_EMPLOYEES,
      addEmployee: (data) => {
        const employee: Employee = { id: uid('e'), status: 'offline', hoursToday: 0, avatar: '', password: 'demo123', phone: '', ...data }
        set((s) => ({ employees: [...s.employees, employee] }))
        return employee
      },
      updateEmployee: (id, patch) =>
        set((s) => ({ employees: s.employees.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
      removeEmployee: (id) => set((s) => ({ employees: s.employees.filter((e) => e.id !== id) })),
    }),
    { name: 'tiendita-employees' },
  ),
)
