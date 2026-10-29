import { useMemo, useState, type ReactNode } from 'react'
import {
  Package,
  Plus,
  Search,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  LayoutGrid,
  List,
  AlertTriangle,
  Sparkles,
} from 'lucide-react'
import { useApp } from '../state/AppContext'
import { ProductTile } from '../components/ProductTile'
import { Modal } from '../components/Modal'
import type { Product, ProductCategory } from '../lib/types'
import { money } from '../lib/format'

const CAT_OPTIONS: { id: ProductCategory; label: string; icon: string }[] = [
  { id: 'cerveza', label: 'Cerveza', icon: '🍺' },
  { id: 'refresco', label: 'Refresco', icon: '🥤' },
  { id: 'botana', label: 'Botana', icon: '🍿' },
  { id: 'otro', label: 'Otro', icon: '📦' },
]

const EMOJI_PRESETS = ['🍺', '🍻', '🥃', '🍹', '🥤', '🧊', '☕', '🍿', '🥜', '🍕', '🍔', '🌮', '🎱', '📦']

const EMPTY: Omit<Product, 'id'> = {
  name: '',
  category: 'cerveza',
  price: 0,
  taxRate: 0.16,
  emoji: '🍺',
  stock: null,
  active: true,
}

export function Productos() {
  const { products, saveProduct, deleteProduct, user, settings, notify } = useApp()
  const [editing, setEditing] = useState<Product | null>(null)
  const [creating, setCreating] = useState(false)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)
  const [selectedCat, setSelectedCat] = useState<'todas' | ProductCategory>('todas')
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')

  const admin = user?.role === 'admin'

  const filteredProducts = useMemo(() => {
    let list = products
    if (selectedCat !== 'todas') {
      list = list.filter((p) => p.category === selectedCat)
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      list = list.filter((p) => p.name.toLowerCase().includes(q))
    }
    return list
  }, [products, selectedCat, search])

  const stats = useMemo(() => {
    const total = products.length
    const active = products.filter((p) => p.active).length
    const lowStock = products.filter((p) => p.stock != null && p.stock <= 5).length
    return { total, active, lowStock }
  }, [products])

  function openNew() {
    setCreating(true)
  }

  function openEdit(p: Product) {
    setEditing(p)
  }

  async function handleToggleActive(p: Product) {
    if (!admin) return
    const updated = { ...p, active: !p.active }
    await saveProduct(updated)
    notify(`Producto ${updated.active ? 'activado' : 'desactivado'} para venta`, 'info')
  }

  async function confirmDelete() {
    if (!deletingProduct) return
    try {
      await deleteProduct(deletingProduct.id)
      notify(`Producto "${deletingProduct.name}" eliminado del catálogo`, 'info')
      setDeletingProduct(null)
    } catch {
      notify('Error al eliminar producto', 'error')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-1 flex items-center gap-2">
            <Package size={26} className="text-brand" />
            Catálogo & Inventario de Productos
          </h1>
          <p className="text-xs text-ink-2 mt-1">
            Control integral de bebidas, botanas, precios, stock e impuestos (IVA {Math.round(settings.defaultTaxRate * 100)}%)
          </p>
        </div>

        {admin && (
          <button
            onClick={openNew}
            className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-brand text-brand-on font-bold hover:bg-brand-hover active:scale-[0.98] transition shadow-card self-start sm:self-auto"
          >
            <Plus size={18} />
            <span>Nuevo Producto</span>
          </button>
        )}
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="billiard-card-frame billiard-felt p-1 shadow-sm">
          <div className="billiard-felt-inner p-3">
            <div className="text-[10px] text-emerald-300/80 uppercase font-bold tracking-wider">Total Catálogo</div>
            <div className="text-xl font-bold text-ink-1 mt-0.5">{stats.total} productos</div>
          </div>
        </div>
        <div className="billiard-card-frame billiard-felt p-1 shadow-sm">
          <div className="billiard-felt-inner p-3">
            <div className="text-[10px] text-emerald-300/80 uppercase font-bold tracking-wider">Activos en Caja</div>
            <div className="text-xl font-bold text-emerald-400 mt-0.5">{stats.active} disponibles</div>
          </div>
        </div>
        <div className="billiard-card-frame billiard-felt p-1 shadow-sm">
          <div className="billiard-felt-inner p-3">
            <div className="text-[10px] text-emerald-300/80 uppercase font-bold tracking-wider">Bajo Stock (≤5)</div>
            <div className={`text-xl font-bold mt-0.5 ${stats.lowStock > 0 ? 'text-amber-400' : 'text-emerald-200/60'}`}>
              {stats.lowStock} productos
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedCat('todas')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
              selectedCat === 'todas'
                ? 'bg-brand text-brand-on shadow-sm'
                : 'text-ink-3 hover:text-ink-1 bg-surface-2'
            }`}
          >
            Todas ({products.length})
          </button>
          {CAT_OPTIONS.map((c) => {
            const count = products.filter((p) => p.category === c.id).length
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCat(c.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 flex items-center gap-1.5 ${
                  selectedCat === c.id
                    ? 'bg-brand text-brand-on shadow-sm'
                    : 'text-ink-3 hover:text-ink-1 bg-surface-2'
                }`}
              >
                <span>{c.icon}</span>
                <span>{c.label} ({count})</span>
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar producto..."
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-surface-2 border border-white/10 text-xs text-ink-1 placeholder:text-ink-3 focus:outline-none focus:border-brand"
            />
          </div>

          <div className="flex items-center p-1 rounded-xl bg-surface-2 border border-white/10 shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'grid' ? 'bg-surface-4 text-brand' : 'text-ink-3 hover:text-ink-1'
              }`}
              title="Vista cuadrícula"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'table' ? 'bg-surface-4 text-brand' : 'text-ink-3 hover:text-ink-1'
              }`}
              title="Vista lista / tabla"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {filteredProducts.length === 0 ? (
        <div className="grid place-items-center py-20 text-center rounded-2xl border border-white/5 bg-surface-2/30">
          <Package size={40} className="text-ink-3 opacity-60 mb-2" />
          <p className="text-sm font-semibold text-ink-1">No se encontraron productos</p>
          <p className="text-xs text-ink-3 mt-1">Prueba con otro término de búsqueda o categoría.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filteredProducts.map((p) => (
            <div
              key={p.id}
              className={`group relative rounded-card border transition-all p-3 flex flex-col justify-between ${
                p.active
                  ? 'bg-surface-2 border-white/10 hover:border-brand/40 shadow-sm'
                  : 'bg-surface-2/40 border-white/5 opacity-55'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <span className="text-3xl select-none">{p.emoji}</span>
                  {admin && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => openEdit(p)}
                        className="p-1 rounded-lg bg-surface-4 text-ink-2 hover:text-brand"
                        title="Editar producto"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => setDeletingProduct(p)}
                        className="p-1 rounded-lg bg-surface-4 text-ink-2 hover:text-rose-400"
                        title="Eliminar producto"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-2 font-semibold text-xs text-ink-1 leading-snug truncate" title={p.name}>
                  {p.name}
                </div>
                <div className="text-[10px] text-ink-3 uppercase mt-0.5 tracking-wider">
                  {p.category}
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-mono font-bold text-brand">{money(p.price)}</div>
                  <div className="text-[10px] text-ink-3 font-mono">
                    Stock: {p.stock == null ? '∞' : p.stock}
                  </div>
                </div>

                {admin && (
                  <button
                    onClick={() => handleToggleActive(p)}
                    className={`p-1 rounded-lg transition ${
                      p.active ? 'text-emerald-400 hover:text-rose-400' : 'text-ink-3 hover:text-emerald-400'
                    }`}
                    title={p.active ? 'Desactivar en punto de venta' : 'Activar en punto de venta'}
                  >
                    {p.active ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="rounded-2xl border border-white/10 bg-surface-2 overflow-hidden shadow-card">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-3/80 text-[11px] uppercase tracking-wider text-ink-3 border-b border-white/5">
              <tr>
                <th className="py-3 px-4">Producto</th>
                <th className="py-3 px-4">Categoría</th>
                <th className="py-3 px-4">Precio</th>
                <th className="py-3 px-4">Stock</th>
                <th className="py-3 px-4">Estado</th>
                {admin && <th className="py-3 px-4 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-white/5 transition">
                  <td className="py-3 px-4 font-semibold text-ink-1">
                    <span className="mr-2 text-base">{p.emoji}</span>
                    {p.name}
                  </td>
                  <td className="py-3 px-4 text-ink-2 capitalize">{p.category}</td>
                  <td className="py-3 px-4 font-mono font-bold text-brand">{money(p.price)}</td>
                  <td className="py-3 px-4 font-mono text-ink-2">
                    {p.stock == null ? (
                      <span className="text-ink-3">Ilimitado</span>
                    ) : (
                      <span className={p.stock <= 5 ? 'text-amber-400 font-bold' : ''}>
                        {p.stock} u.
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleToggleActive(p)}
                      disabled={!admin}
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.active
                          ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                          : 'bg-white/5 text-ink-3 border border-white/10'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${p.active ? 'bg-emerald-400' : 'bg-ink-3'}`} />
                      {p.active ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  {admin && (
                    <td className="py-3 px-4 text-right space-x-1">
                      <button
                        onClick={() => openEdit(p)}
                        className="p-1.5 rounded-lg bg-surface-3 text-ink-2 hover:text-brand transition"
                        title="Editar"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => setDeletingProduct(p)}
                        className="p-1.5 rounded-lg bg-surface-3 text-ink-2 hover:text-rose-400 transition"
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Formulario Crear/Editar */}
      {(creating || editing) && (
        <ProductForm
          initial={editing ?? { ...EMPTY, id: `p-${Date.now()}` }}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
          onSave={async (p) => {
            await saveProduct(p)
            setCreating(false)
            setEditing(null)
            notify(`Producto "${p.name}" guardado exitosamente`, 'success')
          }}
        />
      )}

      {/* Modal Confirmar Eliminación */}
      <Modal
        open={!!deletingProduct}
        onClose={() => setDeletingProduct(null)}
        title="Eliminar Producto del Catálogo"
      >
        {deletingProduct && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
              <AlertTriangle size={20} className="text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs text-ink-2 leading-relaxed">
                ¿Estás seguro de que deseas eliminar permanentemente{' '}
                <strong className="text-ink-1 font-semibold">{deletingProduct.emoji} {deletingProduct.name}</strong>?
                Esta acción se registrará en los registros de auditoría del club.
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDeletingProduct(null)}
                className="px-4 py-2 rounded-xl text-xs text-ink-3 hover:text-ink-1"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-500 text-white font-bold text-xs hover:bg-rose-600 transition shadow-card"
              >
                Confirmar Eliminación
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function ProductForm({
  initial,
  onClose,
  onSave,
}: {
  initial: Product
  onClose: () => void
  onSave: (p: Product) => Promise<void>
}) {
  const [draft, setDraft] = useState<Product>(initial)

  function set<K extends keyof Product>(k: K, v: Product[K]) {
    setDraft((d) => ({ ...d, [k]: v }))
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={initial.name ? `Editar ${initial.name}` : 'Crear Nuevo Producto'}
    >
      <div className="space-y-4">
        <Field label="Nombre del Producto">
          <input
            value={draft.name}
            onChange={(e) => set('name', e.target.value)}
            className={inputCls}
            placeholder="Ej. Cerveza Corona Extra 355ml"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoría">
            <select
              value={draft.category}
              onChange={(e) => set('category', e.target.value as ProductCategory)}
              className={inputCls}
            >
              {CAT_OPTIONS.map((c) => (
                <option key={c.id} value={c.id} className="bg-surface-4">
                  {c.icon} {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Emoji Representativo">
            <input
              value={draft.emoji}
              onChange={(e) => set('emoji', e.target.value)}
              className={inputCls}
              placeholder="🍺"
            />
          </Field>
        </div>

        {/* Emoji Selector Rápido */}
        <div>
          <label className="text-[11px] text-ink-3 uppercase tracking-wider block mb-1">
            Iconos Rápidos
          </label>
          <div className="flex flex-wrap gap-1.5">
            {EMOJI_PRESETS.map((em) => (
              <button
                key={em}
                type="button"
                onClick={() => set('emoji', em)}
                className={`w-8 h-8 rounded-lg text-base grid place-items-center transition ${
                  draft.emoji === em ? 'bg-brand/20 border border-brand' : 'bg-surface-3 hover:bg-surface-4'
                }`}
              >
                {em}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Precio de Venta ($ MXN)">
            <input
              inputMode="decimal"
              value={draft.price === 0 ? '' : String(draft.price)}
              onChange={(e) => set('price', Number(e.target.value) || 0)}
              className={inputCls}
              placeholder="0.00"
            />
          </Field>
          <Field label="Stock Disponible (vacío = ilimitado)">
            <input
              inputMode="numeric"
              value={draft.stock == null ? '' : String(draft.stock)}
              onChange={(e) =>
                set('stock', e.target.value === '' ? null : Number(e.target.value))
              }
              className={inputCls}
              placeholder="∞ (Ilimitado)"
            />
          </Field>
        </div>

        <label className="flex items-center gap-3 text-xs text-ink-2 bg-surface-3 p-3 rounded-xl border border-white/5 cursor-pointer">
          <input
            type="checkbox"
            checked={draft.active}
            onChange={(e) => set('active', e.target.checked)}
            className="w-4 h-4 accent-[#E6B349]"
          />
          <div>
            <span className="font-semibold text-ink-1 block">Producto Activo para Venta</span>
            <span className="text-[11px] text-ink-3">Aparece en la pantalla de pedidos y terminal de caja</span>
          </div>
        </label>

        <div className="pt-2 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs text-ink-3 hover:text-ink-1"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(draft)}
            disabled={!draft.name.trim() || draft.price <= 0}
            className="px-5 py-2.5 rounded-xl bg-brand text-brand-on font-bold text-xs hover:bg-brand-hover disabled:opacity-40 transition shadow-card"
          >
            Guardar Producto
          </button>
        </div>
      </div>
    </Modal>
  )
}

const inputCls =
  'mt-1.5 w-full h-11 px-3.5 rounded-xl bg-surface-3 border border-white/10 text-xs text-ink-1 focus:outline-none focus:border-brand transition'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="text-[11px] text-ink-3 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  )
}
