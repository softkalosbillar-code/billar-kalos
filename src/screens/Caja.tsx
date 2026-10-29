import { useMemo, useState } from 'react'
import {
  CircleDollarSign,
  UserCheck,
  UserRound,
  ShieldCheck,
  Clock,
  ArrowUpRight,
  TrendingUp,
  Receipt,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  Banknote,
  CreditCard,
  History,
} from 'lucide-react'
import { useApp } from '../state/AppContext'
import { money, shortDateTime } from '../lib/format'
import { Modal } from '../components/Modal'
import type { CashierInfo, PaymentMethod, Shift } from '../lib/types'

const METHOD_LABEL: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  otro: 'Otro',
}

export function Caja() {
  const { tabs, shift, shifts, cashiers, user, openShift, closeShift } = useApp()

  // Modal states
  const [openModal, setOpenModal] = useState(false)
  const [closeModal, setCloseModal] = useState(false)

  // Abrir turno form state
  const [openCash, setOpenCash] = useState('500.00')
  const [openCashierId, setOpenCashierId] = useState<string>('')
  const [openNotes, setOpenNotes] = useState('')

  // Cerrar turno form state
  const [closingCash, setClosingCash] = useState('')
  const [closeCashierId, setCloseCashierId] = useState<string>('')
  const [closeNotes, setCloseNotes] = useState('')

  // Active registered cashiers
  const activeCashiers = useMemo(() => cashiers.filter((c) => c.active), [cashiers])

  // Pre-seleccionar cajero si el usuario actual es cajero registrado
  function getSuggestedCashierId(): string {
    const matching = activeCashiers.find(
      (c) =>
        c.username.toLowerCase() === user?.name?.toLowerCase() ||
        c.name.toLowerCase() === user?.name?.toLowerCase()
    )
    if (matching) return matching.id
    return activeCashiers[0]?.id || 'admin'
  }

  // Ventas liquidadas durante el turno actual
  const shiftSales = useMemo(() => {
    if (!shift) return []
    return tabs.filter(
      (t) => t.status === 'cerrada' && (t.closedAt ?? 0) >= shift.openedAt
    )
  }, [tabs, shift])

  // Desglose por método de pago del turno actual
  const shiftByMethod = useMemo(() => {
    const m = new Map<PaymentMethod, number>()
    for (const t of shiftSales) {
      for (const p of t.payments) {
        m.set(p.method, (m.get(p.method) ?? 0) + p.amount)
      }
    }
    return m
  }, [shiftSales])

  const totalShiftSales = shiftSales.reduce((s, t) => s + (t.totals?.total ?? 0), 0)
  const totalShiftCash = shiftByMethod.get('efectivo') ?? 0
  const expectedCashInDrawer = (shift?.openingCash ?? 0) + totalShiftCash

  // Turnos pasados / cerrados ordenados cronológicamente
  const pastShifts = useMemo(() => {
    return shifts.filter((s) => s.closedAt).sort((a, b) => (b.closedAt ?? 0) - (a.closedAt ?? 0))
  }, [shifts])

  async function handleOpenSubmit(e: React.FormEvent) {
    e.preventDefault()
    const chosenCashier = activeCashiers.find((c) => c.id === (openCashierId || getSuggestedCashierId()))
    const cashierInfo: CashierInfo = chosenCashier
      ? { id: chosenCashier.id, name: chosenCashier.name, username: chosenCashier.username }
      : { id: user?.uid || 'admin', name: user?.name || 'Administrador', username: 'admin' }

    await openShift(Number(openCash) || 0, cashierInfo, openNotes.trim() || undefined)
    setOpenModal(false)
    setOpenNotes('')
  }

  async function handleCloseSubmit(e: React.FormEvent) {
    e.preventDefault()
    const chosenCashier = activeCashiers.find((c) => c.id === (closeCashierId || shift?.cashierId || getSuggestedCashierId()))
    const cashierInfo: CashierInfo = chosenCashier
      ? { id: chosenCashier.id, name: chosenCashier.name, username: chosenCashier.username }
      : { id: user?.uid || 'admin', name: user?.name || 'Administrador', username: 'admin' }

    await closeShift(Number(closingCash) || 0, cashierInfo, closeNotes.trim() || undefined)
    setCloseModal(false)
    setClosingCash('')
    setCloseNotes('')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-1 flex items-center gap-2">
            <CircleDollarSign size={26} className="text-brand" />
            <span>Control de Caja & Arqueos de Turno</span>
          </h1>
          <p className="text-sm text-ink-2 mt-1">
            {shift
              ? `Turno en operación desde ${shortDateTime(shift.openedAt)}`
              : 'No hay turno de caja abierto actualmente'}
          </p>
        </div>

        {shift ? (
          <button
            onClick={() => {
              setCloseCashierId(shift.cashierId || getSuggestedCashierId())
              setCloseModal(true)
            }}
            className="h-11 px-5 rounded-xl bg-surface-3 border border-white/10 text-ink-1 font-semibold hover:border-white/25 active:scale-95 transition shadow-card flex items-center gap-2"
          >
            <Banknote size={17} className="text-brand" />
            <span>Cerrar Turno & Arqueo</span>
          </button>
        ) : (
          <button
            onClick={() => {
              setOpenCashierId(getSuggestedCashierId())
              setOpenModal(true)
            }}
            className="h-11 px-5 rounded-xl bg-brand text-brand-on font-semibold hover:bg-brand-hover active:scale-95 transition shadow-card flex items-center gap-2"
          >
            <CircleDollarSign size={18} />
            <span>Abrir Nuevo Turno de Caja</span>
          </button>
        )}
      </div>

      {/* Info Card: Turno Activo */}
      {shift ? (
        <div className="billiard-card-frame billiard-felt p-2 shadow-modal">
          <div className="billiard-pocket billiard-pocket-tl" />
          <div className="billiard-pocket billiard-pocket-tr" />
          <div className="billiard-pocket billiard-pocket-bl" />
          <div className="billiard-pocket billiard-pocket-br" />

          <div className="billiard-felt-inner p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-brand/20 border border-brand/40 grid place-items-center text-brand font-bold text-lg">
                  {(shift.cashierName || shift.openedBy || 'C').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-ink-1">
                      {shift.cashierName || shift.openedBy || 'Cajero de Turno'}
                    </span>
                  {shift.cashierUsername && (
                    <span className="font-mono text-xs text-brand font-semibold">
                      @{shift.cashierUsername}
                    </span>
                  )}
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                    Cajero Registrado
                  </span>
                </div>
                <div className="text-xs text-ink-3 mt-0.5 flex items-center gap-2 flex-wrap">
                  <span>Apertura: {shortDateTime(shift.openedAt)}</span>
                  {shift.notes && <span>· Nota: {shift.notes}</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 self-start sm:self-auto px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Turno Activo</span>
            </div>
          </div>

          {/* Métricas del turno */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-surface-3/60 border border-white/5">
              <span className="text-[11px] text-ink-3 uppercase tracking-wider block">Fondo Inicial</span>
              <span className="font-mono text-2xl font-bold text-ink-1 tabular-nums mt-1 block">
                {money(shift.openingCash)}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-surface-3/60 border border-white/5">
              <span className="text-[11px] text-ink-3 uppercase tracking-wider block">Ventas en Efectivo</span>
              <span className="font-mono text-2xl font-bold text-brand tabular-nums mt-1 block">
                {money(totalShiftCash)}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-surface-3/60 border border-white/5">
              <span className="text-[11px] text-ink-3 uppercase tracking-wider block">Efectivo Esperado</span>
              <span className="font-mono text-2xl font-bold text-emerald-400 tabular-nums mt-1 block">
                {money(expectedCashInDrawer)}
              </span>
              <span className="text-[10px] text-ink-3 mt-0.5 block">Fondo + Efectivo cobrado</span>
            </div>

            <div className="p-4 rounded-xl bg-surface-3/60 border border-white/5">
              <span className="text-[11px] text-ink-3 uppercase tracking-wider block">Total Ventas (Todos métodos)</span>
              <span className="font-mono text-2xl font-bold text-ink-1 tabular-nums mt-1 block">
                {money(totalShiftSales)}
              </span>
              <span className="text-[10px] text-ink-3 mt-0.5 block">{shiftSales.length} tickets cobrados</span>
            </div>
          </div>

          {/* Desglose por método */}
          <div className="pt-2 flex items-center gap-2 flex-wrap text-xs text-ink-2">
            <span className="text-ink-3 font-medium">Desglose de métodos en el turno:</span>
            {(['efectivo', 'tarjeta', 'transferencia', 'otro'] as PaymentMethod[]).map((m) => {
              const val = shiftByMethod.get(m) ?? 0
              if (val <= 0) return null
              return (
                <span key={m} className="px-2.5 py-1 rounded-lg bg-surface-3 border border-white/5 font-mono">
                  {METHOD_LABEL[m]}: <strong className="text-ink-1">{money(val)}</strong>
                </span>
              )
            })}
          </div>
        </div>
      </div>
    ) : (
        <div className="p-8 rounded-2xl border border-white/10 bg-surface-2 text-center space-y-3">
          <CircleDollarSign size={44} className="mx-auto text-ink-3 opacity-60" />
          <h3 className="font-display font-semibold text-ink-1 text-base">
            No hay ningún turno de caja abierto en este momento
          </h3>
          <p className="text-xs text-ink-3 max-w-sm mx-auto">
            Abre el turno indicando el cajero registrado y el fondo de caja en efectivo para habilitar el cobro y control de mesas.
          </p>
          <button
            onClick={() => {
              setOpenCashierId(getSuggestedCashierId())
              setOpenModal(true)
            }}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-brand text-brand-on font-semibold text-xs hover:bg-brand-hover transition shadow-card"
          >
            <CircleDollarSign size={16} />
            <span>Abrir Turno de Caja</span>
          </button>
        </div>
      )}

      {/* Historial de Turnos y Arqueos */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-ink-1 flex items-center gap-2">
              <History size={18} className="text-brand" />
              <span>Historial de Arqueos & Turnos de Caja</span>
            </h2>
            <p className="text-xs text-ink-3">
              Registro auditado de cajeros que abrieron y cerraron caja con cálculo de diferencias
            </p>
          </div>
        </div>

        {pastShifts.length === 0 ? (
          <div className="p-6 rounded-card border border-white/5 bg-surface-2/40 text-center text-xs text-ink-3">
            Aún no hay turnos cerrados en el historial de arqueos.
          </div>
        ) : (
          <div className="space-y-2.5">
            {pastShifts.map((s) => {
              const diff = s.difference ?? 0
              const isExact = diff === 0
              const isShort = diff < 0
              return (
                <div
                  key={s.id}
                  className="p-4 rounded-xl border border-white/10 bg-surface-2 hover:border-white/20 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-ink-1">
                        Turno de {s.cashierName || s.openedBy || 'Cajero'}
                      </span>
                      {s.cashierUsername && (
                        <span className="font-mono text-xs text-brand font-medium">
                          @{s.cashierUsername}
                        </span>
                      )}
                      {s.closedBy && s.closedBy !== (s.cashierName || s.openedBy) && (
                        <span className="text-[11px] text-ink-3">
                          (Cerrado por: {s.closedBy})
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-ink-3 flex items-center gap-2 flex-wrap">
                      <span>📅 {shortDateTime(s.openedAt)}</span>
                      {s.closedAt && <span>→ {shortDateTime(s.closedAt)}</span>}
                      {s.ticketsCount !== undefined && <span>· {s.ticketsCount} tickets</span>}
                      {s.notes && <span>· Nota: {s.notes}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end md:self-auto">
                    <div className="text-right">
                      <span className="text-[10px] text-ink-3 block uppercase">Fondo Inicial / Final</span>
                      <span className="font-mono text-xs text-ink-2 font-medium">
                        {money(s.openingCash)} → <strong className="text-ink-1">{money(s.closingCash ?? 0)}</strong>
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-ink-3 block uppercase">Diferencia de Arqueo</span>
                      <span
                        className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                          isExact
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : isShort
                            ? 'bg-rose-500/15 text-rose-400'
                            : 'bg-amber-500/15 text-amber-300'
                        }`}
                      >
                        {isExact ? 'Exacto $0.00' : isShort ? `Faltante -${money(Math.abs(diff))}` : `Sobrante +${money(diff)}`}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* MODAL: ABRIR TURNO DE CAJA                                     */}
      {/* ============================================================== */}
      <Modal open={openModal} onClose={() => setOpenModal(false)} title="Apertura de Turno de Caja">
        <form onSubmit={handleOpenSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-2 mb-1.5">
              Cajero Registrado Responsable del Turno *
            </label>
            {activeCashiers.length > 0 ? (
              <select
                required
                value={openCashierId || getSuggestedCashierId()}
                onChange={(e) => setOpenCashierId(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-surface-2 border border-white/10 text-xs font-semibold text-ink-1 focus:outline-none focus:border-brand"
              >
                {activeCashiers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (@{c.username})
                  </option>
                ))}
                {user?.role === 'admin' && (
                  <option value="admin">
                    {user.name} (Administrador)
                  </option>
                )}
              </select>
            ) : (
              <input
                disabled
                value={user?.name || 'Administrador'}
                className="w-full h-11 px-3.5 rounded-xl bg-surface-2 border border-white/10 text-xs font-semibold text-ink-1"
              />
            )}
            <p className="text-[10px] text-ink-3 mt-1">
              El cajero registrado se vinculará a cada mesa cobrada durante este turno.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-2 mb-1.5">
              Fondo Inicial de Caja en Efectivo ($ MXN) *
            </label>
            <input
              required
              inputMode="decimal"
              value={openCash}
              onChange={(e) => setOpenCash(e.target.value)}
              placeholder="500.00"
              className="w-full h-11 px-3.5 rounded-xl bg-surface-2 border border-white/10 text-base font-mono font-bold text-ink-1 focus:outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-2 mb-1.5">
              Notas u Observaciones de Apertura (opcional)
            </label>
            <input
              value={openNotes}
              onChange={(e) => setOpenNotes(e.target.value)}
              placeholder="Ej. Cambio de billetes de 50 y 100 pesos entregado"
              className="w-full h-11 px-3.5 rounded-xl bg-surface-2 border border-white/10 text-xs text-ink-1 focus:outline-none focus:border-brand"
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setOpenModal(false)}
              className="px-4 py-2 rounded-xl text-xs text-ink-3 hover:text-ink-1"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-brand text-brand-on font-semibold text-xs hover:bg-brand-hover active:scale-95 transition shadow-card"
            >
              Iniciar Turno
            </button>
          </div>
        </form>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL: CERRAR TURNO Y ARQUEO                                   */}
      {/* ============================================================== */}
      <Modal open={closeModal} onClose={() => setCloseModal(false)} title="Cierre de Turno & Arqueo de Caja">
        <form onSubmit={handleCloseSubmit} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-surface-3 border border-white/10 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-ink-3">Cajero que abrió turno:</span>
              <span className="font-semibold text-ink-1">
                {shift?.cashierName || shift?.openedBy || 'Caja'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-3">Fondo inicial:</span>
              <span className="font-mono text-ink-1">{money(shift?.openingCash ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-3">Ventas cobradas en efectivo:</span>
              <span className="font-mono text-brand font-semibold">+{money(totalShiftCash)}</span>
            </div>
            <div className="pt-2 border-t border-white/10 flex items-center justify-between font-bold text-sm">
              <span className="text-ink-1">Efectivo esperado en caja:</span>
              <span className="font-mono text-emerald-400">{money(expectedCashInDrawer)}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-2 mb-1.5">
              Cajero Responsable del Cierre *
            </label>
            {activeCashiers.length > 0 ? (
              <select
                value={closeCashierId || shift?.cashierId || getSuggestedCashierId()}
                onChange={(e) => setCloseCashierId(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-surface-2 border border-white/10 text-xs font-semibold text-ink-1 focus:outline-none focus:border-brand"
              >
                {activeCashiers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (@{c.username})
                  </option>
                ))}
                {user?.role === 'admin' && (
                  <option value="admin">
                    {user.name} (Administrador)
                  </option>
                )}
              </select>
            ) : (
              <input
                disabled
                value={user?.name || 'Administrador'}
                className="w-full h-11 px-3.5 rounded-xl bg-surface-2 border border-white/10 text-xs font-semibold text-ink-1"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-2 mb-1.5">
              Efectivo Contado al Cierre ($ MXN) *
            </label>
            <input
              required
              inputMode="decimal"
              value={closingCash}
              onChange={(e) => setClosingCash(e.target.value)}
              placeholder="Ingresa el monto contado"
              className="w-full h-11 px-3.5 rounded-xl bg-surface-2 border border-white/10 text-base font-mono font-bold text-ink-1 focus:outline-none focus:border-brand"
            />
          </div>

          {/* Comparación de Arqueo en vivo */}
          {closingCash.trim() !== '' && (
            <div className="p-3 rounded-xl bg-surface-2 border border-white/5 flex items-center justify-between text-xs">
              <span className="text-ink-3">Diferencia de Arqueo:</span>
              <span
                className={`font-mono font-bold text-sm ${
                  Number(closingCash) - expectedCashInDrawer === 0
                    ? 'text-emerald-400'
                    : Number(closingCash) - expectedCashInDrawer < 0
                    ? 'text-rose-400'
                    : 'text-amber-300'
                }`}
              >
                {Number(closingCash) - expectedCashInDrawer === 0
                  ? 'Arqueo Exacto ($0.00)'
                  : Number(closingCash) - expectedCashInDrawer < 0
                  ? `Faltante: -${money(Math.abs(Number(closingCash) - expectedCashInDrawer))}`
                  : `Sobrante: +${money(Number(closingCash) - expectedCashInDrawer)}`}
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-ink-2 mb-1.5">
              Observaciones de Cierre (opcional)
            </label>
            <input
              value={closeNotes}
              onChange={(e) => setCloseNotes(e.target.value)}
              placeholder="Ej. Arqueo verificado y entregado a gerencia"
              className="w-full h-11 px-3.5 rounded-xl bg-surface-2 border border-white/10 text-xs text-ink-1 focus:outline-none focus:border-brand"
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setCloseModal(false)}
              className="px-4 py-2 rounded-xl text-xs text-ink-3 hover:text-ink-1"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-brand text-brand-on font-semibold text-xs hover:bg-brand-hover active:scale-95 transition shadow-card"
            >
              Guardar Cierre y Arqueo
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
