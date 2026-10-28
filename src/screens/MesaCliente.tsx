import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Clock,
  Beer,
  Coffee,
  Utensils,
  Plus,
  CheckCircle2,
  AlertCircle,
  Receipt,
  BellRing,
  Sparkles,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react'
import { useApp, useNow } from '../state/AppContext'
import { computeRentalCharge, computeTotals } from '../lib/billing'
import { duration, money } from '../lib/format'
import { facturableElapsedSec } from '../lib/time'
import { Logo } from '../components/Logo'
import type { Product, ProductCategory } from '../lib/types'

export function MesaCliente() {
  const { tableId } = useParams()
  const { tables, tabs, products, addItem, notify } = useApp()

  const [activeCat, setActiveCat] = useState<'todo' | ProductCategory>('todo')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [orderQty, setOrderQty] = useState(1)
  const [calledStaff, setCalledStaff] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(false)

  const table = tables.find((t) => t.id === tableId || t.name.toLowerCase() === tableId?.toLowerCase())
  const tab = useMemo(() => {
    if (!table?.activeTabId) return null
    return tabs.find((t) => t.id === table.activeTabId && t.status !== 'cerrada' && t.status !== 'anulada') ?? null
  }, [table, tabs])

  const active = !!tab && (tab.status === 'abierta' || tab.status === 'por_cobrar')
  const now = useNow(active)
  const rental = tab?.rental ?? null
  const charge = rental ? computeRentalCharge(rental, now) : null
  const totals = tab ? computeTotals(tab, now) : null
  const elapsedSec = active && rental ? facturableElapsedSec(rental, now) : 0

  const isPaused =
    !!rental && rental.pauses.length > 0 && !rental.pauses[rental.pauses.length - 1].resumedAt

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p.active) return false
      if (activeCat === 'todo') return true
      return p.category === activeCat
    })
  }, [products, activeCat])

  if (!table) {
    return (
      <div className="min-h-dvh bg-bg text-ink-1 flex flex-col items-center justify-center p-6 text-center">
        <Logo variant="mark" height={60} className="mb-4" />
        <h2 className="text-xl font-bold font-display">Mesa no encontrada</h2>
        <p className="text-sm text-ink-3 mt-1 max-w-xs">
          Verifica el número de mesa o escanea nuevamente el código QR ubicado en la mesa.
        </p>
        <Link to="/" className="mt-6 px-4 py-2 rounded-xl bg-surface-3 border border-white/10 text-sm font-semibold text-brand">
          Ir al inicio
        </Link>
      </div>
    )
  }

  async function handleSendOrder() {
    if (!tab || !selectedProduct) return
    try {
      await addItem(tab.id, selectedProduct, orderQty, 'Mesa (Cliente)')
      setOrderSuccess(true)
      setSelectedProduct(null)
      setOrderQty(1)
      notify(`Pedido de ${orderQty}x ${selectedProduct.name} enviado a barra`, 'success')
      setTimeout(() => setOrderSuccess(false), 3000)
    } catch {
      notify('No se pudo enviar el pedido. Intenta nuevamente.', 'error')
    }
  }

  function handleCallWaiter() {
    if (!table) return
    setCalledStaff(true)
    notify(`Personal notificado para ${table.name}`, 'info')
    setTimeout(() => setCalledStaff(false), 8000)
  }

  return (
    <div className="min-h-dvh bg-bg text-ink-1 flex flex-col pb-24">
      {/* Top Banner */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-surface-1/90 backdrop-blur-xl px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo variant="mark" height={32} />
            <div>
              <div className="font-display font-bold text-base text-ink-1 leading-none">{table.name}</div>
              <div className="text-[11px] text-ink-3 mt-0.5">{table.type} · ${table.ratePerHour}/h</div>
            </div>
          </div>
          <button
            onClick={handleCallWaiter}
            disabled={calledStaff}
            className={`h-9 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 ${
              calledStaff
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-surface-3 border border-white/10 text-brand hover:border-brand/40'
            }`}
          >
            <BellRing size={14} className={calledStaff ? 'animate-bounce' : ''} />
            <span>{calledStaff ? 'Llamando...' : 'Pedir Cuenta'}</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto w-full px-4 pt-4 space-y-4">
        {/* Table Timer & Summary Box */}
        {active && rental ? (
          <div className="p-5 rounded-2xl border border-brand/30 bg-surface-2 shadow-card relative overflow-hidden">
            <div className="absolute top-0 right-0 w-36 h-36 bg-brand/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between text-xs text-ink-3">
              <span>Tiempo de Juego en Vivo</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  isPaused ? 'bg-amber-400/20 text-amber-300' : 'bg-emerald-400/20 text-emerald-400'
                }`}
              >
                {isPaused ? 'En Pausa' : 'Tiempo Corriendo'}
              </span>
            </div>

            <div className="mt-2 flex items-baseline justify-between">
              <span className="font-mono text-3xl sm:text-4xl font-bold tracking-tight text-ink-1 tabular-nums">
                {duration(elapsedSec)}
              </span>
              <div className="text-right">
                <span className="text-xs text-ink-3 block">Cargo por tiempo</span>
                <span className="font-mono text-xl font-bold text-brand tabular-nums">
                  {charge ? money(charge.charge) : '$0.00'}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-ink-2">
              <span>Total Cuenta Acumulada:</span>
              <span className="font-mono text-base font-bold text-ink-1 tabular-nums">
                {totals ? money(totals.total) : '$0.00'}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-2xl border border-white/10 bg-surface-2 text-center">
            <Clock size={36} className="mx-auto text-ink-3 opacity-60 mb-2" />
            <h3 className="font-display font-semibold text-ink-1">Mesa disponible</h3>
            <p className="text-xs text-ink-3 mt-1">
              Solicita la apertura de mesa en mostrador para iniciar tu partida de billar.
            </p>
          </div>
        )}

        {/* Order Success Toast */}
        {orderSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fade">
            <CheckCircle2 size={18} />
            <span>¡Tu pedido ha sido enviado a la barra! En breve te lo llevamos a la mesa.</span>
          </div>
        )}

        {/* Consumo Actual de la Mesa */}
        {tab && tab.items.length > 0 && (
          <div className="p-4 rounded-2xl border border-white/10 bg-surface-2">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-ink-2 uppercase tracking-wider flex items-center gap-1.5">
                <Receipt size={14} className="text-brand" />
                Historial de Consumo ({tab.items.reduce((s, i) => s + i.qty, 0)} artículos)
              </div>
            </div>

            <div className="divide-y divide-white/5 text-xs max-h-48 overflow-y-auto pr-1">
              {tab.items.map((item) => (
                <div key={item.id} className="py-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base">{item.emoji}</span>
                    <div className="truncate">
                      <div className="font-medium text-ink-1 truncate">{item.name}</div>
                      <div className="text-[10px] text-ink-3">
                        {item.qty} × {money(item.unitPrice)}
                        {item.orderedBy ? ` · ${item.orderedBy}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="font-mono font-semibold text-ink-1 tabular-nums whitespace-nowrap">
                    {money(item.qty * item.unitPrice)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Digital Self-Order Menu */}
        {active && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-base text-ink-1">Carta de Barra & Botanas</h3>
                <p className="text-xs text-ink-3">Pide directamente a tu mesa sin levantarte</p>
              </div>
            </div>

            {/* Category tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {(
                [
                  { id: 'todo', label: 'Todo' },
                  { id: 'cerveza', label: '🍺 Cerveza' },
                  { id: 'refresco', label: '🥤 Refrescos' },
                  { id: 'botana', label: '🍿 Botanas' },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCat(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                    activeCat === cat.id
                      ? 'bg-brand text-brand-on shadow-sm'
                      : 'bg-surface-2 text-ink-2 hover:text-ink-1 border border-white/5'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Products grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {filteredProducts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedProduct(p)
                    setOrderQty(1)
                  }}
                  className="p-3 rounded-xl border border-white/10 bg-surface-2 text-left hover:border-brand/40 active:scale-95 transition flex flex-col justify-between"
                >
                  <div>
                    <span className="text-2xl block mb-1">{p.emoji}</span>
                    <div className="text-xs font-semibold text-ink-1 line-clamp-1">{p.name}</div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs pt-1 border-t border-white/5">
                    <span className="font-mono font-bold text-brand">{money(p.price)}</span>
                    <span className="w-6 h-6 rounded-lg bg-surface-3 grid place-items-center text-ink-2 hover:text-brand">
                      <Plus size={14} />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Modal para Confirmar Pedido de Producto */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm grid place-items-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-surface-3 border border-white/15 p-5 shadow-modal animate-rise">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{selectedProduct.emoji}</span>
              <div>
                <h4 className="text-base font-bold text-ink-1">{selectedProduct.name}</h4>
                <p className="text-xs text-brand font-mono font-semibold">{money(selectedProduct.price)} c/u</p>
              </div>
            </div>

            {/* Cantidad */}
            <div className="mt-5 flex items-center justify-between bg-surface-2 p-2 rounded-xl border border-white/5">
              <span className="text-xs text-ink-2 pl-2">Cantidad:</span>
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
              <span>Total a cargar:</span>
              <span className="font-mono text-brand text-base tabular-nums">
                {money(selectedProduct.price * orderQty)}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button
                onClick={() => setSelectedProduct(null)}
                className="h-11 rounded-xl border border-white/10 text-ink-3 hover:text-ink-1 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleSendOrder}
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
