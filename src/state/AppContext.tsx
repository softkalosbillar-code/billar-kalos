import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { getStore } from '../data'
import type { Store } from '../data/store'
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
  StaffNotification,
  Tab,
  TableStatus,
  User,
} from '../lib/types'
import {
  signInWithGoogle as firebaseGoogleSignIn,
  signInAdminWithPassword,
  updateAdminUserPassword,
  ADMIN_EMAIL,
} from '../lib/firebase'
import {
  getStoredNotifications,
  onStaffNotification,
  saveStoredNotifications,
} from '../lib/notifications'

export interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

interface AppContextValue {
  store: Store
  user: User | null
  tables: BilliardTable[]
  products: Product[]
  tabs: Tab[]
  settings: Settings
  shift: Shift | null
  shifts: Shift[]
  cashiers: Cashier[]
  auditLogs: AuditLog[]
  reservations: Reservation[]
  loading: boolean
  toasts: Toast[]
  signIn: (name: string, role: Role, email?: string) => Promise<void>
  signInGoogle: (role: Role) => Promise<void>
  loginCashier: (identifier: string, pin: string) => Promise<User>
  loginAdminWithPassword: (password: string, email?: string) => Promise<User>
  sendAdminResetEmail: (email?: string) => Promise<void>
  changeAdminPasswordDirectly: (newPass: string) => Promise<void>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
  openRental: (tableId: string) => Promise<Tab | null>
  pauseRental: (tabId: string) => Promise<void>
  resumeRental: (tabId: string) => Promise<void>
  transferTable: (tabId: string, toTableId: string) => Promise<void>
  addItem: (tabId: string, product: Product, qty: number, orderedBy?: string) => Promise<void>
  setItemQty: (tabId: string, itemId: string, qty: number) => Promise<void>
  removeItem: (tabId: string, itemId: string) => Promise<void>
  setDiscount: (tabId: string, amount: number) => Promise<void>
  setTip: (tabId: string, amount: number) => Promise<void>
  closeTab: (tabId: string, payments: Payment[], cashier?: CashierInfo) => Promise<Tab | null>
  cancelTab: (tabId: string, reason?: string) => Promise<void>
  setTableStatus: (tableId: string, status: TableStatus) => Promise<void>
  saveTable: (table: BilliardTable) => Promise<void>
  deleteTable: (tableId: string) => Promise<void>
  saveProduct: (product: Product) => Promise<void>
  deleteProduct: (productId: string) => Promise<void>
  saveSettings: (settings: Settings) => Promise<void>
  saveReservation: (reservation: Reservation) => Promise<void>
  cancelReservation: (reservationId: string) => Promise<void>
  openShift: (cash: number, cashier?: CashierInfo, notes?: string) => Promise<void>
  closeShift: (cash: number, cashier?: CashierInfo, notes?: string) => Promise<void>
  notify: (message: string, type?: Toast['type']) => void
  notifications: StaffNotification[]
  unreadNotifCount: number
  markAllNotificationsRead: () => void
  clearNotifications: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

let toastSeq = 0

export function AppProvider({ children }: { children: ReactNode }) {
  const store = useMemo(() => getStore(), [])
  const [user, setUser] = useState<User | null>(() => store.getCurrentUser())
  const [tables, setTables] = useState<BilliardTable[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [tabs, setTabs] = useState<Tab[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [shift, setShift] = useState<Shift | null>(null)
  const [shifts, setShifts] = useState<Shift[]>([])
  const [cashiers, setCashiers] = useState<Cashier[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [notifications, setNotifications] = useState<StaffNotification[]>(() => getStoredNotifications())

  const notify = useCallback(
    (message: string, type: Toast['type'] = 'info') => {
      const id = ++toastSeq
      setToasts((t) => [...t, { id, message, type }])
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500)
    },
    [],
  )

  // Escuchar notificaciones en vivo
  useEffect(() => {
    const unsub = onStaffNotification((newNotif) => {
      setNotifications((prev) => {
        const updated = [newNotif, ...prev.filter((n) => n.id !== newNotif.id)]
        return updated.slice(0, 80)
      })
    })
    return unsub
  }, [])

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }))
      saveStoredNotifications(updated)
      return updated
    })
  }, [])

  const clearNotifications = useCallback(() => {
    setNotifications([])
    saveStoredNotifications([])
  }, [])

  const unreadNotifCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length
  }, [notifications])

  const refresh = useCallback(async () => {
    try {
      const [t, p, tb, s, sh, logs, res, cList, allShifts] = await Promise.all([
        store.listTables(),
        store.listProducts(),
        store.listTabs(),
        store.getSettings(),
        store.getOpenShift(),
        store.listAuditLogs(),
        store.listReservations(),
        store.listCashiers(),
        store.listShifts ? store.listShifts() : Promise.resolve([]),
      ])
      setTables(t)
      setProducts(p)
      setTabs(tb)
      setSettings(s)
      setShift(sh)
      setAuditLogs(logs)
      setReservations(res)
      setCashiers(cList)
      setShifts(allShifts)
    } catch (e) {
      console.warn('Refresh error:', e)
    }
  }, [store])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        await refresh()
      } catch (e) {
        notify(e instanceof Error ? e.message : 'Error al cargar datos', 'error')
      } finally {
        if (active) setLoading(false)
      }
    })()

    // Suscripción reactiva en tiempo real (Firestore onSnapshot / eventos locales)
    const unsub = store.subscribe(() => {
      if (active) void refresh()
    })
    return () => {
      active = false
      unsub()
    }
  }, [store, refresh, notify])

  const run = useCallback(
    async (fn: () => Promise<unknown>) => {
      try {
        await fn()
        await refresh()
      } catch (e) {
        notify(e instanceof Error ? e.message : 'Ocurrió un error', 'error')
        throw e
      }
    },
    [refresh, notify],
  )

  const signIn = useCallback(
    async (name: string, role: Role, email?: string) => {
      const u = await store.signIn(name, role, email)
      setUser(u)
      await refresh()
      notify(`Bienvenido, ${u.name} (${u.role})`, 'success')
    },
    [store, refresh, notify],
  )

  const signInGoogle = useCallback(
    async (role: Role) => {
      try {
        const cred = await firebaseGoogleSignIn()
        const displayName = cred.displayName || cred.email?.split('@')[0] || 'Usuario'
        const u = await store.signIn(displayName, role, cred.email || undefined)
        setUser(u)
        await refresh()
        notify(`Autenticado con Google: ${u.name} (${u.role})`, 'success')
      } catch (e) {
        notify(e instanceof Error ? e.message : 'Error al autenticar con Google', 'error')
        throw e
      }
    },
    [store, refresh, notify],
  )

  const loginCashier = useCallback(
    async (identifier: string, pin: string) => {
      try {
        const u = await store.loginWithCashierCredentials(identifier, pin)
        setUser(u)
        await refresh()
        notify(`Turno iniciado: ${u.name} (Cajero)`, 'success')
        return u
      } catch (e) {
        notify(e instanceof Error ? e.message : 'Error al autenticar credenciales de cajero', 'error')
        throw e
      }
    },
    [store, refresh, notify],
  )

  const loginAdminWithPassword = useCallback(
    async (password: string, email = ADMIN_EMAIL) => {
      try {
        const cred = await signInAdminWithPassword(password, email)
        const displayName = cred.displayName || 'Administrador Kalos'
        const u = await store.signIn(displayName, 'admin', cred.email || email)
        setUser(u)
        await refresh()
        notify(`Bienvenido Administrador: ${u.name}`, 'success')
        return u
      } catch (e: any) {
        let msg = 'Error al autenticar contraseña de administrador'
        if (e?.code === 'auth/wrong-password' || e?.code === 'auth/invalid-credential') {
          msg = 'Contraseña incorrecta. Si la olvidaste, puedes restablecerla abajo.'
        } else if (e?.code === 'auth/user-not-found') {
          msg = 'Usuario no encontrado en la terminal'
        }
        notify(msg, 'error')
        throw e
      }
    },
    [store, refresh, notify],
  )

  const changeAdminPasswordDirectly = useCallback(
    async (newPass: string) => {
      try {
        await updateAdminUserPassword(newPass)
        notify('Contraseña de administrador actualizada exitosamente', 'success')
      } catch (e: any) {
        let msg = e instanceof Error ? e.message : 'Error al cambiar contraseña'
        if (e?.code === 'auth/weak-password') {
          msg = 'La contraseña debe tener al menos 6 caracteres'
        } else if (e?.code === 'auth/requires-recent-login') {
          msg = 'Por seguridad, vuelve a iniciar sesión con Google antes de cambiar la contraseña'
        }
        notify(msg, 'error')
        throw e
      }
    },
    [notify],
  )

  const sendAdminResetEmail = useCallback(
    async (email?: string) => {
      try {
        await store.requestAdminPasswordReset(email)
        notify(`Correo de verificación y restablecimiento enviado a ${email || 'softkalosbillar@gmail.com'}`, 'success')
      } catch (e) {
        notify(e instanceof Error ? e.message : 'Error al enviar correo', 'error')
        throw e
      }
    },
    [store, notify],
  )

  const signOut = useCallback(async () => {
    await store.signOut()
    setUser(null)
    notify('Sesión cerrada', 'info')
  }, [store, notify])

  const openRental = useCallback(
    async (tableId: string): Promise<Tab | null> => {
      try {
        const tab = await store.openRental(tableId, settings!)
        await refresh()
        notify(`Mesa ${tab.tableName} rentada — cronómetro iniciado`, 'success')
        return tab
      } catch (e) {
        notify(e instanceof Error ? e.message : 'No se pudo rentar la mesa', 'error')
        return null
      }
    },
    [store, settings, refresh, notify],
  )

  const transferTable = useCallback(
    async (tabId: string, toTableId: string) => {
      try {
        await store.transferTable(tabId, toTableId)
        await refresh()
        notify('Mesa transferida exitosamente', 'success')
      } catch (e) {
        notify(e instanceof Error ? e.message : 'No se pudo transferir la mesa', 'error')
        throw e
      }
    },
    [store, refresh, notify],
  )

  const value: AppContextValue = {
    store,
    user,
    tables,
    products,
    tabs,
    settings: settings || {
      venueName: 'Kalos Billar Club',
      currency: 'MXN',
      taxName: 'IVA',
      defaultTaxRate: 0.16,
      minimumMinutes: 30,
      rounding: 'cuarto_hora',
      tipEnabled: true,
    },
    shift,
    shifts,
    cashiers,
    auditLogs,
    reservations,
    loading,
    toasts,
    signIn,
    signInGoogle,
    loginCashier,
    loginAdminWithPassword,
    sendAdminResetEmail,
    changeAdminPasswordDirectly,
    signOut,
    refresh,
    openRental,
    pauseRental: (tabId) => run(() => store.pauseRental(tabId)),
    resumeRental: (tabId) => run(() => store.resumeRental(tabId)),
    transferTable,
    addItem: (tabId, product, qty, orderedBy) =>
      run(() => store.addItem(tabId, product, qty, orderedBy)),
    setItemQty: (tabId, itemId, qty) => run(() => store.setItemQty(tabId, itemId, qty)),
    removeItem: (tabId, itemId) => run(() => store.removeItem(tabId, itemId)),
    setDiscount: (tabId, amount) => run(() => store.setDiscount(tabId, amount)),
    setTip: (tabId, amount) => run(() => store.setTip(tabId, amount)),
    closeTab: async (tabId, payments, cashier) => {
      try {
        const tab = await store.closeTab(tabId, payments, cashier)
        await refresh()
        notify(`Cobro de ${tab.tableName} liquidado por ${tab.closedByCashierName || 'Caja'}`, 'success')
        return tab
      } catch (e) {
        notify(e instanceof Error ? e.message : 'No se pudo cobrar', 'error')
        return null
      }
    },
    cancelTab: (tabId, reason) => run(() => store.cancelTab(tabId, reason)),
    setTableStatus: (tableId, status) => run(() => store.setTableStatus(tableId, status)),
    saveTable: (table) =>
      run(async () => {
        await store.saveTable(table)
        notify(`Mesa ${table.name} guardada correctamente`, 'success')
      }),
    deleteTable: (tableId) =>
      run(async () => {
        await store.deleteTable(tableId)
        notify('Mesa eliminada', 'info')
      }),
    saveProduct: (product) => run(() => store.saveProduct(product)),
    deleteProduct: (productId) => run(() => store.deleteProduct(productId)),
    saveSettings: (s) => run(() => store.saveSettings(s)),
    saveReservation: (res) =>
      run(async () => {
        await store.saveReservation(res)
        notify('Reserva registrada correctamente', 'success')
      }),
    cancelReservation: (resId) =>
      run(async () => {
        await store.cancelReservation(resId)
        notify('Reserva cancelada', 'info')
      }),
    openShift: (cash, cashier, notes) => run(() => store.openShift(cash, cashier, notes)),
    closeShift: (cash, cashier, notes) => run(() => store.closeShift(cash, cashier, notes)),
    notify,
    notifications,
    unreadNotifCount,
    markAllNotificationsRead,
    clearNotifications,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>')
  return ctx
}

/** Reloj de UI que hace tick cada segundo para el cronómetro */
export function useNow(active = true): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [active])
  return now
}
