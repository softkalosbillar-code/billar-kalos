import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  writeBatch,
  deleteDoc,
  orderBy,
  limit,
} from 'firebase/firestore'
import { signInAnonymously } from 'firebase/auth'
import {
  getAuthInstance,
  getDb,
  signInWithGoogle,
  sendAdminPasswordReset,
  handleFirestoreError,
  OperationType,
  ADMIN_EMAIL,
} from '../lib/firebase'
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
import { dispatchStaffAlert } from '../lib/notifications'

function uid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Implementación de Firestore optimizada con:
 * - Caché reactivo en memoria (<100ms de latencia)
 * - Autenticación con Google para Administrador (softkalosbillar@gmail.com) y Jugadores
 * - Gestión y autenticación por credenciales para Cajeros (creados por Admin)
 * - Alertas y notificaciones push en tiempo real para pedidos de mesa y tiempos
 * - Bitácora de auditoría inmutable
 */
export class FirestoreStore implements Store {
  readonly mode = 'firestore' as const
  private db = getDb()
  private unsubs: Array<() => void> = []
  private currentUser: User | null = null
  private listeners: Set<() => void> = new Set()

  // Caché en memoria para latencia sub-100ms
  private cachedTables: BilliardTable[] = []
  private cachedProducts: Product[] = []
  private cachedTabs: Tab[] = []
  private cachedSettings: Settings = seedSettings()
  private cachedShifts: Shift[] = []
  private cachedAuditLogs: AuditLog[] = []
  private cachedReservations: Reservation[] = []
  private cachedCashiers: Cashier[] = []
  private initialized = false

  constructor() {
    this.initRealtimeListeners()
  }

  private col(name: string) {
    return collection(this.db, 'venues', VENUE_ID, name)
  }

  getCurrentUser(): User | null {
    return this.currentUser
  }

  private notify() {
    this.listeners.forEach((l) => {
      try {
        l()
      } catch (err) {
        console.error('Error in store listener:', err)
      }
    })
  }

  /**
   * Inicializa escuchas en tiempo real con persistencia en caché local
   */
  private initRealtimeListeners() {
    try {
      // 1. Tables listener
      const unsubTables = onSnapshot(
        this.col('tables'),
        (snap) => {
          if (snap.empty && !this.initialized) {
            this.seedInitialData()
            return
          }
          this.cachedTables = snap.docs.map((d) => ({ ...d.data(), id: d.id } as BilliardTable))
          this.notify()
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'tables')
      )
      this.unsubs.push(unsubTables)

      // 2. Products listener
      const unsubProducts = onSnapshot(
        this.col('products'),
        (snap) => {
          if (!snap.empty) {
            this.cachedProducts = snap.docs.map((d) => ({ ...d.data(), id: d.id } as Product))
            this.notify()
          }
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'products')
      )
      this.unsubs.push(unsubProducts)

      // 3. Tabs listener with order alert detection
      let initialTabsLoaded = false
      const unsubTabs = onSnapshot(
        this.col('tabs'),
        (snap) => {
          const newTabs = snap.docs.map((d) => ({ ...d.data(), id: d.id } as Tab))
          
          // Si una mesa tiene un pedido nuevo realizado desde la mesa cliente, emitir alerta
          if (initialTabsLoaded) {
            newTabs.forEach((nt) => {
              const oldT = this.cachedTabs.find((ot) => ot.id === nt.id)
              if (oldT && nt.items.length > oldT.items.length) {
                const latestItem = nt.items[nt.items.length - 1]
                if (latestItem && latestItem.orderedBy?.includes('Cliente')) {
                  dispatchStaffAlert(
                    `¡Nuevo Pedido en ${nt.tableName}!`,
                    `${latestItem.qty}x ${latestItem.name}`,
                    'order',
                    nt.tableId,
                    nt.tableName
                  )
                }
              }
            })
          }

          initialTabsLoaded = true
          this.cachedTabs = newTabs
          this.notify()
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'tabs')
      )
      this.unsubs.push(unsubTabs)

      // 4. Settings listener
      const unsubSettings = onSnapshot(
        doc(this.db, 'venues', VENUE_ID, 'settings', 'main'),
        (snap) => {
          if (snap.exists()) {
            this.cachedSettings = snap.data() as Settings
            this.notify()
          }
        },
        (err) => handleFirestoreError(err, OperationType.GET, 'settings/main')
      )
      this.unsubs.push(unsubSettings)

      // 5. Shifts listener
      const unsubShifts = onSnapshot(
        this.col('shifts'),
        (snap) => {
          this.cachedShifts = snap.docs.map((d) => ({ ...d.data(), id: d.id } as Shift))
          this.notify()
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'shifts')
      )
      this.unsubs.push(unsubShifts)

      // 6. Audit logs listener
      const qLogs = query(this.col('audit_logs'), orderBy('timestamp', 'desc'), limit(200))
      const unsubLogs = onSnapshot(
        qLogs,
        (snap) => {
          this.cachedAuditLogs = snap.docs.map((d) => ({ ...d.data(), id: d.id } as AuditLog))
          this.notify()
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'audit_logs')
      )
      this.unsubs.push(unsubLogs)

      // 7. Reservations listener
      const unsubReservations = onSnapshot(
        this.col('reservations'),
        (snap) => {
          this.cachedReservations = snap.docs.map((d) => ({ ...d.data(), id: d.id } as Reservation))
          this.notify()
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'reservations')
      )
      this.unsubs.push(unsubReservations)

      // 8. Cashiers listener (managed exclusively by Admin)
      const unsubCashiers = onSnapshot(
        this.col('cashiers'),
        (snap) => {
          this.cachedCashiers = snap.docs.map((d) => ({ ...d.data(), id: d.id } as Cashier))
          this.notify()
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'cashiers')
      )
      this.unsubs.push(unsubCashiers)

      this.initialized = true
    } catch (e) {
      console.warn('Realtime listeners initialization fallback:', e)
    }
  }

