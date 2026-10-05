import { lazy, Suspense, type ComponentType, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import Toaster from './components/ui/Toaster'
import { useCurrentUser } from './store/useAuthStore'
import Login from './pages/Login'
import Overview from './pages/Overview'
import Pos from './pages/Pos'
import Promotions from './pages/Promotions'
import PromoDisplay from './pages/PromoDisplay'
import CashSessions from './pages/CashSessions'
import Orders from './pages/Orders'
/**
 * Carga diferida tolerante a despliegues: si se publicó una versión nueva mientras la página estaba
 * abierta, los archivos viejos ya no existen; se recarga una sola vez para traer la versión actual.
 */
function lazyPage<T extends ComponentType>(load: () => Promise<{ default: T }>) {
  return lazy(() =>
    load()
      .then((mod) => {
        // Cargó bien: si en el futuro vuelve a fallar, se permite otra recarga
        sessionStorage.removeItem('tiendita-reloaded')
        return mod
      })
      .catch((err) => {
      if (!sessionStorage.getItem('tiendita-reloaded')) {
        sessionStorage.setItem('tiendita-reloaded', '1')
        window.location.reload()
        return new Promise<never>(() => {})
      }
      throw err
    }),
  )
}

// Pantallas públicas: se cargan aparte para que el cliente no descargue el panel completo
const Shop = lazyPage(() => import('./pages/shop/Shop'))
const ShopAccount = lazyPage(() => import('./pages/shop/ShopAccount'))
const OrderTrack = lazyPage(() => import('./pages/shop/OrderTrack'))
const SelfScan = lazyPage(() => import('./pages/SelfScan'))
const WhatsAppSim = lazyPage(() => import('./pages/WhatsAppSim'))
import Analysis from './pages/Analysis'
import Inventory from './pages/Inventory'
import Customers from './pages/Customers'
import Employees from './pages/Employees'
import Reports from './pages/Reports'
import Branches from './pages/Branches'
import Subscription from './pages/Subscription'
import Help from './pages/Help'
import Settings from './pages/Settings'

/** Pantallas completas (caja, TV de ofertas) que no usan el layout del panel. */
function RequireAuth({ children }: { children: ReactNode }) {
  const user = useCurrentUser()
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="grid h-full place-items-center text-sm text-ink-soft">Cargando…</div>}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/caja" element={<RequireAuth><Pos /></RequireAuth>} />
        {/* Públicas: clientes */}
        <Route path="/tienda" element={<Shop />} />
        <Route path="/tienda/cuenta" element={<ShopAccount />} />
        <Route path="/tienda/pedido/:code" element={<OrderTrack />} />
        <Route path="/scan" element={<SelfScan />} />
        <Route path="/whatsapp" element={<WhatsAppSim />} />
        <Route path="/pantalla-ofertas" element={<RequireAuth><PromoDisplay /></RequireAuth>} />
        <Route element={<AppLayout />}>
          <Route index element={<Overview />} />
          <Route path="pedidos" element={<Orders />} />
          <Route path="ofertas" element={<Promotions />} />
          <Route path="cortes" element={<CashSessions />} />
          <Route path="analisis" element={<Analysis />} />
          <Route path="inventario" element={<Inventory />} />
          <Route path="clientes" element={<Customers />} />
          <Route path="empleados" element={<Employees />} />
          <Route path="reportes" element={<Reports />} />
          <Route path="sucursales" element={<Branches />} />
          <Route path="suscripcion" element={<Subscription />} />
          <Route path="ayuda" element={<Help />} />
          <Route path="ajustes" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
      <Toaster />
    </BrowserRouter>
  )
}
