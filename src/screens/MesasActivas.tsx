import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Flame,
  Clock,
  Coins,
  Beer,
  Play,
  Pause,
  ArrowRightLeft,
  Receipt,
  QrCode,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react'
import { useApp, useNow } from '../state/AppContext'
import { Modal } from '../components/Modal'
import { facturableElapsedSec } from '../lib/time'
import { duration, money } from '../lib/format'
import { computeTotals } from '../lib/billing'
import type { BilliardTable, Product, Tab } from '../lib/types'

export function MesasActivas() {
  const { tables, tabs, products, openRental, pauseRental, resumeRental, transferTable, addItem, notify } = useApp()
  const navigate = useNavigate()
  const now = useNow(true)

  const [search, setSearch] = useState('')
  const [quickOrderTable, setQuickOrderTable] = useState<BilliardTable | null>(null)
  const [transferModalTab, setTransferModalTab] = useState<Tab | null>(null)
  const [targetTableId, setTargetTableId] = useState('')
  const [qrModalTable, setQrModalTable] = useState<BilliardTable | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)

  // Mesas activas (ocupada, pausada o por_cobrar)
  const activeTables = useMemo(() => {
    return tables.filter(
      (t) => t.status === 'ocupada' || t.status === 'pausada' || t.status === 'por_cobrar'
    )
  }, [tables])

  const freeTables = useMemo(() => {
    return tables.filter((t) => t.status === 'libre')
  }, [tables])

  const filteredActive = useMemo(() => {
    if (!search.trim()) return activeTables
    const q = search.toLowerCase().trim()
    return activeTables.filter(
      (t) => t.name.toLowerCase().includes(q) || t.type.toLowerCase().includes(q)
    )
  }, [activeTables, search])

  // Métricas globales en tiempo real
  const activeMetrics = useMemo(() => {
    let totalAccumulated = 0
    let totalItems = 0
    let totalSeconds = 0

    activeTables.forEach((table) => {
      const tab = table.activeTabId
        ? tabs.find((t) => t.id === table.activeTabId && t.status !== 'cerrada' && t.status !== 'anulada')
        : null

      if (tab) {
        const totals = computeTotals(tab, now)
        totalAccumulated += totals.total
        totalItems += tab.items.reduce((sum, item) => sum + item.qty, 0)
        if (tab.rental) {
          totalSeconds += facturableElapsedSec(tab.rental, now)
        }
      }
    })

    const avgMinutes = activeTables.length > 0 ? Math.round(totalSeconds / activeTables.length / 60) : 0
    const occupancyRate = tables.length > 0 ? Math.round((activeTables.length / tables.length) * 100) : 0

    return { totalAccumulated, totalItems, avgMinutes, occupancyRate }
  }, [activeTables, tabs, now, tables.length])

  async function handleQuickAdd(table: BilliardTable, product: Product) {
    if (!table.activeTabId) return
    await addItem(table.activeTabId, product, 1, 'Mostrador (Mesas Activas)')
    notify(`1x ${product.name} añadido a ${table.name}`, 'success')
  }

  async function handleTransfer() {
    if (!transferModalTab || !targetTableId) return
    await transferTable(transferModalTab.id, targetTableId)
    setTransferModalTab(null)
    setTargetTableId('')
  }

  function getClientUrl(t: BilliardTable) {
    const origin = window.location.origin
    const hash = `#/mesa-cliente/${t.id}`
    return `${origin}${window.location.pathname}${hash}`
  }

  function copyClientLink(t: BilliardTable) {
    const url = getClientUrl(t)
    navigator.clipboard.writeText(url)
    setCopiedLink(true)
    notify('Enlace de la mesa copiado', 'success')
    setTimeout(() => setCopiedLink(false), 2500)
  }

  return (
    <div className="space-y-6">
      {/* Header con indicador de tiempo real */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl font-bold text-ink-1 flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-amber-400/20 text-brand border border-amber-400/30">
                <Flame size={22} className="animate-pulse" />
              </span>
              Mesas Activas en Tiempo Real
            </h1>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              En Vivo
            </span>
          </div>
          <p className="text-xs text-ink-2 mt-1">
            Monitoreo continuo de rentas en curso, consumos acumulados, cobros y pedidos de clientes
          </p>
        </div>

        {/* Buscador de mesas */}
        {activeTables.length > 0 && (
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar mesa activa..."
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-surface-2 border border-white/10 text-xs text-ink-1 placeholder:text-ink-3 focus:outline-none focus:border-brand"
            />
          </div>
        )}
      </div>

      {/* Tarjetas de Métricas en Tiempo Real */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-surface-2 border border-white/10 shadow-card flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-ink-3 uppercase tracking-wider">Ocupación Actual</div>
            <div className="text-2xl font-display font-black text-brand mt-0.5">
              {activeTables.length} <span className="text-sm font-normal text-ink-3">/ {tables.length}</span>
            </div>
            <div className="text-[10px] text-emerald-400 font-medium mt-0.5">
              {activeMetrics.occupancyRate}% del aforo ocupado
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand grid place-items-center">
            <Flame size={20} />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface-2 border border-white/10 shadow-card flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-ink-3 uppercase tracking-wider">Total en Juego</div>
            <div className="text-2xl font-mono font-black text-ink-1 mt-0.5">
              {money(activeMetrics.totalAccumulated)}
            </div>
            <div className="text-[10px] text-ink-3 font-medium mt-0.5">
              Acumulado en mesas activas
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 grid place-items-center">
            <Coins size={20} />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface-2 border border-white/10 shadow-card flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-ink-3 uppercase tracking-wider">Consumos en Curso</div>
            <div className="text-2xl font-display font-black text-sky-400 mt-0.5">
              {activeMetrics.totalItems} <span className="text-xs font-normal text-ink-3">items</span>
            </div>
            <div className="text-[10px] text-ink-3 font-medium mt-0.5">
              Bebidas y botanas despachadas
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 grid place-items-center">
            <Beer size={20} />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface-2 border border-white/10 shadow-card flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-ink-3 uppercase tracking-wider">Tiempo Promedio</div>
            <div className="text-2xl font-mono font-black text-amber-300 mt-0.5">
              {activeMetrics.avgMinutes} <span className="text-xs font-normal text-ink-3">min</span>
            </div>
            <div className="text-[10px] text-ink-3 font-medium mt-0.5">
              Por mesa activa
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 grid place-items-center">
            <Clock size={20} />
          </div>
        </div>
      </div>

      {/* Grid de Mesas Activas o Estado Vacío */}
      {filteredActive.length === 0 ? (
        <div className="billiard-card-frame billiard-felt p-8 sm:p-12 text-center rounded-2xl border-2 border-emerald-700/40 shadow-modal">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 grid place-items-center mx-auto mb-4 shadow-lg">
            <Clock size={32} />
          </div>
          <h2 className="text-xl font-display font-bold text-ink-1">No hay mesas en juego en este momento</h2>
          <p className="text-xs text-emerald-200/80 max-w-md mx-auto mt-1.5 leading-relaxed">
            Todas las mesas de billar están disponibles para rentar. Puedes iniciar el tiempo de juego de cualquiera desde aquí mismo:
          </p>

          {freeTables.length > 0 && (
            <div className="mt-6 flex flex-wrap justify-center gap-2.5 max-w-xl mx-auto">
              {freeTables.slice(0, 6).map((freeTable) => (
                <button
                  key={freeTable.id}
                  onClick={async () => {
                    const tab = await openRental(freeTable.id)
                    if (tab) navigate(`/mesa/${tab.id}`)
                  }}
                  className="px-4 py-2.5 rounded-xl bg-brand text-brand-on font-bold text-xs flex items-center gap-2 hover:bg-brand-hover active:scale-95 transition shadow-card"
                >
                  <Play size={14} />
                  <span>Rentar {freeTable.name}</span>
                  <span className="font-mono opacity-80">${freeTable.ratePerHour}/h</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredActive.map((table) => {
            const tab = table.activeTabId
              ? tabs.find((t) => t.id === table.activeTabId && t.status !== 'cerrada' && t.status !== 'anulada') ?? null
              : null

            const elapsed = tab?.rental ? facturableElapsedSec(tab.rental, now) : 0
            const totals = tab ? computeTotals(tab, now) : null
            const isPaused = table.status === 'pausada'
            const isPendingCheckout = table.status === 'por_cobrar'

            return (
              <div
                key={table.id}
                className="billiard-card-frame billiard-felt p-2 shadow-card flex flex-col justify-between transition-transform duration-150"
              >
                {/* Troneras en las esquinas */}
                <div className="billiard-pocket billiard-pocket-tl" />
                <div className="billiard-pocket billiard-pocket-tr" />
                <div className="billiard-pocket billiard-pocket-bl" />
                <div className="billiard-pocket billiard-pocket-br" />

                <div className="billiard-felt-inner p-4 flex-1 flex flex-col justify-between">
                  {/* Encabezado de Mesa */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-ink-1 tracking-tight">{table.name}</span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-black/40 text-emerald-200/80 border border-white/5">
                            {table.type}
                          </span>
                        </div>
                        <div className="text-xs text-emerald-200/70 mt-0.5">
                          Tarifa: <strong className="text-ink-1 font-mono">${table.ratePerHour}/h</strong>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                            isPaused
                              ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                              : isPendingCheckout
                              ? 'bg-sky-400/20 text-sky-300 border border-sky-400/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isPaused ? 'bg-amber-400' : isPendingCheckout ? 'bg-sky-400 animate-pulse' : 'bg-emerald-400 animate-ping'
                            }`}
                          />
                          {isPaused ? 'Pausada' : isPendingCheckout ? 'Por Cobrar' : 'En Juego'}
                        </span>
                      </div>
                    </div>

                    {/* Cronómetro en Vivo & Total Acumulado */}
                    <div className="mt-4 p-3.5 rounded-xl bg-black/40 border border-white/5">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-emerald-300/80 font-semibold">
                            Tiempo Transcurrido
                          </div>
                          <div className="font-mono text-3xl font-black text-amber-300 tracking-tight tabular-nums mt-0.5 drop-shadow">
                            {duration(elapsed)}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[10px] uppercase tracking-wider text-emerald-300/80 font-semibold">
                            Total a Pagar
                          </div>
                          <div className="font-mono text-2xl font-black text-brand tabular-nums mt-0.5 drop-shadow">
                            {totals ? money(totals.total) : '$0'}
                          </div>
                        </div>
                      </div>

                      {/* Desglose de renta vs consumos */}
                      {totals && (
                        <div className="mt-2.5 pt-2 border-t border-white/10 flex justify-between text-[11px] text-emerald-200/80">
                          <span>Renta tiempo: <strong className="text-ink-1 font-mono">{money(totals.rentalCharge)}</strong></span>
                          <span>Consumos: <strong className="text-ink-1 font-mono">{money(totals.productsSubtotal)}</strong></span>
                        </div>
                      )}
                    </div>

                    {/* Productos Consumidos en esta Mesa */}
                    {tab && tab.items.length > 0 ? (
                      <div className="mt-3">
                        <div className="text-[11px] font-semibold text-emerald-200/80 mb-1.5 flex items-center justify-between">
                          <span>Consumos Registrados ({tab.items.reduce((s, i) => s + i.qty, 0)})</span>
                          <span className="text-[10px] text-emerald-300/70 font-mono">
                            {tab.items.length} {tab.items.length === 1 ? 'producto' : 'productos'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                          {tab.items.map((item) => (
                            <span
                              key={item.id}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-black/40 border border-white/10 text-[11px] text-ink-1"
                            >
                              <span>{item.emoji}</span>
                              <span className="font-bold text-amber-300">{item.qty}x</span>
                              <span className="truncate max-w-[90px]">{item.name}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 text-[11px] text-emerald-200/50 italic">
                        Sin pedidos de bebidas o botanas aún
                      </div>
                    )}
                  </div>

                  {/* Barra de Acciones Directas */}
                  <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      {/* Pausar / Reanudar */}
                      {isPaused ? (
                        <button
                          onClick={() => tab && resumeRental(tab.id)}
                          className="h-10 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
                        >
                          <Play size={14} />
                          Reanudar
                        </button>
                      ) : (
                        <button
                          onClick={() => tab && pauseRental(tab.id)}
                          className="h-10 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
                        >
                          <Pause size={14} />
                          Pausar
                        </button>
                      )}

                      {/* Pedido Rápido */}
                      <button
                        onClick={() => setQuickOrderTable(table)}
                        className="h-10 px-3 rounded-xl bg-brand/20 hover:bg-brand/30 border border-brand/30 text-brand font-semibold text-xs flex items-center justify-center gap-1.5 transition"
                      >
                        <Plus size={14} />
                        + Pedido
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {/* Cobrar y Cerrar */}
                      <button
                        onClick={() => {
                          if (tab) navigate(`/mesa/${tab.id}`)
                        }}
                        className="col-span-2 h-11 px-3 rounded-xl bg-brand text-brand-on font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-brand-hover active:scale-95 transition shadow-card"
                      >
                        <Receipt size={16} />
                        Cobrar y Cerrar Mesa
                      </button>

                      {/* Acceso Cliente / QR */}
                      <button
                        onClick={() => setQrModalTable(table)}
                        className="h-11 px-2 rounded-xl bg-black/40 hover:bg-black/60 border border-white/10 text-emerald-200 font-semibold text-xs flex items-center justify-center gap-1 transition"
                        title="Ver QR de la mesa"
                      >
                        <QrCode size={16} />
                        QR
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Despacho Rápido desde Mostrador */}
      <Modal
        open={!!quickOrderTable}
        onClose={() => setQuickOrderTable(null)}
        title={quickOrderTable ? `Añadir Pedido Rápido: ${quickOrderTable.name}` : ''}
      >
        {quickOrderTable && (
          <div className="space-y-4">
            <p className="text-xs text-ink-3">
              Selecciona productos del inventario para añadir a la cuenta de la mesa al instante:
            </p>

            <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
              {products
                .filter((p) => p.active)
                .map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleQuickAdd(quickOrderTable, product)}
                    className="p-3 rounded-xl border border-white/10 bg-surface-2 hover:border-brand/50 active:scale-95 transition text-left flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-base">{product.emoji}</div>
                      <div className="text-xs font-semibold text-ink-1 truncate mt-0.5">{product.name}</div>
                      <div className="text-[11px] font-mono text-brand font-medium">{money(product.price)}</div>
                    </div>
                    <span className="w-7 h-7 rounded-lg bg-surface-4 text-brand grid place-items-center shrink-0">
                      <Plus size={16} />
                    </span>
                  </button>
                ))}
            </div>

            <div className="pt-2 flex justify-between items-center border-t border-white/10 text-xs">
              <button
                onClick={() => {
                  if (quickOrderTable.activeTabId) navigate(`/mesa/${quickOrderTable.activeTabId}`)
                  setQuickOrderTable(null)
                }}
                className="text-brand font-semibold hover:underline"
              >
                Abrir cuenta completa →
              </button>
              <button
                onClick={() => setQuickOrderTable(null)}
                className="px-4 py-2 rounded-xl bg-surface-3 text-ink-1 font-medium"
              >
                Listo
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal QR de Cliente */}
      <Modal
        open={!!qrModalTable}
        onClose={() => setQrModalTable(null)}
        title={qrModalTable ? `Acceso Jugador — ${qrModalTable.name}` : ''}
      >
        {qrModalTable && (
          <div className="text-center space-y-4 py-2">
            <div className="w-48 h-48 mx-auto bg-white p-3 rounded-2xl shadow-popover grid place-items-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  getClientUrl(qrModalTable)
                )}`}
                alt={`QR ${qrModalTable.name}`}
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>

            <div>
              <p className="text-sm font-semibold text-ink-1">
                Código QR de Autoservicio
              </p>
              <p className="text-xs text-ink-3 mt-1 max-w-xs mx-auto">
                Los jugadores de esta mesa pueden escanearlo para ver su cronómetro en vivo y pedir bebidas sin esperar.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => copyClientLink(qrModalTable)}
                className="flex-1 h-11 rounded-xl bg-surface-2 border border-white/10 hover:border-white/20 text-xs font-semibold text-ink-1 flex items-center justify-center gap-2 transition"
              >
                {copiedLink ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                {copiedLink ? '¡Copiado!' : 'Copiar Enlace'}
              </button>

              <a
                href={getClientUrl(qrModalTable)}
                target="_blank"
                rel="noopener noreferrer"
                className="h-11 px-4 rounded-xl bg-brand text-brand-on text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-brand-hover transition"
              >
                <ExternalLink size={16} />
                Abrir Vista
              </a>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
