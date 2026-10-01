// Datos semilla del demo. Todo lo que el usuario modifique se persiste en localStorage.
import type { Branch, CashMovement, CashSession, Category, CategoryId, CreditPayment, Customer, Employee, PaymentMethod, Plan, Product, Promotion, Sale, SaleItem, Segment, SupplierOrder, WasteItem } from '../types'

export const CATEGORIES: Category[] = [
  { id: 'lacteos', name: 'Lácteos y Huevo', icon: 'Milk', subcategories: ['Leche y Crema', 'Quesos', 'Mantequilla y Untables', 'Huevo', 'Yogurt'] },
  { id: 'verduras', name: 'Verduras', icon: 'Carrot', subcategories: ['Hortalizas', 'Raíces y Tubérculos', 'Hojas Verdes'] },
  { id: 'frutas', name: 'Frutas', icon: 'Apple', subcategories: ['Frutas Frescas', 'Cítricos', 'Tropicales'] },
  { id: 'panaderia', name: 'Panadería', icon: 'Croissant', subcategories: ['Pan de Caja', 'Pan Dulce', 'Tortillas'] },
  { id: 'carnes', name: 'Carnes y Mariscos', icon: 'Beef', subcategories: ['Pollo', 'Res', 'Pescados y Mariscos'] },
  { id: 'bebidas', name: 'Bebidas', icon: 'CupSoda', subcategories: ['Refrescos', 'Jugos', 'Agua'] },
  { id: 'botanas', name: 'Botanas', icon: 'Cookie', subcategories: ['Papas', 'Galletas', 'Dulces'] },
  { id: 'abarrotes', name: 'Abarrotes', icon: 'Wheat', subcategories: ['Granos', 'Aceites y Condimentos', 'Enlatados'] },
  { id: 'limpieza', name: 'Limpieza', icon: 'SprayCan', subcategories: ['Lavandería', 'Cocina', 'Papel'] },
]

const DAY = 86400000
const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString()
const daysAhead = (n: number) => new Date(Date.now() + n * DAY).toISOString()

// [nombre, marca, categoría, subcategoría, precio, stock, emoji, días desde reabasto]
type RawProduct = [name: string, brand: string, category: CategoryId, subcategory: string, price: number, stock: number, emoji: string, restockedDaysAgo: number]

