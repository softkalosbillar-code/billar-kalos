import type {
  BilliardTable,
  Product,
  Reservation,
  Settings,
} from './types'

export const VENUE_ID = 'kalos'

export function seedTables(): BilliardTable[] {
  const defs: Array<[string, string, number]> = [
    ['Mesa 1', 'Estándar 8ft', 60],
    ['Mesa 2', 'Estándar 8ft', 60],
    ['Mesa 3', 'Estándar 8ft', 60],
    ['Mesa 4', 'Estándar 8ft', 60],
    ['Mesa 5', 'Premium Pool 9ft', 90],
    ['Mesa 6', 'Premium Pool 9ft', 90],
    ['Mesa 7', 'Snooker Oficial', 120],
    ['Mesa 8', 'Carambola 3 Bandas', 80],
  ]
  return defs.map(([name, type, rate], i) => ({
    id: `t${i + 1}`,
    name,
    type,
    ratePerHour: rate,
    status: 'libre',
    activeTabId: null,
  }))
}

export function seedProducts(): Product[] {
  const list: Array<[string, Product['category'], number, string, number | null]> = [
    ['Corona Extra 355ml', 'cerveza', 45, '🍺', 48],
    ['Modelo Especial 355ml', 'cerveza', 50, '🍺', 48],
    ['Negra Modelo', 'cerveza', 52, '🍺', 36],
    ['Victoria 355ml', 'cerveza', 48, '🍺', 40],
    ['Indio', 'cerveza', 46, '🍺', 36],
    ['Heineken 330ml', 'cerveza', 55, '🍺', 24],
    ['Michelada Especial', 'cerveza', 65, '🍺', null],
    ['Coca-Cola Original 355ml', 'refresco', 25, '🥤', 60],
    ['Coca-Cola Sin Azúcar', 'refresco', 25, '🥤', 40],
    ['Sprite 355ml', 'refresco', 25, '🥤', 30],
    ['Jarrito Mandarina', 'refresco', 30, '🥤', 24],
    ['Agua Ciel 600ml', 'refresco', 20, '💧', 80],
    ['Topo Chico Mineral', 'refresco', 35, '🥤', 36],
    ['Papas Fritas con Salsa', 'botana', 35, '🍟', 30],
    ['Cacahuates Enchilados', 'botana', 30, '🥜', 30],
    ['Nachos con Queso y Jalapeño', 'botana', 65, '🧀', null],
    ['Alitas BBQ (6 pzas)', 'botana', 95, '🍗', null],
    ['Palomitas Mantequilla', 'botana', 40, '🍿', null],
  ]
  return list.map(([name, category, price, emoji, stock], i) => ({
    id: `p${i + 1}`,
    name,
    category,
    price,
    taxRate: 0.16,
    emoji,
    stock,
    active: true,
  }))
}

export function seedSettings(): Settings {
  return {
    venueName: 'Kalos Billar Club',
    currency: 'MXN',
    taxName: 'IVA',
    defaultTaxRate: 0.16,
    minimumMinutes: 30,
    rounding: 'cuarto_hora',
    tipEnabled: true,
  }
}

export function seedReservations(): Reservation[] {
  const today = new Date().toISOString().slice(0, 10)
  return [
    {
      id: 'res-1',
      customerName: 'Carlos Mendoza',
      customerPhone: '55 1234 5678',
      tableId: 't5',
      tableName: 'Mesa 5',
      date: today,
      timeSlot: '20:00',
      durationMinutes: 120,
      playersCount: 4,
      deposit: 100,
      status: 'confirmada',
      notes: 'Torneo entre amigos, apartar mesa 5',
      createdAt: Date.now() - 3600000,
    },
    {
      id: 'res-2',
      customerName: 'Alejandra Ríos',
      customerPhone: '55 9876 5432',
      tableId: 't7',
      tableName: 'Mesa 7',
      date: today,
      timeSlot: '21:30',
      durationMinutes: 90,
      playersCount: 2,
      deposit: 150,
      status: 'confirmada',
      notes: 'Mesa Snooker',
      createdAt: Date.now() - 7200000,
    },
  ]
}
