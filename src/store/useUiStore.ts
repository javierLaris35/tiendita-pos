import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { uid } from '../utils/format'
import type { AppNotification, Toast, ToastType } from '../types'

interface ToastInput {
  type?: ToastType
  title: string
  message?: string
  duration?: number
}

interface NotifyInput {
  type?: ToastType
  title: string
  message?: string
  toast?: boolean
}

interface UiState {
  toasts: Toast[]
  notifications: AppNotification[]
  sidebarCollapsed: boolean
  mobileNavOpen: boolean
  receiptId: string | null
  openReceipt: (id: string) => void
  closeReceipt: () => void
  toast: (input: ToastInput) => string
  dismissToast: (id: string) => void
  notify: (input: NotifyInput) => void
  markRead: (id: string) => void
  markAllRead: () => void
  clearNotifications: () => void
  toggleSidebar: () => void
  setMobileNav: (open: boolean) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      toasts: [],
      notifications: [],
      sidebarCollapsed: false,
      mobileNavOpen: false,
      receiptId: null,
      openReceipt: (receiptId) => set({ receiptId }),
      closeReceipt: () => set({ receiptId: null }),

      toast: ({ type = 'success', title, message = '', duration = 3500 }) => {
        const id = uid('t')
        set((s) => ({ toasts: [...s.toasts, { id, type, title, message }] }))
        if (duration) setTimeout(() => get().dismissToast(id), duration)
        return id
      },
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      notify: ({ type = 'info', title, message = '', toast = false }) => {
        const n: AppNotification = { id: uid('n'), type, title, message, date: new Date().toISOString(), read: false }
        set((s) => ({ notifications: [n, ...s.notifications].slice(0, 50) }))
        if (toast) get().toast({ type, title, message, duration: type === 'warning' ? 6000 : 3500 })
      },
      markRead: (id) =>
        set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
      markAllRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
      clearNotifications: () => set({ notifications: [] }),

      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setMobileNav: (open) => set({ mobileNavOpen: open }),
    }),
    {
      name: 'tiendita-ui',
      partialize: (s) => ({ notifications: s.notifications, sidebarCollapsed: s.sidebarCollapsed }),
    },
  ),
)

export const toast = (input: ToastInput) => useUiStore.getState().toast(input)
export const notify = (input: NotifyInput) => useUiStore.getState().notify(input)