const RAW_PRODUCTS: RawProduct[] = [
  ['Leche Light 1L', 'Lala', 'lacteos', 'Leche y Crema', 27.5, 120, '🥛', 2],
  ['Leche de Almendra', 'Silk', 'lacteos', 'Leche y Crema', 58, 34, '🌰', 4],
  ['Leche de Soya', 'Ades', 'lacteos', 'Leche y Crema', 34.9, 40, '🫘', 6],
  ['Leche de Avena', 'Silk', 'lacteos', 'Leche y Crema', 62, 28, '🌾', 3],
  ['Leche de Coco', 'Calahua', 'lacteos', 'Leche y Crema', 45, 18, '🥥', 8],
  ['Leche Entera 1L', 'Alpura', 'lacteos', 'Leche y Crema', 29, 96, '🥛', 1],
  ['Crema Ácida', 'Lala', 'lacteos', 'Leche y Crema', 32, 45, '🥣', 2],
  ['Queso Panela', 'Lala', 'lacteos', 'Quesos', 68, 30, '🧀', 3],
  ['Queso Oaxaca', 'Esmeralda', 'lacteos', 'Quesos', 89, 22, '🧀', 5],
  ['Queso Cheddar', 'Kraft', 'lacteos', 'Quesos', 75, 8, '🧀', 5],
  ['Mantequilla', 'Gloria', 'lacteos', 'Mantequilla y Untables', 48, 36, '🧈', 4],
  ['Queso Crema', 'Philadelphia', 'lacteos', 'Mantequilla y Untables', 42, 25, '🍶', 6],
  ['Huevo Blanco 12 pzas', 'Bachoco', 'lacteos', 'Huevo', 52, 60, '🥚', 1],
  ['Huevo Rojo 18 pzas', 'San Juan', 'lacteos', 'Huevo', 79, 24, '🥚', 2],
  ['Yogurt de Fresa', 'Danone', 'lacteos', 'Yogurt', 18.5, 50, '🍓', 3],
  ['Yogurt Griego', 'Oikos', 'lacteos', 'Yogurt', 24, 14, '🥄', 4],

  ['Jitomate (kg)', 'Granel', 'verduras', 'Hortalizas', 18, 40, '🍅', 1],
  ['Brócoli', 'Granel', 'verduras', 'Hortalizas', 35, 6, '🥦', 3],
  ['Chile Jalapeño (kg)', 'Granel', 'verduras', 'Hortalizas', 32, 15, '🌶️', 2],
  ['Pepino', 'Granel', 'verduras', 'Hortalizas', 16, 9, '🥒', 2],
  ['Aguacate Hass (kg)', 'Granel', 'verduras', 'Hortalizas', 69, 18, '🥑', 1],
  ['Zanahoria Orgánica (kg)', 'Granel', 'verduras', 'Raíces y Tubérculos', 22, 30, '🥕', 6],
  ['Papa (kg)', 'Granel', 'verduras', 'Raíces y Tubérculos', 28, 55, '🥔', 3],
  ['Cebolla Blanca (kg)', 'Granel', 'verduras', 'Raíces y Tubérculos', 24, 7, '🧅', 4],
  ['Lechuga Romana', 'Granel', 'verduras', 'Hojas Verdes', 19, 12, '🥬', 2],

  ['Manzana Roja (kg)', 'Granel', 'frutas', 'Frutas Frescas', 45, 15, '🍎', 5],
  ['Manzana Verde (kg)', 'Granel', 'frutas', 'Frutas Frescas', 49, 26, '🍏', 5],
  ['Uvas (kg)', 'Granel', 'frutas', 'Frutas Frescas', 79, 12, '🍇', 3],
  ['Fresas 500 g', 'Granel', 'frutas', 'Frutas Frescas', 55, 20, '🍓', 2],
  ['Naranja (kg)', 'Granel', 'frutas', 'Cítricos', 20, 70, '🍊', 2],
  ['Limón (kg)', 'Granel', 'frutas', 'Cítricos', 30, 45, '🍋', 1],
  ['Plátano (kg)', 'Granel', 'frutas', 'Tropicales', 22, 0, '🍌', 7],
  ['Piña', 'Granel', 'frutas', 'Tropicales', 38, 14, '🍍', 3],
  ['Mango (kg)', 'Granel', 'frutas', 'Tropicales', 42, 28, '🥭', 2],

  ['Pan Integral', 'Bimbo', 'panaderia', 'Pan de Caja', 52, 10, '🍞', 4],
  ['Pan Blanco', 'Bimbo', 'panaderia', 'Pan de Caja', 46, 32, '🍞', 2],
  ['Croissant', 'Casa', 'panaderia', 'Pan Dulce', 18, 24, '🥐', 1],
  ['Mantecadas', 'Bimbo', 'panaderia', 'Pan Dulce', 34, 20, '🧁', 3],
  ['Bolillo', 'Casa', 'panaderia', 'Pan Dulce', 3.5, 80, '🥖', 0],
  ['Tortillas de Maíz (kg)', 'Casa', 'panaderia', 'Tortillas', 24, 40, '🫓', 0],

  ['Pechuga de Pollo (kg)', 'Bachoco', 'carnes', 'Pollo', 125, 22, '🍗', 1],
  ['Muslo de Pollo (kg)', 'Bachoco', 'carnes', 'Pollo', 79, 18, '🍗', 2],
  ['Bistec de Res (kg)', 'SuKarne', 'carnes', 'Res', 189, 12, '🥩', 2],
  ['Carne Molida (kg)', 'SuKarne', 'carnes', 'Res', 159, 16, '🥩', 1],
  ['Camarón 500 g', 'Mar Azul', 'carnes', 'Pescados y Mariscos', 175, 9, '🦐', 3],
  ['Filete de Pescado (kg)', 'Mar Azul', 'carnes', 'Pescados y Mariscos', 145, 11, '🐟', 2],

  ['Coca-Cola 600 ml', 'Coca-Cola', 'bebidas', 'Refrescos', 19, 140, '🥤', 2],
  ['Sprite 600 ml', 'Coca-Cola', 'bebidas', 'Refrescos', 18, 60, '🥤', 2],
  ['Jugo de Naranja 1L', 'Jumex', 'bebidas', 'Jugos', 32, 25, '🧃', 3],
  ['Jugo de Manzana 1L', 'Del Valle', 'bebidas', 'Jugos', 30, 19, '🧃', 4],
  ['Agua Natural 1.5L', 'Bonafont', 'bebidas', 'Agua', 15, 90, '💧', 1],

  ['Papas Original', 'Sabritas', 'botanas', 'Papas', 20, 64, '🍟', 2],
  ['Totopos Nacho', 'Doritos', 'botanas', 'Papas', 21, 48, '🌽', 2],
  ['Galletas Marías', 'Gamesa', 'botanas', 'Galletas', 22, 38, '🍪', 5],
  ['Chocolate de Leche', 'Carlos V', 'botanas', 'Dulces', 12, 75, '🍫', 4],
  ['Gomitas', 'Ricolino', 'botanas', 'Dulces', 15, 42, '🍬', 6],

  ['Arroz 1 kg', 'Verde Valle', 'abarrotes', 'Granos', 34, 50, '🍚', 7],
  ['Frijol Negro 1 kg', 'Verde Valle', 'abarrotes', 'Granos', 42, 44, '🫘', 7],
  ['Aceite Vegetal 1L', 'Nutrioli', 'abarrotes', 'Aceites y Condimentos', 48, 30, '🫒', 5],
  ['Miel Orgánica', 'Carlota', 'abarrotes', 'Aceites y Condimentos', 95, 16, '🍯', 9],
  ['Sal de Mesa', 'La Fina', 'abarrotes', 'Aceites y Condimentos', 12, 60, '🧂', 12],
  ['Atún en Agua', 'Dolores', 'abarrotes', 'Enlatados', 24, 70, '🥫', 6],
  ['Café Molido', 'Legal', 'abarrotes', 'Enlatados', 89, 21, '☕', 8],

  ['Detergente 1 kg', 'Ariel', 'limpieza', 'Lavandería', 65, 26, '🧺', 6],
  ['Cloro 1L', 'Cloralex', 'limpieza', 'Lavandería', 22, 40, '🧪', 5],
  ['Lavatrastes Líquido', 'Salvo', 'limpieza', 'Cocina', 38, 200, '🧴', 1],
  ['Jabón de Barra', 'Zote', 'limpieza', 'Cocina', 18, 55, '🧼', 9],
  ['Papel Higiénico 12 pzas', 'Pétalo', 'limpieza', 'Papel', 89, 150, '🧻', 4],
]

