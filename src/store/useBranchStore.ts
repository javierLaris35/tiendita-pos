import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SEED_STORES } from '../data/seed'
import { uid } from '../utils/format'
import type { Branch } from '../types'

export type BranchInput = Omit<Branch, 'id' | 'counters'> & { counters?: number }

interface BranchState {
  branches: Branch[]
  activeBranchId: string
  setActive: (id: string) => void
  addBranch: (data: BranchInput) => Branch
  updateBranch: (id: string, patch: Partial<Branch>) => void
  removeBranch: (id: string) => void
}

export const useBranchStore = create<BranchState>()(
  persist(
    (set) => ({
      branches: SEED_STORES,
      activeBranchId: 's1',
      setActive: (id) => set({ activeBranchId: id }),
      addBranch: (data) => {
        const branch: Branch = { id: uid('s'), counters: 1, ...data }
        set((s) => ({ branches: [...s.branches, branch] }))
        return branch
      },
      updateBranch: (id, patch) =>
        set((s) => ({ branches: s.branches.map((b) => (b.id === id ? { ...b, ...patch } : b)) })),
      removeBranch: (id) =>
        set((s) => {
          const branches = s.branches.filter((b) => b.id !== id)
          return { branches, activeBranchId: s.activeBranchId === id ? (branches[0]?.id ?? '') : s.activeBranchId }
        }),
    }),
    { name: 'tiendita-branches' },
  ),
)

export const useActiveBranch = (): Branch | undefined =>
  useBranchStore((s) => s.branches.find((b) => b.id === s.activeBranchId) ?? s.branches[0])
