import { MoreVertical, QrCode, ArrowRightLeft, Sparkles } from 'lucide-react'
import { facturableElapsedSec } from '../lib/time'
import { duration, money } from '../lib/format'
import { computeTotals } from '../lib/billing'
import { useNow } from '../state/AppContext'
import type { BilliardTable, Tab, TableStatus } from '../lib/types'

const STATUS_META: Record<
  TableStatus,
  { label: string; dot: string; text: string; border: string }
> = {
  libre: { label: 'Libre', dot: 'bg-emerald-500', text: 'text-emerald-400', border: 'border-white/10 hover:border-emerald-500/30' },
  ocupada: { label: 'Rentada', dot: 'bg-brand animate-pulse', text: 'text-brand', border: 'border-brand/40 bg-surface-2' },
  pausada: { label: 'Pausada', dot: 'bg-amber-400', text: 'text-amber-300', border: 'border-amber-400/40 bg-surface-2' },
  por_cobrar: { label: 'Por cobrar', dot: 'bg-sky-400 animate-pulse', text: 'text-sky-300', border: 'border-sky-400/40 bg-surface-2' },
  limpieza: { label: 'Limpieza', dot: 'bg-purple-400', text: 'text-purple-300', border: 'border-purple-400/20 bg-surface-2' },
  mantenimiento: { label: 'Mantenimiento', dot: 'bg-rose-400', text: 'text-rose-400', border: 'border-rose-400/20 bg-surface-2' },
}

interface TableCardProps {
  table: BilliardTable
  tab: Tab | null
  onTap: () => void
  onMenu?: () => void
  onQuickOrder?: () => void
}

export function TableCard({ table, tab, onTap, onMenu, onQuickOrder }: TableCardProps) {
  const active = table.status === 'ocupada' || table.status === 'pausada'
  const now = useNow(active)
  const meta = STATUS_META[table.status]

  const elapsed = active && tab?.rental ? facturableElapsedSec(tab.rental, now) : 0
  const totals = active && tab ? computeTotals(tab, now) : null
  const itemsCount = tab?.items.reduce((s, i) => s + i.qty, 0) || 0

  return (
    <div
      onClick={onTap}
      className="billiard-card-frame billiard-felt group text-left p-1.5 shadow-card active:scale-[0.98] cursor-pointer select-none transition-transform"
    >
      {/* 4 Troneras en las esquinas emulando mesa de billar */}
      <div className="billiard-pocket billiard-pocket-tl" />
      <div className="billiard-pocket billiard-pocket-tr" />
      <div className="billiard-pocket billiard-pocket-bl" />
      <div className="billiard-pocket billiard-pocket-br" />

      {/* Superficie interna de paño aterciopelado con banda biselada */}
      <div className="billiard-felt-inner p-3 sm:p-3.5 h-full flex flex-col justify-between min-h-[148px]">
        <div>
          <div className="flex items-start justify-between gap-1">
            <div className="min-w-0">
              <div className="text-sm sm:text-base font-bold text-ink-1 leading-tight flex items-center gap-1.5 truncate">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <span className="truncate">{table.name}</span>
              </div>
              <div className="text-[11px] text-emerald-200/70 mt-0.5 truncate uppercase tracking-wider font-medium">
                {table.type}
              </div>
            </div>
            {onMenu && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onMenu()
                }}
                className="p-1 rounded-lg text-emerald-200/60 hover:text-ink-1 hover:bg-black/30 transition-colors shrink-0 z-10"
                title="Opciones de mesa"
              >
                <MoreVertical size={16} />
              </button>
            )}
          </div>

          {/* Live Timer or Rate */}
          <div className="mt-3 h-12 flex flex-col justify-end">
            {active ? (
              <div>
                <div className="font-mono text-xl sm:text-2xl font-black text-amber-300 tabular-nums tracking-tight leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  {duration(elapsed)}
                </div>
                <div className="mt-1 flex items-center justify-between text-xs font-semibold">
                  <span className="text-brand tabular-nums font-mono drop-shadow">
                    {totals ? money(totals.total) : '$0'}
                  </span>
                  {itemsCount > 0 && (
                    <span className="text-[10px] text-emerald-200/80 font-medium px-1.5 py-0.2 rounded bg-black/40">
                      {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
                    </span>
                  )}
                </div>
              </div>
            ) : table.status === 'libre' ? (
              <div>
                <span className="text-xl sm:text-2xl text-ink-1 font-display font-bold drop-shadow">
                  {money(table.ratePerHour)}
                  <span className="text-xs font-normal text-emerald-200/60">/h</span>
                </span>
                <div className="text-[10px] text-emerald-300/90 font-medium mt-0.5 flex items-center gap-1">
                  <span>●</span> Disponible para jugar
                </div>
              </div>
            ) : (
              <div className="text-sm sm:text-base text-ink-2 font-display font-semibold">
                {meta.label}
              </div>
            )}
          </div>
        </div>

        {/* Footer info bar */}
        <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between gap-1">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold">
            <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
            <span className={meta.text}>{meta.label}</span>
          </span>

          {active && onQuickOrder ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onQuickOrder()
              }}
              className="text-[10px] font-bold text-amber-300 hover:text-amber-200 px-2 py-0.5 rounded-md bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/30 transition shadow-sm z-10"
            >
              + Pedido
            </button>
          ) : (
            <span className="text-[11px] text-emerald-200/60 tabular-nums font-mono">
              {money(table.ratePerHour)}/h
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