export const SEED_PRODUCTS: Product[] = RAW_PRODUCTS.map(([name, brand, category, subcategory, price, stock, emoji, restocked], i) => ({
  id: `p${i + 1}`,
  unit: name.includes('(kg)') ? 'kg' : 'pz',
  name,
  brand,
  category,
  subcategory,
  price,
  cost: Math.round(price * 0.68 * 100) / 100,
  stock,
  minStock: 15,
  emoji,
  barcode: `7501${String(1000 + i * 37).padStart(9, '0')}`,
  lastRestocked: daysAgo(restocked),
}))

export const SEED_STORES: Branch[] = [
  { id: 's1', name: 'Tiendita Centro', address: 'Av. Juárez 45, Col. Centro, CDMX', phone: '+52 55 1234 5678', manager: 'Admin Demo', counters: 3 },
  { id: 's2', name: 'Tiendita Norte', address: 'Calz. Vallejo 1020, Industrial Vallejo, CDMX', phone: '+52 55 8765 4321', manager: 'Sofía Ramírez', counters: 2 },
  { id: 's3', name: 'Tiendita Sur', address: 'Av. Tlalpan 3300, Coyoacán, CDMX', phone: '+52 55 5555 0101', manager: 'Carlos Díaz', counters: 2 },
]

export const SEED_EMPLOYEES: Employee[] = [
  { id: 'e1', name: 'Admin Demo', role: 'Administrador', counter: 'Caja 1', email: 'admin@tiendita.mx', password: 'demo123', phone: '+52 55 1000 0001', avatar: 'https://i.pravatar.cc/150?img=12', status: 'active', hoursToday: 6.5, storeId: 's1' },
  { id: 'e2', name: 'Alicia Juárez', role: 'Cajera', counter: 'Caja 1', email: 'alicia@tiendita.mx', password: 'demo123', phone: '+52 55 1000 0002', avatar: 'https://i.pravatar.cc/150?img=45', status: 'active', hoursToday: 4.5, storeId: 's1' },
  { id: 'e3', name: 'Sara Medina', role: 'Inventario', counter: 'Almacén', email: 'sara@tiendita.mx', password: 'demo123', phone: '+52 55 1000 0003', avatar: 'https://i.pravatar.cc/150?img=47', status: 'break', hoursToday: 3.75, storeId: 's1' },
  { id: 'e4', name: 'Carlos Díaz', role: 'Cajero', counter: 'Caja 2', email: 'carlos@tiendita.mx', password: 'demo123', phone: '+52 55 1000 0004', avatar: 'https://i.pravatar.cc/150?img=53', status: 'offline', hoursToday: 9.1, storeId: 's3' },
  { id: 'e5', name: 'Sofía Ramírez', role: 'Gerente', counter: 'Oficina', email: 'sofia@tiendita.mx', password: 'demo123', phone: '+52 55 1000 0005', avatar: 'https://i.pravatar.cc/150?img=44', status: 'active', hoursToday: 7.2, storeId: 's2' },
  { id: 'e6', name: 'Miguel Torres', role: 'Cajero', counter: 'Caja 3', email: 'miguel@tiendita.mx', password: 'demo123', phone: '+52 55 1000 0006', avatar: 'https://i.pravatar.cc/150?img=59', status: 'active', hoursToday: 2.4, storeId: 's1' },
]

