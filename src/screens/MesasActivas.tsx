import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Flame,
  Clock,
  Coins,
  Beer,
  Play,
  Pause,
  Receipt,
  QrCode,
  Plus,
  Search,
  Check,
  Copy,
  ExternalLink,
  History,
  Settings2,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp,
  ReceiptText,
  UserCheck,
  ShieldCheck,
  CheckCircle2,
  LayoutGrid,
  List,
  Move,
  RotateCw,
} from 'lucide-react'
import { useApp, useNow } from '../state/AppContext'
import { Modal } from '../components/Modal'
import { SalonFloorPlan } from '../components/SalonFloorPlan'
import { facturableElapsedSec } from '../lib/time'
import { duration, money, shortDateTime } from '../lib/format'
import { computeTotals } from '../lib/billing'
import type { BilliardTable, Product, Tab } from '../lib/types'

const PRESET_TABLE_TYPES = [
  'Pool Estándar (8ft)',
  'Pool Torneo (9ft)',
  'Carambola 3 Bandas',
  'Snooker (12ft)',
  'Pool Bar / Monedero (7ft)',
  'Mesa VIP / Lounge',
]

export function MesasActivas() {
  const {
    tables,
    tabs,
    products,
    user,
    pauseRental,
    resumeRental,
    addItem,
    saveTable,
    deleteTable,
    openRental,
    notify,
  } = useApp()
  const navigate = useNavigate()
  const now = useNow(true)

  const [activeViewMode, setActiveViewMode] = useState<'plano' | 'tarjetas'>('plano')
  const [search, setSearch] = useState('')
  const [quickOrderTable, setQuickOrderTable] = useState<BilliardTable | null>(null)
  const [qrModalTable, setQrModalTable] = useState<BilliardTable | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [selectedClosedTab, setSelectedClosedTab] = useState<Tab | null>(null)

  // Control del recuadro de despliegue para administración de mesas
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [editingTable, setEditingTable] = useState<BilliardTable | null>(null)

  // Formulario para nueva mesa o edición
  const [newTableName, setNewTableName] = useState('')
  const [newTableTypeSelect, setNewTableTypeSelect] = useState(PRESET_TABLE_TYPES[0])
  const [customTableType, setCustomTableType] = useState('')
  const [isCustomType, setIsCustomType] = useState(false)
  const [newTableRate, setNewTableRate] = useState<number>(80)
  const [newTableOrientation, setNewTableOrientation] = useState<'horizontal' | 'vertical'>('horizontal')

  // Historial de búsqueda de mesas cerradas
  const [historySearch, setHistorySearch] = useState('')

  // 1. Mesas activas EXCLUSIVAMENTE (ocupada, pausada o por_cobrar)
  const activeTables = useMemo(() => {
    return tables.filter(
      (t) => t.status === 'ocupada' || t.status === 'pausada' || t.status === 'por_cobrar'
    )
  }, [tables])

  const filteredActive = useMemo(() => {
    if (!search.trim()) return activeTables
    const q = search.toLowerCase().trim()
    return activeTables.filter(
      (t) => t.name.toLowerCase().includes(q) || t.type.toLowerCase().includes(q)
    )
  }, [activeTables, search])

  // 2. Historial de mesas que han cerrado su cuenta
  const closedTabs = useMemo(() => {
    return tabs
      .filter((t) => t.status === 'cerrada')
      .sort((a, b) => (b.closedAt ?? 0) - (a.closedAt ?? 0))
  }, [tabs])

  const filteredClosedTabs = useMemo(() => {
    if (!historySearch.trim()) return closedTabs
    const q = historySearch.toLowerCase().trim()
    return closedTabs.filter(
      (t) =>
        t.tableName.toLowerCase().includes(q) ||
        (t.closedByCashierName && t.closedByCashierName.toLowerCase().includes(q)) ||
        (t.closedByCashierUsername && t.closedByCashierUsername.toLowerCase().includes(q))
    )
  }, [closedTabs, historySearch])

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

  // Guardar mesa nueva o editada
  async function handleSaveTable(e: React.FormEvent) {
    e.preventDefault()
    const name = newTableName.trim()
    if (!name) {
      notify('Ingresa el nombre o número de la mesa', 'error')
      return
    }

    const typeFinal = isCustomType ? customTableType.trim() : newTableTypeSelect.trim()
    if (!typeFinal) {
      notify('Selecciona o escribe el tipo de mesa', 'error')
      return
    }

    const rate = Number(newTableRate)
    if (isNaN(rate) || rate < 0) {
      notify('Ingresa una tarifa horaria válida', 'error')
      return
    }

    if (editingTable) {
      // Editar mesa existente
      const updated: BilliardTable = {
        ...editingTable,
        name,
        type: typeFinal,
        ratePerHour: rate,
        orientation: newTableOrientation,
      }
      await saveTable(updated)
      setEditingTable(null)
      notify(`Mesa ${name} actualizada`, 'success')
    } else {
      // Crear nueva mesa
      const nextNum = tables.length + 1
      const newId = `m-${Date.now().toString(36)}`
      const newTable: BilliardTable = {
        id: newId,
        name: name || `Mesa ${nextNum}`,
        type: typeFinal,
        ratePerHour: rate,
        status: 'libre',
        activeTabId: null,
        orientation: newTableOrientation,
      }
      await saveTable(newTable)
      notify(`Mesa ${newTable.name} creada exitosamente`, 'success')
    }

    // Reset form
    setNewTableName('')
    setCustomTableType('')
    setIsCustomType(false)
    setNewTableRate(80)
    setNewTableOrientation('horizontal')
  }

  function startEditTable(t: BilliardTable) {
    setEditingTable(t)
    setNewTableName(t.name)
    setNewTableRate(t.ratePerHour)
    setNewTableOrientation(t.orientation || 'horizontal')
    if (PRESET_TABLE_TYPES.includes(t.type)) {
      setNewTableTypeSelect(t.type)
      setIsCustomType(false)
    } else {
      setIsCustomType(true)
      setCustomTableType(t.type)
    }
    setShowAdminPanel(true)
  }

  function cancelEdit() {
    setEditingTable(null)
    setNewTableName('')
    setCustomTableType('')
    setIsCustomType(false)
    setNewTableRate(80)
    setNewTableOrientation('horizontal')
  }

  async function handleDeleteTable(table: BilliardTable) {
    if (table.status !== 'libre') {
      notify(`No se puede eliminar ${table.name} porque se encuentra en juego o ocupada`, 'error')
      return
    }
    if (confirm(`¿Estás seguro de eliminar ${table.name} del club de billar?`)) {
      await deleteTable(table.id)
    }
  }

  async function handleQuickRotateTable(table: BilliardTable) {
    const nextOrientation = table.orientation === 'vertical' ? 'horizontal' : 'vertical'
    await saveTable({
      ...table,
      orientation: nextOrientation,
    })
    notify(`${table.name} orientada en modo ${nextOrientation === 'vertical' ? 'Vertical ↕' : 'Horizontal ↔'}`, 'success')
  }

  return (
    <div className="space-y-8">
      {/* Header Principal con Controles de Administrador */}
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
            Monitoreo exclusivo de mesas rentadas al momento, consumos en juego e historial de cuentas cerradas
          </p>
        </div>

        {/* Botón de despliegue para el Administrador */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setShowAdminPanel((v) => !v)
              if (editingTable) cancelEdit()
            }}
            className={`h-10 px-4 rounded-xl border text-xs font-bold flex items-center gap-2 transition shadow-sm active:scale-95 ${
              showAdminPanel
                ? 'bg-brand text-brand-on border-brand'
                : 'bg-surface-2 text-ink-1 border-white/10 hover:border-brand/50'
            }`}
          >
            <Settings2 size={16} />
            <span>{showAdminPanel ? 'Ocultar Panel Mesas' : '+ Agregar / Configurar Mesas'}</span>
            {showAdminPanel ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {/* RECUADRO DE DESPLIEGUE PARA ADMINISTRADOR (AGREGAR / EDITAR MESA Y TIPOS DE MESA) */}
      {showAdminPanel && (
        <div className="p-5 rounded-2xl bg-surface-2 border border-brand/30 shadow-modal animate-rise space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-brand/10 text-brand">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-ink-1 font-display">
                  {editingTable ? `Editar Mesa: ${editingTable.name}` : 'Agregar Nueva Mesa al Billar'}
                </h2>
                <p className="text-[11px] text-ink-3">
                  Define el número de mesa, su tipo reglamentario y la tarifa por hora aplicable
                </p>
              </div>
            </div>

            {editingTable && (
              <button
                onClick={cancelEdit}
                className="text-xs text-ink-3 hover:text-ink-1 px-3 py-1.5 rounded-lg bg-surface-3"
              >
                Cancelar edición
              </button>
            )}
          </div>

          {/* Formulario de Alta / Edición */}
          <form onSubmit={handleSaveTable} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            {/* Nombre de la Mesa */}
            <div>
              <label className="block text-[11px] font-semibold text-ink-3 uppercase tracking-wider mb-1.5">
                Nombre o Número
              </label>
              <input
                type="text"
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                placeholder="Ej. Mesa 7, Mesa VIP"
                className="w-full h-10 px-3 rounded-xl bg-surface-3 border border-white/10 text-xs text-ink-1 placeholder:text-ink-3 focus:outline-none focus:border-brand"
                required
              />
            </div>

            {/* Recuadro de Selección / Edición de Tipo de Mesa */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-semibold text-ink-3 uppercase tracking-wider">
                  Tipo de Mesa
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomType((v) => !v)}
                  className="text-[10px] text-brand hover:underline font-semibold"
                >
                  {isCustomType ? '← Elegir de la lista' : '+ Tipo personalizado'}
                </button>
              </div>

              {isCustomType ? (
                <input
                  type="text"
                  value={customTableType}
                  onChange={(e) => setCustomTableType(e.target.value)}
                  placeholder="Ej. Pool Francés, Carambola Libre"
                  className="w-full h-10 px-3 rounded-xl bg-surface-3 border border-brand/50 text-xs text-ink-1 focus:outline-none focus:border-brand"
                  required
                />
              ) : (
                <select
                  value={newTableTypeSelect}
                  onChange={(e) => setNewTableTypeSelect(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-surface-3 border border-white/10 text-xs text-ink-1 focus:outline-none focus:border-brand"
                >
                  {PRESET_TABLE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Tarifa por Hora */}
            <div>
              <label className="block text-[11px] font-semibold text-ink-3 uppercase tracking-wider mb-1.5">
                Tarifa por Hora ($ / h)
              </label>
              <input
                type="number"
                min="0"
                step="5"
                value={newTableRate}
                onChange={(e) => setNewTableRate(Number(e.target.value))}
                placeholder="80"
                className="w-full h-10 px-3 rounded-xl bg-surface-3 border border-white/10 text-xs font-mono text-ink-1 focus:outline-none focus:border-brand"
                required
              />
            </div>

            {/* Orientación */}
            <div>
              <label className="block text-[11px] font-semibold text-ink-3 uppercase tracking-wider mb-1.5">
                Orientación en Salón
              </label>
              <div className="flex items-center h-10 p-1 rounded-xl bg-surface-3 border border-white/10 gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setNewTableOrientation('horizontal')}
                  className={`flex-1 h-full rounded-lg font-bold flex items-center justify-center gap-1 transition ${
                    newTableOrientation === 'horizontal'
                      ? 'bg-brand text-brand-on shadow-sm'
                      : 'text-ink-3 hover:text-ink-1'
                  }`}
                  title="Mesa Horizontal (220px × 125px)"
                >
                  ↔ Horiz
                </button>
                <button
                  type="button"
                  onClick={() => setNewTableOrientation('vertical')}
                  className={`flex-1 h-full rounded-lg font-bold flex items-center justify-center gap-1 transition ${
                    newTableOrientation === 'vertical'
                      ? 'bg-brand text-brand-on shadow-sm'
                      : 'text-ink-3 hover:text-ink-1'
                  }`}
                  title="Mesa Vertical (130px × 220px)"
                >
                  ↕ Vert
                </button>
              </div>
            </div>

            {/* Botón Guardar */}
            <div>
              <button
                type="submit"
                className="w-full h-10 px-4 rounded-xl bg-brand text-brand-on font-bold text-xs flex items-center justify-center gap-2 hover:bg-brand-hover active:scale-95 transition shadow-card"
              >
                <Check size={16} />
                <span>{editingTable ? 'Actualizar Mesa' : 'Guardar Mesa'}</span>
              </button>
            </div>
          </form>

          {/* Listado de Mesas Existentes para Gestión y Edición */}
          <div className="pt-4 border-t border-white/10">
            <h3 className="text-xs font-bold text-ink-2 uppercase tracking-wider mb-3">
              Catálogo de Mesas Registradas ({tables.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {tables.map((t) => (
                <div
                  key={t.id}
                  className="p-3 rounded-xl bg-surface-3 border border-white/5 flex items-center justify-between gap-2 hover:border-white/15 transition"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-ink-1 truncate">{t.name}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-ink-3 font-mono">
                        {t.orientation === 'vertical' ? '↕ Vert' : '↔ Horiz'}
                      </span>
                    </div>
                    <div className="text-[10px] text-ink-3 truncate">{t.type}</div>
                    <div className="text-[11px] font-mono font-bold text-brand mt-0.5">${t.ratePerHour}/h</div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleQuickRotateTable(t)}
                      className="p-1.5 rounded-lg text-ink-3 hover:text-brand hover:bg-white/5 transition"
                      title={t.orientation === 'vertical' ? 'Girar a horizontal ↔' : 'Girar a vertical ↕'}
                    >
                      <RotateCw size={14} />
                    </button>
                    <button
                      onClick={() => startEditTable(t)}
                      className="p-1.5 rounded-lg text-ink-3 hover:text-brand hover:bg-white/5 transition"
                      title="Editar mesa"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteTable(t)}
                      disabled={t.status !== 'libre'}
                      className={`p-1.5 rounded-lg transition ${
                        t.status !== 'libre'
                          ? 'text-ink-4 opacity-40 cursor-not-allowed'
                          : 'text-ink-3 hover:text-rose-400 hover:bg-white/5'
                      }`}
                      title={t.status !== 'libre' ? 'No se puede eliminar mientras esté en uso' : 'Eliminar mesa'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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

      {/* SECCIÓN 1: MESAS RENTADAS AL MOMENTO / DISTRIBUCIÓN EN VIVO DEL SALÓN DE BILLAR */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-display font-bold text-ink-1 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              Mesas Rentadas al Momento y Plano del Salón
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Selector de Vista: Plano vs Tarjetas */}
            <div className="flex items-center bg-surface-2 p-1 rounded-xl border border-white/10 text-xs">
              <button
                onClick={() => setActiveViewMode('plano')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition ${
                  activeViewMode === 'plano'
                    ? 'bg-brand text-brand-on shadow-sm'
                    : 'text-ink-3 hover:text-ink-1'
                }`}
              >
                <LayoutGrid size={14} />
                <span>Plano del Salón ({tables.length})</span>
              </button>
              <button
                onClick={() => setActiveViewMode('tarjetas')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition ${
                  activeViewMode === 'tarjetas'
                    ? 'bg-brand text-brand-on shadow-sm'
                    : 'text-ink-3 hover:text-ink-1'
                }`}
              >
                <List size={14} />
                <span>Tarjetas Activas ({activeTables.length})</span>
              </button>
            </div>

            {activeViewMode === 'tarjetas' && activeTables.length > 0 && (
              <div className="relative w-full sm:w-56">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filtrar mesa..."
                  className="w-full h-8 pl-8 pr-3 rounded-xl bg-surface-2 border border-white/10 text-xs text-ink-1 placeholder:text-ink-3 focus:outline-none focus:border-brand"
                />
              </div>
            )}
          </div>
        </div>

        {/* 1. VISTA PLANO DEL SALÓN (RECUADRO GRANDE ENORME CON TODAS LAS MESAS SIMULANDO MESAS DE BILLAR PEQUEÑAS) */}
        {activeViewMode === 'plano' ? (
          <SalonFloorPlan
            tables={tables}
            tabs={tabs}
            now={now}
            onSaveTable={saveTable}
            onQuickOrder={(table) => setQuickOrderTable(table)}
            onPauseRental={pauseRental}
            onResumeRental={resumeRental}
            onOpenRental={(tableId) => openRental(tableId)}
            notify={notify}
          />
        ) : (
          /* 2. VISTA DETALLADA EN TARJETAS */
          filteredActive.length === 0 ? (
            <div className="billiard-card-frame billiard-felt p-10 text-center rounded-2xl border-2 border-emerald-700/40 shadow-modal">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 grid place-items-center mx-auto mb-3 shadow-lg">
                <Clock size={28} />
              </div>
              <h3 className="text-lg font-display font-bold text-ink-1">
                No hay mesas en juego en este momento
              </h3>
              <p className="text-xs text-emerald-200/80 max-w-md mx-auto mt-1 leading-relaxed">
                En este apartado únicamente se muestran las mesas que se encuentran rentadas y con cronómetro en curso. Al abrir una renta desde la sección de mesas, aparecerá aquí automáticamente en tiempo real.
              </p>
              <button
                onClick={() => setActiveViewMode('plano')}
                className="mt-4 px-4 py-2 rounded-xl bg-brand text-brand-on font-bold text-xs inline-flex items-center gap-1.5 hover:bg-brand-hover transition"
              >
                <LayoutGrid size={15} />
                Ver Plano General del Salón
              </button>
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
                        {/* Botón para acomodar en plano */}
                        <button
                          onClick={() => setActiveViewMode('plano')}
                          className="w-full h-8 px-2 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 text-amber-300 text-[11px] font-bold flex items-center justify-center gap-1.5 transition"
                        >
                          <Move size={12} />
                          <span>Acomodar o organizar mesa en el plano</span>
                        </button>

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
          )
        )}
      </div>

      {/* SECCIÓN 2: HISTORIAL DE MESAS QUE HAN CERRADO SU CUENTA */}
      <div className="space-y-4 pt-6 border-t border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-surface-3 text-ink-2">
              <History size={18} />
            </span>
            <div>
              <h2 className="text-base font-display font-bold text-ink-1">
                Historial de Mesas Liquidadas ({closedTabs.length})
              </h2>
              <p className="text-[11px] text-ink-3">
                Registro de cuentas cerradas, tiempo jugado, cajero que cobró y monto liquidado
              </p>
            </div>
          </div>

          {closedTabs.length > 0 && (
            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
              <input
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Buscar por mesa o cajero..."
                className="w-full h-8 pl-8 pr-3 rounded-lg bg-surface-2 border border-white/10 text-xs text-ink-1 placeholder:text-ink-3 focus:outline-none focus:border-brand"
              />
            </div>
          )}
        </div>

        {filteredClosedTabs.length === 0 ? (
          <div className="p-8 rounded-2xl bg-surface-2/60 border border-white/5 text-center">
            <ReceiptText size={28} className="mx-auto text-ink-3 opacity-50 mb-2" />
            <p className="text-xs font-semibold text-ink-2">Aún no hay cuentas de mesas cerradas</p>
            <p className="text-[11px] text-ink-3 mt-0.5">
              Cuando se liquide una mesa en el punto de venta, su historial y ticket aparecerán aquí.
            </p>
          </div>
        ) : (
          <div className="bg-surface-2 rounded-2xl border border-white/10 overflow-hidden shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-surface-3/50 text-ink-3 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Mesa</th>
                    <th className="py-3 px-4">Fecha y Hora Cierre</th>
                    <th className="py-3 px-4">Tiempo Jugado</th>
                    <th className="py-3 px-4">Consumos</th>
                    <th className="py-3 px-4">Cajero / Operador</th>
                    <th className="py-3 px-4">Método de Pago</th>
                    <th className="py-3 px-4 text-right">Total Liquidado</th>
                    <th className="py-3 px-4 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredClosedTabs.slice(0, 15).map((ct) => {
                    const elapsed = ct.rental && ct.closedAt ? facturableElapsedSec(ct.rental, ct.closedAt) : 0
                    const totalItems = ct.items.reduce((s, i) => s + i.qty, 0)
                    const methods = ct.payments.map((p) => p.method).join(', ')

                    return (
                      <tr key={ct.id} className="hover:bg-white/[0.02] transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-ink-1">{ct.tableName}</div>
                          <div className="text-[10px] text-ink-3">ID: {ct.id.slice(0, 8)}</div>
                        </td>
                        <td className="py-3 px-4 font-mono text-ink-2 text-[11px]">
                          {ct.closedAt ? shortDateTime(ct.closedAt) : '—'}
                        </td>
                        <td className="py-3 px-4 font-mono text-amber-300 font-semibold">
                          {duration(elapsed)}
                        </td>
                        <td className="py-3 px-4 text-ink-2">
                          {totalItems > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px]">
                              <span>🍺</span>
                              <span>{totalItems} items</span>
                            </span>
                          ) : (
                            <span className="text-ink-4 text-[10px] italic">Solo renta</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-4 text-ink-1 text-[11px] font-medium border border-white/5">
                            <UserCheck size={12} className="text-brand" />
                            <span>{ct.closedByCashierName || 'Caja'}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[11px] text-ink-2 capitalize">
                          {methods || 'Efectivo'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 text-sm">
                          {money(ct.totals?.total ?? 0)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setSelectedClosedTab(ct)}
                            className="px-2.5 py-1 rounded-lg bg-surface-3 hover:bg-surface-4 text-brand text-[11px] font-semibold transition"
                          >
                            Ver Ticket
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

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

      {/* Modal Detalle de Cuenta Cerrada / Ticket */}
      <Modal
        open={!!selectedClosedTab}
        onClose={() => setSelectedClosedTab(null)}
        title={selectedClosedTab ? `Ticket Liquidado — ${selectedClosedTab.tableName}` : ''}
      >
        {selectedClosedTab && (
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-surface-2 border border-white/10 space-y-2">
              <div className="flex justify-between">
                <span className="text-ink-3">Mesa:</span>
                <span className="font-bold text-ink-1">{selectedClosedTab.tableName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-3">Apertura:</span>
                <span className="font-mono text-ink-2">{shortDateTime(selectedClosedTab.openedAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-3">Cierre:</span>
                <span className="font-mono text-ink-2">
                  {selectedClosedTab.closedAt ? shortDateTime(selectedClosedTab.closedAt) : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-3">Cobrado por Cajero:</span>
                <span className="font-semibold text-brand">
                  {selectedClosedTab.closedByCashierName || 'Caja Principal'}
                </span>
              </div>
            </div>

            {/* Consumos */}
            <div>
              <div className="font-bold text-ink-2 uppercase tracking-wider text-[10px] mb-2">
                Desglose de la Cuenta
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-ink-2">Renta de Mesa ({selectedClosedTab.rental?.rounding || 'tiempo'})</span>
                  <span className="font-mono font-semibold text-ink-1">
                    {money(selectedClosedTab.totals?.rentalCharge ?? 0)}
                  </span>
                </div>

                {selectedClosedTab.items.map((item) => (
                  <div key={item.id} className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-ink-2">
                      {item.qty}x {item.emoji} {item.name}
                    </span>
                    <span className="font-mono text-ink-1">
                      {money(item.qty * item.unitPrice)}
                    </span>
                  </div>
                ))}

                {selectedClosedTab.totals?.discount ? (
                  <div className="flex justify-between py-1 text-rose-400">
                    <span>Descuento aplicado</span>
                    <span className="font-mono">-{money(selectedClosedTab.totals.discount)}</span>
                  </div>
                ) : null}

                {selectedClosedTab.totals?.tip ? (
                  <div className="flex justify-between py-1 text-emerald-400">
                    <span>Propina</span>
                    <span className="font-mono">+{money(selectedClosedTab.totals.tip)}</span>
                  </div>
                ) : null}
              </div>

              <div className="mt-3 pt-2 border-t border-white/10 flex justify-between text-sm font-bold text-ink-1">
                <span>Total Cobrado:</span>
                <span className="font-mono text-emerald-400 text-base">
                  {money(selectedClosedTab.totals?.total ?? 0)}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setSelectedClosedTab(null)}
                className="px-4 py-2 rounded-xl bg-surface-3 text-ink-1 font-semibold text-xs hover:bg-surface-4"
              >
                Cerrar Ticket
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
