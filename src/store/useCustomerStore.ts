import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SEED_CUSTOMERS, seedHistory } from '../data/seed'
import { uid } from '../utils/format'
import type { CreditPayment, Customer, Offer } from '../types'

export type CustomerInput = Pick<Customer, 'name'> & Partial<Omit<Customer, 'id'>>

interface CustomerState {
  customers: Customer[]
  offers: Offer[]
  payments: CreditPayment[]
  addCustomer: (data: CustomerInput) => Customer
  updateCustomer: (id: string, patch: Partial<Customer>) => void
  removeCustomer: (id: string) => void
  sendOffer: (customerIds: string[], offer: Pick<Offer, 'title' | 'channel' | 'message'>) => void
  addPayment: (data: Omit<CreditPayment, 'id' | 'folio' | 'date'>) => CreditPayment
}

export const useCustomerStore = create<CustomerState>()(
  persist(
    (set, get) => ({
      customers: SEED_CUSTOMERS,
      offers: [],
      payments: seedHistory().payments,
      addCustomer: (data) => {
        const customer: Customer = { id: uid('c'), avatar: '', segment: 'Ocasional', phone: '', email: '', creditEnabled: false, creditLimit: 0, creditDays: 15, ...data }
        set((s) => ({ customers: [customer, ...s.customers] }))
        return customer
      },
      updateCustomer: (id, patch) =>
        set((s) => ({ customers: s.customers.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      removeCustomer: (id) => set((s) => ({ customers: s.customers.filter((c) => c.id !== id) })),
      sendOffer: (customerIds, offer) =>
        set((s) => ({ offers: [{ id: uid('of'), customerIds, ...offer, date: new Date().toISOString() }, ...s.offers] })),
      addPayment: (data) => {
        const folio = Math.max(500, ...get().payments.map((p) => p.folio)) + 1
        const payment: CreditPayment = { ...data, id: uid('cp'), folio, date: new Date().toISOString() }
        set((s) => ({ payments: [payment, ...s.payments] }))
        return payment
      },
    }),
    { name: 'tiendita-customers' },
  ),
)

export const LOYALTY = [
  { min: 30000, label: 'Platino' },
  { min: 18000, label: 'Oro' },
  { min: 9000, label: 'Plata' },
  { min: 0, label: 'Regular' },
] as const

export type LoyaltyTier = (typeof LOYALTY)[number]

export const loyaltyFor = (total: number): LoyaltyTier => LOYALTY.find((l) => total >= l.min) ?? LOYALTY[LOYALTY.length - 1]