export const SEGMENTS: Segment[] = ['VIP', 'Recurrente', 'Cazaofertas', 'Ocasional', 'Suscriptor', 'Familiar', 'Mayoreo', 'Lealtad']

const BASE_CUSTOMERS: Omit<Customer, 'creditEnabled' | 'creditLimit' | 'creditDays'>[] = [
  { id: 'c1', name: 'Juan Pérez', phone: '+52 55 2345 6789', email: 'juan.perez@correo.mx', segment: 'VIP', avatar: 'https://i.pravatar.cc/150?img=15' },
  { id: 'c2', name: 'Alicia Herrera', phone: '+52 55 9876 5432', email: 'alicia.h@correo.mx', segment: 'Recurrente', avatar: 'https://i.pravatar.cc/150?img=32' },
  { id: 'c3', name: 'David Morales', phone: '+52 55 5123 4567', email: 'david.m@correo.mx', segment: 'Cazaofertas', avatar: 'https://i.pravatar.cc/150?img=33' },
  { id: 'c4', name: 'Emma Gutiérrez', phone: '+52 55 1333 2221', email: 'emma.g@correo.mx', segment: 'Familiar', avatar: 'https://i.pravatar.cc/150?img=26' },
  { id: 'c5', name: 'Sara Molina', phone: '+52 55 1444 6789', email: 'sara.molina@correo.mx', segment: 'Ocasional', avatar: 'https://i.pravatar.cc/150?img=49' },
  { id: 'c6', name: 'Luis Jiménez', phone: '+52 55 3111 0987', email: 'luis.j@correo.mx', segment: 'Mayoreo', avatar: 'https://i.pravatar.cc/150?img=11' },
  { id: 'c7', name: 'Sofía Bravo', phone: '+52 55 4222 1234', email: 'sofia.b@correo.mx', segment: 'Suscriptor', avatar: 'https://i.pravatar.cc/150?img=9' },
  { id: 'c8', name: 'Ricardo Vega', phone: '+52 55 6000 7777', email: 'ricardo.v@correo.mx', segment: 'Lealtad', avatar: 'https://i.pravatar.cc/150?img=68' },
  { id: 'c9', name: 'Fernanda Ruiz', phone: '+52 55 7123 9000', email: 'fer.ruiz@correo.mx', segment: 'VIP', avatar: 'https://i.pravatar.cc/150?img=20' },
  { id: 'c10', name: 'Jorge Castillo', phone: '+52 55 8456 1200', email: 'jorge.c@correo.mx', segment: 'Recurrente', avatar: 'https://i.pravatar.cc/150?img=60' },
  { id: 'c11', name: 'Valeria Núñez', phone: '+52 55 9012 3456', email: 'vale.n@correo.mx', segment: 'Familiar', avatar: 'https://i.pravatar.cc/150?img=24' },
  { id: 'c12', name: 'Andrés Ortega', phone: '+52 55 3456 7788', email: 'andres.o@correo.mx', segment: 'Cazaofertas', avatar: 'https://i.pravatar.cc/150?img=52' },
]

