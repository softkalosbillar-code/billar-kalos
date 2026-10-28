import { useMemo, useState } from 'react'
import {
  ReceiptText,
  ChevronRight,
  Eye,
  Calendar,
  DollarSign,
  Clock,
  UserCheck,
  UserRound,
  Filter,
} from 'lucide-react'
import { useApp } from '../state/AppContext'
import { money, shortDateTime, duration } from '../lib/format'
import { facturableElapsedSec } from '../lib/time'
import { Modal } from '../components/Modal'
import type { PaymentMethod, Tab } from '../lib/types'

const METHOD_LABEL: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  otro: 'Otro',
}

export function Ventas() {
  const { tabs, cashiers } = useApp()
  const [all, setAll] = useState(false)
  const [selectedCashierFilter, setSelectedCashierFilter] = useState<string>('all')
  const [selectedTicket, setSelectedTicket] = useState<Tab | null>(null)

  const sales = useMemo(
    () =>
      tabs
        .filter((t) => t.status === 'cerrada')
        .sort((a, b) => (b.closedAt ?? 0) - (a.closedAt ?? 0)),
    [tabs]
  )

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todaySales = sales.filter((t) => (t.closedAt ?? 0) >= todayStart.getTime())
  const timeFiltered = all ? sales : todaySales

  // Filtrado por cajero registrado
  const shown = useMemo(() => {
    if (selectedCashierFilter === 'all') return timeFiltered
    return timeFiltered.filter(
      (t) =>
        t.closedByCashierId === selectedCashierFilter ||
        t.closedByCashierUsername === selectedCashierFilter ||
        t.closedByCashierName === selectedCashierFilter
    )
  }, [timeFiltered, selectedCashierFilter])

  const total = shown.reduce((s, t) => s + (t.totals?.total ?? 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-1 flex items-center gap-2">
            <ReceiptText size={24} className="text-brand" />
            <span>Historial de Ventas & Tickets</span>
          </h1>
          <p className="text-sm text-ink-2 mt-1">
            {shown.length} tickets liquidados · Total recaudado:{' '}
            <strong className="text-brand font-mono">{money(total)}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setAll((v) => !v)}
            className="h-10 px-4 rounded-xl bg-surface-2 border border-white/10 text-xs font-semibold text-ink-1 hover:border-white/25 transition active:scale-95"
          >
            {all ? 'Ver solo hoy' : 'Ver todo el histórico'}
          </button>
        </div>
      </div>

      {/* Filter by Registered Cashier */}
      {cashiers.length > 0 && (
        <div className="flex items-center gap-2 bg-surface-2 p-2.5 rounded-xl border border-white/10 overflow-x-auto scrollbar-none">
          <span className="text-xs font-semibold text-ink-3 uppercase tracking-wider flex items-center gap-1.5 pl-1 shrink-0">
            <Filter size={13} className="text-brand" />
            <span>Filtrar por Cajero:</span>
          </span>
          <button
            onClick={() => setSelectedCashierFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              selectedCashierFilter === 'all'
                ? 'bg-brand text-brand-on shadow-sm'
                : 'bg-surface-3 text-ink-2 hover:text-ink-1 border border-white/5'
            }`}
          >
            Todos los cajeros
          </button>
          {cashiers.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCashierFilter(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                selectedCashierFilter === c.id
                  ? 'bg-brand text-brand-on shadow-sm'
                  : 'bg-surface-3 text-ink-2 hover:text-ink-1 border border-white/5'
              }`}
            >
              {c.name} (@{c.username})
            </button>
          ))}
        </div>
      )}

      {/* Ticket List */}
      {shown.length === 0 ? (
        <div className="grid place-items-center py-20 text-center rounded-card border border-white/5 bg-surface-1/40">
          <ReceiptText size={40} className="text-ink-3 opacity-60 mb-2" />
          <p className="text-sm font-semibold text-ink-1">
            Sin ventas {all ? 'registradas' : 'el día de hoy'}{' '}
            {selectedCashierFilter !== 'all' ? 'para este cajero' : ''}
          </p>
          <p className="text-xs text-ink-3 mt-1">
            Los tickets cobrados y liquidados aparecerán aquí automáticamente.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {shown.map((t) => {
            const primaryMethod = t.payments[0] ? METHOD_LABEL[t.payments[0].method] : 'Efectivo'
            const isSplit = t.payments.length > 1
            const cashierLabel = t.closedByCashierName || 'Cajero de Turno'
            const cashierUsername = t.closedByCashierUsername

            return (
              <div
                key={t.id}
                onClick={() => setSelectedTicket(t)}
                className="flex items-center gap-4 rounded-card border border-white/10 bg-surface-2 p-4 hover:border-brand/40 cursor-pointer active:scale-[0.99] transition shadow-card"
              >
                <div className="w-11 h-11 rounded-xl bg-brand/10 border border-brand/20 text-brand grid place-items-center text-lg shrink-0">
                  🎱
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-ink-1 flex items-center gap-2 flex-wrap">
                    <span>{t.tableName}</span>
                    {isSplit && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-surface-4 text-brand">
                        Pago Mixto
                      </span>
                    )}
                    {/* Cashier attribution badge */}
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-2 bg-surface-3 px-2 py-0.5 rounded-md border border-white/5">
                      <UserCheck size={12} className="text-brand shrink-0" />
                      <span>{cashierLabel}</span>
                      {cashierUsername && (
                        <span className="text-brand font-mono text-[10px]">@{cashierUsername}</span>
                      )}
                    </span>
                  </div>

                  <div className="text-xs text-ink-3 mt-1">
                    {shortDateTime(t.closedAt ?? t.openedAt)} ·{' '}
                    {t.items.reduce((s, i) => s + i.qty, 0)} consumos + renta de mesa
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-mono text-base font-bold text-ink-1 tabular-nums">
                    {money(t.totals?.total ?? 0)}
                  </div>
                  <div className="text-[11px] text-ink-3 capitalize">
                    {isSplit ? 'Varios métodos' : primaryMethod}
                  </div>
                </div>

                <ChevronRight size={18} className="text-ink-3 shrink-0" />
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Detalle de Ticket */}
      <Modal
        open={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        title={selectedTicket ? `Ticket de Cobro: ${selectedTicket.tableName}` : ''}
      >
        {selectedTicket && (
          <div className="space-y-4 text-xs">
            {/* Cashier attribution banner */}
            <div className="p-3.5 rounded-xl bg-surface-3 border border-brand/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand text-brand-on font-bold grid place-items-center text-xs uppercase">
                  {(selectedTicket.closedByCashierName || 'C').charAt(0)}
                </div>
                <div>
                  <span className="text-[10px] text-ink-3 uppercase block">Cajero que Cobró:</span>
                  <span className="font-bold text-sm text-ink-1">
                    {selectedTicket.closedByCashierName || 'Cajero de Turno'}
                  </span>
                  {selectedTicket.closedByCashierUsername && (
                    <span className="ml-1.5 font-mono text-brand text-xs">
                      @{selectedTicket.closedByCashierUsername}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                Liquidado
              </span>
            </div>

            <div className="p-3 rounded-xl bg-surface-1 border border-white/5 space-y-1.5">
              <div className="flex justify-between text-ink-3">
                <span>Apertura de Mesa:</span>
                <span className="text-ink-1 font-mono">
                  {new Date(selectedTicket.openedAt).toLocaleString('es-MX')}
                </span>
              </div>
              <div className="flex justify-between text-ink-3">
                <span>Cierre / Cobro Liquidado:</span>
                <span className="text-ink-1 font-mono">
                  {selectedTicket.closedAt
                    ? new Date(selectedTicket.closedAt).toLocaleString('es-MX')
                    : '—'}
                </span>
              </div>
              {selectedTicket.rental && (
                <div className="flex justify-between text-ink-3">
                  <span>Tiempo Facturable:</span>
                  <span className="text-brand font-mono font-bold">
                    {duration(
                      facturableElapsedSec(
                        selectedTicket.rental,
                        selectedTicket.rental.endedAt ?? selectedTicket.closedAt ?? Date.now()
                      )
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* Consumos */}
            <div>
              <div className="font-semibold text-ink-2 uppercase tracking-wider pb-1.5 border-b border-white/10">
                Desglose de Ítems & Consumos
              </div>
              <div className="divide-y divide-white/5 max-h-48 overflow-y-auto pr-1">
                <div className="py-2 flex justify-between">
                  <span>Renta de Mesa ({selectedTicket.tableName})</span>
                  <span className="font-mono font-semibold text-ink-1">
                    {money(selectedTicket.totals?.rentalCharge ?? 0)}
                  </span>
                </div>
                {selectedTicket.items.map((i) => (
                  <div key={i.id} className="py-2 flex justify-between">
                    <span>
                      {i.emoji} {i.name} (x{i.qty})
                    </span>
                    <span className="font-mono text-ink-1">{money(i.qty * i.unitPrice)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totales */}
            <div className="pt-2 border-t border-white/10 space-y-1">
              <div className="flex justify-between text-ink-2">
                <span>Subtotal:</span>
                <span className="font-mono text-ink-1">
                  {money(selectedTicket.totals?.subtotal ?? 0)}
                </span>
              </div>
              <div className="flex justify-between text-ink-2">
                <span>IVA (16%):</span>
                <span className="font-mono text-ink-1">{money(selectedTicket.totals?.tax ?? 0)}</span>
              </div>
              {selectedTicket.totals?.discount ? (
                <div className="flex justify-between text-emerald-400 font-semibold">
                  <span>Descuento aplicado:</span>
                  <span className="font-mono">-{money(selectedTicket.totals.discount)}</span>
                </div>
              ) : null}
              {selectedTicket.totals?.tip ? (
                <div className="flex justify-between text-brand font-semibold">
                  <span>Propina:</span>
                  <span className="font-mono">+{money(selectedTicket.totals.tip)}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-sm font-bold text-ink-1 pt-1.5 border-t border-white/10">
                <span>Total Cobrado:</span>
                <span className="font-mono text-xl text-brand tabular-nums">
                  {money(selectedTicket.totals?.total ?? 0)}
                </span>
              </div>
            </div>

            {/* Pagos */}
            <div className="pt-1">
              <span className="text-[11px] text-ink-3 uppercase block mb-1">
                Métodos de Pago & Cajero Receptor:
              </span>
              <div className="space-y-1.5">
                {selectedTicket.payments.map((p, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-surface-1 border border-white/5 flex items-center justify-between capitalize text-[11px]"
                  >
                    <div>
                      <span className="font-medium text-ink-1">{METHOD_LABEL[p.method]}</span>
                      {(p.cashierName || selectedTicket.closedByCashierName) && (
                        <span className="text-ink-3 block text-[10px]">
                          Cobrado por: {p.cashierName || selectedTicket.closedByCashierName}
                        </span>
                      )}
                    </div>
                    <span className="font-mono font-bold text-ink-1">{money(p.amount)}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setSelectedTicket(null)}
              className="mt-2 w-full h-11 rounded-xl bg-surface-3 border border-white/10 text-ink-1 font-semibold text-xs hover:bg-surface-4 transition"
            >
              Cerrar Ticket
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}
