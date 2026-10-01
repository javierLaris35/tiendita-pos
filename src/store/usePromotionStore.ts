import { useMemo } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SEED_PROMOTIONS } from '../data/seed'
import { uid } from '../utils/format'
import { isPromoActive } from '../utils/promotions'
import { useBranchStore } from './useBranchStore'
import type { Promotion } from '../types'

export type PromotionInput = Omit<Promotion, 'id' | 'createdAt'>

interface PromotionState {
  promotions: Promotion[]
  addPromotion: (data: PromotionInput) => Promotion
  updatePromotion: (id: string, patch: Partial<Promotion>) => void
  removePromotion: (id: string) => void
}

export const usePromotionStore = create<PromotionState>()(
  persist(
    (set) => ({
      promotions: SEED_PROMOTIONS,
      addPromotion: (data) => {
        const promotion: Promotion = { ...data, id: uid('pr'), createdAt: new Date().toISOString() }
        set((s) => ({ promotions: [promotion, ...s.promotions] }))
        return promotion
      },
      updatePromotion: (id, patch) =>
        set((s) => ({ promotions: s.promotions.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      removePromotion: (id) => set((s) => ({ promotions: s.promotions.filter((p) => p.id !== id) })),
    }),
    { name: 'tiendita-promotions' },
  ),
)

/** Ofertas vigentes hoy en la sucursal activa. */
export function useActivePromotions(): Promotion[] {
  const promotions = usePromotionStore((s) => s.promotions)
  const branchId = useBranchStore((s) => s.activeBranchId)
  return useMemo(() => promotions.filter((p) => isPromoActive(p, branchId)), [promotions, branchId])
}

export const activePromotionsNow = () => {
  const branchId = useBranchStore.getState().activeBranchId
  return usePromotionStore.getState().promotions.filter((p) => isPromoActive(p, branchId))
}