export const SUPPLIERS = ['Granja Fresca', 'Orgánicos del Valle', 'Carnes Selectas', 'Panificadora Real', 'Bebidas del Centro', 'Distribuidora Hogar']

export const SEED_SUPPLIER_ORDERS: SupplierOrder[] = [
  { id: 'o1', code: '#ORD2451', supplier: 'Granja Fresca', productId: 'p1', qty: 500, expected: daysAhead(1), status: 'transit', createdAt: daysAgo(3) },
  { id: 'o2', code: '#ORD2452', supplier: 'Orgánicos del Valle', productId: 'p26', qty: 200, expected: daysAhead(3), status: 'approval', createdAt: daysAgo(1) },
  { id: 'o3', code: '#ORD2453', supplier: 'Carnes Selectas', productId: 'p41', qty: 100, expected: daysAgo(0), status: 'delivered', createdAt: daysAgo(5) },
  { id: 'o4', code: '#ORD2454', supplier: 'Panificadora Real', productId: 'p35', qty: 150, expected: daysAhead(5), status: 'approval', createdAt: daysAgo(1) },
  { id: 'o5', code: '#ORD2455', supplier: 'Bebidas del Centro', productId: 'p49', qty: 300, expected: daysAhead(7), status: 'transit', createdAt: daysAgo(2) },
]

export const SEED_WASTE: WasteItem[] = [
  { id: 'w1', productId: 'p1', qty: 5, expiry: daysAhead(1) },
  { id: 'w2', productId: 'p32', qty: 2, expiry: daysAhead(2) },
  { id: 'w3', productId: 'p15', qty: 3, expiry: daysAgo(0) },
  { id: 'w4', productId: 'p49', qty: 4, expiry: daysAhead(4) },
  { id: 'w5', productId: 'p29', qty: 6, expiry: daysAhead(3) },
]

// Generador pseudoaleatorio determinista para que el demo siempre luzca igual.
function mulberry32(a: number) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Cada segmento compra con distinta frecuencia (weight), tamaño de canasta y cantidades.
const SEGMENT_PROFILE: Record<Segment, { weight: number; basket: number; qty: number }> = {
  VIP: { weight: 3, basket: 1.5, qty: 1.2 },
  Recurrente: { weight: 2.6, basket: 1, qty: 1 },
  Cazaofertas: { weight: 1.4, basket: 0.7, qty: 1 },
  Ocasional: { weight: 0.5, basket: 0.8, qty: 1 },
  Suscriptor: { weight: 1.6, basket: 1.1, qty: 1 },
  Familiar: { weight: 1.8, basket: 1.6, qty: 1.3 },
  Mayoreo: { weight: 1, basket: 1.3, qty: 2.6 },
  Lealtad: { weight: 2, basket: 1.2, qty: 1 },
}

