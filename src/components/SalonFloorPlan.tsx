import { useState, useRef, useEffect, useMemo } from 'react'
import {
  Move,
  Clock,
  Coins,
  Play,
  Pause,
  Grid,
  RotateCcw,
  RotateCw,
  Check,
  Flame,
  Beer,
  Layers,
  Sparkles,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Maximize2,
  CheckCircle2,
} from 'lucide-react'
import { facturableElapsedSec } from '../lib/time'
import { duration, money } from '../lib/format'
import { computeTotals } from '../lib/billing'
import type { BilliardTable, Tab } from '../lib/types'

interface SalonFloorPlanProps {
  tables: BilliardTable[]
  tabs: Tab[]
  now: number
  onSaveTable: (table: BilliardTable) => Promise<void>
  onQuickOrder?: (table: BilliardTable) => void
  onPauseRental?: (tabId: string) => void
  onResumeRental?: (tabId: string) => void
  onOpenRental?: (tableId: string) => void
  notify: (message: string, type?: 'success' | 'error' | 'info') => void
}

// Cálculo de posiciones iniciales por defecto en cuadrícula de billar (porcentajes)
function getDefaultPosition(index: number, total: number): { x: number; y: number } {
  // Disponer en 3 o 4 columnas dependiendo del número de mesas
  const cols = total <= 4 ? 2 : total <= 8 ? 4 : 4
  const col = index % cols
  const row = Math.floor(index / cols)

  const marginX = 4
  const marginY = 6
  const spacingX = (100 - marginX * 2) / cols
  const spacingY = 44

  const x = Math.min(82, Math.max(2, Math.round(marginX + col * spacingX + 1)))
  const y = Math.min(80, Math.max(4, Math.round(marginY + row * spacingY + 2)))
  return { x, y }
}

