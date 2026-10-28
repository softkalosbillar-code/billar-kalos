import { computeTotals } from '../lib/billing'
import {
  VENUE_ID,
  seedProducts,
  seedSettings,
  seedTables,
  seedReservations,
} from '../lib/seed'
import type {
  AuditAction,
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
import type { Store } from './store'
import { ADMIN_EMAIL } from '../lib/firebase'
import { dispatchStaffAlert } from '../lib/notifications'

const KEY = 'kalos-pos-state-v3'

interface Persisted {
  tables: BilliardTable[]
  products: Product[]
  tabs: Tab[]
  settings: Settings
  shift: Shift | null
  pastShifts?: Shift[]
  auditLogs: AuditLog[]
  reservations: Reservation[]
  cashiers: Cashier[]
}

function uid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function emptyState(): Persisted {
  const defaultCashier: Cashier = {
    id: 'caj-1',
    name: 'Cajero Principal',
    username: 'cajero1',
    pin: '1234',
    email: 'cajero1@kalosbillar.com',
    active: true,
    createdAt: Date.now(),
    createdBy: 'Administrador',
    notes: 'Turno de tarde',
  }

  return {
    tables: seedTables(),
    products: seedProducts(),
    tabs: [],
    settings: seedSettings(),
    shift: null,
    auditLogs: [],
    reservations: seedReservations(),
    cashiers: [defaultCashier],
  }
}

export class LocalStore implements Store {
  readonly mode = 'demo' as const
  private state: Persisted
  private listeners = new Set<() => void>()
  private currentUser: User | null = null

  constructor() {
    this.state = this.load()
  }

  private load(): Persisted {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Persisted
        if (!parsed.auditLogs) parsed.auditLogs = []
        if (!parsed.reservations) parsed.reservations = seedReservations()
        if (!parsed.cashiers) parsed.cashiers = emptyState().cashiers
        return parsed
      }
    } catch {
      /* ignore corrupt state */
    }
    return emptyState()
  }

  private save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.state))
    } catch {
      /* quota exceeded / private mode */
    }
    this.notify()
  }

  private notify() {
    this.listeners.forEach((l) => l())
  }

  private logAudit(
    action: AuditAction,
    details: string,
    tableId?: string | null,
    tableName?: string | null,
    metadata?: Record<string, unknown>
  ) {
    const entry: AuditLog = {
      id: uid(),
      timestamp: Date.now(),
      action,
      tableId: tableId ?? null,
      tableName: tableName ?? null,
      userId: this.currentUser?.uid || 'local-op',
      userName: this.currentUser?.name || 'Operador',
      userRole: this.currentUser?.role || 'cajero',
      details,
      metadata,
    }
    this.state.auditLogs = [entry, ...this.state.auditLogs.slice(0, 199)]
    this.save()
  }

  getCurrentUser(): User | null {
    return this.currentUser
  }

  async signIn(name: string, role: Role, email?: string): Promise<User> {
    let finalRole: Role = role
    if (email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      finalRole = 'admin'
    }

    const u: User = { uid: `u-${Date.now()}`, name, role: finalRole, email }
    this.currentUser = u
    this.logAudit('open_shift', `Sesión local iniciada: ${name} (${finalRole})`)
    return u
  }

  async signOut(): Promise<void> {
    if (this.currentUser) {
      this.logAudit('close_shift', `Sesión local cerrada: ${this.currentUser.name}`)
    }
    this.currentUser = null
  }

  async loginWithCashierCredentials(identifier: string, pin: string): Promise<User> {
    const cleanId = identifier.trim().toLowerCase()
    const cleanPin = pin.trim()

    const cashier = this.state.cashiers.find(
      (c) =>
        (c.username.toLowerCase() === cleanId || (c.email && c.email.toLowerCase() === cleanId)) &&
        c.pin === cleanPin
    )

    if (!cashier) {
      throw new Error('Credenciales o PIN de cajero incorrectos')
    }
    if (!cashier.active) {
      throw new Error('Esta cuenta de cajero se encuentra desactivada por el administrador')
    }

    return this.signIn(cashier.name, 'cajero', cashier.email)
  }

  async requestAdminPasswordReset(email = ADMIN_EMAIL): Promise<void> {
    this.logAudit('password_reset', `Solicitud de restablecimiento de contraseña para ${email}`)
  }

  async listCashiers(): Promise<Cashier[]> {
    return this.state.cashiers
  }

  async saveCashier(cashier: Cashier): Promise<void> {
    const idx = this.state.cashiers.findIndex((c) => c.id === cashier.id)
    if (idx >= 0) {
      this.state.cashiers[idx] = cashier
    } else {
      this.state.cashiers.push(cashier)
    }
    this.logAudit(
      idx >= 0 ? 'update_cashier' : 'create_cashier',
      `Cajero ${cashier.name} (@${cashier.username}) ${idx >= 0 ? 'actualizado' : 'creado'}`
    )
    this.save()
  }

  async deleteCashier(cashierId: string): Promise<void> {
    const c = this.state.cashiers.find((x) => x.id === cashierId)
    this.state.cashiers = this.state.cashiers.filter((x) => x.id !== cashierId)
    if (c) {
      this.logAudit('delete_cashier', `Cajero eliminado: ${c.name} (@${c.username})`)
    }
    this.save()
  }

  async listTables(): Promise<BilliardTable[]> {
    return this.state.tables
  }
  async listProducts(): Promise<Product[]> {
    return this.state.products
  }
  async listTabs(): Promise<Tab[]> {
    return this.state.tabs
  }
  async getSettings(): Promise<Settings> {
    return this.state.settings
  }
  async getOpenShift(): Promise<Shift | null> {
    return this.state.shift && !this.state.shift.closedAt ? this.state.shift : null
  }
  async listAuditLogs(): Promise<AuditLog[]> {
    return this.state.auditLogs
  }
  async listReservations(): Promise<Reservation[]> {
    return this.state.reservations
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  async openRental(tableId: string, settings: Settings, playerEmail?: string): Promise<Tab> {
    const table = this.state.tables.find((t) => t.id === tableId)
    if (!table || table.status !== 'libre') {
      throw new Error('La mesa no está libre para rentar')
    }
    const now = Date.now()
    const tab: Tab = {
      id: uid(),
      venueId: VENUE_ID,
      tableId,
      tableName: table.name,
      status: 'abierta',
      openedAt: now,
      rental: {
        startedAt: now,
        pauses: [],
        ratePerHour: table.ratePerHour,
        minimumMinutes: settings.minimumMinutes,
        rounding: settings.rounding,
        taxRate: settings.defaultTaxRate,
      },
      items: [],
      discount: 0,
      tip: 0,
      payments: [],
      assignedPlayerEmail: playerEmail,
    }
    table.status = 'ocupada'
    table.activeTabId = tab.id
    this.state.tabs.push(tab)
    this.logAudit('open_rental', `Apertura de renta en ${table.name}${playerEmail ? ` (${playerEmail})` : ''}`, tableId, table.name)
    this.save()
    return tab
  }

  async pauseRental(tabId: string): Promise<void> {
    const tab = this.state.tabs.find((t) => t.id === tabId)
    if (!tab || !tab.rental) return
    const last = tab.rental.pauses[tab.rental.pauses.length - 1]
    if (last && !last.resumedAt) return
    tab.rental.pauses.push({ pausedAt: Date.now() })
    const table = this.state.tables.find((t) => t.id === tab.tableId)
    if (table) table.status = 'pausada'
    this.logAudit('pause_rental', `Pausa en ${tab.tableName}`, tab.tableId, tab.tableName)
    this.save()
  }

  async resumeRental(tabId: string): Promise<void> {
    const tab = this.state.tabs.find((t) => t.id === tabId)
    if (!tab || !tab.rental || tab.rental.pauses.length === 0) return
    const last = tab.rental.pauses[tab.rental.pauses.length - 1]
    if (!last || last.resumedAt) return
    last.resumedAt = Date.now()
    const table = this.state.tables.find((t) => t.id === tab.tableId)
    if (table) table.status = 'ocupada'
    this.logAudit('resume_rental', `Reanudación de tiempo en ${tab.tableName}`, tab.tableId, tab.tableName)
    this.save()
  }

  async transferTable(tabId: string, toTableId: string): Promise<void> {
    const tab = this.state.tabs.find((t) => t.id === tabId)
    const target = this.state.tables.find((t) => t.id === toTableId)
    if (!tab || !target || target.status !== 'libre') {
      throw new Error('Mesa destino no disponible')
    }
    const oldTable = this.state.tables.find((t) => t.id === tab.tableId)
    if (oldTable) {
      oldTable.status = 'limpieza'
      oldTable.activeTabId = null
    }
    tab.tableId = target.id
    tab.tableName = target.name
    target.status = 'ocupada'
    target.activeTabId = tab.id
    this.logAudit('transfer_table', `Mesa transferida a ${target.name}`, target.id, target.name)
    this.save()
  }

  async addItem(tabId: string, product: Product, qty: number, orderedBy = 'caja'): Promise<void> {
    const tab = this.state.tabs.find((t) => t.id === tabId)
    if (!tab) return
    const existing = tab.items.find((i) => i.productId === product.id)
    if (existing) {
      existing.qty += qty
    } else {
      tab.items.push({
        id: uid(),
        productId: product.id,
        name: product.name,
        emoji: product.emoji,
        qty,
        unitPrice: product.price,
        taxRate: product.taxRate,
        addedAt: Date.now(),
        orderedBy,
      })
    }

    if (orderedBy && (orderedBy.includes('Cliente') || orderedBy.includes('Mesa'))) {
      dispatchStaffAlert(
        `¡Nuevo Pedido en ${tab.tableName}!`,
        `${qty}x ${product.name}`,
        'order',
        tab.tableId,
        tab.tableName
      )
    }

    this.logAudit('add_item', `+${qty} ${product.name} en ${tab.tableName} (${orderedBy})`, tab.tableId, tab.tableName)
    this.save()
  }

  async setItemQty(tabId: string, itemId: string, qty: number): Promise<void> {
    const tab = this.state.tabs.find((t) => t.id === tabId)
    if (!tab) return
    if (qty <= 0) {
      tab.items = tab.items.filter((i) => i.id !== itemId)
    } else {
      const it = tab.items.find((i) => i.id === itemId)
      if (it) it.qty = qty
    }
    this.save()
  }

  async removeItem(tabId: string, itemId: string): Promise<void> {
    const tab = this.state.tabs.find((t) => t.id === tabId)
    if (!tab) return
    tab.items = tab.items.filter((i) => i.id !== itemId)
    this.save()
  }

  async setDiscount(tabId: string, amount: number): Promise<void> {
    const tab = this.state.tabs.find((t) => t.id === tabId)
    if (!tab) return
    tab.discount = Math.max(0, amount)
    this.logAudit('set_discount', `Descuento $${amount} en ${tab.tableName}`, tab.tableId, tab.tableName)
    this.save()
  }

  async setTip(tabId: string, amount: number): Promise<void> {
    const tab = this.state.tabs.find((t) => t.id === tabId)
    if (!tab) return
    tab.tip = Math.max(0, amount)
    this.save()
  }

  async listShifts(): Promise<Shift[]> {
    const list: Shift[] = []
    if (this.state.shift) list.push(this.state.shift)
    if (this.state.pastShifts) list.push(...this.state.pastShifts)
    return list.sort((a, b) => b.openedAt - a.openedAt)
  }

  async closeTab(tabId: string, payments: Payment[], cashier?: CashierInfo): Promise<Tab> {
    const tab = this.state.tabs.find((t) => t.id === tabId)
    if (!tab) throw new Error('Cuenta no encontrada')
    const now = Date.now()
    if (tab.rental && !tab.rental.endedAt) tab.rental.endedAt = now
    tab.status = 'cerrada'
    tab.closedAt = now

    let resolvedCashier: CashierInfo | undefined = cashier
    if (!resolvedCashier) {
      const found = this.state.cashiers.find(
        (c) =>
          c.username.toLowerCase() === this.currentUser?.name?.toLowerCase() ||
          c.name.toLowerCase() === this.currentUser?.name?.toLowerCase()
      )
      if (found) {
        resolvedCashier = { id: found.id, name: found.name, username: found.username }
      } else if (this.currentUser) {
        resolvedCashier = {
          id: this.currentUser.uid,
          name: this.currentUser.name,
          username: this.currentUser.email ? this.currentUser.email.split('@')[0] : 'cajero',
        }
      }
    }

    if (resolvedCashier) {
      tab.closedByCashierId = resolvedCashier.id
      tab.closedByCashierName = resolvedCashier.name
      tab.closedByCashierUsername = resolvedCashier.username
    }

    const stampedPayments = payments.map((p) => ({
      ...p,
      cashierId: p.cashierId || resolvedCashier?.id,
      cashierName: p.cashierName || resolvedCashier?.name,
      cashierUsername: p.cashierUsername || resolvedCashier?.username,
    }))
    tab.payments = stampedPayments
    tab.totals = computeTotals(tab, now)

    const table = this.state.tables.find((t) => t.id === tab.tableId)
    if (table) {
      table.status = 'limpieza'
      table.activeTabId = null
    }
    this.logAudit(
      'close_tab',
      `Cobro cerrado en ${tab.tableName} por cajero ${tab.closedByCashierName || 'Caja'}: Total $${tab.totals?.total}`,
      tab.tableId,
      tab.tableName,
      {
        tabId,
        total: tab.totals?.total,
        cashierId: tab.closedByCashierId,
        cashierName: tab.closedByCashierName,
        cashierUsername: tab.closedByCashierUsername,
      }
    )

    // Notificación en vivo de Cierre de Mesa y Cierre de Pago
    dispatchStaffAlert(
      `Cierre de Mesa: ${tab.tableName}`,
      `Cuenta finalizada por $${tab.totals?.total || 0} liquidada por ${tab.closedByCashierName || 'Caja'}`,
      'close_tab',
      tab.tableId,
      tab.tableName,
      {
        amount: tab.totals?.total,
        cashierName: tab.closedByCashierName,
      }
    )

    if (stampedPayments.length > 0) {
      const summaryMethods = stampedPayments.map((p) => `$${p.amount} (${p.method})`).join(', ')
      dispatchStaffAlert(
        `Cierre de Pago: ${tab.tableName}`,
        `Pago recibido: ${summaryMethods} — Cajero: ${tab.closedByCashierName || 'Caja'}`,
        'payment',
        tab.tableId,
        tab.tableName,
        {
          amount: tab.totals?.total,
          cashierName: tab.closedByCashierName,
          paymentMethod: stampedPayments[0]?.method,
        }
      )
    }

    this.save()
    return tab
  }

  async cancelTab(tabId: string, reason?: string): Promise<void> {
    const tab = this.state.tabs.find((t) => t.id === tabId)
    if (!tab) return
    tab.status = 'anulada'
    tab.closedAt = Date.now()
    const table = this.state.tables.find((t) => t.id === tab.tableId)
    if (table) {
      table.status = 'libre'
      table.activeTabId = null
    }
    this.logAudit('cancel_tab', `Cuenta anulada en ${tab.tableName}${reason ? `: ${reason}` : ''}`, tab.tableId, tab.tableName)
    this.save()
  }

  async setTableStatus(tableId: string, status: TableStatus): Promise<void> {
    const table = this.state.tables.find((t) => t.id === tableId)
    if (!table) return
    table.status = status
    this.logAudit('set_table_status', `Estado de ${table.name} cambiado a '${status}'`, tableId, table.name)
    this.save()
  }

  async saveProduct(product: Product): Promise<void> {
    const idx = this.state.products.findIndex((p) => p.id === product.id)
    if (idx >= 0) this.state.products[idx] = product
    else this.state.products.push(product)
    this.logAudit('save_product', `Producto guardado: ${product.name} ($${product.price})`)
    this.save()
  }

  async deleteProduct(productId: string): Promise<void> {
    const p = this.state.products.find((x) => x.id === productId)
    this.state.products = this.state.products.filter((x) => x.id !== productId)
    if (p) {
      this.logAudit('delete_product', `Producto eliminado del catálogo: ${p.name}`)
    }
    this.save()
  }

  async saveSettings(settings: Settings): Promise<void> {
    this.state.settings = settings
    this.logAudit('save_settings', 'Configuración de facturación guardada')
    this.save()
  }

  async saveReservation(reservation: Reservation): Promise<void> {
    const idx = this.state.reservations.findIndex((r) => r.id === reservation.id)
    if (idx >= 0) this.state.reservations[idx] = reservation
    else {
      this.state.reservations.unshift(reservation)
      dispatchStaffAlert(
        `Nueva Reserva: ${reservation.tableName}`,
        `${reservation.customerName} - ${reservation.date} ${reservation.timeSlot}`,
        'reservation',
        reservation.tableId,
        reservation.tableName
      )
    }
    this.logAudit('create_reservation', `Reserva registrada: ${reservation.customerName} en ${reservation.tableName}`)
    this.save()
  }

  async cancelReservation(reservationId: string): Promise<void> {
    const r = this.state.reservations.find((res) => res.id === reservationId)
    if (r) {
      r.status = 'cancelada'
      this.logAudit('cancel_reservation', `Reserva cancelada: ${r.customerName}`)
      this.save()
    }
  }

  async openShift(openingCash: number, cashier?: CashierInfo, notes?: string): Promise<Shift> {
    let resolvedCashier: CashierInfo | undefined = cashier
    if (!resolvedCashier) {
      const found = this.state.cashiers.find(
        (c) =>
          c.username.toLowerCase() === this.currentUser?.name?.toLowerCase() ||
          c.name.toLowerCase() === this.currentUser?.name?.toLowerCase()
      )
      if (found) {
        resolvedCashier = { id: found.id, name: found.name, username: found.username }
      } else if (this.currentUser) {
        resolvedCashier = {
          id: this.currentUser.uid,
          name: this.currentUser.name,
          username: this.currentUser.email ? this.currentUser.email.split('@')[0] : 'admin',
        }
      }
    }

    const s: Shift = {
      id: uid(),
      openedAt: Date.now(),
      openingCash,
      openedBy: resolvedCashier?.name || this.currentUser?.name || 'Cajero',
      cashierId: resolvedCashier?.id,
      cashierName: resolvedCashier?.name,
      cashierUsername: resolvedCashier?.username,
      notes,
    }
    this.state.shift = s
    this.logAudit('open_shift', `Turno de caja abierto por ${s.cashierName || s.openedBy} con fondo de $${openingCash}`)
    this.save()
    return s
  }

  async closeShift(closingCash: number, cashier?: CashierInfo, notes?: string): Promise<Shift> {
    if (!this.state.shift) throw new Error('No hay turno abierto')
    const open = this.state.shift

    let resolvedCashier: CashierInfo | undefined = cashier
    if (!resolvedCashier) {
      const found = this.state.cashiers.find(
        (c) =>
          c.username.toLowerCase() === this.currentUser?.name?.toLowerCase() ||
          c.name.toLowerCase() === this.currentUser?.name?.toLowerCase()
      )
      if (found) {
        resolvedCashier = { id: found.id, name: found.name, username: found.username }
      } else if (this.currentUser) {
        resolvedCashier = {
          id: this.currentUser.uid,
          name: this.currentUser.name,
          username: this.currentUser.email ? this.currentUser.email.split('@')[0] : 'admin',
        }
      }
    }

    const now = Date.now()
    const shiftTabs = this.state.tabs.filter(
      (t) => t.status === 'cerrada' && (t.closedAt ?? 0) >= open.openedAt && (t.closedAt ?? 0) <= now
    )
    const cashSales = shiftTabs.reduce((sum, t) => {
      const cashPayments = t.payments.filter((p) => p.method === 'efectivo')
      return sum + cashPayments.reduce((s, p) => s + p.amount, 0)
    }, 0)
    const totalSales = shiftTabs.reduce((sum, t) => sum + (t.totals?.total ?? 0), 0)
    const expectedCash = open.openingCash + cashSales
    const difference = closingCash - expectedCash

    open.closedAt = now
    open.closingCash = closingCash
    open.closedBy = resolvedCashier?.name || this.currentUser?.name || 'Cajero'
    open.closedByCashierId = resolvedCashier?.id
    open.closedByCashierName = resolvedCashier?.name
    open.closedByCashierUsername = resolvedCashier?.username
    open.expectedCash = expectedCash
    open.difference = difference
    open.totalSales = totalSales
    open.ticketsCount = shiftTabs.length
    if (notes) open.notes = notes

    if (!this.state.pastShifts) this.state.pastShifts = []
    this.state.pastShifts.unshift({ ...open })
    const closed = { ...open }
    this.state.shift = null

    this.logAudit(
      'close_shift',
      `Turno de caja cerrado por ${closed.closedBy}: Arqueo $${closingCash}, Esperado $${expectedCash}, Dif: $${difference}`
    )
    this.save()
    return closed
  }
}