function pickWeighted(rand: () => number): Customer {
  const total = SEED_CUSTOMERS.reduce((a, c) => a + SEGMENT_PROFILE[c.segment].weight, 0)
  let r = rand() * total
  for (const c of SEED_CUSTOMERS) {
    r -= SEGMENT_PROFILE[c.segment].weight
    if (r <= 0) return c
  }
  return SEED_CUSTOMERS[0]
}


const round = (n: number) => Math.round(n * 100) / 100
const TAX = 16

// Caja asignada a cada cajero en la sucursal Centro (s1)
const REGISTER_OF: Record<string, number> = { e1: 1, e2: 2, e6: 3 }

/** Genera ~90 días de ventas históricas (precios con IVA incluido) para dashboards y reportes. */
function generateSeedSales(): Sale[] {
  const rand = mulberry32(20260930)
  const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]
  const cashiers = ['e1', 'e2', 'e6', 'e4']
  // Algunos días de la semana venden más (sábado / miércoles de plaza)
  const weekdayBoost = [1.1, 0.8, 0.7, 1.35, 0.9, 1.05, 1.3]
  const sales: Sale[] = []
  let number = 1000
  const now = new Date()

  for (let d = 90; d >= 0; d--) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - d)
    const count = Math.round((4 + rand() * 6) * weekdayBoost[day.getDay()])
    for (let s = 0; s < count; s++) {
      const date = new Date(day)
      date.setHours(8 + Math.floor(rand() * 13), Math.floor(rand() * 60))
      if (date > now) continue
      const customer = rand() < 0.72 ? pickWeighted(rand) : null
      const profile = customer ? SEGMENT_PROFILE[customer.segment] : { basket: 1, qty: 1 }
      const lines = Math.max(1, Math.round((1 + rand() * 4) * profile.basket))
      const items: SaleItem[] = []
      for (let l = 0; l < lines; l++) {
        const p = pick(SEED_PRODUCTS)
        if (items.some((i) => i.productId === p.id)) continue
        const qty = Math.max(1, Math.round((1 + Math.floor(rand() * 3)) * profile.qty))
        items.push({ productId: p.id, name: p.name, category: p.category, emoji: p.emoji, price: p.price, qty })
      }
      const total = round(items.reduce((a, i) => a + i.price * i.qty, 0))
      const storeRoll = rand()
      const storeId = storeRoll < 0.7 ? 's1' : storeRoll < 0.87 ? 's2' : 's3'
      let cashierId = pick(cashiers)
      const payment = pick<PaymentMethod>(['cash', 'cash', 'card', 'card', 'transfer'])
      let register: number | null = null
      let sessionId: string | null = null
      // La última semana de la sucursal Centro queda ligada a turnos de caja (cortes)
      if (storeId === 's1' && d <= 7) {
        // Hoy solo está abierta la caja de Alicia; Carlos trabaja en la sucursal Sur
        if (d === 0 || cashierId === 'e4') cashierId = 'e2'
        register = REGISTER_OF[cashierId]
        sessionId = `cs-${d}-${register}`
      }
      const received = Math.ceil(total / 50) * 50
      sales.push({
        id: `sale-seed-${number}`,
        number: ++number,
        date: date.toISOString(),
        customerId: customer?.id ?? null,
        cashierId,
        storeId,
        register,
        sessionId,
        payment,
        cashReceived: payment === 'cash' ? received : null,
        change: payment === 'cash' ? round(received - total) : null,
        items,
        subtotal: total,
        discount: 0,
        tax: round((total * TAX) / (100 + TAX)),
        total,
      })
    }
  }
  return sales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

