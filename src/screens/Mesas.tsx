import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Brush,
  Wrench,
  CircleCheck,
  Play,
  QrCode,
  ArrowRightLeft,
  Beer,
  Plus,
  Receipt,
  ExternalLink,
  Copy,
  Check,
  Search,
  Flame,
} from 'lucide-react'
import { useApp } from '../state/AppContext'
import { TableCard } from '../components/TableCard'
import { Modal } from '../components/Modal'
import type { BilliardTable, Product, Tab } from '../lib/types'
import { money } from '../lib/format'

export function Mesas() {
  const { tables, tabs, products, openRental, setTableStatus, addItem, notify } = useApp()
  const navigate = useNavigate()

  const [menuTable, setMenuTable] = useState<BilliardTable | null>(null)
  const [quickOrderTable, setQuickOrderTable] = useState<BilliardTable | null>(null)
  const [qrModalTable, setQrModalTable] = useState<BilliardTable | null>(null)
  const [statusFilter, setStatusFilter] = useState<'todas' | 'ocupadas' | 'libres'>('todas')
  const [copiedLink, setCopiedLink] = useState(false)

  const activeTab = (table: BilliardTable): Tab | null =>
    table.activeTabId
      ? tabs.find((t) => t.id === table.activeTabId && t.status !== 'cerrada' && t.status !== 'anulada') ?? null
      : null

  const occupied = tables.filter((t) => t.status === 'ocupada' || t.status === 'pausada').length
  const libre = tables.filter((t) => t.status === 'libre').length
  const other = tables.length - occupied - libre

  const filteredTables = useMemo(() => {
    if (statusFilter === 'ocupadas') {
      return tables.filter((t) => t.status === 'ocupada' || t.status === 'pausada' || t.status === 'por_cobrar')
    }
    if (statusFilter === 'libres') {
      return tables.filter((t) => t.status === 'libre')
    }
    return tables
  }, [tables, statusFilter])

  async function onTap(table: BilliardTable) {
    if (table.status === 'libre') {
      const tab = await openRental(table.id)
      if (tab) navigate(`/mesa/${tab.id}`)
    } else if (table.status === 'ocupada' || table.status === 'pausada' || table.status === 'por_cobrar') {
      if (table.activeTabId) navigate(`/mesa/${table.activeTabId}`)
    } else {
      setMenuTable(table)
    }
  }

  async function handleQuickAdd(table: BilliardTable, product: Product) {
    if (!table.activeTabId) return
    await addItem(table.activeTabId, product, 1, 'Mostrador')
    notify(`1x ${product.name} añadido a ${table.name}`, 'success')
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
    notify('Enlace de la mesa copiado al portapapeles', 'success')
    setTimeout(() => setCopiedLink(false), 3000)
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Status Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-1">Mesas de Billar</h1>
          <div className="flex items-center gap-2 mt-1 text-xs text-ink-2">
            <span className="font-semibold text-brand tabular-nums">{occupied} ocupadas</span>
            <span>·</span>
            <span className="font-semibold text-emerald-400 tabular-nums">{libre} libres</span>
            {other > 0 && (
              <>
                <span>·</span>
                <span className="text-ink-3 tabular-nums">{other} en servicio/limpieza</span>
              </>
            )}
            <span>·</span>
            <span className="text-ink-3 tabular-nums">{tables.length} total</span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {occupied > 0 && (
            <button
              onClick={() => navigate('/mesas-activas')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300 font-bold text-xs hover:bg-amber-400/20 active:scale-95 transition shadow-sm"
              title="Abrir vista dedicada de mesas activas"
            >
              <Flame size={14} className="text-amber-400 animate-pulse" />
              <span>Ver {occupied} Activas</span>
            </button>
          )}

          {/* Filter Pills */}
          <div className="flex items-center gap-1 p-1 bg-surface-2 rounded-xl border border-white/10">
            {(['todas', 'ocupadas', 'libres'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                  statusFilter === s ? 'bg-brand text-brand-on shadow-sm' : 'text-ink-2 hover:text-ink-1'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
        {filteredTables.map((table) => (
          <TableCard
            key={table.id}
            table={table}
            tab={activeTab(table)}
            onTap={() => onTap(table)}
            onMenu={() => setMenuTable(table)}
            onQuickOrder={() => setQuickOrderTable(table)}
          />
        ))}
      </div>

      {/* Modal Acciones de Mesa */}
      <Modal
        open={!!menuTable}
        onClose={() => setMenuTable(null)}
        title={menuTable ? `${menuTable.name} (${menuTable.type})` : ''}
      >
        {menuTable && (
          <div className="space-y-2">
            {/* Si está libre */}
            {menuTable.status === 'libre' && (
              <>
                <button
                  onClick={async () => {
                    const tab = await openRental(menuTable.id)
                    setMenuTable(null)
                    if (tab) navigate(`/mesa/${tab.id}`)
                  }}
                  className="w-full h-12 rounded-xl bg-brand text-brand-on font-semibold flex items-center justify-between px-4 hover:bg-brand-hover transition"
                >
                  <span className="flex items-center gap-2.5 text-sm">
                    <Play size={18} />
                    Rentar ahora e Iniciar Tiempo
                  </span>
                  <span className="text-xs font-mono">${menuTable.ratePerHour}/h</span>
                </button>

                <button
                  onClick={async () => {
                    await setTableStatus(menuTable.id, 'limpieza')
                    setMenuTable(null)
                  }}
                  className="w-full h-11 rounded-xl bg-surface-2 border border-white/10 hover:border-white/20 text-ink-1 flex items-center gap-2.5 px-4 text-xs font-medium transition"
                >
                  <Brush size={16} className="text-purple-400" />
                  Marcar en limpieza
                </button>

                <button
                  onClick={async () => {
                    await setTableStatus(menuTable.id, 'mantenimiento')
                    setMenuTable(null)
                  }}
                  className="w-full h-11 rounded-xl bg-surface-2 border border-white/10 hover:border-white/20 text-ink-1 flex items-center gap-2.5 px-4 text-xs font-medium transition"
                >
                  <Wrench size={16} className="text-rose-400" />
                  Poner en mantenimiento
                </button>
              </>
            )}

            {/* Si está ocupada o pausada */}
            {(menuTable.status === 'ocupada' || menuTable.status === 'pausada' || menuTable.status === 'por_cobrar') && (
              <>
                <button
                  onClick={() => {
                    if (menuTable.activeTabId) navigate(`/mesa/${menuTable.activeTabId}`)
                    setMenuTable(null)
                  }}
                  className="w-full h-12 rounded-xl bg-brand text-brand-on font-semibold flex items-center gap-2.5 px-4 hover:bg-brand-hover transition text-sm"
                >
                  <Receipt size={18} />
                  Ver cuenta y administrar mesa
                </button>

                <button
                  onClick={() => {
                    setQrModalTable(menuTable)
                    setMenuTable(null)
                  }}
                  className="w-full h-11 rounded-xl bg-surface-2 border border-white/10 hover:border-white/20 text-ink-1 flex items-center gap-2.5 px-4 text-xs font-medium transition"
                >
                  <QrCode size={16} className="text-brand" />
                  Abrir QR / Enlace para Cliente
                </button>
              </>
            )}

            {/* Si está en limpieza o mantenimiento */}
            {(menuTable.status === 'limpieza' || menuTable.status === 'mantenimiento') && (
              <button
                onClick={async () => {
                  await setTableStatus(menuTable.id, 'libre')
                  setMenuTable(null)
                }}
                className="w-full h-12 rounded-xl bg-emerald-500 text-white font-semibold flex items-center justify-center gap-2 hover:bg-emerald-600 transition text-sm"
              >
                <CircleCheck size={18} />
                Liberar mesa y poner disponible
              </button>
            )}

            {/* Vista cliente para cualquier mesa */}
            <button
              onClick={() => {
                setQrModalTable(menuTable)
                setMenuTable(null)
              }}
              className="w-full h-10 rounded-xl text-ink-3 hover:text-ink-1 flex items-center justify-center gap-1.5 text-xs font-medium transition"
            >
              <QrCode size={14} />
              Ver código QR de autoservicio
            </button>
          </div>
        )}
      </Modal>

      {/* Modal Despacho Rápido desde Mostrador */}
      <Modal
        open={!!quickOrderTable}
        onClose={() => setQuickOrderTable(null)}
        title={quickOrderTable ? `Pedido Rápido a ${quickOrderTable.name}` : ''}
      >
        {quickOrderTable && (
          <div className="space-y-4">
            <p className="text-xs text-ink-3">
              Selecciona productos para despachar al instante a la cuenta de esta mesa:
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

      {/* Modal Código QR / Enlace de Autoservicio para Cliente */}
      <Modal
        open={!!qrModalTable}
        onClose={() => setQrModalTable(null)}
        title={qrModalTable ? `Acceso de Clientes — ${qrModalTable.name}` : ''}
      >
        {qrModalTable && (
          <div className="text-center space-y-4 py-2">
            <div className="w-48 h-48 mx-auto bg-white p-3 rounded-2xl shadow-popover grid place-items-center">
              {/* QR Image representation */}
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
                Los clientes pueden escanear este código en la mesa
              </p>
              <p className="text-xs text-ink-3 mt-1 max-w-xs mx-auto">
                Permite a los jugadores ver su tiempo transcurrido en vivo, revisar consumos y pedir bebidas desde su móvil.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => copyClientLink(qrModalTable)}
                className="flex-1 h-11 rounded-xl bg-surface-2 border border-white/10 hover:border-white/20 text-xs font-semibold text-ink-1 flex items-center justify-center gap-2 transition"
              >
                {copiedLink ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                {copiedLink ? '¡Enlace Copiado!' : 'Copiar Enlace'}
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