  private async seedInitialData() {
    try {
      const batch = writeBatch(this.db)
      const tables = seedTables()
      for (const t of tables) {
        batch.set(doc(this.db, 'venues', VENUE_ID, 'tables', t.id), t)
      }
      const products = seedProducts()
      for (const p of products) {
        batch.set(doc(this.db, 'venues', VENUE_ID, 'products', p.id), p)
      }
      batch.set(doc(this.db, 'venues', VENUE_ID, 'settings', 'main'), seedSettings())
      const reservations = seedReservations()
      for (const r of reservations) {
        batch.set(doc(this.db, 'venues', VENUE_ID, 'reservations', r.id), r)
      }
      // Seed default demo cashier if empty
      const defaultCashier: Cashier = {
        id: 'caj-1',
        name: 'Cajero Principal',
        username: 'cajero1',
        pin: '1234',
        email: 'cajero1@kalosbillar.com',
        active: true,
        createdAt: Date.now(),
        createdBy: 'Admin Inicial',
        notes: 'Turno Vespertino',
      }
      batch.set(doc(this.db, 'venues', VENUE_ID, 'cashiers', defaultCashier.id), defaultCashier)
      await batch.commit()
    } catch (e) {
      console.error('Error auto-seeding Firestore:', e)
    }
  }

  private async logAudit(
    action: AuditAction,
    details: string,
    tableId?: string | null,
    tableName?: string | null,
    metadata?: Record<string, unknown>
  ) {
    try {
      const logId = uid()
      const logEntry: AuditLog = {
        id: logId,
        timestamp: Date.now(),
        action,
        tableId: tableId ?? null,
        tableName: tableName ?? null,
        userId: this.currentUser?.uid || 'anon',
        userName: this.currentUser?.name || 'Operador',
        userRole: this.currentUser?.role || 'cajero',
        details,
        metadata,
      }
      this.cachedAuditLogs = [logEntry, ...this.cachedAuditLogs]
      this.notify()
      await setDoc(doc(this.db, 'venues', VENUE_ID, 'audit_logs', logId), logEntry)
    } catch (e) {
      console.warn('Could not record audit log:', e)
    }
  }