export function SalonFloorPlan({
  tables,
  tabs,
  now,
  onSaveTable,
  onQuickOrder,
  onPauseRental,
  onResumeRental,
  onOpenRental,
  notify,
}: SalonFloorPlanProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Estado de acomodo / organización
  const [organizeTableId, setOrganizeTableId] = useState<string | null>(null)
  const [globalOrganizeMode, setGlobalOrganizeMode] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  // Coordenadas locales en memoria durante el arrastre para fluidez a 60fps
  const [localPositions, setLocalPositions] = useState<Record<string, { x: number; y: number }>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  // Sincronizar posiciones iniciales
  useEffect(() => {
    const posMap: Record<string, { x: number; y: number }> = {}
    tables.forEach((t, i) => {
      if (typeof t.posX === 'number' && typeof t.posY === 'number') {
        posMap[t.id] = { x: t.posX, y: t.posY }
      } else {
        const def = getDefaultPosition(i, tables.length)
        posMap[t.id] = def
      }
    })
    setLocalPositions(posMap)
  }, [tables])

  // Métricas del plano
  const activeCount = useMemo(
    () => tables.filter((t) => t.status === 'ocupada' || t.status === 'pausada' || t.status === 'por_cobrar').length,
    [tables]
  )
  const freeCount = useMemo(() => tables.filter((t) => t.status === 'libre').length, [tables])

  // Iniciar arrastre con puntero
  function handlePointerDown(e: React.PointerEvent, table: BilliardTable) {
    // Si no está en modo organizar para esta mesa ni en modo global, no arrastrar con cualquier click
    if (!globalOrganizeMode && organizeTableId !== table.id) {
      return
    }

    e.preventDefault()
    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const currentPos = localPositions[table.id] || { x: 50, y: 50 }

    // Calcular offset en porcentaje respecto al origen de la mesa
    const clickXPercent = ((e.clientX - rect.left) / rect.width) * 100
    const clickYPercent = ((e.clientY - rect.top) / rect.height) * 100

    setDragOffset({
      x: clickXPercent - currentPos.x,
      y: clickYPercent - currentPos.y,
    })
    setDraggingId(table.id)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!draggingId) return
    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const rawX = ((e.clientX - rect.left) / rect.width) * 100 - dragOffset.x
    const rawY = ((e.clientY - rect.top) / rect.height) * 100 - dragOffset.y

    // Limitar dentro del recuadro grande del salón (2% - 82% X, 3% - 80% Y)
    const clampedX = Math.min(81, Math.max(1, Math.round(rawX)))
    const clampedY = Math.min(79, Math.max(2, Math.round(rawY)))

    setLocalPositions((prev) => ({
      ...prev,
      [draggingId]: { x: clampedX, y: clampedY },
    }))
  }

  async function handlePointerUp(e: React.PointerEvent) {
    if (!draggingId) return
    const tableId = draggingId
    setDraggingId(null)

    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      // Ignorar si ya se soltó
    }

    const table = tables.find((t) => t.id === tableId)
    const newPos = localPositions[tableId]
    if (table && newPos) {
      setSavingId(tableId)
      try {
        await onSaveTable({
          ...table,
          posX: newPos.x,
          posY: newPos.y,
        })
        notify(`Mesa ${table.name} acomodada en el salón (${newPos.x}%, ${newPos.y}%)`, 'success')
      } catch (err) {
        console.error('Error guardando posición de mesa:', err)
      } finally {
        setSavingId(null)
      }
    }
  }

  // Mover mesa con controles de flecha de precisión
  async function nudgeTable(tableId: string, deltaX: number, deltaY: number) {
    const table = tables.find((t) => t.id === tableId)
    if (!table) return

    const current = localPositions[tableId] || { x: 50, y: 50 }
    const newX = Math.min(81, Math.max(1, current.x + deltaX))
    const newY = Math.min(79, Math.max(2, current.y + deltaY))

    setLocalPositions((prev) => ({
      ...prev,
      [tableId]: { x: newX, y: newY },
    }))

    setSavingId(tableId)
    try {
      await onSaveTable({
        ...table,
        posX: newX,
        posY: newY,
      })
    } finally {
      setSavingId(null)
    }
  }

  // Girar mesa entre horizontal y vertical
  async function toggleOrientation(tableId: string) {
    const table = tables.find((t) => t.id === tableId)
    if (!table) return

    const nextOrientation = table.orientation === 'vertical' ? 'horizontal' : 'vertical'
    setSavingId(tableId)
    try {
      await onSaveTable({
        ...table,
        orientation: nextOrientation,
      })
      notify(
        `Mesa ${table.name} girada a posición ${nextOrientation === 'vertical' ? 'Vertical ↕' : 'Horizontal ↔'}`,
        'success'
      )
    } catch (err) {
      console.error('Error al girar la mesa:', err)
      notify('No se pudo girar la mesa', 'error')
    } finally {
      setSavingId(null)
    }
  }

  // Auto-distribuir todas las mesas en cuadrícula ordenada
  async function handleAutoAlign() {
    notify('Alineando mesas en cuadrícula del salón...', 'info')
    const updatedMap: Record<string, { x: number; y: number }> = {}

    for (let i = 0; i < tables.length; i++) {
      const t = tables[i]
      const pos = getDefaultPosition(i, tables.length)
      updatedMap[t.id] = pos
      await onSaveTable({
        ...t,
        posX: pos.x,
        posY: pos.y,
      })
    }
    setLocalPositions(updatedMap)
    notify('Distribución del salón alineada exitosamente', 'success')
  }

  return (
    <div className="space-y-4">
      {/* Barra superior de control del Plano del Salón */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-surface-2 border border-white/10 shadow-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 grid place-items-center">
            <Layers size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-display font-bold text-ink-1">
                Plano de Distribución del Salón de Billar
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {tables.length} Mesas en total
              </span>
            </div>
            <p className="text-xs text-ink-3">
              Representación visual a escala. Pulsa <strong className="text-brand">"Acomodar o organizar mesa"</strong> en cualquier mesa para moverla y adaptarla a tu club.
            </p>
          </div>
        </div>

        {/* Acciones globales */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setGlobalOrganizeMode((v) => !v)
              if (!globalOrganizeMode) {
                notify('Modo Acomodo General activo: Puedes arrastrar libremente cualquier mesa', 'info')
              } else {
                setOrganizeTableId(null)
                notify('Modo Acomodo finalizado', 'success')
              }
            }}
            className={`h-9 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 ${
              globalOrganizeMode
                ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20 border border-amber-300'
                : 'bg-surface-3 text-ink-1 border border-white/10 hover:border-brand/40'
            }`}
          >
            <Move size={14} />
            <span>{globalOrganizeMode ? 'Terminar de Acomodar' : 'Acomodar Todo el Salón'}</span>
          </button>

          <button
            onClick={handleAutoAlign}
            title="Alinear automáticamente todas las mesas en orden"
            className="h-9 px-3 rounded-xl bg-surface-3 hover:bg-surface-4 border border-white/10 text-xs font-semibold text-ink-2 hover:text-ink-1 flex items-center gap-1.5 transition"
          >
            <Grid size={14} />
            <span className="hidden md:inline">Auto-alinear</span>
          </button>
        </div>
      </div>

      {/* Banner de estado si hay mesa en modo acomodo activo */}
      {(organizeTableId || globalOrganizeMode) && (
        <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs flex items-center justify-between gap-3 animate-fade">
          <div className="flex items-center gap-2">
            <Move size={16} className="text-amber-400 animate-bounce" />
            <span>
              <strong>Modo Organización Activo:</strong> Arrastra la mesa seleccionada dentro del recuadro verde para fijar su ubicación real en el salón.
            </span>
          </div>
          <button
            onClick={() => {
              setOrganizeTableId(null)
              setGlobalOrganizeMode(false)
            }}
            className="px-2.5 py-1 rounded-lg bg-amber-400 text-black font-bold text-[11px] hover:bg-amber-300 transition"
          >
            Listo / Guardar
          </button>
        </div>
      )}

      {/* RECUADRO GRANDE ENORME DEL SALÓN (SIMULA EL PISO DE BILLAR) */}
      <div
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="salon-floor-canvas w-full min-h-[580px] lg:min-h-[640px] p-4 relative select-none touch-none"
      >
        {/* Decoraciones de ambientación del club de billar */}
        <div className="absolute top-3 left-4 text-[10px] uppercase tracking-widest font-black text-emerald-400/40 flex items-center gap-2 pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-emerald-400/50" />
          Área de Juego · Salón Oficial Kalos Billar
        </div>

        <div className="absolute bottom-3 right-4 text-[10px] uppercase tracking-widest font-bold text-emerald-300/30 pointer-events-none">
          🚪 Entrada Principal / Recepción
        </div>

        <div className="absolute top-3 right-4 text-[10px] uppercase tracking-widest font-bold text-amber-400/40 pointer-events-none flex items-center gap-1.5">
          <span>🍹 Barra & Mostrador de Cobro</span>
        </div>

        {/* Indicadores de ocupación en esquina inferior */}
        <div className="absolute bottom-3 left-4 flex items-center gap-3 pointer-events-none text-[11px] font-semibold text-emerald-200/60 bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">
          <span className="flex items-center gap-1.5 text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            {activeCount} en juego
          </span>
          <span className="text-white/20">|</span>
          <span className="flex items-center gap-1 text-ink-3">
            <span className="w-2 h-2 rounded-full bg-white/30" />
            {freeCount} disponibles
          </span>
        </div>

        {/* RENDERIZADO DE CADA PEQUEÑA MESA DE BILLAR */}
        {tables.map((table) => {
          const tab = table.activeTabId
            ? tabs.find((t) => t.id === table.activeTabId && t.status !== 'cerrada' && t.status !== 'anulada') ?? null
            : null

          const isOrganizing = organizeTableId === table.id || globalOrganizeMode
          const isDragging = draggingId === table.id
          const pos = localPositions[table.id] || { x: 10, y: 10 }

          const elapsed = tab?.rental ? facturableElapsedSec(tab.rental, now) : 0
          const totals = tab ? computeTotals(tab, now) : null
          const isVertical = table.orientation === 'vertical'
          const isOccupied = table.status === 'ocupada'
          const isPaused = table.status === 'pausada'
          const isPendingCheckout = table.status === 'por_cobrar'
          const isFree = table.status === 'libre'

          return (
            <div
              key={table.id}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
              }}
              onPointerDown={(e) => handlePointerDown(e, table)}
              className={`billiard-mini-table ${isVertical ? 'is-vertical' : ''} ${
                isDragging ? 'is-dragging' : ''
              } ${isOrganizing ? 'is-selected cursor-grab' : ''}`}
            >
              {/* 6 Troneras auténticas de billar (se adaptan si la mesa es horizontal o vertical) */}
              <div className="pocket-mini pocket-mini-tl" />
              <div className="pocket-mini pocket-mini-tr" />
              {isVertical ? (
                <>
                  <div className="pocket-mini pocket-mini-lc" />
                  <div className="pocket-mini pocket-mini-rc" />
                </>
              ) : (
                <>
                  <div className="pocket-mini pocket-mini-tc" />
                  <div className="pocket-mini pocket-mini-bc" />
                </>
              )}
              <div className="pocket-mini pocket-mini-bl" />
              <div className="pocket-mini pocket-mini-br" />

              {/* Diamantes de referencia en las bandas de madera */}
              {isVertical ? (
                <>
                  <div className="billiard-diamond" style={{ left: '2px', top: '25%' }} />
                  <div className="billiard-diamond" style={{ left: '2px', top: '75%' }} />
                  <div className="billiard-diamond" style={{ right: '2px', top: '25%' }} />
                  <div className="billiard-diamond" style={{ right: '2px', top: '75%' }} />
                </>
              ) : (
                <>
                  <div className="billiard-diamond" style={{ top: '2px', left: '25%' }} />
                  <div className="billiard-diamond" style={{ top: '2px', left: '75%' }} />
                  <div className="billiard-diamond" style={{ bottom: '2px', left: '25%' }} />
                  <div className="billiard-diamond" style={{ bottom: '2px', left: '75%' }} />
                </>
              )}

              {/* Paño verde aterciopelado de la pequeña mesa de billar */}
              <div className="billiard-mini-felt">
                {/* Encabezado: Nombre de mesa y estado */}
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
                    <span className="font-display text-xs font-black text-white tracking-wide truncate drop-shadow">
                      {table.name}
                    </span>
                    <span
                      title={`Orientación ${isVertical ? 'Vertical ↕' : 'Horizontal ↔'}`}
                      className="text-[9px] text-amber-300 font-mono font-bold shrink-0"
                    >
                      {isVertical ? '↕' : '↔'}
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                      isOccupied
                        ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/40'
                        : isPaused
                        ? 'bg-amber-400/30 text-amber-200 border border-amber-400/40'
                        : isPendingCheckout
                        ? 'bg-sky-400/30 text-sky-200 border border-sky-400/40'
                        : 'bg-black/50 text-white/70 border border-white/10'
                    }`}
                  >
                    {isOccupied && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />}
                    {isOccupied ? 'En Juego' : isPaused ? 'Pausa' : isPendingCheckout ? 'Cobro' : 'Libre'}
                  </span>
                </div>

                {/* Centro: Cronómetro en tiempo real o Tarifa */}
                <div className="my-auto py-1">
                  {tab?.rental ? (
                    <div className="flex flex-col gap-0.5 bg-black/40 px-2 py-1 rounded-lg border border-white/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-amber-300 font-mono font-bold text-xs tabular-nums">
                          <Clock size={11} className={isPaused ? '' : 'animate-spin'} />
                          {duration(elapsed)}
                        </div>
                        <div className="font-mono font-black text-xs text-brand">
                          {totals ? money(totals.total) : '$0'}
                        </div>
                      </div>
                      {isVertical && (
                        <div className="text-[9px] text-emerald-200/70 truncate">
                          {table.type}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={`flex ${isVertical ? 'flex-col gap-0.5' : 'items-center justify-between'} text-[10px] text-emerald-200/80 px-1 font-medium`}>
                      <span className="truncate max-w-[90px]">{table.type}</span>
                      <strong className="text-ink-1 font-mono">${table.ratePerHour}/h</strong>
                    </div>
                  )}
                </div>

                {/* BOTÓN OBLIGATORIO: Acomodar o organizar mesa + Botón Girar */}
                <div className="pt-1 border-t border-white/10 flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (organizeTableId === table.id) {
                          setOrganizeTableId(null)
                          notify(`Posición de ${table.name} guardada`, 'success')
                        } else {
                          setOrganizeTableId(table.id)
                          notify(`Acomoda ${table.name}: Arrástrala o gírala al lugar deseado`, 'info')
                        }
                      }}
                      className={`h-5 px-1.5 rounded text-[9px] font-bold flex items-center gap-1 transition shadow-sm active:scale-95 flex-1 justify-center truncate ${
                        organizeTableId === table.id
                          ? 'bg-amber-400 text-black font-black'
                          : 'bg-black/60 hover:bg-black/90 text-amber-300 border border-amber-400/30'
                      }`}
                      title="Acomodar o organizar mesa en el salón"
                    >
                      <Move size={10} className="shrink-0" />
                      <span className="truncate">
                        {organizeTableId === table.id ? 'Acomodando' : 'Acomodar mesa'}
                      </span>
                    </button>

                    {/* Botón directo de Girar mesa al acomodar */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleOrientation(table.id)
                      }}
                      className="h-5 px-1.5 rounded text-[9px] font-bold flex items-center gap-0.5 bg-amber-400/20 hover:bg-amber-400/35 text-amber-300 border border-amber-400/40 active:scale-95 transition shrink-0"
                      title="Girar mesa entre Horizontal y Vertical"
                    >
                      <RotateCw size={10} className={isVertical ? 'rotate-90 text-amber-400' : ''} />
                      <span className="text-[8px] font-mono">{isVertical ? 'Horiz' : 'Vert'}</span>
                    </button>
                  </div>

                  {/* Acciones de juego si está activa o libre */}
                  {tab && (
                    <div className="flex items-center justify-end gap-1">
                      {isPaused ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onResumeRental?.(tab.id)
                          }}
                          title="Reanudar tiempo"
                          className="flex-1 h-5 rounded bg-emerald-500/30 hover:bg-emerald-500/50 text-emerald-200 text-[9px] font-semibold flex items-center justify-center gap-1"
                        >
                          <Play size={9} />
                          Reanudar
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onPauseRental?.(tab.id)
                          }}
                          title="Pausar tiempo"
                          className="flex-1 h-5 rounded bg-amber-400/30 hover:bg-amber-400/50 text-amber-200 text-[9px] font-semibold flex items-center justify-center gap-1"
                        >
                          <Pause size={9} />
                          Pausa
                        </button>
                      )}
                      {onQuickOrder && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onQuickOrder(table)
                          }}
                          title="Agregar bebida o botana"
                          className="w-5 h-5 rounded bg-sky-500/30 hover:bg-sky-500/50 text-sky-200 grid place-items-center"
                        >
                          <Beer size={10} />
                        </button>
                      )}
                    </div>
                  )}

                  {isFree && onOpenRental && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onOpenRental(table.id)
                      }}
                      className="h-5 px-1.5 rounded bg-emerald-500/30 hover:bg-emerald-500/50 text-emerald-200 text-[9px] font-bold transition w-full"
                    >
                      Rentar mesa
                    </button>
                  )}
                </div>
              </div>

              {/* Micro-controles de posición y giro si esta mesa está en modo acomodo */}
              {organizeTableId === table.id && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute -bottom-11 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-black/95 p-1 rounded-xl border border-amber-400/60 shadow-2xl animate-fade backdrop-blur-sm whitespace-nowrap"
                >
                  <button
                    onClick={() => nudgeTable(table.id, -2, 0)}
                    title="Mover izquierda"
                    className="w-6 h-6 rounded bg-surface-3 hover:bg-surface-4 text-ink-1 grid place-items-center active:scale-95 text-xs"
                  >
                    <ArrowLeft size={12} />
                  </button>
                  <button
                    onClick={() => nudgeTable(table.id, 0, -2)}
                    title="Mover arriba"
                    className="w-6 h-6 rounded bg-surface-3 hover:bg-surface-4 text-ink-1 grid place-items-center active:scale-95 text-xs"
                  >
                    <ArrowUp size={12} />
                  </button>
                  <button
                    onClick={() => nudgeTable(table.id, 0, 2)}
                    title="Mover abajo"
                    className="w-6 h-6 rounded bg-surface-3 hover:bg-surface-4 text-ink-1 grid place-items-center active:scale-95 text-xs"
                  >
                    <ArrowDown size={12} />
                  </button>
                  <button
                    onClick={() => nudgeTable(table.id, 2, 0)}
                    title="Mover derecha"
                    className="w-6 h-6 rounded bg-surface-3 hover:bg-surface-4 text-ink-1 grid place-items-center active:scale-95 text-xs"
                  >
                    <ArrowRight size={12} />
                  </button>

                  {/* Botón Prominente para Girar Mesa */}
                  <button
                    onClick={() => toggleOrientation(table.id)}
                    title="Girar orientación de la mesa entre Horizontal y Vertical"
                    className="h-6 px-2 rounded bg-amber-400 hover:bg-amber-300 text-black text-[10px] font-black flex items-center gap-1 shadow-md active:scale-95 transition"
                  >
                    <RotateCw size={11} className={isVertical ? 'rotate-90' : ''} />
                    <span>{isVertical ? 'Girar Horiz ↔' : 'Girar Vert ↕'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setOrganizeTableId(null)
                      notify(`Posición de ${table.name} fijada`, 'success')
                    }}
                    title="Fijar mesa"
                    className="h-6 px-2 rounded bg-surface-3 hover:bg-surface-4 text-emerald-300 text-[10px] font-bold flex items-center gap-1 active:scale-95 transition"
                  >
                    <Check size={11} />
                    Fijar
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
