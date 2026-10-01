import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useUiStore } from '../../store/useUiStore'
import type { ToastType } from '../../types'

const STYLES: Partial<Record<ToastType, { cls: string; icon: LucideIcon; iconCls: string }>> = {
  success: { cls: 'bg-white text-ink border-emerald-200', icon: CheckCircle2, iconCls: 'text-emerald-500' },
  error: { cls: 'bg-white text-ink border-red-200', icon: XCircle, iconCls: 'text-red-500' },
  info: { cls: 'bg-white text-ink border-brand-200', icon: Info, iconCls: 'text-brand-500' },
}

export default function Toaster() {
  const toasts = useUiStore((s) => s.toasts)
  const dismiss = useUiStore((s) => s.dismissToast)
  const warnings = toasts.filter((t) => t.type === 'warning')
  const others = toasts.filter((t) => t.type !== 'warning')

  return (
    <>
      {/* Alertas de stock: banner naranja centrado arriba, como en el diseño */}
      <div className="pointer-events-none fixed left-1/2 top-3 z-[60] flex w-[min(92vw,22rem)] -translate-x-1/2 flex-col gap-2">
        {warnings.map((t) => (
          <div key={t.id} className="animate-slide-down pointer-events-auto flex items-start gap-3 rounded-xl bg-orange-500 px-4 py-3 text-white shadow-lg shadow-orange-500/30">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{t.title}</p>
              {t.message && <p className="text-[11px] text-white/90">{t.message}</p>}
            </div>
            <button onClick={() => dismiss(t.id)} className="rounded p-0.5 hover:bg-white/20" aria-label="Cerrar">
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(92vw,22rem)] flex-col gap-2">
        {others.map((t) => {
          const s = STYLES[t.type] ?? STYLES.info!
          const Icon = s.icon
          return (
            <div key={t.id} className={`animate-pop pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg shadow-brand-900/10 ${s.cls}`}>
              <Icon className={`mt-0.5 size-5 shrink-0 ${s.iconCls}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{t.title}</p>
                {t.message && <p className="text-xs text-ink-soft">{t.message}</p>}
              </div>
              <button onClick={() => dismiss(t.id)} className="rounded p-0.5 text-ink-mute hover:bg-brand-50" aria-label="Cerrar">
                <X className="size-4" />
              </button>
            </div>
          )
        })}
      </div>
    </>
  )
}