/** Turnos de caja de la última semana a partir de las ventas ligadas a una sesión. */
function generateSeedSessions(sales: Sale[]): CashSession[] {
  const rand = mulberry32(777)
  const groups = new Map<string, Sale[]>()
  for (const s of sales) if (s.sessionId) groups.set(s.sessionId, [...(groups.get(s.sessionId) ?? []), s])
  const now = new Date()
  const sessions: CashSession[] = []
  for (const [id, list] of groups) {
    const [, dStr, regStr] = id.split('-')
    const d = Number(dStr)
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - d)
    const openedAt = new Date(day)
    openedAt.setHours(7, 45)
    const movements: CashMovement[] =
      rand() < 0.5
        ? [{ id: `${id}-m1`, type: 'out', amount: 150 + Math.floor(rand() * 6) * 50, reason: 'Pago a proveedor', date: new Date(openedAt.getTime() + 5 * 3600000).toISOString(), by: list[0].cashierId }]
        : []
    const session: CashSession = {
      id,
      branchId: 's1',
      register: Number(regStr),
      cashierId: list[0].cashierId,
      openedAt: openedAt.toISOString(),
      openingAmount: 1000,
      movements,
      status: d === 0 ? 'open' : 'closed',
    }
    if (d > 0) {
      const cash = list.filter((s) => s.payment === 'cash').reduce((a, s) => a + s.total, 0)
      const out = movements.reduce((a, m) => a + m.amount, 0)
      const expected = round(1000 + cash - out)
      const diff = [0, 0, 0, 0, -10, 5, -2.5, 20][Math.floor(rand() * 8)]
      const closedAt = new Date(day)
      closedAt.setHours(21, 30)
      session.closedAt = closedAt.toISOString()
      session.expectedAmount = expected
      session.countedAmount = round(expected + diff)
      session.notes = diff ? 'Diferencia revisada con el encargado.' : ''
    }
    sessions.push(session)
  }
  return sessions.sort((a, b) => b.openedAt.localeCompare(a.openedAt))
}

// Clientes de confianza con fiado: límite, plazo en días y qué tanto suelen abonar de su saldo
// payEvery: cada cuántos días abona de verdad (Emma abona cada 15 aunque su plazo es de 10 → aparece vencida)
const CREDIT_PROFILE: Record<string, { limit: number; days: number; payRate: number; payEvery?: number }> = {
  c1: { limit: 1500, days: 15, payRate: 0.8 },
  c4: { limit: 1000, days: 10, payRate: 0.45, payEvery: 15 },
  c6: { limit: 3000, days: 30, payRate: 0.15 },
  c8: { limit: 800, days: 7, payRate: 1 },
  c11: { limit: 1200, days: 15, payRate: 0.6 },
}

export const SEED_CUSTOMERS: Customer[] = BASE_CUSTOMERS.map((c) => ({
  ...c,
  creditEnabled: c.id in CREDIT_PROFILE,
  creditLimit: CREDIT_PROFILE[c.id]?.limit ?? 0,
  creditDays: CREDIT_PROFILE[c.id]?.days ?? 15,
  // Cuenta en la tienda en línea para el demo
  password: 'cliente123',
  address: c.id === 'c1' ? 'Calle Roble 12, Col. Centro, CDMX' : c.id === 'c6' ? 'Av. Insurgentes 845, int. 3, Col. Roma' : undefined,
}))

/** Marca como fiadas algunas compras recientes de clientes con crédito y simula sus abonos. */
function applySeedCredit(sales: Sale[]): CreditPayment[] {
  const since = Date.now() - 45 * DAY
  for (const s of sales) {
    if (s.customerId && s.customerId in CREDIT_PROFILE && new Date(s.date).getTime() >= since && s.number % 3 === 0) {
      s.payment = 'credit'
      s.cashReceived = null
      s.change = null
    }
  }
  const payments: CreditPayment[] = []
  let folio = 500
  const now = new Date()
  for (const [customerId, profile] of Object.entries(CREDIT_PROFILE)) {
    const charges = sales.filter((s) => s.customerId === customerId && s.payment === 'credit').sort((a, b) => a.date.localeCompare(b.date))
    let balance = 0
    let ci = 0
    for (let d = 45; d >= 0; d--) {
      const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - d, 23, 59).getTime()
      while (ci < charges.length && new Date(charges[ci].date).getTime() <= dayEnd) {
        balance += charges[ci].total
        charges[ci].creditBalanceAfter = round(balance)
        ci++
      }
      // Abona cada "plazo" días una parte de lo que debe
      if (d > 0 && d % (profile.payEvery ?? profile.days) === 0 && balance > 0) {
        const amount = Math.min(round(balance), Math.max(50, Math.round((balance * profile.payRate) / 10) * 10))
        balance = round(balance - amount)
        const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - d, 18, 30)
        payments.push({ id: `cp-${customerId}-${d}`, folio: ++folio, customerId, amount, method: 'cash', date: date.toISOString(), sessionId: null, register: null, by: 'e1', balanceAfter: balance })
      }
    }
    // Si las compras semilla rebasan el límite, se ajusta el límite para que el demo sea coherente
    const customer = SEED_CUSTOMERS.find((c) => c.id === customerId)
    if (customer && balance > customer.creditLimit) customer.creditLimit = Math.ceil((balance + 100) / 500) * 500
  }
  return payments.sort((a, b) => b.date.localeCompare(a.date))
}

