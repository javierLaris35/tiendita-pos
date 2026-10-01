import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useEmployeeStore, type EmployeeInput } from './useEmployeeStore'
import type { Employee } from '../types'

export type AuthResult = { ok: true; employee: Employee } | { ok: false; error: string }

interface AuthState {
  userId: string | null
  login: (email: string, password: string) => AuthResult
  register: (data: EmployeeInput) => AuthResult
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userId: null,
      login: (email, password) => {
        const employee = useEmployeeStore
          .getState()
          .employees.find((e) => e.email.toLowerCase() === email.trim().toLowerCase())
        if (!employee) return { ok: false, error: 'No existe un empleado con ese correo.' }
        if (employee.password !== password) return { ok: false, error: 'La contraseña es incorrecta.' }
        useEmployeeStore.getState().updateEmployee(employee.id, { status: 'active' })
        set({ userId: employee.id })
        return { ok: true, employee }
      },
      register: (data) => {
        const { employees, addEmployee } = useEmployeeStore.getState()
        if (employees.some((e) => e.email.toLowerCase() === data.email.toLowerCase()))
          return { ok: false, error: 'Ese correo ya está registrado.' }
        const employee = addEmployee({ ...data, status: 'active' })
        set({ userId: employee.id })
        return { ok: true, employee }
      },
      logout: () => set({ userId: null }),
    }),
    { name: 'tiendita-auth' },
  ),
)

export const useCurrentUser = (): Employee | undefined => {
  const userId = useAuthStore((s) => s.userId)
  return useEmployeeStore((s) => s.employees.find((e) => e.id === userId))
}
