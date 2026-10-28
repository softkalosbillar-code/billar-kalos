import type {
  AuditLog,
  BilliardTable,
  Cashier,
  CashierInfo,
  Payment,
  Product,
  Reservation,
  Role,
  Settings,
  Shift,
  Tab,
  TableStatus,
  User,
} from '../lib/types'

/**
 * Contrato de persistencia y caché del POS. Dos implementaciones:
 *  - FirestoreStore (Cloud Firestore con caché en memoria reactiva de <100ms)
 *  - LocalStore  (demo / offline fallback)
 */
export interface Store {
  readonly mode: 'demo' | 'firestore'

  signIn(name: string, role: Role, email?: string): Promise<User>
  signOut(): Promise<void>
  getCurrentUser(): User | null

  // Autenticación de Cajeros y Admin
  listCashiers(): Promise<Cashier[]>
  saveCashier(cashier: Cashier): Promise<void>
  deleteCashier(cashierId: string): Promise<void>
  loginWithCashierCredentials(identifier: string, pin: string): Promise<User>
  requestAdminPasswordReset(email?: string): Promise<void>

  listTables(): Promise<BilliardTable[]>
  listProducts(): Promise<Product[]>
  listTabs(): Promise<Tab[]>
  getSettings(): Promise<Settings>
  getOpenShift(): Promise<Shift | null>
  listAuditLogs(): Promise<AuditLog[]>
  listReservations(): Promise<Reservation[]>
  listShifts(): Promise<Shift[]>

  openRental(tableId: string, settings: Settings, playerEmail?: string): Promise<Tab>
  pauseRental(tabId: string): Promise<void>
  resumeRental(tabId: string): Promise<void>

  addItem(tabId: string, product: Product, qty: number, orderedBy?: string): Promise<void>
  setItemQty(tabId: string, itemId: string, qty: number): Promise<void>
  removeItem(tabId: string, itemId: string): Promise<void>
  setDiscount(tabId: string, amount: number): Promise<void>
  setTip(tabId: string, amount: number): Promise<void>
  transferTable(tabId: string, toTableId: string): Promise<void>

  closeTab(tabId: string, payments: Payment[], cashier?: CashierInfo): Promise<Tab>
  cancelTab(tabId: string, reason?: string): Promise<void>

  setTableStatus(tableId: string, status: TableStatus): Promise<void>
  saveProduct(product: Product): Promise<void>
  deleteProduct(productId: string): Promise<void>
  saveSettings(settings: Settings): Promise<void>

  saveReservation(reservation: Reservation): Promise<void>
  cancelReservation(reservationId: string): Promise<void>

  openShift(openingCash: number, cashier?: CashierInfo, notes?: string): Promise<Shift>
  closeShift(closingCash: number, cashier?: CashierInfo, notes?: string): Promise<Shift>

  /** Suscripción a cambios reactivos (realtime) */
  subscribe(listener: () => void): () => void
}
