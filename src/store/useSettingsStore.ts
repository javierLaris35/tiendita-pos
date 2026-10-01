import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Settings } from '../types'

export const DEFAULT_SETTINGS: Settings = {
  businessName: 'Tiendita POS',
  rfc: 'TIE260930AB1',
  taxPct: 16,
  plan: 'pro',
  lowStockAlerts: true,
  soundOnScan: true,
  receiptFooter: '¡Gracias por su compra! Vuelva pronto.',
  whatsappNumber: '6444230374',
  deliveryFee: 35,
  freeDeliveryFrom: 400,
}

interface SettingsState extends Settings {
  update: (patch: Partial<Settings>) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      update: (patch) => set(patch),
    }),
    { name: 'tiendita-settings' },
  ),
)
