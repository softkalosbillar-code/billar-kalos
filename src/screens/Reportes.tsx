import { useMemo, useState, type ReactNode } from 'react'
import {
  BarChart3,
  TrendingUp,
  Clock,
  DollarSign,
  ShieldAlert,
  Search,
  Filter,
  Users,
  Calendar,
  Layers,
  ArrowUpRight,
  PieChart,
  FileSpreadsheet,
} from 'lucide-react'
import { useApp } from '../state/AppContext'
import { money } from '../lib/format'
import { facturableElapsedSec } from '../lib/time'
import type { AuditLog, Tab } from '../lib/types'

type TimeRange = 'hoy' | 'semana' | 'mes'
type ReportTab = 'metricas' | 'auditoria'

export function Reportes() {
  const { tabs, tables, auditLogs, settings } = useApp()
  const [timeRange, setTimeRange] = useState<TimeRange>('hoy')
  const [activeTab, setActiveTab] = useState<ReportTab>('metricas')
  const [auditSearch, setAuditSearch] = useState('')
  const [auditActionFilter, setAuditActionFilter] = useState('todas')

  // Calculate start timestamp based on range
  const rangeStart = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    if (timeRange === 'semana') {
      d.setDate(d.getDate() - 7)
    } else if (timeRange === 'mes') {
      d.setDate(d.getDate() - 30)
    }
    return d.getTime()
  }, [timeRange])

  // Filtered closed tabs within timeframe
  const filteredSales = useMemo(() => {
    return tabs.filter((t) => t.status === 'cerrada' && (t.closedAt ?? 0) >= rangeStart)
  }, [tabs, rangeStart])

  // Financial aggregates
  const totalVentas = filteredSales.reduce((s, t) => s + (t.totals?.total ?? 0), 0)
  const totalRenta = filteredSales.reduce((s, t) => s + (t.totals?.rentalCharge ?? 0), 0)
  const totalBarra = filteredSales.reduce((s, t) => s + (t.totals?.productsSubtotal ?? 0), 0)
  const totalPropinas = filteredSales.reduce((s, t) => s + (t.totals?.tip ?? 0), 0)
  const totalDescuentos = filteredSales.reduce((s, t) => s + (t.totals?.discount ?? 0), 0)
  const ticketPromedio = filteredSales.length ? totalVentas / filteredSales.length : 0

  // Time & Occupancy metrics
  const totalHorasRentadas = filteredSales.reduce((s, t) => {
    if (!t.rental) return s
    return s + facturableElapsedSec(t.rental, t.rental.endedAt ?? t.openedAt) / 3600
  }, 0)

  // Real-time occupation
  const occupiedCount = tables.filter(
    (t) => t.status === 'ocupada' || t.status === 'pausada',
  ).length
  const occupationRate = tables.length ? (occupiedCount / tables.length) * 100 : 0

  // RevPASH (Revenue Per Available Table Hour)
  // Formula: Revenue / (Tables * 12 hours * days)
  const daysInRange = timeRange === 'hoy' ? 1 : timeRange === 'semana' ? 7 : 30
  const availableTableHours = tables.length * 12 * daysInRange
  const revpash = availableTableHours > 0 ? totalRenta / availableTableHours : 0

  // Top Products
  const topProducts = useMemo(() => {
    const m = new Map<string, { name: string; emoji: string; qty: number; revenue: number }>()
    for (const t of filteredSales) {
      for (const i of t.items) {
        const cur = m.get(i.productId) ?? {
          name: i.name,
          emoji: i.emoji,
          qty: 0,
          revenue: 0,
        }
        cur.qty += i.qty
        cur.revenue += i.qty * i.unitPrice
        m.set(i.productId, cur)
      }
    }
    return [...m.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 6)
  }, [filteredSales])

  // Performance by table
  const byTable = useMemo(() => {
    const m = new Map<string, { revenue: number; hours: number; count: number }>()
    for (const t of filteredSales) {
      const cur = m.get(t.tableName) ?? { revenue: 0, hours: 0, count: 0 }
      cur.revenue += t.totals?.total ?? 0
      cur.count += 1
      if (t.rental) {
        cur.hours += facturableElapsedSec(t.rental, t.rental.endedAt ?? t.openedAt) / 3600
      }
      m.set(t.tableName, cur)
    }
    return [...m.entries()].sort((a, b) => b[1].revenue - a[1].revenue)
  }, [filteredSales])

  // Payment methods breakdown
  const paymentBreakdown = useMemo(() => {
    const m = { efectivo: 0, tarjeta: 0, transferencia: 0 }
    for (const t of filteredSales) {
      for (const p of t.payments) {
        if (p.method === 'efectivo') m.efectivo += p.amount
        else if (p.method === 'tarjeta') m.tarjeta += p.amount
        else m.transferencia += p.amount
      }
    }
    return m
  }, [filteredSales])

  // Desglose de recaudación por cajero registrado
  const byCashier = useMemo(() => {
    const map = new Map<string, { name: string; username?: string | null; count: number; total: number }>()
    for (const t of filteredSales) {
      const cName = t.closedByCashierName || 'Caja Principal'
      const cUser = t.closedByCashierUsername
      const prev = map.get(cName) ?? { name: cName, username: cUser, count: 0, total: 0 }
      prev.count += 1
      prev.total += t.totals?.total ?? 0
      map.set(cName, prev)
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [filteredSales])

  // Filtered Audit logs
  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const matchesSearch = auditSearch
        ? log.details.toLowerCase().includes(auditSearch.toLowerCase()) ||
          log.userName.toLowerCase().includes(auditSearch.toLowerCase()) ||
          (log.tableName && log.tableName.toLowerCase().includes(auditSearch.toLowerCase()))
        : true
      const matchesAction =
        auditActionFilter === 'todas' ? true : log.action === auditActionFilter
      return matchesSearch && matchesAction
    })
  }, [auditLogs, auditSearch, auditActionFilter])

  return (
    <div className="space-y-6">
      {/* Top Header & Section Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-1">
            Panel Administrativo & Reportes
          </h1>
          <p className="text-sm text-ink-2 mt-1">
            Ocupación en tiempo real, ingresos detallados y bitácora de auditoría
          </p>
        </div>

        {/* Range Selector */}
        {activeTab === 'metricas' && (
          <div className="flex items-center gap-1 p-1 bg-surface-2 rounded-xl border border-white/10 self-start sm:self-auto">
            {(
              [
                { id: 'hoy', label: 'Hoy' },
                { id: 'semana', label: '7 Días' },
                { id: 'mes', label: 'Mes' },
              ] as const
            ).map((r) => (
              <button
                key={r.id}
                onClick={() => setTimeRange(r.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                  timeRange === r.id
                    ? 'bg-brand text-brand-on shadow-sm'
                    : 'text-ink-2 hover:text-ink-1'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Tab Toggle: Métricas vs Auditoría */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-1">
        <button
          onClick={() => setActiveTab('metricas')}
          className={`pb-2 px-3 text-sm font-semibold transition border-b-2 flex items-center gap-2 ${
            activeTab === 'metricas'
              ? 'border-brand text-brand'
              : 'border-transparent text-ink-3 hover:text-ink-1'
          }`}
        >
          <BarChart3 size={17} />
          Estadísticas & Ocupación
        </button>
        <button
          onClick={() => setActiveTab('auditoria')}
          className={`pb-2 px-3 text-sm font-semibold transition border-b-2 flex items-center gap-2 ${
            activeTab === 'auditoria'
              ? 'border-brand text-brand'
              : 'border-transparent text-ink-3 hover:text-ink-1'
          }`}
        >
          <ShieldAlert size={17} />
          Bitácora de Auditoría ({auditLogs.length})
        </button>
      </div>

      {activeTab === 'metricas' ? (
        <>
          {/* Real-time Occupancy & RevPASH Banner */}
          <div className="p-5 rounded-card border border-brand/30 bg-surface-2 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full blur-3xl pointer-events-none" />
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase tracking-wider text-ink-3 font-semibold">
                  Ocupación de Sala en Tiempo Real
                </span>
                <div className="flex items-baseline gap-3 mt-1">
                  <span className="font-display text-3xl sm:text-4xl font-extrabold text-ink-1 tabular-nums">
                    {occupationRate.toFixed(0)}%
                  </span>
                  <span className="text-sm font-medium text-emerald-400">
                    {occupiedCount} de {tables.length} mesas en juego
                  </span>
                </div>
              </div>

              {/* Occupancy Bar Visual */}
              <div className="w-full md:w-64 space-y-1.5">
                <div className="flex justify-between text-xs text-ink-2">
                  <span>Capacidad en vivo:</span>
                  <span className="font-semibold text-ink-1">
                    {occupiedCount}/{tables.length} mesas
                  </span>
                </div>
                <div className="h-3 w-full bg-surface-4 rounded-full overflow-hidden p-0.5 border border-white/5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-brand transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(5, occupationRate))}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 4 Primary Financial KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi
              label="Ingresos Totales"
              value={money(totalVentas)}
              accent
              sub={`${filteredSales.length} cuentas cobradas`}
            />
            <Kpi
              label="Renta de Mesas"
              value={money(totalRenta)}
              sub={`${totalHorasRentadas.toFixed(1)} horas vendidas`}
            />
            <Kpi
              label="Barra & Botanas"
              value={money(totalBarra)}
              sub={`Attach: ${totalHorasRentadas > 0 ? money(totalBarra / totalHorasRentadas) : '$0'}/h`}
            />
            <Kpi
              label="RevPASH (Mesa-Hora)"
              value={money(revpash)}
              sub="Ingreso/hora disponible"
            />
          </div>

          {/* Second Row: Detailed Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Mix de Ingresos */}
            <Panel title="Mix de Ingresos">
              <div className="space-y-3 pt-1">
                <IncomeRow
                  label="Tiempo de Mesa"
                  amount={totalRenta}
                  total={totalVentas}
                  color="bg-brand"
                />
                <IncomeRow
                  label="Barra & Bebidas"
                  amount={totalBarra}
                  total={totalVentas}
                  color="bg-emerald-400"
                />
                <IncomeRow
                  label="Propinas Recibidas"
                  amount={totalPropinas}
                  total={totalVentas}
                  color="bg-amber-400"
                />
                {totalDescuentos > 0 && (
                  <div className="pt-2 border-t border-white/5 flex justify-between text-xs text-rose-400">
                    <span>Descuentos otorgados:</span>
                    <span className="font-mono font-semibold">-{money(totalDescuentos)}</span>
                  </div>
                )}
              </div>
            </Panel>

            {/* Métodos de Pago */}
            <Panel title="Desglose por Método de Pago">
              <div className="space-y-3 pt-1">
                <IncomeRow
                  label="Efectivo en Caja"
                  amount={paymentBreakdown.efectivo}
                  total={totalVentas}
                  color="bg-emerald-400"
                />
                <IncomeRow
                  label="Tarjeta Débito/Crédito"
                  amount={paymentBreakdown.tarjeta}
                  total={totalVentas}
                  color="bg-sky-400"
                />
                <IncomeRow
                  label="Transferencia SPEI"
                  amount={paymentBreakdown.transferencia}
                  total={totalVentas}
                  color="bg-purple-400"
                />
              </div>
            </Panel>

            {/* Promedios de sesión */}
            <Panel title="Comportamiento del Cliente">
              <div className="space-y-3 pt-1 text-xs">
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-ink-2">Ticket Promedio por Mesa:</span>
                  <span className="font-mono font-bold text-ink-1">{money(ticketPromedio)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-ink-2">Duración promedio de juego:</span>
                  <span className="font-mono font-bold text-ink-1">
                    {filteredSales.length
                      ? `${(totalHorasRentadas / filteredSales.length).toFixed(1)} horas`
                      : '0 horas'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-ink-2">Consumo de barra por mesa:</span>
                  <span className="font-mono font-bold text-ink-1">
                    {filteredSales.length ? money(totalBarra / filteredSales.length) : '$0'}
                  </span>
                </div>
              </div>
            </Panel>
          </div>

          {/* Third Row: Tables ranking & Top Products */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Sales per table */}
            <Panel title="Rendimiento por Mesa de Billar">
              {byTable.length === 0 ? (
                <Empty text="No hay ventas registradas en este período" />
              ) : (
                <div className="space-y-3 pt-1">
                  {byTable.map(([name, data]) => {
                    const max = byTable[0][1].revenue || 1
                    return (
                      <div key={name} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-ink-1">{name}</span>
                          <span className="text-ink-2 tabular-nums">
                            {data.hours.toFixed(1)}h jugadas ·{' '}
                            <strong className="text-brand font-mono">{money(data.revenue)}</strong>
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-surface-3 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-brand"
                            style={{ width: `${Math.max(4, (data.revenue / max) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Panel>

            {/* Top Products */}
            <Panel title="Productos Más Vendidos (Barra & Botana)">
              {topProducts.length === 0 ? (
                <Empty text="No hay productos vendidos en este período" />
              ) : (
                <div className="divide-y divide-white/5 pt-1">
                  {topProducts.map((p, i) => (
                    <div key={p.name} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 text-center font-bold text-ink-3">{i + 1}</span>
                        <span className="text-lg">{p.emoji}</span>
                        <span className="font-medium text-ink-1 truncate">{p.name}</span>
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <div className="font-mono font-bold text-ink-1 tabular-nums">
                          {money(p.revenue)}
                        </div>
                        <div className="text-[11px] text-ink-3">{p.qty} unidades</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          {/* Fourth Row: Cashier Performance */}
          <Panel title="Recaudación y Cobro por Cajero Registrado">
            {byCashier.length === 0 ? (
              <Empty text="No hay registros de cobro en este período" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                {byCashier.map((c) => (
                  <div
                    key={c.name}
                    className="p-3.5 rounded-xl bg-surface-3/60 border border-white/5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-brand/10 border border-brand/20 grid place-items-center text-brand font-bold text-xs uppercase shrink-0">
                        {c.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-ink-1 truncate">{c.name}</div>
                        <div className="text-[11px] text-ink-3">
                          {c.username ? `@${c.username} · ` : ''}
                          {c.count} {c.count === 1 ? 'ticket' : 'tickets'}
                        </div>
                      </div>
                    </div>
                    <div className="font-mono font-bold text-sm text-brand tabular-nums shrink-0">
                      {money(c.total)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </>
      ) : (
        /* Pestaña: Bitácora de Auditoría en Vivo */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
              <input
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="Buscar por operador, acción o mesa..."
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-surface-2 border border-white/10 text-xs text-ink-1 placeholder:text-ink-3 focus:outline-none focus:border-brand"
              />
            </div>
            <select
              value={auditActionFilter}
              onChange={(e) => setAuditActionFilter(e.target.value)}
              className="h-11 px-3.5 rounded-xl bg-surface-2 border border-white/10 text-xs text-ink-1 focus:outline-none focus:border-brand"
            >
              <option value="todas">Todas las acciones</option>
              <option value="open_rental">Apertura de renta</option>
              <option value="pause_rental">Pausa de renta</option>
              <option value="resume_rental">Reanudación</option>
              <option value="transfer_table">Transferencia de mesa</option>
              <option value="add_item">Añadir producto</option>
              <option value="close_tab">Cobro y cierre</option>
              <option value="cancel_tab">Anulación de cuenta</option>
              <option value="open_shift">Turno de caja</option>
              <option value="create_reservation">Reservas</option>
            </select>
          </div>

          <div className="rounded-card border border-white/10 bg-surface-2 overflow-hidden shadow-card">
            {filteredLogs.length === 0 ? (
              <div className="py-12 text-center text-xs text-ink-3">
                No hay registros de auditoría que coincidan con la búsqueda.
              </div>
            ) : (
              <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="p-3.5 sm:px-5 flex items-start justify-between gap-3 text-xs hover:bg-white/[0.02] transition">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-ink-3">
                          {new Date(log.timestamp).toLocaleTimeString('es-MX', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface-3 text-brand uppercase tracking-wider">
                          {log.action.replace('_', ' ')}
                        </span>
                        {log.tableName && (
                          <span className="font-semibold text-ink-1">{log.tableName}</span>
                        )}
                      </div>
                      <div className="text-ink-1 text-sm font-medium">{log.details}</div>
                      <div className="text-[11px] text-ink-3">
                        Operador: <strong className="text-ink-2">{log.userName}</strong> ({log.userRole})
                      </div>
                    </div>
                    <span className="text-[11px] text-ink-3 whitespace-nowrap shrink-0">
                      {new Date(log.timestamp).toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Kpi({
  label,
  value,
  accent,
  sub,
}: {
  label: string
  value: string
  accent?: boolean
  sub?: string
}) {
  return (
    <div className="rounded-card border border-white/10 bg-surface-2 p-4">
      <div className="text-xs text-ink-3 uppercase tracking-wider">{label}</div>
      <div
        className={`mt-1 font-display text-2xl font-bold tabular-nums ${
          accent ? 'text-brand' : 'text-ink-1'
        }`}
      >
        {value}
      </div>
      {sub && <div className="text-[11px] text-ink-3 mt-1 truncate">{sub}</div>}
    </div>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-card border border-white/10 bg-surface-2 p-5 shadow-card">
      <h3 className="font-display text-sm font-bold text-ink-1 mb-3">{title}</h3>
      {children}
    </div>
  )
}

function IncomeRow({
  label,
  amount,
  total,
  color,
}: {
  label: string
  amount: number
  total: number
  color: string
}) {
  const pct = total > 0 ? (amount / total) * 100 : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-ink-2">{label}</span>
        <span className="font-mono text-ink-1 font-semibold tabular-nums">
          {money(amount)} ({pct.toFixed(0)}%)
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.min(100, Math.max(3, pct))}%` }}
        />
      </div>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <div className="py-8 text-center text-xs text-ink-3">{text}</div>
}
