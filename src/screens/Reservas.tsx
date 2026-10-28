import { useMemo, useState } from 'react'
import {
  CalendarDays,
  Plus,
  Clock,
  Phone,
  User,
  Users,
  CheckCircle2,
  XCircle,
  Play,
  Calendar,
  MessageCircle,
  Search,
  DollarSign,
} from 'lucide-react'
import { useApp } from '../state/AppContext'
import { money } from '../lib/format'
import { Modal } from '../components/Modal'
import type { Reservation, ReservationStatus } from '../lib/types'
import { useNavigate } from 'react-router-dom'

export function Reservas() {
  const { reservations, tables, saveReservation, cancelReservation, openRental } = useApp()
  const navigate = useNavigate()

  const todayStr = new Date().toISOString().slice(0, 10)
  const [selectedDate, setSelectedDate] = useState<string>(todayStr)
  const [statusFilter, setStatusFilter] = useState<'todas' | ReservationStatus>('todas')
  const [searchTerm, setSearchTerm] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  // Form state
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [tableId, setTableId] = useState(tables[0]?.id || 't1')
  const [timeSlot, setTimeSlot] = useState('19:00')
  const [durationMinutes, setDurationMinutes] = useState(120)
  const [playersCount, setPlayersCount] = useState(4)
  const [deposit, setDeposit] = useState(0)
  const [notes, setNotes] = useState('')

  // Filtered reservations
  const filtered = useMemo(() => {
    return reservations.filter((r) => {
      const matchDate = selectedDate ? r.date === selectedDate : true
      const matchStatus = statusFilter === 'todas' ? true : r.status === statusFilter
      const matchSearch = searchTerm
        ? r.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.customerPhone.includes(searchTerm) ||
          r.tableName.toLowerCase().includes(searchTerm.toLowerCase())
        : true
      return matchDate && matchStatus && matchSearch
    }).sort((a, b) => a.timeSlot.localeCompare(b.timeSlot))
  }, [reservations, selectedDate, statusFilter, searchTerm])

  const stats = useMemo(() => {
    const todayRes = reservations.filter((r) => r.date === selectedDate)
    const confirmed = todayRes.filter((r) => r.status === 'confirmada').length
    const totalDeposits = todayRes.reduce((acc, r) => acc + (r.deposit || 0), 0)
    return {
      total: todayRes.length,
      confirmed,
      deposits: totalDeposits,
    }
  }, [reservations, selectedDate])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!customerName.trim() || !customerPhone.trim()) return

    const selectedTable = tables.find((t) => t.id === tableId)
    const newRes: Reservation = {
      id: `res-${Date.now()}`,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      tableId,
      tableName: selectedTable?.name || 'Mesa',
      date: selectedDate,
      timeSlot,
      durationMinutes: Number(durationMinutes),
      playersCount: Number(playersCount),
      deposit: Number(deposit),
      status: 'confirmada',
      notes: notes.trim(),
      createdAt: Date.now(),
    }

    await saveReservation(newRes)
    setModalOpen(false)
    // Reset form
    setCustomerName('')
    setCustomerPhone('')
    setDeposit(0)
    setNotes('')
  }

  async function startRentalFromReservation(res: Reservation) {
    const tab = await openRental(res.tableId)
    if (tab) {
      await saveReservation({ ...res, status: 'completada' })
      navigate(`/mesa/${tab.id}`)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-1">Reservas</h1>
          <p className="text-sm text-ink-2 mt-1">
            Control de mesas reservadas y anticipos desde mostrador y móvil
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-brand text-brand-on font-semibold hover:bg-brand-hover active:scale-[0.98] transition shadow-card"
        >
          <Plus size={20} />
          <span>Nueva Reserva</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-card border border-white/10 bg-surface-2">
          <div className="text-xs text-ink-3 uppercase tracking-wider">Reservas Fecha</div>
          <div className="mt-1 font-display text-2xl font-bold text-ink-1 tabular-nums">
            {stats.total}
          </div>
        </div>
        <div className="p-4 rounded-card border border-white/10 bg-surface-2">
          <div className="text-xs text-ink-3 uppercase tracking-wider">Confirmadas</div>
          <div className="mt-1 font-display text-2xl font-bold text-emerald-400 tabular-nums">
            {stats.confirmed}
          </div>
        </div>
        <div className="p-4 rounded-card border border-white/10 bg-surface-2">
          <div className="text-xs text-ink-3 uppercase tracking-wider">Anticipos</div>
          <div className="mt-1 font-display text-2xl font-bold text-brand tabular-nums">
            {money(stats.deposits)}
          </div>
        </div>
      </div>

      {/* Date & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Date Quick Selector */}
        <div className="flex items-center gap-2 p-1 bg-surface-2 rounded-xl border border-white/10 overflow-x-auto">
          <button
            onClick={() => setSelectedDate(todayStr)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              selectedDate === todayStr ? 'bg-brand text-brand-on' : 'text-ink-2 hover:text-ink-1'
            }`}
          >
            Hoy
          </button>
          <button
            onClick={() => {
              const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
              setSelectedDate(tomorrow)
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              selectedDate !== todayStr && selectedDate === new Date(Date.now() + 86400000).toISOString().slice(0, 10)
                ? 'bg-brand text-brand-on'
                : 'text-ink-2 hover:text-ink-1'
            }`}
          >
            Mañana
          </button>
          <div className="flex items-center gap-1.5 px-2 text-xs text-ink-2">
            <Calendar size={14} />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-ink-1 text-xs focus:outline-none cursor-pointer"
            />
          </div>
        </div>

        {/* Search */}
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por cliente, teléfono o mesa..."
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-surface-2 border border-white/10 text-sm text-ink-1 placeholder:text-ink-3 focus:outline-none focus:border-brand/60"
          />
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1 p-1 bg-surface-2 rounded-xl border border-white/10">
          {(['todas', 'confirmada', 'completada', 'cancelada'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition whitespace-nowrap ${
                statusFilter === s ? 'bg-surface-4 text-ink-1 font-semibold' : 'text-ink-3 hover:text-ink-1'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Reservation Cards List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 border border-white/5 bg-surface-1/40 rounded-card">
          <CalendarDays size={44} className="mx-auto text-ink-3 opacity-60 mb-3" />
          <p className="text-ink-1 font-semibold text-base">No hay reservas para esta fecha</p>
          <p className="text-ink-3 text-xs mt-1">Registra una reserva para apartar una mesa con anticipo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {filtered.map((res) => {
            const isConfirmed = res.status === 'confirmada'
            return (
              <div
                key={res.id}
                className={`p-4 rounded-card border transition-all ${
                  isConfirmed
                    ? 'border-brand/30 bg-surface-2'
                    : res.status === 'completada'
                    ? 'border-emerald-500/20 bg-surface-2/60 opacity-80'
                    : 'border-white/5 bg-surface-2/40 opacity-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-mono font-bold text-brand bg-brand/10 px-2 py-0.5 rounded">
                      {res.timeSlot} hrs ({res.durationMinutes}m)
                    </span>
                    <h3 className="text-base font-semibold text-ink-1 mt-2">{res.customerName}</h3>
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full capitalize ${
                      res.status === 'confirmada'
                        ? 'bg-amber-400/15 text-amber-300'
                        : res.status === 'completada'
                        ? 'bg-emerald-400/15 text-emerald-300'
                        : 'bg-rose-400/15 text-rose-300'
                    }`}
                  >
                    {res.status}
                  </span>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-ink-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink-1">{res.tableName}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Users size={14} className="text-ink-3" />
                      {res.playersCount} jugadores
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <a
                      href={`tel:${res.customerPhone}`}
                      className="flex items-center gap-1.5 text-ink-1 hover:text-brand transition"
                    >
                      <Phone size={13} className="text-ink-3" />
                      {res.customerPhone}
                    </a>
                    <a
                      href={`https://wa.me/${res.customerPhone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                    >
                      <MessageCircle size={13} />
                      WhatsApp
                    </a>
                  </div>
                  {res.deposit > 0 && (
                    <div className="pt-1 flex items-center justify-between text-xs font-semibold text-brand">
                      <span>Anticipo pagado:</span>
                      <span className="tabular-nums">{money(res.deposit)}</span>
                    </div>
                  )}
                  {res.notes && (
                    <p className="pt-1 text-[11px] text-ink-3 italic line-clamp-2">"{res.notes}"</p>
                  )}
                </div>

                {isConfirmed && (
                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2">
                    <button
                      onClick={() => startRentalFromReservation(res)}
                      className="flex-1 h-9 rounded-lg bg-brand text-brand-on text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-brand-hover active:scale-[0.97] transition"
                    >
                      <Play size={14} />
                      Iniciar Renta
                    </button>
                    <button
                      onClick={() => cancelReservation(res.id)}
                      className="h-9 px-3 rounded-lg border border-white/10 text-ink-3 hover:text-rose-400 text-xs font-medium transition"
                      title="Cancelar reserva"
                    >
                      <XCircle size={16} />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Nueva Reserva */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nueva Reserva de Mesa">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-2 mb-1.5">Nombre del Cliente *</label>
            <input
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Ej. Roberto Sánchez"
              className="w-full h-11 px-3.5 rounded-xl bg-surface-2 border border-white/10 text-sm text-ink-1 focus:outline-none focus:border-brand/60"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1.5">Teléfono / WhatsApp *</label>
              <input
                required
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="55 1234 5678"
                className="w-full h-11 px-3.5 rounded-xl bg-surface-2 border border-white/10 text-sm text-ink-1 focus:outline-none focus:border-brand/60"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1.5">Mesa Asignada</label>
              <select
                value={tableId}
                onChange={(e) => setTableId(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-surface-2 border border-white/10 text-sm text-ink-1 focus:outline-none focus:border-brand/60"
              >
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.type} · ${t.ratePerHour}/h)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1.5">Hora Inicio</label>
              <input
                type="time"
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-surface-2 border border-white/10 text-sm text-ink-1 focus:outline-none focus:border-brand/60"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1.5">Duración (min)</label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full h-11 px-3 rounded-xl bg-surface-2 border border-white/10 text-sm text-ink-1 focus:outline-none focus:border-brand/60"
              >
                <option value={60}>1 hora (60m)</option>
                <option value={90}>1.5 horas (90m)</option>
                <option value={120}>2 horas (120m)</option>
                <option value={180}>3 horas (180m)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1.5">Jugadores</label>
              <input
                type="number"
                min={1}
                max={12}
                value={playersCount}
                onChange={(e) => setPlayersCount(Number(e.target.value))}
                className="w-full h-11 px-3 rounded-xl bg-surface-2 border border-white/10 text-sm text-ink-1 focus:outline-none focus:border-brand/60"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-2 mb-1.5">Anticipo / Depósito ($ MXN)</label>
            <input
              type="number"
              min={0}
              step={10}
              value={deposit}
              onChange={(e) => setDeposit(Number(e.target.value))}
              placeholder="0"
              className="w-full h-11 px-3.5 rounded-xl bg-surface-2 border border-white/10 text-sm text-ink-1 focus:outline-none focus:border-brand/60"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-2 mb-1.5">Notas adicionales (opcional)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Cumpleaños, reservar juego de bolas pro..."
              className="w-full p-3 rounded-xl bg-surface-2 border border-white/10 text-sm text-ink-1 focus:outline-none focus:border-brand/60 resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-ink-3 hover:text-ink-1 text-sm font-medium transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-brand text-brand-on font-semibold text-sm hover:bg-brand-hover active:scale-[0.98] transition shadow-card"
            >
              Confirmar Reserva
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
