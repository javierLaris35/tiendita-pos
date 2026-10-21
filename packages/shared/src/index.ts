// Tipos de dominio compartidos por stores, páginas y componentes.

export type CategoryId =
  | 'lacteos'
  | 'verduras'
  | 'frutas'
  | 'panaderia'
  | 'carnes'
  | 'bebidas'
  | 'botanas'
  | 'abarrotes'
  | 'limpieza'

export type CategoryIconName = 'Milk' | 'Carrot' | 'Apple' | 'Croissant' | 'Beef' | 'CupSoda' | 'Cookie' | 'Wheat' | 'SprayCan' | 'LayoutGrid'

export interface Category {
  id: CategoryId
  name: string
  icon: CategoryIconName
  subcategories: string[]
}

/** pz = pieza; kg = venta a granel por peso */
export type ProductUnit = 'pz' | 'kg'

export interface Product {
  id: string
  unit: ProductUnit
  name: string
  brand: string
  category: CategoryId
  subcategory: string
  price: number
  cost: number
  stock: number
  minStock: number
  emoji: string
  barcode: string
  lastRestocked: string
}

export type StockStatus = 'ok' | 'low' | 'out'

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'credit' | 'online'
/** Formas de pago con las que se puede abonar a una cuenta de crédito */
export type AbonoMethod = 'cash' | 'card' | 'transfer'

export interface SaleItem {
  productId: string
  name: string
  category: CategoryId
  emoji: string
  price: number
  qty: number
}

export interface AppliedPromotion {
  promoId: string
  name: string
  badge: string
  discount: number
}

/** Sugerencia que la caja muestra para completar una oferta ("agrega 1 más y llévate 3x2"). */
export interface PromoSuggestion {
  promoId: string
  productId: string
  qty: number
  message: string
}

export interface Totals {
  /** Suma de precios de lista (con IVA incluido) */
  subtotal: number
  /** Ahorro total por ofertas */
  discount: number
  /** IVA contenido en el total (informativo, los precios lo incluyen) */
  tax: number
  total: number
  units: number
}

/** Ahorro que le toca a un producto del ticket y qué ofertas lo generaron. */
export interface LineDiscount {
  amount: number
  badges: string[]
}

export interface Ticket extends Totals {
  promotions: AppliedPromotion[]
  suggestions: PromoSuggestion[]
  /** Ahorro por producto (clave: productId) para mostrarlo en cada renglón */
  lineDiscounts: Record<string, LineDiscount>
}

export interface Sale {
  id: string
  number: number
  date: string
  customerId: string | null
  cashierId: string | null
  storeId: string
  sessionId?: string | null
  register?: number | null
  payment: PaymentMethod
  items: SaleItem[]
  promotions?: AppliedPromotion[]
  subtotal: number
  discount: number
  tax: number
  total: number
  cashReceived?: number | null
  change?: number | null
  cardRef?: string
  /** Ventas a crédito: saldo del cliente después de esta compra */
  creditBalanceAfter?: number
  /** Pedido (web, WhatsApp o QR) que originó la venta */
  orderId?: string | null
  deliveryFee?: number
  refunded?: boolean
}

// ---------- Ofertas

export type PromotionType = 'nxm' | 'gift' | 'percent' | 'bundle'

export interface Promotion {
  id: string
  name: string
  type: PromotionType
  /** Productos que activan la oferta (vacío + categoryId = toda la categoría, solo en 'percent') */
  productIds: string[]
  categoryId?: CategoryId | null
  /** nxm: lleva buyQty paga payQty · gift: comprando buyQty del producto disparador */
  buyQty: number
  payQty: number
  /** gift (combo): producto que se lleva con descuento, cantidad y % (100 = gratis) */
  giftProductId?: string | null
  giftQty: number
  giftDiscountPct: number
  /** percent */
  percent: number
  /** bundle: bundleQty piezas por bundlePrice */
  bundleQty: number
  bundlePrice: number
  active: boolean
  startDate: string
  endDate: string
  /** Sucursales donde aplica (vacío = todas) */
  branchIds: string[]
  createdAt: string
}

// ---------- Caja

export interface CashMovement {
  id: string
  type: 'in' | 'out'
  amount: number
  reason: string
  date: string
  by: string | null
}

/** Conteo de efectivo por denominación: { "500": 2, "0.5": 3 } */
export type CashCount = Record<string, number>

export interface CashSession {
  id: string
  branchId: string
  register: number
  cashierId: string | null
  openedAt: string
  openingAmount: number
  movements: CashMovement[]
  status: 'open' | 'closed'
  closedAt?: string
  expectedAmount?: number
  countedAmount?: number
  countedBreakdown?: CashCount
  notes?: string
}