let seedCache: { sales: Sale[]; sessions: CashSession[]; payments: CreditPayment[] } | null = null

/** Ventas y turnos de caja semilla (deterministas y memorizados para que ambos stores coincidan). */
export function seedHistory() {
  if (!seedCache) {
    const sales = generateSeedSales()
    const payments = applySeedCredit(sales)
    seedCache = { sales, sessions: generateSeedSessions(sales), payments }
  }
  return seedCache
}

const isoDay = (offset: number) => {
  const d = new Date(Date.now() + offset * DAY)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const promo = (p: Partial<Promotion> & Pick<Promotion, 'id' | 'name' | 'type'>): Promotion => ({
  productIds: [],
  categoryId: null,
  buyQty: 1,
  payQty: 1,
  giftProductId: null,
  giftQty: 1,
  giftDiscountPct: 100,
  percent: 0,
  bundleQty: 2,
  bundlePrice: 0,
  active: true,
  startDate: isoDay(-7),
  endDate: isoDay(21),
  branchIds: [],
  createdAt: daysAgo(7),
  ...p,
})

export const SEED_PROMOTIONS: Promotion[] = [
  promo({ id: 'pr1', name: '3x2 en botanas Sabritas', type: 'nxm', productIds: ['p52', 'p53'], buyQty: 3, payQty: 2 }),
  promo({ id: 'pr2', name: 'Refrescos 3 por $50', type: 'bundle', productIds: ['p47', 'p48'], bundleQty: 3, bundlePrice: 50, branchIds: ['s1', 's2'] }),
  promo({ id: 'pr3', name: 'Café + Galletas Marías gratis', type: 'gift', productIds: ['p63'], buyQty: 1, giftProductId: 'p54', giftQty: 1, giftDiscountPct: 100 }),
  promo({ id: 'pr4', name: 'Pan Blanco + Mantecadas con 50% de descuento', type: 'gift', productIds: ['p36'], buyQty: 1, giftProductId: 'p38', giftQty: 1, giftDiscountPct: 50 }),
  promo({ id: 'pr5', name: 'Frutas -15%', type: 'percent', categoryId: 'frutas', percent: 15 }),
  promo({ id: 'pr6', name: '2x1 en yogurt', type: 'nxm', productIds: ['p15', 'p16'], buyQty: 2, payQty: 1, startDate: isoDay(3), endDate: isoDay(10) }),
  promo({ id: 'pr7', name: 'Limpieza -10%', type: 'percent', categoryId: 'limpieza', percent: 10, active: false }),
]

export const PLANS: Plan[] = [
  { id: 'basic', name: 'Básico', price: 299, features: ['1 sucursal', '2 cajas', 'Inventario básico', 'Reportes diarios'] },
  { id: 'pro', name: 'Profesional', price: 699, features: ['Hasta 3 sucursales', 'Cajas ilimitadas', 'Analítica avanzada', 'Programa de lealtad', 'Soporte prioritario'] },
  { id: 'enterprise', name: 'Empresarial', price: 1499, features: ['Sucursales ilimitadas', 'Pronóstico de demanda con IA', 'API e integraciones', 'Gerente de cuenta dedicado'] },
]
