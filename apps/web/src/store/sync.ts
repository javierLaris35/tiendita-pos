// Sincroniza los stores entre pestañas: el cliente hace un pedido en la tienda en línea
// y el tablero del personal (en otra pestaña) lo recibe al instante, y viceversa.
// En producción esto sería un backend con websockets; aquí usamos el evento "storage".
import { useInventoryStore } from './useInventoryStore'
import { useOrderStore } from './useOrderStore'
import { useCustomerStore } from './useCustomerStore'
import { useSalesStore } from './useSalesStore'
import { useCashStore } from './useCashStore'
import { usePromotionStore } from './usePromotionStore'
import { useSettingsStore } from './useSettingsStore'
import { useBranchStore } from './useBranchStore'

const STORES: Record<string, { persist: { rehydrate: () => Promise<void> | void } }> = {
  'tiendita-inventory': useInventoryStore,
  'tiendita-orders': useOrderStore,
  'tiendita-customers': useCustomerStore,
  'tiendita-sales': useSalesStore,
  'tiendita-cash': useCashStore,
  'tiendita-promotions': usePromotionStore,
  'tiendita-settings': useSettingsStore,
  'tiendita-branches': useBranchStore,
}

window.addEventListener('storage', (e) => {
  if (e.key && STORES[e.key]) void STORES[e.key].persist.rehydrate()
})
