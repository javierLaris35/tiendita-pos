// Capa mínima de acceso al backend. La URL base se configura por entorno
// (VITE_API_URL); en el demo sin backend queda vacía y las llamadas fallan
// de forma controlada (ver SetupGate en App.tsx).
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? ''

export interface SetupPayload {
  businessName: string
  rfc?: string
  ticketHeader?: string
  ticketFooter?: string
  defaultIvaRate?: number
  printerType?: 'network' | 'serial' | 'none'
  printerTarget?: string
  admin: { email: string; name: string; password: string }
}

export async function getSetupStatus(): Promise<{ complete: boolean }> {
  const res = await fetch(`${API_BASE}/setup/status`)
  if (!res.ok) throw new Error('No se pudo consultar el estado de configuración')
  return (await res.json()) as { complete: boolean }
}

export async function submitSetup(payload: SetupPayload): Promise<void> {
  const res = await fetch(`${API_BASE}/setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string }
    throw new Error(body.message ?? 'No se pudo completar la configuración')
  }
}
