import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  CreditCard,
  Minus,
  Pause,
  Play,
  Plus,
  ReceiptText,
  Trash2,
  Wallet,
  X,
  ArrowRightLeft,
  QrCode,
  Search,
  ExternalLink,
  Tag,
  DollarSign,
  Printer,
  Copy,
  Check,
  UserCheck,
  UserRound,
} from 'lucide-react'
import { useApp, useNow } from '../state/AppContext'
import { computeRentalCharge, computeTotals } from '../lib/billing'
import { money, moneyNoSymbol, duration } from '../lib/format'
import { facturableElapsedSec } from '../lib/time'
import { Modal } from '../components/Modal'
import { ProductTile } from '../components/ProductTile'
import type { Payment, PaymentMethod, Product, ProductCategory, Tab, BilliardTable, CashierInfo } from '../lib/types'

type CatFilter = 'todo' | ProductCategory

const CATS: { id: CatFilter; label: string }[] = [
  { id: 'todo', label: 'Todo' },
  { id: 'cerveza', label: '🍺 Cerveza' },
  { id: 'refresco', label: '🥤 Refrescos' },
  { id: 'botana', label: '🍿 Botana' },
]

export function CuentaMesa() {
  const { tabId } = useParams()
  const navigate = useNavigate()
  const {
    tabs,
    tables,
    products,
    settings,
    addItem,
    setItemQty,
    removeItem,
    pauseRental,
    resumeRental,
    transferTable,
    setDiscount,
    setTip,
    closeTab,
    cancelTab,
    notify,
  } = useApp()

  const [cat, setCat] = useState<CatFilter>('todo')
  const [productSearch, setProductSearch] = useState('')
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [discountOpen, setDiscountOpen] = useState(false)
  const [discountInput, setDiscountInput] = useState('')
  const [selectedTargetTableId, setSelectedTargetTableId] = useState('')
  const [receipt, setReceipt] = useState<Tab | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)

  const tab = tabs.find((t) => t.id === tabId)
  const active = !!tab && (tab.status === 'abierta' || tab.status === 'por_cobrar')
  const now = useNow(active)

  const rental = tab?.rental ?? null
  const charge = rental ? computeRentalCharge(rental, now) : null
  const totals = tab ? computeTotals(tab, now) : null

  const isPaused =
    !!rental && rental.pauses.length > 0 && !rental.pauses[rental.pauses.length - 1].resumedAt

  const availableTables = useMemo(() => {
    return tables.filter((t) => t.status === 'libre')
  }, [tables])

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (!p.active) return false
      const matchesCat = cat === 'todo' || p.category === cat
      const matchesSearch = productSearch
        ? p.name.toLowerCase().includes(productSearch.toLowerCase())
        : true
      return matchesCat && matchesSearch
    })
  }, [cat, products, productSearch])

  if (!tab) {
    return (
      <div className="min-h-dvh bg-bg grid place-items-center px-6 text-center">
        <div>
          <ReceiptText size={40} className="mx-auto text-ink-3" />
          <p className="mt-4 text-ink-1 font-semibold">Cuenta no encontrada</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 inline-flex items-center gap-2 text-brand font-medium hover:underline"
          >
            <ArrowLeft size={18} /> Volver a mesas
          </button>
        </div>
      </div>
    )
  }

  const elapsedSec = active && rental ? facturableElapsedSec(rental, now) : 0

  function getClientUrl() {
    const origin = window.location.origin
    const hash = `#/mesa-cliente/${tab!.tableId}`
    return `${origin}${window.location.pathname}${hash}`
  }

  function handleCopyClientUrl() {
    const url = getClientUrl()
    navigator.clipboard.writeText(url)
    setCopiedLink(true)
    notify('Enlace de la mesa copiado', 'success')
    setTimeout(() => setCopiedLink(false), 3000)
  }

  async function onPaid(payments: Payment[], cashier?: CashierInfo) {
    const closed = await closeTab(tab!.id, payments, cashier)
    if (closed) {
      setCheckoutOpen(false)
      setReceipt(closed)
    }
  }

  async function handleTransfer() {
    if (!selectedTargetTableId) return
    await transferTable(tab!.id, selectedTargetTableId)
    setTransferOpen(false)
  }

  async function handleApplyDiscount() {
    const amount = Number(discountInput) || 0
    await setDiscount(tab!.id, amount)
    setDiscountOpen(false)
    setDiscountInput('')
  }

  return (
    <div className="min-h-dvh bg-bg flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-bg/85 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/')}
              className="p-2.5 rounded-xl hover:bg-white/10 text-ink-2 transition-colors shrink-0"
              aria-label="Volver a mesas"
            >
              <ArrowLeft size={22} />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-lg font-bold text-ink-1 truncate">
                  {tab.tableName}
                </h1>
                {isPaused && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-warning/20 text-warning">
                    Pausada
                  </span>
                )}
              </div>
              <p className="text-xs text-ink-3 truncate">
                {money(tab.rental?.ratePerHour ?? 0)}/h · abierta a las{' '}
                {new Date(tab.openedAt).toLocaleTimeString('es-MX', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Transfer Table Button */}
            {active && (
              <button
                onClick={() => {
                  setSelectedTargetTableId(availableTables[0]?.id || '')
                  setTransferOpen(true)
                }}
                className="h-10 px-3 rounded-xl bg-surface-2 border border-white/10 hover:border-white/25 text-ink-2 text-xs font-semibold flex items-center gap-1.5 transition"
                title="Cambiar a otra mesa"
              >
                <ArrowRightLeft size={15} />
                <span className="hidden sm:inline">Transferir</span>
              </button>
            )}

            {/* QR / Modo Cliente */}
            <button
              onClick={() => setQrOpen(true)}
              className="h-10 px-3 rounded-xl bg-surface-2 border border-white/10 hover:border-white/25 text-ink-2 text-xs font-semibold flex items-center gap-1.5 transition"
              title="QR y vista cliente"
            >
              <QrCode size={15} className="text-brand" />
              <span className="hidden sm:inline">QR Mesa</span>
            </button>

            {/* Pause / Resume Button */}
            {active && rental && (
              <button
                onClick={() => (isPaused ? resumeRental(tab.id) : pauseRental(tab.id))}
                className={`inline-flex items-center gap-2 h-10 px-3.5 rounded-xl text-xs font-semibold transition active:scale-[0.97] ${
                  isPaused
                    ? 'bg-brand text-brand-on hover:bg-brand-hover shadow-card'
                    : 'bg-surface-3 border border-white/10 text-ink-1 hover:border-white/25'
                }`}
              >
                {isPaused ? <Play size={16} /> : <Pause size={16} />}
                <span>{isPaused ? 'Reanudar' : 'Pausar'}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Body: Split View (Products left / Tab receipt right) */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-5 grid lg:grid-cols-12 gap-6 items-start">
        {/* Left: Product Catalog */}
        <section className="lg:col-span-7 space-y-4">
          <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center justify-between">
            {/* Search Box */}
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
              <input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Buscar bebida o botana..."
                className="w-full h-10 pl-9 pr-3 rounded-xl bg-surface-2 border border-white/10 text-xs text-ink-1 placeholder:text-ink-3 focus:outline-none focus:border-brand/60"
              />
            </div>

            {/* Categories */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {CATS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCat(c.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    cat === c.id
                      ? 'bg-brand text-brand-on shadow-sm'
                      : 'bg-surface-2 text-ink-2 hover:text-ink-1 border border-white/5'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Product Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {filtered.map((p) => (
              <ProductTile
                key={p.id}
                product={p}
                onAdd={() => active && addItem(tab.id, p, 1, 'Caja')}
              />
            ))}
          </div>
        </section>

        {/* Right: Tab Summary Card */}
        <section className="lg:col-span-5 rounded-2xl border border-white/10 bg-surface-2 shadow-card p-5 space-y-4 sticky top-20">
          {/* Timer Widget */}
          {rental && (
            <div className="rounded-xl border border-white/10 bg-surface-1 p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-ink-3 uppercase tracking-wider block">
                  Tiempo de juego
                </span>
                <span className="font-mono text-2xl font-bold text-ink-1 tabular-nums">
                  {duration(elapsedSec)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-ink-3 uppercase tracking-wider block">
                  Cálculo de renta
                </span>
                <span className="font-mono text-xl font-bold text-brand tabular-nums">
                  {charge ? money(charge.charge) : '$0'}
                </span>
              </div>
            </div>
          )}

          {/* Tab Items List */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-ink-3 uppercase tracking-wider pb-2 border-b border-white/10">
              <span>Consumos ({tab.items.reduce((s, i) => s + i.qty, 0)})</span>
              <span>Subtotal</span>
            </div>

            {tab.items.length === 0 ? (
              <div className="py-8 text-center text-xs text-ink-3">
                No hay consumos añadidos aún. Selecciona productos a la izquierda.
              </div>
            ) : (
              <div className="divide-y divide-white/5 max-h-56 overflow-y-auto pr-1">
                {tab.items.map((item) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-ink-1 truncate flex items-center gap-1.5">
                        <span>{item.emoji}</span>
                        <span>{item.name}</span>
                        {item.orderedBy && item.orderedBy.includes('Cliente') && (
                          <span className="text-[9px] bg-brand/15 text-brand px-1.5 py-0.2 rounded font-mono">
                            Mesa
                          </span>
                        )}
                      </div>
                      <div className="text-ink-3 text-[11px] mt-0.5">
                        {money(item.unitPrice)} c/u
                      </div>
                    </div>

                    {/* Qty Stepper */}
                    {active ? (
                      <div className="flex items-center gap-2 bg-surface-3 rounded-lg p-1 border border-white/5">
                        <button
                          onClick={() => setItemQty(tab.id, item.id, item.qty - 1)}
                          className="w-6 h-6 rounded bg-surface-4 text-ink-2 hover:text-ink-1 grid place-items-center active:scale-90"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="font-mono font-bold text-ink-1 w-5 text-center tabular-nums">
                          {item.qty}
                        </span>
                        <button
                          onClick={() => setItemQty(tab.id, item.id, item.qty + 1)}
                          className="w-6 h-6 rounded bg-surface-4 text-ink-2 hover:text-ink-1 grid place-items-center active:scale-90"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    ) : (
                      <span className="font-mono font-bold text-ink-1">{item.qty}</span>
                    )}

                    <div className="font-mono font-semibold text-ink-1 tabular-nums w-16 text-right">
                      {money(item.qty * item.unitPrice)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals Breakdown */}
          {totals && (
            <div className="pt-3 border-t border-white/10 space-y-1.5 text-xs text-ink-2">
              <div className="flex justify-between">
                <span>Renta de mesa:</span>
                <span className="font-mono text-ink-1 tabular-nums">{money(totals.rentalCharge)}</span>
              </div>
              <div className="flex justify-between">
                <span>Consumo de barra:</span>
                <span className="font-mono text-ink-1 tabular-nums">{money(totals.productsSubtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>IVA (16%):</span>
                <span className="font-mono text-ink-1 tabular-nums">{money(totals.tax)}</span>
              </div>
              {tab.discount > 0 && (
                <div className="flex justify-between text-emerald-400 font-semibold">
                  <span>Descuento aplicado:</span>
                  <span className="font-mono tabular-nums">-{money(tab.discount)}</span>
                </div>
              )}
              {tab.tip > 0 && (
                <div className="flex justify-between text-brand font-semibold">
                  <span>Propina:</span>
                  <span className="font-mono tabular-nums">+{money(tab.tip)}</span>
                </div>
              )}

              <div className="pt-2 border-t border-white/10 flex items-baseline justify-between text-base font-bold text-ink-1">
                <span>Total a liquidar:</span>
                <span className="font-mono text-2xl text-brand tabular-nums">
                  {money(totals.total)}
                </span>
              </div>
            </div>
          )}

          {/* Quick Actions (Discount, Checkout, Cancel) */}
          {active && (
            <div className="pt-2 space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setDiscountOpen(true)}
                  className="h-10 rounded-xl bg-surface-3 border border-white/10 text-xs font-semibold text-ink-2 hover:text-ink-1 flex items-center justify-center gap-1.5 transition"
                >
                  <Tag size={14} />
                  Descuento
                </button>
                <button
                  onClick={() => setCancelOpen(true)}
                  className="h-10 rounded-xl bg-surface-3 border border-white/10 text-xs font-semibold text-rose-400/80 hover:text-rose-400 flex items-center justify-center gap-1.5 transition"
                >
                  <Trash2 size={14} />
                  Anular Mesa
                </button>
              </div>

              <button
                onClick={() => setCheckoutOpen(true)}
                className="w-full h-13 rounded-xl bg-brand text-brand-on font-display font-bold text-base hover:bg-brand-hover active:scale-[0.98] transition shadow-card flex items-center justify-center gap-2"
              >
                <ReceiptText size={20} />
                <span>Cobrar {totals ? money(totals.total) : ''}</span>
              </button>
            </div>
          )}
        </section>
      </main>

      {/* Modal Checkout con División de Métodos */}
      {checkoutOpen && totals && (
        <CheckoutModal
          total={totals.total}
          tipEnabled={settings.tipEnabled}
          onClose={() => setCheckoutOpen(false)}
          onPaid={onPaid}
        />
      )}

      {/* Modal Descuento */}
      <Modal open={discountOpen} onClose={() => setDiscountOpen(false)} title="Aplicar Descuento a Cuenta">
        <div className="space-y-4">
          <p className="text-xs text-ink-3">
            Ingresa el monto directo en pesos ($ MXN) a descontar de la cuenta final:
          </p>
          <input
            type="number"
            min={0}
            step={5}
            value={discountInput}
            onChange={(e) => setDiscountInput(e.target.value)}
            placeholder="Ej. 50"
            className="w-full h-12 px-4 rounded-xl bg-surface-2 border border-white/10 text-lg font-mono text-ink-1 focus:outline-none focus:border-brand"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setDiscountOpen(false)}
              className="px-4 py-2 rounded-xl text-xs text-ink-3 hover:text-ink-1"
            >
              Cancelar
            </button>
            <button
              onClick={handleApplyDiscount}
              className="px-5 py-2.5 rounded-xl bg-brand text-brand-on font-semibold text-xs"
            >
              Aplicar Descuento
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Transferencia de Mesa */}
      <Modal open={transferOpen} onClose={() => setTransferOpen(false)} title="Transferir a Otra Mesa">
        <div className="space-y-4">
          <p className="text-xs text-ink-3">
            Mueve esta cuenta a otra mesa sin perder el tiempo de juego acumulado ni los consumos:
          </p>
          {availableTables.length === 0 ? (
            <p className="text-xs text-rose-400 font-semibold py-2">
              No hay otras mesas libres en este momento para realizar la transferencia.
            </p>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-ink-2">Selecciona mesa destino:</label>
              <select
                value={selectedTargetTableId}
                onChange={(e) => setSelectedTargetTableId(e.target.value)}
                className="w-full h-12 px-3 rounded-xl bg-surface-2 border border-white/10 text-sm text-ink-1 focus:outline-none focus:border-brand"
              >
                {availableTables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.type} · ${t.ratePerHour}/h)
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setTransferOpen(false)}
              className="px-4 py-2 rounded-xl text-xs text-ink-3 hover:text-ink-1"
            >
              Cancelar
            </button>
            <button
              disabled={availableTables.length === 0}
              onClick={handleTransfer}
              className="px-5 py-2.5 rounded-xl bg-brand text-brand-on font-semibold text-xs disabled:opacity-50"
            >
              Confirmar Transferencia
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal QR de Mesa */}
      <Modal open={qrOpen} onClose={() => setQrOpen(false)} title={`Código QR — ${tab.tableName}`}>
        <div className="text-center space-y-4 py-2">
          <div className="w-48 h-48 mx-auto bg-white p-3 rounded-2xl shadow-popover grid place-items-center">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                getClientUrl()
              )}`}
              alt="QR Mesa"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <p className="text-xs text-ink-2 max-w-xs mx-auto">
            Los clientes en {tab.tableName} pueden escanear este código para revisar su tiempo y ordenar bebidas en vivo.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleCopyClientUrl}
              className="flex-1 h-11 rounded-xl bg-surface-2 border border-white/10 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-surface-3 transition"
            >
              {copiedLink ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
              {copiedLink ? 'Copiado' : 'Copiar Enlace'}
            </button>
            <a
              href={getClientUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="h-11 px-4 rounded-xl bg-brand text-brand-on text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-brand-hover transition"
            >
              <ExternalLink size={16} />
              Abrir
            </a>
          </div>
        </div>
      </Modal>

      {/* Modal Anular */}
      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="¿Anular cuenta de mesa?">
        <div className="space-y-4">
          <p className="text-xs text-ink-2">
            Esta acción liberará {tab.tableName} y marcará la cuenta como anulada. Esta operación quedará registrada en la bitácora de auditoría.
          </p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setCancelOpen(false)}
              className="px-4 py-2.5 rounded-xl text-xs text-ink-3 hover:text-ink-1"
            >
              Regresar
            </button>
            <button
              onClick={async () => {
                await cancelTab(tab.id, 'Anulación manual desde mostrador')
                setCancelOpen(false)
                navigate('/')
              }}
              className="px-5 py-2.5 rounded-xl bg-rose-500 text-white font-semibold text-xs hover:bg-rose-600 transition"
            >
              Confirmar Anulación
            </button>
          </div>
        </div>
      </Modal>

      {/* Receipt Modal */}
      {receipt && (
        <ReceiptOverlay
          tab={receipt}
          onDone={() => {
            setReceipt(null)
            navigate('/')
          }}
        />
      )}
    </div>
  )
}

function CheckoutModal({
  total,
  tipEnabled,
  onClose,
  onPaid,
}: {
  total: number
  tipEnabled: boolean
  onClose: () => void
  onPaid: (payments: Payment[], cashier?: CashierInfo) => void
}) {
  const { cashiers, user } = useApp()
  const activeCashiers = useMemo(() => cashiers.filter((c) => c.active), [cashiers])
  const [selectedCashierId, setSelectedCashierId] = useState<string>(() => {
    const matching = activeCashiers.find(
      (c) =>
        c.username.toLowerCase() === user?.name?.toLowerCase() ||
        c.name.toLowerCase() === user?.name?.toLowerCase()
    )
    if (matching) return matching.id
    return activeCashiers[0]?.id || 'admin'
  })

  const [method, setMethod] = useState<PaymentMethod>('efectivo')
  const [tip, setTip] = useState('')
  const [received, setReceived] = useState('')
  const [splitMode, setSplitMode] = useState(false)
  const [cashAmount, setCashAmount] = useState('')
  const [cardAmount, setCardAmount] = useState('')

  const tipVal = Number(tip) || 0
  const grandTotal = total + tipVal
  const receivedVal = Number(received) || 0
  const change = receivedVal - grandTotal

  function handleSubmit() {
    const chosenCashier = activeCashiers.find((c) => c.id === selectedCashierId)
    const cashierInfo: CashierInfo = chosenCashier
      ? { id: chosenCashier.id, name: chosenCashier.name, username: chosenCashier.username }
      : { id: user?.uid || 'admin', name: user?.name || 'Administrador', username: 'admin' }

    if (splitMode) {
      const c = Number(cashAmount) || 0
      const d = Number(cardAmount) || 0
      if (c + d < grandTotal) {
        alert('La suma de los pagos divididos debe cubrir el total')
        return
      }
      onPaid(
        [
          {
            id: `pay-cash-${Date.now()}`,
            method: 'efectivo',
            amount: c,
            at: Date.now(),
            cashierId: cashierInfo.id,
            cashierName: cashierInfo.name,
            cashierUsername: cashierInfo.username,
          },
          {
            id: `pay-card-${Date.now()}`,
            method: 'tarjeta',
            amount: d,
            at: Date.now(),
            cashierId: cashierInfo.id,
            cashierName: cashierInfo.name,
            cashierUsername: cashierInfo.username,
          },
        ],
        cashierInfo
      )
    } else {
      onPaid(
        [
          {
            id: `pay-${Date.now()}`,
            method,
            amount: grandTotal,
            at: Date.now(),
            cashierId: cashierInfo.id,
            cashierName: cashierInfo.name,
            cashierUsername: cashierInfo.username,
          },
        ],
        cashierInfo
      )
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-md rounded-t-modal sm:rounded-modal bg-surface-4 border border-white/10 shadow-modal max-h-[92vh] overflow-y-auto animate-rise p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h2 className="text-ink-1 font-semibold text-lg">Cobro de Cuenta</h2>
          <button onClick={onClose} className="p-1.5 text-ink-3 hover:text-ink-1">
            <X size={20} />
          </button>
        </div>

        {/* Cajero Registrado que cobra la cuenta */}
        <div className="bg-surface-3 p-3.5 rounded-xl border border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-ink-3 uppercase tracking-wider flex items-center gap-1.5">
              <UserRound size={13} className="text-brand" />
              Cajero que Liquida la Cuenta:
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">Registrado</span>
          </div>

          {activeCashiers.length > 0 ? (
            <select
              value={selectedCashierId}
              onChange={(e) => setSelectedCashierId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-surface-2 border border-white/10 text-xs font-semibold text-ink-1 focus:outline-none focus:border-brand"
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
            <div className="text-xs font-semibold text-ink-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{user?.name || 'Cajero de Turno'}</span>
            </div>
          )}
        </div>

        <div className="text-center py-1">
          <div className="text-xs text-ink-3 uppercase tracking-wider">Total a Cobrar</div>
          <div className="font-display text-4xl font-bold text-ink-1 tabular-nums mt-1">
            {money(total)}
          </div>
          {tipVal > 0 && (
            <div className="text-xs text-brand font-semibold mt-1">
              + propina {money(tipVal)} = {money(grandTotal)}
            </div>
          )}
        </div>

        {/* Split mode toggle */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-surface-3 border border-white/5 text-xs">
          <span className="text-ink-2">Dividir pago (Efectivo + Tarjeta)</span>
          <button
            onClick={() => setSplitMode(!splitMode)}
            className={`px-3 py-1 rounded-lg font-semibold transition ${
              splitMode ? 'bg-brand text-brand-on' : 'bg-surface-2 text-ink-3'
            }`}
          >
            {splitMode ? 'Activado' : 'Un solo método'}
          </button>
        </div>

        {splitMode ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-ink-3 uppercase">Monto Efectivo</label>
              <input
                type="number"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                placeholder="0.00"
                className="w-full h-11 px-3 mt-1 rounded-xl bg-surface-3 border border-white/10 font-mono text-ink-1"
              />
            </div>
            <div>
              <label className="text-xs text-ink-3 uppercase">Monto Tarjeta / Transferencia</label>
              <input
                type="number"
                value={cardAmount}
                onChange={(e) => setCardAmount(e.target.value)}
                placeholder="0.00"
                className="w-full h-11 px-3 mt-1 rounded-xl bg-surface-3 border border-white/10 font-mono text-ink-1"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 'efectivo', label: 'Efectivo', icon: Banknote },
                { id: 'tarjeta', label: 'Tarjeta', icon: CreditCard },
                { id: 'transferencia', label: 'Transfer.', icon: Wallet },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                className={`py-3 px-2 rounded-xl border flex flex-col items-center gap-1.5 transition ${
                  method === m.id
                    ? 'border-brand bg-brand-soft text-brand font-semibold'
                    : 'border-white/10 bg-surface-3 text-ink-2'
                }`}
              >
                <m.icon size={20} />
                <span className="text-xs">{m.label}</span>
              </button>
            ))}
          </div>
        )}

        {!splitMode && method === 'efectivo' && (
          <div>
            <label className="text-xs text-ink-3 uppercase tracking-wider">Efectivo Recibido</label>
            <input
              inputMode="decimal"
              value={received}
              onChange={(e) => setReceived(e.target.value)}
              placeholder={moneyNoSymbol(grandTotal)}
              className="mt-1 w-full h-12 px-4 rounded-xl bg-surface-3 border border-white/10 text-ink-1 font-mono text-lg focus:outline-none focus:border-brand"
            />
            {receivedVal > 0 && (
              <div
                className={`mt-1.5 text-xs font-semibold ${
                  change >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {change >= 0 ? `Cambio a devolver: ${money(change)}` : `Faltan: ${money(Math.abs(change))}`}
              </div>
            )}
          </div>
        )}

        {tipEnabled && (
          <div>
            <label className="text-xs text-ink-3 uppercase tracking-wider">Propina Voluntaria</label>
            <input
              inputMode="decimal"
              value={tip}
              onChange={(e) => setTip(e.target.value)}
              placeholder="0.00"
              className="mt-1 w-full h-11 px-4 rounded-xl bg-surface-3 border border-white/10 text-ink-1 font-mono text-sm focus:outline-none focus:border-brand"
            />
          </div>
        )}

        <button
          onClick={handleSubmit}
          className="w-full h-14 rounded-xl bg-brand text-brand-on font-display font-bold text-base hover:bg-brand-hover active:scale-[0.98] transition shadow-card"
        >
          Confirmar Cobro {money(grandTotal)}
        </button>
      </div>
    </div>
  )
}

function ReceiptOverlay({ tab, onDone }: { tab: Tab; onDone: () => void }) {
  const t = tab.totals
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-surface-4 border border-white/10 shadow-modal p-6 animate-rise text-center">
        <CheckCircle2 size={44} className="mx-auto text-emerald-400 mb-2" />
        <h2 className="font-display text-xl font-bold text-ink-1">Cobro Liquidado</h2>
        <p className="text-xs text-ink-3 mt-0.5">
          {tab.tableName} · {new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
        </p>

        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-3 border border-brand/20 text-xs font-semibold text-brand">
          <UserCheck size={14} />
          <span>Cobrado por: {tab.closedByCashierName || 'Cajero de Turno'} {tab.closedByCashierUsername ? `(@${tab.closedByCashierUsername})` : ''}</span>
        </div>

        <div className="mt-5 rounded-xl bg-surface-3 border border-white/10 p-4 space-y-2 text-xs text-left">
          <div className="flex justify-between">
            <span className="text-ink-2">Renta de mesa:</span>
            <span className="font-mono text-ink-1 tabular-nums">{money(t?.rentalCharge ?? 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-2">Consumo ({tab.items.length} items):</span>
            <span className="font-mono text-ink-1 tabular-nums">{money(t?.productsSubtotal ?? 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-2">IVA (16%):</span>
            <span className="font-mono text-ink-1 tabular-nums">{money(t?.tax ?? 0)}</span>
          </div>
          {t?.discount ? (
            <div className="flex justify-between text-emerald-400">
              <span>Descuento:</span>
              <span className="font-mono tabular-nums">-{money(t.discount)}</span>
            </div>
          ) : null}
          {t?.tip ? (
            <div className="flex justify-between text-brand">
              <span>Propina:</span>
              <span className="font-mono tabular-nums">+{money(t.tip)}</span>
            </div>
          ) : null}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-sm font-bold text-ink-1">
            <span>Total Pagado:</span>
            <span className="font-mono text-xl text-brand tabular-nums">{money(t?.total ?? 0)}</span>
          </div>
        </div>

        <button
          onClick={onDone}
          className="mt-5 w-full h-12 rounded-xl bg-brand text-brand-on font-semibold hover:bg-brand-hover transition"
        >
          Finalizar y Salir
        </button>
      </div>
    </div>
  )
}
