import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { seedHistory } from '../data/seed'
import { uid } from '../utils/format'
import { useAuthStore } from './useAuthStore'
import { useBranchStore } from './useBranchStore'
import type { CashCount, CashMovement, CashSession } from '../types'

interface OpenInput {
  branchId: string
  register: number
  cashierId: string
  openingAmount: number
}

interface CloseInput {
  expectedAmount: number
  countedAmount: number
  countedBreakdown: CashCount
  notes: string
}

interface CashState {
  sessions: CashSession[]
  openSession: (data: OpenInput) => CashSession | { error: string }
  addMovement: (sessionId: string, movement: Omit<CashMovement, 'id' | 'date'>) => void
  closeSession: (sessionId: string, data: CloseInput) => void
}

export const useCashStore = create<CashState>()(
  persist(
    (set, get) => ({
      sessions: seedHistory().sessions,
      openSession: ({ branchId, register, cashierId, openingAmount }) => {
        const open = get().sessions.filter((s) => s.status === 'open' && s.branchId === branchId)
        if (open.some((s) => s.register === register)) return { error: 'Esa caja ya tiene un turno abierto.' }
        if (open.some((s) => s.cashierId === cashierId)) return { error: 'Ya tienes otra caja abierta en esta sucursal.' }
        const session: CashSession = {
          id: uid('cs'),
          branchId,
          register,
          cashierId,
          openedAt: new Date().toISOString(),
          openingAmount,
          movements: [],
          status: 'open',
        }
        set((s) => ({ sessions: [session, ...s.sessions] }))
        return session
      },
      addMovement: (sessionId, movement) =>
        set((s) => ({
          sessions: s.sessions.map((x) =>
            x.id === sessionId ? { ...x, movements: [...x.movements, { ...movement, id: uid('m'), date: new Date().toISOString() }] } : x,
          ),
        })),
      closeSession: (sessionId, data) =>
        set((s) => ({
          sessions: s.sessions.map((x) => (x.id === sessionId ? { ...x, ...data, status: 'closed', closedAt: new Date().toISOString() } : x)),
        })),
    }),
    { name: 'tiendita-cash' },
  ),
)

/** Turno abierto del usuario actual en la sucursal activa. */
export function useMySession(): CashSession | undefined {
  const userId = useAuthStore((s) => s.userId)
  const branchId = useBranchStore((s) => s.activeBranchId)
  return useCashStore((s) => s.sessions.find((x) => x.status === 'open' && x.cashierId === userId && x.branchId === branchId))
}

export const mySessionNow = () => {
  const userId = useAuthStore.getState().userId
  const branchId = useBranchStore.getState().activeBranchId
  return useCashStore.getState().sessions.find((x) => x.status === 'open' && x.cashierId === userId && x.branchId === branchId)
}