export type Segment = 'VIP' | 'Recurrente' | 'Cazaofertas' | 'Ocasional' | 'Suscriptor' | 'Familiar' | 'Mayoreo' | 'Lealtad'

export interface Customer {
  id: string
  name: string
  phone: string
  email: string
  segment: Segment
  avatar: string
  /** Fiado: si puede comprar a crédito, hasta cuánto y en cuántos días debe abonar */
  creditEnabled: boolean
  creditLimit: number
  creditDays: number
  /** Cuenta de la tienda en línea / escanea y paga */
  password?: string
  address?: string
}

export interface CustomerWithStats extends Customer {
  total: number
  orders: number
  last: string | null
  balance: number
  available: number
  lastPayment: string | null
  /** Días sin abonar con saldo pendiente por encima del plazo (0 = al corriente) */
  overdueDays: number
}

/** Abono a la cuenta de crédito de un cliente. */
export interface CreditPayment {
  id: string
  folio: number
  customerId: string
  amount: number
  method: AbonoMethod
  date: string
  sessionId: string | null
  register?: number | null
  by: string | null
  balanceAfter: number
}

export type OfferChannel = 'whatsapp' | 'sms' | 'email'

export interface Offer {
  id: string
  customerIds: string[]
  title: string
  channel: OfferChannel
  message: string
  date: string
}

export type EmployeeStatus = 'active' | 'break' | 'offline'

export interface Employee {
  id: string
  name: string
  role: string
  counter: string
  email: string
  password: string
  phone: string
  avatar: string
  status: EmployeeStatus
  hoursToday: number
  storeId: string
}

export interface Branch {
  id: string
  name: string
  address: string
  phone: string
  manager: string
  counters: number
}

export type OrderStatus = 'approval' | 'transit' | 'delivered' | 'cancelled'

export interface SupplierOrder {
  id: string
  code: string
  supplier: string
  productId: string
  qty: number
  expected: string
  status: OrderStatus
  createdAt: string
}

export interface WasteItem {
  id: string
  productId: string
  qty: number
  expiry: string
}

export interface WasteLogEntry extends WasteItem {
  removedAt: string
}

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message: string
}

export interface AppNotification {
  id: string
  type: ToastType
  title: string
  message: string
  date: string
  read: boolean
}

export type PlanId = 'basic' | 'pro' | 'enterprise'

export interface Plan {
  id: PlanId
  name: string
  price: number
  features: string[]
}

export interface Settings {
  businessName: string
  rfc: string
  /** % de IVA contenido en los precios (los precios de anaquel ya lo incluyen) */
  taxPct: number
  plan: PlanId
  lowStockAlerts: boolean
  soundOnScan: boolean
  receiptFooter: string
  /** Número de WhatsApp que recibe pedidos (10 dígitos) */
  whatsappNumber: string
  deliveryFee: number
  freeDeliveryFrom: number
}

export type Period = 'today' | 'week' | 'month' | 'year' | 'all'

export interface Option<T extends string | number = string> {
  value: T
  label: string
}

// ---------- Pedidos (tienda en línea, WhatsApp y escanea-y-paga)

export type OrderChannel = 'web' | 'whatsapp' | 'scan'
/** delivery = a domicilio · pickup = recoger en sucursal · instore = el cliente ya está en la tienda (QR) */
export type Fulfillment = 'delivery' | 'pickup' | 'instore'

export type PedidoStatus =
  | 'received'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'on_the_way'
  | 'delivered'
  | 'picked_up'
  | 'awaiting_payment'
  | 'completed'
  | 'cancelled'

export interface OrderItem {
  productId: string
  name: string
  emoji: string
  price: number
  qty: number
  unit: ProductUnit
  category: CategoryId
  /** Marcado por quien arma el pedido */
  picked?: boolean
}

export interface OrderEvent {
  status: PedidoStatus
  date: string
  /** Mensaje que se le envía al cliente */
  message: string
  by: string | null
  note?: string
}

export interface Order {
  id: string
  code: string
  channel: OrderChannel
  fulfillment: Fulfillment
  customerId: string
  customerName: string
  phone: string
  /** Sucursal que surte / donde se recoge o se escaneó */
  branchId: string
  address?: string
  items: OrderItem[]
  promotions: AppliedPromotion[]
  subtotal: number
  discount: number
  deliveryFee: number
  total: number
  paymentMode: 'online' | 'on_delivery'
  paid: boolean
  status: PedidoStatus
  timeline: OrderEvent[]
  notes?: string
  saleId?: string | null
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  id: string
  from: 'customer' | 'bot'
  text: string
  date: string
  /** Pase de recolección adjunto (id del pedido): se dibuja con su QR dentro del chat */
  orderPass?: string
}
