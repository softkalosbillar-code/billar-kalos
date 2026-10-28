import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  Clock,
  Sparkles,
  Beer,
  Utensils,
  Plus,
  Minus,
  CheckCircle2,
  BellRing,
  Receipt,
  User,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Layers,
  Phone,
  MessageSquare,
  AlertCircle,
  Table2,
} from 'lucide-react'
import { useApp, useNow } from '../state/AppContext'
import { computeRentalCharge, computeTotals } from '../lib/billing'
import { duration, money } from '../lib/format'
import { facturableElapsedSec } from '../lib/time'
import { Logo } from '../components/Logo'
import type { PreorderItem, Product, ProductCategory, Reservation } from '../lib/types'

export function PortalJugador() {
  const {
    user,
    signInGoogle,
    signOut,
    tables,
    tabs,
    products,
    reservations,
    saveReservation,
    addItem,
    notify,
  } = useApp()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<'reservar' | 'mi-mesa' | 'mis-reservas'>('reservar')
  const [loadingGoogle, setLoadingGoogle] = useState(false)

  // --- Formulario de Reserva ---
  const [selectedTableId, setSelectedTableId] = useState<string>(tables[0]?.id || '')
  const [resDate, setResDate] = useState<string>(() => new Date().toISOString().split('T')[0])
  const [timeSlot, setTimeSlot] = useState<string>('19:00')
  const [durationMinutes, setDurationMinutes] = useState<number>(60)
  const [playersCount, setPlayersCount] = useState<number>(2)
  const [customerName, setCustomerName] = useState<string>(user?.name || '')
  const [customerPhone, setCustomerPhone] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [preorderQuantities, setPreorderQuantities] = useState<Record<string, number>>({})
  const [preorderCat, setPreorderCat] = useState<'todo' | ProductCategory>('todo')
  const [reserving, setReserving] = useState(false)
  const [reservationSuccess, setReservationSuccess] = useState<Reservation | null>(null)

  // --- Estado para "Mi Mesa en Vivo" ---
  const [selectedLiveTableId, setSelectedLiveTableId] = useState<string>(tables[0]?.id || '')
  const [orderProduct, setOrderProduct] = useState<Product | null>(null)
  const [orderQty, setOrderQty] = useState(1)
  const [callingStaff, setCallingStaff] = useState(false)

  // Mesa seleccionada en vivo
  const liveTable = tables.find((t) => t.id === selectedLiveTableId) || tables[0]
  const liveTab = useMemo(() => {
    if (!liveTable?.activeTabId) return null
    return (
      tabs.find((t) => t.id === liveTable.activeTabId && t.status !== 'cerrada' && t.status !== 'anulada') ??
      null
    )
  }, [liveTable, tabs])

  const isLiveActive = !!liveTab && (liveTab.status === 'abierta' || liveTab.status === 'por_cobrar')
  const now = useNow(isLiveActive)
  const liveRental = liveTab?.rental ?? null
  const liveCharge = liveRental ? computeRentalCharge(liveRental, now) : null
  const liveTotals = liveTab ? computeTotals(liveTab, now) : null
  const liveElapsedSec = isLiveActive && liveRental ? facturableElapsedSec(liveRental, now) : 0
  const isLivePaused =
    !!liveRental &&
    liveRental.pauses.length > 0 &&
    !liveRental.pauses[liveRental.pauses.length - 1].resumedAt

  // Preorder items seleccionados
  const preorderItemsList = useMemo<PreorderItem[]>(() => {
    const list: PreorderItem[] = []
    for (const [prodId, qty] of Object.entries(preorderQuantities)) {
      if (qty > 0) {
        const prod = products.find((p) => p.id === prodId)
        if (prod) {
          list.push({
            productId: prod.id,
            name: prod.name,
            emoji: prod.emoji,
            qty,
            unitPrice: prod.price,
          })
        }
      }
    }
    return list
  }, [preorderQuantities, products])

  const preorderTotal = useMemo(() => {
    return preorderItemsList.reduce((acc, item) => acc + item.qty * item.unitPrice, 0)
  }, [preorderItemsList])

  const selectedTable = tables.find((t) => t.id === selectedTableId) || tables[0]
  const estimatedTableCharge = useMemo(() => {
    if (!selectedTable) return 0
    return Math.round((selectedTable.ratePerHour * durationMinutes) / 60)
  }, [selectedTable, durationMinutes])

  // Filtrado de reservas del usuario
  const myReservations = useMemo(() => {
    if (!user?.email) return reservations
    return reservations.filter(
      (r) =>
        (r.userEmail && r.userEmail.toLowerCase() === user.email?.toLowerCase()) ||
        (r.customerName && user.name && r.customerName.toLowerCase() === user.name.toLowerCase())
    )
  }, [reservations, user])

  // Manejo de Login con Google para jugador
  async function handleGoogleLogin() {
    try {
      setLoadingGoogle(true)
      await signInGoogle('jugador')
      if (user?.name) setCustomerName(user.name)
    } catch {
      // Notificado por AppContext
    } finally {
      setLoadingGoogle(false)
    }
  }

  function handlePreorderQty(productId: string, delta: number) {
    setPreorderQuantities((prev) => {
      const current = prev[productId] || 0
      const next = Math.max(0, current + delta)
      return { ...prev, [productId]: next }
    })
  }

  async function handleConfirmReservation(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedTable) return
    const nameToUse = customerName.trim() || user?.name || 'Jugador Kalos'
    if (!nameToUse) {
      notify('Por favor ingresa tu nombre para la reserva', 'error')
      return
    }

    setReserving(true)
    try {
      const newReservation: Reservation = {
        id: `res-${Date.now()}`,
        customerName: nameToUse,
        customerPhone: customerPhone.trim() || 'No registrada',
        tableId: selectedTable.id,
        tableName: selectedTable.name,
        date: resDate,
        timeSlot,
        durationMinutes,
        playersCount,
        deposit: 0,
        status: 'confirmada',
        notes: notes.trim() || undefined,
        createdAt: Date.now(),
        userId: user?.uid,
        userEmail: user?.email || undefined,
        preorderItems: preorderItemsList.length > 0 ? preorderItemsList : undefined,
      }

      await saveReservation(newReservation)
      setReservationSuccess(newReservation)
      setPreorderQuantities({})
      setNotes('')
      notify(`¡Reserva confirmada en ${selectedTable.name}!`, 'success')
    } catch {
      notify('No se pudo guardar la reserva. Intenta nuevamente.', 'error')
    } finally {
      setReserving(false)
    }
  }

  async function handleSendTableOrder() {
    if (!liveTab || !orderProduct) return
    try {
      await addItem(liveTab.id, orderProduct, orderQty, `Jugador (${user?.name || 'Mesa'})`)
      notify(`Pedido de ${orderQty}x ${orderProduct.name} enviado a barra`, 'success')
      setOrderProduct(null)
      setOrderQty(1)
    } catch {
      notify('Error al enviar el pedido', 'error')
    }
  }

  function handleCallWaiter() {
    if (!liveTable) return
    setCallingStaff(true)
    notify(`Personal notificado para ${liveTable.name}. En breve se acercan a tu mesa.`, 'info')
    setTimeout(() => setCallingStaff(false), 7000)
  }

  return (
    <div className="min-h-dvh bg-bg text-ink-1 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-surface-1/90 backdrop-blur-xl px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo variant="full" height={34} />
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand/10 border border-brand/20 text-[11px] font-mono text-brand">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Portal de Jugadores</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-2 border border-white/10">
                  <div className="w-6 h-6 rounded-full bg-brand text-brand-on font-bold text-xs grid place-items-center uppercase">
                    {user.name.charAt(0)}
                  </div>
                  <span className="text-xs font-semibold text-ink-1 max-w-[120px] truncate">
                    {user.name}
                  </span>
                </div>
                <button
                  onClick={() => signOut()}
                  className="p-2 rounded-xl bg-surface-2 border border-white/10 text-ink-3 hover:text-rose-400 transition"
                  title="Cerrar sesión"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button
                disabled={loadingGoogle}
                onClick={handleGoogleLogin}
                className="h-9 px-3.5 rounded-xl bg-surface-2 border border-white/15 hover:border-brand/40 text-xs font-semibold text-ink-1 flex items-center gap-2 active:scale-95 transition shadow-sm"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{loadingGoogle ? 'Conectando...' : 'Entrar con Google'}</span>
              </button>
            )}

            <Link
              to="/login"
              className="text-xs text-ink-3 hover:text-brand transition hidden md:block"
            >
              Acceso Staff / Caja →
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Bar */}
      <div className="border-b border-white/5 bg-gradient-to-b from-brand/10 via-surface-1 to-bg px-4 py-6">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-ink-1 tracking-tight">
              Bienvenido a Kalos Billar Club
            </h1>
            <p className="text-xs sm:text-sm text-ink-2 mt-1">
              Reserva tu mesa con botanas incluidas o monitorea tu tiempo de juego y cuenta en vivo.
            </p>
          </div>

          {/* Navigation segmented buttons */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-2 border border-white/10 self-start md:self-auto">
            <button
              onClick={() => {
                setActiveTab('reservar')
                setReservationSuccess(null)
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
                activeTab === 'reservar'
                  ? 'bg-brand text-brand-on shadow-sm'
                  : 'text-ink-2 hover:text-ink-1'
              }`}
            >
              <CalendarDays size={15} />
              <span>Reservar Mesa</span>
            </button>
            <button
              onClick={() => setActiveTab('mi-mesa')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
                activeTab === 'mi-mesa'
                  ? 'bg-brand text-brand-on shadow-sm'
                  : 'text-ink-2 hover:text-ink-1'
              }`}
            >
              <Clock size={15} />
              <span>Mi Mesa en Vivo</span>
            </button>
            <button
              onClick={() => setActiveTab('mis-reservas')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
                activeTab === 'mis-reservas'
                  ? 'bg-brand text-brand-on shadow-sm'
                  : 'text-ink-2 hover:text-ink-1'
              }`}
            >
              <Receipt size={15} />
              <span>Mis Reservas</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Body */}
      <main className="max-w-4xl mx-auto w-full px-4 py-6 flex-1">
        {/* ============================================================== */}
        {/* TAB 1: RESERVAR MESA & BOTANAS                                 */}
        {/* ============================================================== */}
        {activeTab === 'reservar' && (
          <div>
            {reservationSuccess ? (
              <div className="max-w-md mx-auto p-6 rounded-2xl border border-brand/30 bg-surface-2 shadow-card text-center space-y-4 animate-rise">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 grid place-items-center mx-auto">
                  <CheckCircle2 size={32} />
                </div>
                <h2 className="font-display text-xl font-bold text-ink-1">
                  ¡Reserva Confirmada con Éxito!
                </h2>
                <p className="text-xs text-ink-2">
                  Hemos reservado la <strong className="text-brand">{reservationSuccess.tableName}</strong> para el día{' '}
                  <strong className="text-ink-1">{reservationSuccess.date}</strong> a las{' '}
                  <strong className="text-ink-1">{reservationSuccess.timeSlot} hrs</strong> ({reservationSuccess.durationMinutes} min).
                </p>

                {reservationSuccess.preorderItems && reservationSuccess.preorderItems.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-surface-3 border border-white/5 text-left text-xs space-y-1.5">
                    <span className="font-semibold text-ink-1 block mb-1">
                      Bebidas & Botanas pre-ordenadas:
                    </span>
                    {reservationSuccess.preorderItems.map((item) => (
                      <div key={item.productId} className="flex justify-between text-ink-2">
                        <span>
                          {item.emoji} {item.qty}x {item.name}
                        </span>
                        <span className="font-mono text-brand font-semibold">
                          {money(item.qty * item.unitPrice)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                  <button
                    onClick={() => {
                      setSelectedLiveTableId(reservationSuccess.tableId)
                      setActiveTab('mi-mesa')
                    }}
                    className="flex-1 h-11 rounded-xl bg-brand text-brand-on font-semibold text-xs hover:bg-brand-hover active:scale-95 transition"
                  >
                    Ver Mesa en Vivo
                  </button>
                  <button
                    onClick={() => setReservationSuccess(null)}
                    className="h-11 px-4 rounded-xl border border-white/10 text-xs text-ink-3 hover:text-ink-1 transition"
                  >
                    Hacer otra reserva
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleConfirmReservation} className="space-y-6">
                {/* Paso 1: Seleccionar Mesa */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-ink-2 uppercase tracking-wider flex items-center gap-1.5">
                      <Table2 size={15} className="text-brand" />
                      1. Selecciona la Mesa de Billar
                    </label>
                    <span className="text-xs text-ink-3">Tarifas por hora exactas</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {tables.map((t) => {
                      const isSelected = t.id === selectedTableId
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setSelectedTableId(t.id)}
                          className={`p-3.5 rounded-xl border text-left transition relative active:scale-[0.99] ${
                            isSelected
                              ? 'border-brand bg-brand/10 shadow-card'
                              : 'border-white/10 bg-surface-2 hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <span className="font-bold text-sm text-ink-1">{t.name}</span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                t.status === 'libre'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-amber-500/20 text-amber-300'
                              }`}
                            >
                              {t.status === 'libre' ? 'Disponible' : 'En uso actualmente'}
                            </span>
                          </div>
                          <div className="text-xs text-ink-3 mt-1 capitalize">{t.type}</div>
                          <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-white/5">
                            <span className="text-[11px] text-ink-3">Precio por hora:</span>
                            <span className="font-mono font-bold text-sm text-brand">
                              ${t.ratePerHour}/h
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Paso 2: Horario y Duración */}
                <div className="space-y-2.5">
                  <label className="text-xs font-bold text-ink-2 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock size={15} className="text-brand" />
                    2. Fecha, Horario y Duración del Juego
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-surface-2 p-4 rounded-xl border border-white/10">
                    <div>
                      <span className="block text-[11px] text-ink-3 mb-1">Fecha de Reserva</span>
                      <input
                        type="date"
                        required
                        value={resDate}
                        onChange={(e) => setResDate(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg bg-surface-3 border border-white/10 text-xs text-ink-1 font-mono focus:outline-none focus:border-brand"
                      />
                    </div>
                    <div>
                      <span className="block text-[11px] text-ink-3 mb-1">Hora de Inicio</span>
                      <select
                        value={timeSlot}
                        onChange={(e) => setTimeSlot(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg bg-surface-3 border border-white/10 text-xs text-ink-1 font-mono focus:outline-none focus:border-brand"
                      >
                        {[
                          '15:00',
                          '16:00',
                          '17:00',
                          '18:00',
                          '19:00',
                          '20:00',
                          '21:00',
                          '22:00',
                          '23:00',
                          '00:00',
                        ].map((time) => (
                          <option key={time} value={time}>
                            {time} hrs
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <span className="block text-[11px] text-ink-3 mb-1">Tiempo de Renta</span>
                      <select
                        value={durationMinutes}
                        onChange={(e) => setDurationMinutes(Number(e.target.value))}
                        className="w-full h-10 px-3 rounded-lg bg-surface-3 border border-white/10 text-xs text-ink-1 font-mono focus:outline-none focus:border-brand"
                      >
                        <option value={30}>30 minutos</option>
                        <option value={60}>1 hora (60 min)</option>
                        <option value={90}>1.5 horas (90 min)</option>
                        <option value={120}>2 horas (120 min)</option>
                        <option value={180}>3 horas (180 min)</option>
                        <option value={240}>4 horas (240 min)</option>
                      </select>
                    </div>
                    <div>
                      <span className="block text-[11px] text-ink-3 mb-1">Jugadores</span>
                      <select
                        value={playersCount}
                        onChange={(e) => setPlayersCount(Number(e.target.value))}
                        className="w-full h-10 px-3 rounded-lg bg-surface-3 border border-white/10 text-xs text-ink-1 font-mono focus:outline-none focus:border-brand"
                      >
                        {[1, 2, 3, 4, 5, 6, 8].map((c) => (
                          <option key={c} value={c}>
                            {c} {c === 1 ? 'persona' : 'personas'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Paso 3: Integrar Bebidas o Botanas dentro del horario de reserva */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label className="text-xs font-bold text-ink-2 uppercase tracking-wider flex items-center gap-1.5">
                        <Utensils size={15} className="text-brand" />
                        3. Pre-ordenar Bebidas & Botanas para tu Mesa
                      </label>
                      <p className="text-xs text-ink-3">
                        Listas al momento de llegar a tu mesa de billar
                      </p>
                    </div>

                    {/* Filtro de Categoría */}
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                      {(
                        [
                          { id: 'todo', label: 'Todo' },
                          { id: 'cerveza', label: '🍺 Cervezas' },
                          { id: 'refresco', label: '🥤 Refrescos' },
                          { id: 'botana', label: '🍿 Botanas' },
                        ] as const
                      ).map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setPreorderCat(cat.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                            preorderCat === cat.id
                              ? 'bg-brand text-brand-on'
                              : 'bg-surface-2 text-ink-3 hover:text-ink-1 border border-white/5'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Catálogo de Productos para la Pre-orden */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                    {products
                      .filter((p) => p.active && (preorderCat === 'todo' || p.category === preorderCat))
                      .map((p) => {
                        const qty = preorderQuantities[p.id] || 0
                        return (
                          <div
                            key={p.id}
                            className={`p-3 rounded-xl border transition flex flex-col justify-between ${
                              qty > 0
                                ? 'border-brand/50 bg-brand/10'
                                : 'border-white/10 bg-surface-2 hover:border-white/20'
                            }`}
                          >
                            <div>
                              <span className="text-2xl block mb-1">{p.emoji}</span>
                              <div className="text-xs font-semibold text-ink-1 line-clamp-1">
                                {p.name}
                              </div>
                              <div className="font-mono text-xs font-bold text-brand mt-0.5">
                                {money(p.price)}
                              </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between pt-2 border-t border-white/5">
                              {qty === 0 ? (
                                <button
                                  type="button"
                                  onClick={() => handlePreorderQty(p.id, 1)}
                                  className="w-full h-7 rounded-lg bg-surface-3 border border-white/10 text-xs font-semibold text-ink-2 hover:text-brand flex items-center justify-center gap-1 active:scale-95 transition"
                                >
                                  <Plus size={13} />
                                  <span>Agregar</span>
                                </button>
                              ) : (
                                <div className="w-full flex items-center justify-between">
                                  <button
                                    type="button"
                                    onClick={() => handlePreorderQty(p.id, -1)}
                                    className="w-7 h-7 rounded-lg bg-surface-4 text-ink-1 grid place-items-center active:scale-90"
                                  >
                                    <Minus size={13} />
                                  </button>
                                  <span className="font-mono text-xs font-bold text-ink-1">
                                    {qty}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handlePreorderQty(p.id, 1)}
                                    className="w-7 h-7 rounded-lg bg-brand text-brand-on grid place-items-center active:scale-90"
                                  >
                                    <Plus size={13} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>

                {/* Paso 4: Datos del Jugador y Confirmación */}
                <div className="space-y-3 bg-surface-2 p-4 rounded-xl border border-white/10">
                  <label className="text-xs font-bold text-ink-2 uppercase tracking-wider flex items-center gap-1.5">
                    <User size={15} className="text-brand" />
                    4. Datos del Cliente & Contacto
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="block text-[11px] text-ink-3 mb-1">Nombre Completo *</span>
                      <input
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Ej. Carlos Mendoza"
                        className="w-full h-10 px-3 rounded-lg bg-surface-3 border border-white/10 text-xs text-ink-1 focus:outline-none focus:border-brand"
                      />
                    </div>
                    <div>
                      <span className="block text-[11px] text-ink-3 mb-1">Teléfono / WhatsApp</span>
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="Ej. +52 55 1234 5678"
                        className="w-full h-10 px-3 rounded-lg bg-surface-3 border border-white/10 text-xs text-ink-1 focus:outline-none focus:border-brand"
                      />
                    </div>
                  </div>

                  <div>
                    <span className="block text-[11px] text-ink-3 mb-1">Notas especiales (opcional)</span>
                    <input
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ej. Festejo de cumpleaños, preferencia por bolas de carambola limpias..."
                      className="w-full h-10 px-3 rounded-lg bg-surface-3 border border-white/10 text-xs text-ink-1 focus:outline-none focus:border-brand"
                    />
                  </div>
                </div>

                {/* Resumen Final de Reserva */}
                <div className="p-4 rounded-xl border border-brand/20 bg-brand/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1 text-xs">
                    <div className="font-semibold text-ink-1">
                      {selectedTable?.name} · {resDate} a las {timeSlot} hrs ({durationMinutes} min)
                    </div>
                    <div className="text-ink-2">
                      Renta estimada de mesa: <strong className="font-mono text-ink-1">{money(estimatedTableCharge)}</strong>
                      {preorderTotal > 0 && (
                        <span>
                          {' '}
                          + Botanas/Bebidas:{' '}
                          <strong className="font-mono text-brand">{money(preorderTotal)}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] text-ink-3 block uppercase">Total Estimado</span>
                      <span className="font-mono text-xl font-bold text-brand tabular-nums">
                        {money(estimatedTableCharge + preorderTotal)}
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={reserving}
                      className="h-12 px-6 rounded-xl bg-brand text-brand-on font-bold text-xs hover:bg-brand-hover active:scale-95 transition shadow-card flex items-center gap-2"
                    >
                      <Sparkles size={16} />
                      <span>{reserving ? 'Confirmando...' : 'Confirmar Reserva'}</span>
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: MI MESA EN VIVO (TIEMPO REAL)                           */}
        {/* ============================================================== */}
        {activeTab === 'mi-mesa' && (
          <div className="space-y-5">
            {/* Table Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-2 p-3.5 rounded-xl border border-white/10">
              <div className="flex items-center gap-2">
                <Table2 size={18} className="text-brand" />
                <span className="text-xs font-semibold text-ink-2">Mesa en Seguimiento:</span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {tables.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedLiveTableId(t.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                      t.id === selectedLiveTableId
                        ? 'bg-brand text-brand-on'
                        : 'bg-surface-3 text-ink-3 hover:text-ink-1 border border-white/5'
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Timer and Status Box */}
            {isLiveActive && liveRental ? (
              <div className="p-5 sm:p-6 rounded-2xl border border-brand/30 bg-surface-2 shadow-card relative overflow-hidden">
                <div className="absolute top-0 right-0 w-44 h-44 bg-brand/5 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-bold text-ink-2 uppercase tracking-wider">
                      Partida en Curso · {liveTable?.name} ({liveTable?.type})
                    </span>
                  </div>
                  <button
                    onClick={handleCallWaiter}
                    disabled={callingStaff}
                    className={`h-8 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 ${
                      callingStaff
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-surface-3 border border-white/10 text-brand hover:border-brand/40'
                    }`}
                  >
                    <BellRing size={13} className={callingStaff ? 'animate-bounce' : ''} />
                    <span>{callingStaff ? 'Aviso enviado' : 'Llamar Mesero'}</span>
                  </button>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
                  <div>
                    <span className="text-xs text-ink-3 block">Tiempo Transcurrido (En Vivo)</span>
                    <span className="font-mono text-4xl sm:text-5xl font-extrabold tracking-tight text-ink-1 tabular-nums">
                      {duration(liveElapsedSec)}
                    </span>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-xs text-ink-3 block">Cargo acumulado por tiempo</span>
                    <span className="font-mono text-2xl font-bold text-brand tabular-nums">
                      {liveCharge ? money(liveCharge.charge) : '$0.00'}
                    </span>
                  </div>
                </div>

                {/* Resumen Total */}
                <div className="mt-5 pt-3.5 border-t border-white/10 flex items-center justify-between text-xs">
                  <div className="text-ink-2">
                    Total Actual (Tiempo + Consumos):
                  </div>
                  <div className="font-mono text-lg font-bold text-ink-1 tabular-nums">
                    {liveTotals ? money(liveTotals.total) : '$0.00'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-2xl border border-white/10 bg-surface-2 text-center space-y-3">
                <Clock size={40} className="mx-auto text-ink-3 opacity-60" />
                <h3 className="font-display font-semibold text-ink-1 text-base">
                  {liveTable?.name} no tiene partida activa en este instante
                </h3>
                <p className="text-xs text-ink-3 max-w-sm mx-auto">
                  Si ya estás en el club, solicita al personal de caja que aperture la mesa. O pulsa abajo para reservar tu turno.
                </p>
                <button
                  onClick={() => setActiveTab('reservar')}
                  className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-brand text-brand-on font-semibold text-xs hover:bg-brand-hover transition"
                >
                  <CalendarDays size={14} />
                  <span>Reservar Esta Mesa</span>
                </button>
              </div>
            )}

            {/* Consumos Actuales y Pedidos de la Mesa */}
            {liveTab && liveTab.items.length > 0 && (
              <div className="p-4 rounded-2xl border border-white/10 bg-surface-2 space-y-3">
                <div className="text-xs font-semibold text-ink-2 uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt size={14} className="text-brand" />
                  Productos & Botanas en tu Cuenta ({liveTab.items.reduce((s, i) => s + i.qty, 0)})
                </div>

                <div className="divide-y divide-white/5 text-xs max-h-56 overflow-y-auto pr-1">
                  {liveTab.items.map((item) => (
                    <div key={item.id} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xl">{item.emoji}</span>
                        <div>
                          <div className="font-medium text-ink-1">{item.name}</div>
                          <div className="text-[10px] text-ink-3">
                            {item.qty} × {money(item.unitPrice)}
                            {item.orderedBy ? ` · ${item.orderedBy}` : ''}
                          </div>
                        </div>
                      </div>
                      <div className="font-mono font-semibold text-ink-1 tabular-nums">
                        {money(item.qty * item.unitPrice)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Menú de Barra Rápido para pedir durante el juego */}
            {isLiveActive && (
              <div className="space-y-3 pt-2">
                <div>
                  <h3 className="font-display font-bold text-base text-ink-1 flex items-center gap-2">
                    <Beer size={18} className="text-brand" />
                    <span>Pedir a la Mesa sin Levantarte</span>
                  </h3>
                  <p className="text-xs text-ink-3">
                    Llega directamente a tu mesa de juego con notificación al personal
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {products
                    .filter((p) => p.active)
                    .slice(0, 8)
                    .map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setOrderProduct(p)
                          setOrderQty(1)
                        }}
                        className="p-3 rounded-xl border border-white/10 bg-surface-2 text-left hover:border-brand/40 active:scale-95 transition flex flex-col justify-between"
                      >
                        <div>
                          <span className="text-2xl block mb-1">{p.emoji}</span>
                          <div className="text-xs font-semibold text-ink-1 line-clamp-1">{p.name}</div>
                        </div>
                        <div className="mt-2.5 flex items-center justify-between text-xs pt-1.5 border-t border-white/5">
                          <span className="font-mono font-bold text-brand">{money(p.price)}</span>
                          <span className="w-6 h-6 rounded-lg bg-surface-3 grid place-items-center text-ink-2 hover:text-brand">
                            <Plus size={13} />
                          </span>
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: MIS RESERVAS & HISTORIAL                                */}
        {/* ============================================================== */}
        {activeTab === 'mis-reservas' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-bold text-ink-1">Historial de Reservas</h2>
                <p className="text-xs text-ink-3">Monitorea tus reservaciones en Kalos Billar Club</p>
              </div>
              <button
                onClick={() => setActiveTab('reservar')}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-brand text-brand-on font-semibold text-xs hover:bg-brand-hover transition"
              >
                <Plus size={14} />
                <span>Nueva Reserva</span>
              </button>
            </div>

            {myReservations.length === 0 ? (
              <div className="p-8 rounded-2xl border border-white/10 bg-surface-2 text-center space-y-2">
                <Calendar size={36} className="mx-auto text-ink-3 opacity-60 mb-1" />
                <h4 className="font-semibold text-ink-1 text-sm">No tienes reservas registradas</h4>
                <p className="text-xs text-ink-3 max-w-xs mx-auto">
                  Elige una mesa y horario para asegurar tu partida en el club.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {myReservations.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 rounded-xl border border-white/10 bg-surface-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-white/20 transition"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-ink-1">{r.tableName}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            r.status === 'confirmada'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : r.status === 'completada'
                              ? 'bg-sky-500/20 text-sky-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {r.status}
                        </span>
                      </div>
                      <div className="text-xs text-ink-3 mt-1 flex items-center gap-2 flex-wrap">
                        <span>📅 {r.date} a las {r.timeSlot} hrs</span>
                        <span>· ⏱️ {r.durationMinutes} min</span>
                        <span>· 👥 {r.playersCount} jugadores</span>
                      </div>

                      {r.preorderItems && r.preorderItems.length > 0 && (
                        <div className="mt-2 text-[11px] text-brand flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold">Botanas pre-ordenadas:</span>
                          {r.preorderItems.map((item) => (
                            <span key={item.productId} className="bg-brand/10 px-1.5 py-0.5 rounded">
                              {item.emoji} {item.qty}x {item.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        onClick={() => {
                          setSelectedLiveTableId(r.tableId)
                          setActiveTab('mi-mesa')
                        }}
                        className="h-8 px-3 rounded-lg bg-surface-3 border border-white/10 text-xs font-semibold text-brand hover:border-brand/40 transition"
                      >
                        Ver Mesa
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal para Confirmar Pedido de Producto a Mesa */}
      {orderProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm grid place-items-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-surface-3 border border-white/15 p-5 shadow-modal animate-rise">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{orderProduct.emoji}</span>
              <div>
                <h4 className="text-base font-bold text-ink-1">{orderProduct.name}</h4>
                <p className="text-xs text-brand font-mono font-semibold">
                  {money(orderProduct.price)} c/u
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between bg-surface-2 p-2 rounded-xl border border-white/5">
              <span className="text-xs text-ink-2 pl-2">Cantidad a pedir:</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setOrderQty(Math.max(1, orderQty - 1))}
                  className="w-8 h-8 rounded-lg bg-surface-4 text-ink-1 grid place-items-center font-bold active:scale-90"
                >
                  -
                </button>
                <span className="font-mono text-base font-bold text-ink-1 w-6 text-center tabular-nums">
                  {orderQty}
                </span>
                <button
                  onClick={() => setOrderQty(orderQty + 1)}
                  className="w-8 h-8 rounded-lg bg-surface-4 text-ink-1 grid place-items-center font-bold active:scale-90"
                >
                  +
                </button>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-sm font-semibold text-ink-1 px-1">
              <span>Total a cargar a {liveTable?.name}:</span>
              <span className="font-mono text-brand text-base tabular-nums">
                {money(orderProduct.price * orderQty)}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button
                onClick={() => setOrderProduct(null)}
                className="h-11 rounded-xl border border-white/10 text-ink-3 hover:text-ink-1 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleSendTableOrder}
                className="h-11 rounded-xl bg-brand text-brand-on text-xs font-bold hover:bg-brand-hover active:scale-95 transition shadow-card flex items-center justify-center gap-1.5"
              >
                <Plus size={16} />
                Pedir a Mesa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