  // ----- Autenticación de Administrador, Cajeros y Jugadores -----
  async signIn(name: string, role: Role, email?: string): Promise<User> {
    try {
      const auth = getAuthInstance()
      let userId: string
      let userEmail = email

      // Si el email es el del administrador, forzamos rol admin
      let finalRole: Role = role
      if (email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        finalRole = 'admin'
      }

      if (!auth.currentUser) {
        const cred = await signInAnonymously(auth)
        userId = cred.user.uid
      } else {
        userId = auth.currentUser.uid
        userEmail = auth.currentUser.email || email
      }

      const userData: User = {
        uid: userId,
        name,
        role: finalRole,
        email: userEmail,
      }

      await setDoc(doc(this.db, 'venues', VENUE_ID, 'users', userId), {
        ...userData,
        updatedAt: new Date().toISOString(),
      })

      this.currentUser = userData
      this.logAudit('open_shift', `Sesión iniciada como ${finalRole}: ${name}`, null, null, {
        uid: userId,
        role: finalRole,
        email: userEmail,
      })
      return userData
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'users')
      throw error
    }
  }

  async signOut(): Promise<void> {
    try {
      const auth = getAuthInstance()
      if (this.currentUser) {
        this.logAudit('close_shift', `Cierre de sesión de ${this.currentUser.name}`)
      }
      await auth.signOut()
      this.currentUser = null
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  /**
   * Autenticación de cajero validada contra las credenciales creadas por el Administrador
   */
  async loginWithCashierCredentials(identifier: string, pin: string): Promise<User> {
    const cleanId = identifier.trim().toLowerCase()
    const cleanPin = pin.trim()

    // Buscar en caché primero
    const cashier = this.cachedCashiers.find(
      (c) =>
        (c.username.toLowerCase() === cleanId || (c.email && c.email.toLowerCase() === cleanId)) &&
        c.pin === cleanPin
    )

    if (!cashier) {
      // Forzar lectura fresca si no está en caché
      const snap = await getDocs(this.col('cashiers'))
      const allCashiers = snap.docs.map((d) => ({ ...d.data(), id: d.id } as Cashier))
      const fresh = allCashiers.find(
        (c) =>
          (c.username.toLowerCase() === cleanId || (c.email && c.email.toLowerCase() === cleanId)) &&
          c.pin === cleanPin
      )
      if (!fresh) {
        throw new Error('Credenciales de cajero incorrectas o PIN inválido')
      }
      if (!fresh.active) {
        throw new Error('Esta cuenta de cajero se encuentra desactivada por el administrador')
      }
      return this.signIn(fresh.name, 'cajero', fresh.email)
    }

    if (!cashier.active) {
      throw new Error('Esta cuenta de cajero se encuentra desactivada por el administrador')
    }

    return this.signIn(cashier.name, 'cajero', cashier.email)
  }

  async requestAdminPasswordReset(targetEmail = ADMIN_EMAIL): Promise<void> {
    await sendAdminPasswordReset(targetEmail)
    this.logAudit('password_reset', `Solicitud de restablecimiento de contraseña enviada a ${targetEmail}`)
  }

  // ----- Gestión de Cajeros por el Administrador -----
  async listCashiers(): Promise<Cashier[]> {
    if (this.cachedCashiers.length > 0) return this.cachedCashiers
    const snap = await getDocs(this.col('cashiers'))
    this.cachedCashiers = snap.docs.map((d) => ({ ...d.data(), id: d.id } as Cashier))
    return this.cachedCashiers
  }

  async saveCashier(cashier: Cashier): Promise<void> {
    const idx = this.cachedCashiers.findIndex((c) => c.id === cashier.id)
    if (idx >= 0) {
      this.cachedCashiers[idx] = cashier
    } else {
      this.cachedCashiers.push(cashier)
    }
    this.notify()

    try {
      await setDoc(doc(this.db, 'venues', VENUE_ID, 'cashiers', cashier.id), cashier)
      this.logAudit(
        idx >= 0 ? 'update_cashier' : 'create_cashier',
        `Cajero ${cashier.name} (@${cashier.username}) ${idx >= 0 ? 'actualizado' : 'creado'} por admin`
      )
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `cashiers/${cashier.id}`)
      throw err
    }
  }

  async deleteCashier(cashierId: string): Promise<void> {
    const c = this.cachedCashiers.find((x) => x.id === cashierId)
    this.cachedCashiers = this.cachedCashiers.filter((x) => x.id !== cashierId)
    this.notify()

    try {
      await deleteDoc(doc(this.db, 'venues', VENUE_ID, 'cashiers', cashierId))
      if (c) {
        this.logAudit('delete_cashier', `Cajero eliminado: ${c.name} (@${c.username})`)
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `cashiers/${cashierId}`)
      throw err
    }
  }

  // ----- Lecturas ultra rápidas (<10ms) -----
  async listTables(): Promise<BilliardTable[]> {
    if (this.cachedTables.length > 0) return this.cachedTables
    const snap = await getDocs(this.col('tables'))
    if (snap.empty) {
      await this.seedInitialData()
      return seedTables()
    }
    this.cachedTables = snap.docs.map((d) => ({ ...d.data(), id: d.id } as BilliardTable))
    return this.cachedTables
  }

  async listProducts(): Promise<Product[]> {
    if (this.cachedProducts.length > 0) return this.cachedProducts
    const snap = await getDocs(this.col('products'))
    if (snap.empty) {
      return seedProducts()
    }
    this.cachedProducts = snap.docs.map((d) => ({ ...d.data(), id: d.id } as Product))
    return this.cachedProducts
  }

  async listTabs(): Promise<Tab[]> {
    if (this.cachedTabs.length > 0) return this.cachedTabs
    const snap = await getDocs(this.col('tabs'))
    this.cachedTabs = snap.docs.map((d) => ({ ...d.data(), id: d.id } as Tab))
    return this.cachedTabs
  }

  async getSettings(): Promise<Settings> {
    if (this.cachedSettings) return this.cachedSettings
    const snap = await getDoc(doc(this.db, 'venues', VENUE_ID, 'settings', 'main'))
    if (snap.exists()) {
      this.cachedSettings = snap.data() as Settings
      return this.cachedSettings
    }
    return seedSettings()
  }

  async getOpenShift(): Promise<Shift | null> {
    const open = this.cachedShifts.find((s) => !s.closedAt)
    if (open) return open
    const snap = await getDocs(this.col('shifts'))
    this.cachedShifts = snap.docs.map((d) => ({ ...d.data(), id: d.id } as Shift))
    return this.cachedShifts.find((s) => !s.closedAt) ?? null
  }

  async listAuditLogs(): Promise<AuditLog[]> {
    return this.cachedAuditLogs
  }

  async listReservations(): Promise<Reservation[]> {
    if (this.cachedReservations.length > 0) return this.cachedReservations
    const snap = await getDocs(this.col('reservations'))
    this.cachedReservations = snap.docs.map((d) => ({ ...d.data(), id: d.id } as Reservation))
    return this.cachedReservations
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  // ----- Renta y Control de Mesas -----
  async openRental(tableId: string, settings: Settings, playerEmail?: string): Promise<Tab> {
    const table = this.cachedTables.find((t) => t.id === tableId)
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

    this.cachedTabs = [tab, ...this.cachedTabs]
    this.cachedTables = this.cachedTables.map((t) =>
      t.id === tableId ? { ...t, status: 'ocupada', activeTabId: tab.id } : t
    )
    this.notify()

    try {
      const batch = writeBatch(this.db)
      batch.set(doc(this.db, 'venues', VENUE_ID, 'tabs', tab.id), tab)
      batch.update(doc(this.db, 'venues', VENUE_ID, 'tables', tableId), {
        status: 'ocupada',
        activeTabId: tab.id,
      })
      await batch.commit()

      this.logAudit(
        'open_rental',
        `Apertura de renta en ${table.name} a $${table.ratePerHour}/h${playerEmail ? ` (${playerEmail})` : ''}`,
        tableId,
        table.name,
        { tabId: tab.id, ratePerHour: table.ratePerHour, playerEmail }
      )
      return tab
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `tabs/${tab.id}`)
      throw err
    }
  }

  async pauseRental(tabId: string): Promise<void> {
    const tab = this.cachedTabs.find((t) => t.id === tabId)
    if (!tab?.rental) return

    const last = tab.rental.pauses[tab.rental.pauses.length - 1]
    if (last && !last.resumedAt) return

    const now = Date.now()
    tab.rental.pauses.push({ pausedAt: now })

    this.cachedTables = this.cachedTables.map((t) =>
      t.id === tab.tableId ? { ...t, status: 'pausada' } : t
    )
    this.notify()

    try {
      const batch = writeBatch(this.db)
      batch.update(doc(this.db, 'venues', VENUE_ID, 'tabs', tabId), { rental: tab.rental })
      batch.update(doc(this.db, 'venues', VENUE_ID, 'tables', tab.tableId), { status: 'pausada' })
      await batch.commit()
      this.logAudit('pause_rental', `Pausa en ${tab.tableName}`, tab.tableId, tab.tableName, { tabId })
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `tabs/${tabId}`)
      throw err
    }
  }

  async resumeRental(tabId: string): Promise<void> {
    const tab = this.cachedTabs.find((t) => t.id === tabId)
    if (!tab?.rental || tab.rental.pauses.length === 0) return

    const last = tab.rental.pauses[tab.rental.pauses.length - 1]
    if (!last || last.resumedAt) return

    last.resumedAt = Date.now()

    this.cachedTables = this.cachedTables.map((t) =>
      t.id === tab.tableId ? { ...t, status: 'ocupada' } : t
    )
    this.notify()

    try {
      const batch = writeBatch(this.db)
      batch.update(doc(this.db, 'venues', VENUE_ID, 'tabs', tabId), { rental: tab.rental })
      batch.update(doc(this.db, 'venues', VENUE_ID, 'tables', tab.tableId), { status: 'ocupada' })
      await batch.commit()
      this.logAudit('resume_rental', `Reanudación de tiempo en ${tab.tableName}`, tab.tableId, tab.tableName, { tabId })
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `tabs/${tabId}`)
      throw err
    }
  }

  async transferTable(tabId: string, toTableId: string): Promise<void> {
    const tab = this.cachedTabs.find((t) => t.id === tabId)
    const targetTable = this.cachedTables.find((t) => t.id === toTableId)

    if (!tab) throw new Error('Cuenta no encontrada')
    if (!targetTable || targetTable.status !== 'libre') {
      throw new Error('La mesa de destino no está libre para transferencia')
    }

    const oldTableId = tab.tableId
    const oldTableName = tab.tableName

    tab.tableId = targetTable.id
    tab.tableName = targetTable.name

    this.cachedTables = this.cachedTables.map((t) => {
      if (t.id === oldTableId) return { ...t, status: 'limpieza', activeTabId: null }
      if (t.id === toTableId) return { ...t, status: 'ocupada', activeTabId: tab.id }
      return t
    })
    this.notify()

    try {
      const batch = writeBatch(this.db)
      batch.update(doc(this.db, 'venues', VENUE_ID, 'tabs', tab.id), {
        tableId: targetTable.id,
        tableName: targetTable.name,
      })
      batch.update(doc(this.db, 'venues', VENUE_ID, 'tables', oldTableId), {
        status: 'limpieza',
        activeTabId: null,
      })
      batch.update(doc(this.db, 'venues', VENUE_ID, 'tables', toTableId), {
        status: 'ocupada',
        activeTabId: tab.id,
      })
      await batch.commit()

      this.logAudit(
        'transfer_table',
        `Transferencia de cuenta desde ${oldTableName} a ${targetTable.name}`,
        targetTable.id,
        targetTable.name,
        { tabId, oldTableId, newTableId: toTableId }
      )
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `tabs/${tabId}`)
      throw err
    }
  }

  // ----- Consumo y Productos en Mesa con Alerta de Notificación -----
  async addItem(tabId: string, product: Product, qty: number, orderedBy = 'caja'): Promise<void> {
    const tab = this.cachedTabs.find((t) => t.id === tabId)
    if (!tab) return

    const existingIndex = tab.items.findIndex((i) => i.productId === product.id)
    if (existingIndex >= 0) {
      tab.items[existingIndex].qty += qty
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

    this.notify()

    // Si el pedido fue solicitado desde la mesa o por el cliente, despachar alerta inmediata
    if (orderedBy && (orderedBy.includes('Cliente') || orderedBy.includes('Mesa'))) {
      dispatchStaffAlert(
        `¡Nuevo Pedido en ${tab.tableName}!`,
        `${qty}x ${product.name}`,
        'order',
        tab.tableId,
        tab.tableName
      )
    }

    try {
      await updateDoc(doc(this.db, 'venues', VENUE_ID, 'tabs', tabId), { items: tab.items })
      this.logAudit(
        'add_item',
        `+${qty} ${product.name} añadido a ${tab.tableName} (${orderedBy})`,
        tab.tableId,
        tab.tableName,
        { tabId, productId: product.id, productName: product.name, qty, orderedBy }
      )
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `tabs/${tabId}`)
      throw err
    }
  }

  async setItemQty(tabId: string, itemId: string, qty: number): Promise<void> {
    const tab = this.cachedTabs.find((t) => t.id === tabId)
    if (!tab) return

    if (qty <= 0) {
      tab.items = tab.items.filter((i) => i.id !== itemId)
    } else {
      const it = tab.items.find((i) => i.id === itemId)
      if (it) it.qty = qty
    }

    this.notify()

    try {
      await updateDoc(doc(this.db, 'venues', VENUE_ID, 'tabs', tabId), { items: tab.items })
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `tabs/${tabId}`)
      throw err
    }
  }

  async removeItem(tabId: string, itemId: string): Promise<void> {
    const tab = this.cachedTabs.find((t) => t.id === tabId)
    if (!tab) return
    const removedItem = tab.items.find((i) => i.id === itemId)
    tab.items = tab.items.filter((i) => i.id !== itemId)
    this.notify()

    try {
      await updateDoc(doc(this.db, 'venues', VENUE_ID, 'tabs', tabId), { items: tab.items })
      if (removedItem) {
        this.logAudit(
          'remove_item',
          `Eliminado ${removedItem.name} de ${tab.tableName}`,
          tab.tableId,
          tab.tableName,
          { tabId, itemId }
        )
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `tabs/${tabId}`)
      throw err
    }
  }

  async setDiscount(tabId: string, amount: number): Promise<void> {
    const tab = this.cachedTabs.find((t) => t.id === tabId)
    if (!tab) return
    tab.discount = Math.max(0, amount)
    this.notify()

    try {
      await updateDoc(doc(this.db, 'venues', VENUE_ID, 'tabs', tabId), { discount: tab.discount })
      this.logAudit('set_discount', `Descuento de $${amount} en ${tab.tableName}`, tab.tableId, tab.tableName, { tabId, amount })
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `tabs/${tabId}`)
      throw err
    }
  }

  async setTip(tabId: string, amount: number): Promise<void> {
    const tab = this.cachedTabs.find((t) => t.id === tabId)
    if (!tab) return
    tab.tip = Math.max(0, amount)
    this.notify()

    try {
      await updateDoc(doc(this.db, 'venues', VENUE_ID, 'tabs', tabId), { tip: tab.tip })
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `tabs/${tabId}`)
      throw err
    }
  }

  // ----- Cierre y Cobro de Cuenta -----
  async closeTab(tabId: string, payments: Payment[], cashier?: CashierInfo): Promise<Tab> {
    const tab = this.cachedTabs.find((t) => t.id === tabId)
    if (!tab) throw new Error('Cuenta no encontrada')

    const now = Date.now()
    if (tab.rental && !tab.rental.endedAt) {
      tab.rental.endedAt = now
    }
    tab.status = 'cerrada'
    tab.closedAt = now

    // Resolver cajero registrado que cobra la cuenta
    let resolvedCashier: CashierInfo | undefined = cashier
    if (!resolvedCashier) {
      const found = this.cachedCashiers.find(
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
          username: this.currentUser.email ? this.currentUser.email.split('@')[0] : 'caja',
        }
      }
    }

    if (resolvedCashier) {
      tab.closedByCashierId = resolvedCashier.id
      tab.closedByCashierName = resolvedCashier.name
      tab.closedByCashierUsername = resolvedCashier.username
    }

    // Atribuir cajero en cada pago
    const stampedPayments = payments.map((p) => ({
      ...p,
      cashierId: p.cashierId || resolvedCashier?.id,
      cashierName: p.cashierName || resolvedCashier?.name,
      cashierUsername: p.cashierUsername || resolvedCashier?.username,
    }))
    tab.payments = stampedPayments
    tab.totals = computeTotals(tab, now)

    this.cachedTables = this.cachedTables.map((t) =>
      t.id === tab.tableId ? { ...t, status: 'limpieza', activeTabId: null } : t
    )
    this.notify()

    try {
      const batch = writeBatch(this.db)
      batch.update(doc(this.db, 'venues', VENUE_ID, 'tabs', tabId), {
        status: 'cerrada',
        closedAt: now,
        rental: tab.rental,
        payments: stampedPayments,
        totals: tab.totals,
        closedByCashierId: tab.closedByCashierId ?? null,
        closedByCashierName: tab.closedByCashierName ?? null,
        closedByCashierUsername: tab.closedByCashierUsername ?? null,
      })
      batch.update(doc(this.db, 'venues', VENUE_ID, 'tables', tab.tableId), {
        status: 'limpieza',
        activeTabId: null,
      })
      await batch.commit()

      this.logAudit(
        'close_tab',
        `Cobro y liquidación de ${tab.tableName} por cajero ${tab.closedByCashierName || 'Caja'}: Total $${tab.totals?.total}`,
        tab.tableId,
        tab.tableName,
        {
          tabId,
          total: tab.totals?.total,
          cashierId: tab.closedByCashierId,
          cashierName: tab.closedByCashierName,
          cashierUsername: tab.closedByCashierUsername,
          payments: stampedPayments,
        }
      )

      // Notificaciones en tiempo real
      dispatchStaffAlert(
        `Cierre de Mesa: ${tab.tableName}`,
        `Cobro liquidado por $${tab.totals?.total || 0} (${tab.closedByCashierName || 'Caja'})`,
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
          `Pago liquidado: ${summaryMethods} — Cajero: ${tab.closedByCashierName || 'Caja'}`,
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

      return tab
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `tabs/${tabId}`)
      throw err
    }
  }

  async cancelTab(tabId: string, reason?: string): Promise<void> {
    const tab = this.cachedTabs.find((t) => t.id === tabId)
    if (!tab) return

    tab.status = 'anulada'
    tab.closedAt = Date.now()

    this.cachedTables = this.cachedTables.map((t) =>
      t.id === tab.tableId ? { ...t, status: 'libre', activeTabId: null } : t
    )
    this.notify()

    try {
      const batch = writeBatch(this.db)
      batch.update(doc(this.db, 'venues', VENUE_ID, 'tabs', tabId), {
        status: 'anulada',
        closedAt: tab.closedAt,
      })
      batch.update(doc(this.db, 'venues', VENUE_ID, 'tables', tab.tableId), {
        status: 'libre',
        activeTabId: null,
      })
      await batch.commit()

      this.logAudit(
        'cancel_tab',
        `Cuenta anulada en ${tab.tableName}${reason ? `: ${reason}` : ''}`,
        tab.tableId,
        tab.tableName,
        { tabId, reason }
      )
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `tabs/${tabId}`)
      throw err
    }
  }

  async setTableStatus(tableId: string, status: TableStatus): Promise<void> {
    const table = this.cachedTables.find((t) => t.id === tableId)
    this.cachedTables = this.cachedTables.map((t) =>
      t.id === tableId ? { ...t, status } : t
    )
    this.notify()

    try {
      await updateDoc(doc(this.db, 'venues', VENUE_ID, 'tables', tableId), { status })
      this.logAudit(
        'set_table_status',
        `Mesa ${table?.name || tableId} marcada como '${status}'`,
        tableId,
        table?.name,
        { status }
      )
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `tables/${tableId}`)
      throw err
    }
  }

  async saveProduct(product: Product): Promise<void> {
    const idx = this.cachedProducts.findIndex((p) => p.id === product.id)
    if (idx >= 0) {
      this.cachedProducts[idx] = product
    } else {
      this.cachedProducts.push(product)
    }
    this.notify()

    try {
      await setDoc(doc(this.db, 'venues', VENUE_ID, 'products', product.id), product)
      this.logAudit('save_product', `Producto guardado: ${product.name} ($${product.price})`)
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `products/${product.id}`)
      throw err
    }
  }

  async deleteProduct(productId: string): Promise<void> {
    const p = this.cachedProducts.find((x) => x.id === productId)
    this.cachedProducts = this.cachedProducts.filter((x) => x.id !== productId)
    this.notify()

    try {
      await deleteDoc(doc(this.db, 'venues', VENUE_ID, 'products', productId))
      if (p) {
        this.logAudit('delete_product', `Producto eliminado del catálogo: ${p.name}`)
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `products/${productId}`)
      throw err
    }
  }

  async saveSettings(settings: Settings): Promise<void> {
    this.cachedSettings = settings
    this.notify()

    try {
      await setDoc(doc(this.db, 'venues', VENUE_ID, 'settings', 'main'), settings)
      this.logAudit('save_settings', 'Configuración de facturación y tarifas actualizada')
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/main')
      throw err
    }
  }

  // ----- Reservas con pre-pedido de bebidas/botanas -----
  async saveReservation(reservation: Reservation): Promise<void> {
    const idx = this.cachedReservations.findIndex((r) => r.id === reservation.id)
    if (idx >= 0) {
      this.cachedReservations[idx] = reservation
    } else {
      this.cachedReservations = [reservation, ...this.cachedReservations]
    }
    this.notify()

    // Alert staff if new reservation is created
    if (idx < 0) {
      dispatchStaffAlert(
        `Nueva Reserva: ${reservation.tableName}`,
        `${reservation.customerName} - ${reservation.date} ${reservation.timeSlot}`,
        'reservation',
        reservation.tableId,
        reservation.tableName
      )
    }

    try {
      await setDoc(doc(this.db, 'venues', VENUE_ID, 'reservations', reservation.id), reservation)
      this.logAudit(
        'create_reservation',
        `Reserva para ${reservation.customerName} en ${reservation.tableName} (${reservation.date} ${reservation.timeSlot})`,
        reservation.tableId,
        reservation.tableName,
        { reservationId: reservation.id }
      )
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `reservations/${reservation.id}`)
      throw err
    }
  }

  async cancelReservation(reservationId: string): Promise<void> {
    const r = this.cachedReservations.find((res) => res.id === reservationId)
    if (r) {
      r.status = 'cancelada'
    }
    this.notify()

    try {
      await updateDoc(doc(this.db, 'venues', VENUE_ID, 'reservations', reservationId), {
        status: 'cancelada',
      })
      if (r) {
        this.logAudit('cancel_reservation', `Reserva cancelada de ${r.customerName} (${r.tableName})`, r.tableId, r.tableName)
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reservations/${reservationId}`)
      throw err
    }
  }

  // ----- Turnos de caja y Arqueos -----
  async listShifts(): Promise<Shift[]> {
    return [...this.cachedShifts].sort((a, b) => b.openedAt - a.openedAt)
  }

  async openShift(openingCash: number, cashier?: CashierInfo, notes?: string): Promise<Shift> {
    let resolvedCashier: CashierInfo | undefined = cashier
    if (!resolvedCashier) {
      const found = this.cachedCashiers.find(
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

    const shift: Shift = {
      id: uid(),
      openedAt: Date.now(),
      openingCash,
      openedBy: resolvedCashier?.name || this.currentUser?.name || 'Cajero',
      cashierId: resolvedCashier?.id,
      cashierName: resolvedCashier?.name,
      cashierUsername: resolvedCashier?.username,
      notes,
    }
    this.cachedShifts = [shift, ...this.cachedShifts]
    this.notify()

    try {
      await setDoc(doc(this.db, 'venues', VENUE_ID, 'shifts', shift.id), shift)
      this.logAudit(
        'open_shift',
        `Apertura de turno de caja por cajero ${shift.cashierName || shift.openedBy} con fondo de $${openingCash}`
      )
      return shift
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `shifts/${shift.id}`)
      throw err
    }
  }

  async closeShift(closingCash: number, cashier?: CashierInfo, notes?: string): Promise<Shift> {
    const open = this.cachedShifts.find((s) => !s.closedAt)
    if (!open) throw new Error('No hay turno abierto')

    let resolvedCashier: CashierInfo | undefined = cashier
    if (!resolvedCashier) {
      const found = this.cachedCashiers.find(
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
    // Calcular ventas liquidadas durante este turno
    const shiftTabs = this.cachedTabs.filter(
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

    this.notify()

    try {
      await updateDoc(doc(this.db, 'venues', VENUE_ID, 'shifts', open.id), {
        closedAt: open.closedAt,
        closingCash: open.closingCash,
        closedBy: open.closedBy,
        closedByCashierId: open.closedByCashierId ?? null,
        closedByCashierName: open.closedByCashierName ?? null,
        closedByCashierUsername: open.closedByCashierUsername ?? null,
        expectedCash: open.expectedCash,
        difference: open.difference,
        totalSales: open.totalSales,
        ticketsCount: open.ticketsCount,
        notes: open.notes ?? null,
      })
      this.logAudit(
        'close_shift',
        `Cierre de turno por ${open.closedBy}: Arqueo $${closingCash}, Esperado $${expectedCash}, Dif: $${difference}`
      )
      return open
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `shifts/${open.id}`)
      throw err
    }
  }
}
