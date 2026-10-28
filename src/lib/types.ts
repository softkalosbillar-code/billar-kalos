// ===== Tipos del dominio (Kalos Billar Club POS) =====

export type Role = 'admin' | 'cajero' | 'jugador'

export interface User {
  uid: string
  name: string
  role: Role
  email?: string
}

// ----- Cajeros gestionados por Administrador -----
export interface Cashier {
  id: string
  name: string
  username: string
  pin: string // PIN de 4 a 6 dígitos o clave segura
  email?: string
  active: boolean
  createdAt: number
  createdBy: string
  notes?: string
}

// ----- Mesas -----
export type TableStatus =
  | 'libre'
  | 'ocupada'
  | 'pausada'
  | 'por_cobrar'
  | 'limpieza'
  | 'mantenimiento'

export interface BilliardTable {
  id: string
  name: string
  type: string
  ratePerHour: number
  status: TableStatus
  activeTabId: string | null
}

// ----- Productos -----
export type ProductCategory = 'cerveza' | 'refresco' | 'botana' | 'otro'

export interface Product {
  id: string
  name: string
  category: ProductCategory
  price: number
  taxRate: number
  emoji: string
  stock: number | null
  active: boolean
}

// ----- Configuración / tarifas -----
export type RoundingMode = 'exacto' | 'minuto' | 'cuarto_hora' | 'hora'

export interface Settings {
  venueName: string
  currency: string
  taxName: string
  defaultTaxRate: number
  minimumMinutes: number
  rounding: RoundingMode
  tipEnabled: boolean
}

// ----- Renta por tiempo -----
export interface RentalPause {
  pausedAt: number
  resumedAt?: number
}

export interface Rental {
  startedAt: number
  endedAt?: number
  pauses: RentalPause[]
  ratePerHour: number
  minimumMinutes: number
  rounding: RoundingMode
  taxRate: number
}

// ----- Cuenta de mesa (tab) -----
export type PaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia' | 'otro'

export interface TabItem {
  id: string
  productId: string
  name: string
  emoji: string
  qty: number
  unitPrice: number
  taxRate: number
  addedAt?: number
  orderedBy?: string // 'caja' | 'Mesa (Cliente)' | string
}

export interface CashierInfo {
  id: string
  name: string
  username: string
}

export interface Payment {
  id: string
  method: PaymentMethod
  amount: number
  at: number
  cashierId?: string
  cashierName?: string
  cashierUsername?: string
}

export interface TabTotals {
  rentalCharge: number
  productsSubtotal: number
  subtotal: number
  tax: number
  discount: number
  tip: number
  total: number
}

export type TabStatus = 'abierta' | 'por_cobrar' | 'cerrada' | 'anulada'

export interface Tab {
  id: string
  venueId: string
  tableId: string
  tableName: string
  status: TabStatus
  openedAt: number
  closedAt?: number
  rental: Rental | null
  items: TabItem[]
  discount: number
  tip: number
  payments: Payment[]
  totals?: TabTotals
  customerNote?: string
  assignedPlayerEmail?: string
  // Cajero registrado que cerró la cuenta y cobró
  closedByCashierId?: string
  closedByCashierName?: string
  closedByCashierUsername?: string
}

// ----- Caja / turno -----
export interface Shift {
  id: string
  openedAt: number
  closedAt?: number
  openingCash: number
  closingCash?: number
  openedBy?: string
  closedBy?: string
  // Cajero registrado por el Administrador
  cashierId?: string
  cashierName?: string
  cashierUsername?: string
  closedByCashierId?: string
  closedByCashierName?: string
  closedByCashierUsername?: string
  expectedCash?: number
  difference?: number
  totalSales?: number
  ticketsCount?: number
  notes?: string
}

// ----- Auditoría de eventos -----
export type AuditAction =
  | 'open_rental'
  | 'pause_rental'
  | 'resume_rental'
  | 'stop_rental'
  | 'close_tab'
  | 'cancel_tab'
  | 'add_item'
  | 'remove_item'
  | 'transfer_table'
  | 'set_discount'
  | 'set_tip'
  | 'set_table_status'
  | 'save_product'
  | 'delete_product'
  | 'save_settings'
  | 'open_shift'
  | 'close_shift'
  | 'create_reservation'
  | 'cancel_reservation'
  | 'create_cashier'
  | 'update_cashier'
  | 'delete_cashier'
  | 'password_reset'

export interface AuditLog {
  id: string
  timestamp: number
  action: AuditAction
  tableId?: string | null
  tableName?: string | null
  userId: string
  userName: string
  userRole: string
  details: string
  metadata?: Record<string, unknown>
}

// ----- Reservas -----
export type ReservationStatus = 'confirmada' | 'completada' | 'cancelada'

export interface PreorderItem {
  productId: string
  name: string
  emoji: string
  qty: number
  unitPrice: number
}

export interface Reservation {
  id: string
  customerName: string
  customerPhone: string
  tableId: string
  tableName: string
  date: string // YYYY-MM-DD
  timeSlot: string // HH:MM
  durationMinutes: number
  playersCount: number
  deposit: number
  status: ReservationStatus
  notes?: string
  createdAt: number
  userId?: string
  userEmail?: string
  preorderItems?: PreorderItem[]
}

// ----- Notificaciones en tiempo real / Push -----
export type NotificationType =
  | 'order'
  | 'time_warning'
  | 'reservation'
  | 'call_waiter'
  | 'close_tab'
  | 'payment'

export interface StaffNotification {
  id: string
  title: string
  body: string
  type: NotificationType
  tableId?: string
  tableName?: string
  amount?: number
  cashierName?: string
  paymentMethod?: string
  createdAt: number
  read: boolean
}

