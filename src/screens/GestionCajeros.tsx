import { useEffect, useState } from 'react'
import {
  UserCheck,
  UserX,
  Plus,
  KeyRound,
  Shield,
  Trash2,
  Copy,
  Check,
  Eye,
  EyeOff,
  User,
  Sparkles,
  Edit2,
} from 'lucide-react'
import { useApp } from '../state/AppContext'
import { Modal } from '../components/Modal'
import type { Cashier } from '../lib/types'

export function GestionCajeros() {
  const { store, user, notify } = useApp()
  const [cashiers, setCashiers] = useState<Cashier[]>([])
  const [loading, setLoading] = useState(true)
  const [createModal, setCreateModal] = useState(false)
  const [editingCashier, setEditingCashier] = useState<Cashier | null>(null)
  const [visiblePins, setVisiblePins] = useState<Record<string, boolean>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')

  async function loadCashiers() {
    try {
      const list = await store.listCashiers()
      setCashiers(list)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCashiers()
  }, [])

  function togglePinVisibility(id: string) {
    setVisiblePins((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  function generateRandomPin() {
    const random = Math.floor(1000 + Math.random() * 9000).toString()
    setPin(random)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !username.trim() || !pin.trim()) return

    const newCashier: Cashier = {
      id: `caj-${Date.now()}`,
      name: name.trim(),
      username: username.trim().toLowerCase(),
      pin: pin.trim(),
      email: email.trim() || undefined,
      active: true,
      createdAt: Date.now(),
      createdBy: user?.name || 'Administrador',
      notes: notes.trim() || undefined,
    }

    try {
      await store.saveCashier(newCashier)
      notify(`Cajero ${newCashier.name} registrado con éxito`, 'success')
      setCreateModal(false)
      setName('')
      setUsername('')
      setPin('')
      setEmail('')
      setNotes('')
      await loadCashiers()
    } catch {
      notify('Error al registrar cajero', 'error')
    }
  }

  async function handleToggleActive(c: Cashier) {
    const updated = { ...c, active: !c.active }
    await store.saveCashier(updated)
    notify(
      `Acceso de ${c.name} ${updated.active ? 'reactivado' : 'suspendido'}`,
      updated.active ? 'success' : 'info'
    )
    await loadCashiers()
  }

  async function handleDelete(c: Cashier) {
    if (!confirm(`¿Eliminar definitivamente el acceso de ${c.name}?`)) return
    await store.deleteCashier(c.id)
    notify(`Cajero ${c.name} eliminado`, 'info')
    await loadCashiers()
  }

  function copyCredentials(c: Cashier) {
    const text = `Credenciales Kalos Billar:\nUsuario: ${c.username}\nPIN: ${c.pin}`
    navigator.clipboard.writeText(text)
    setCopiedId(c.id)
    notify('Credenciales copiadas al portapapeles', 'success')
    setTimeout(() => setCopiedId(null), 3000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-1 flex items-center gap-2.5">
            <Shield size={24} className="text-brand" />
            Gestión de Personal & Cajeros
          </h1>
          <p className="text-sm text-ink-2 mt-1">
            Crea y administra credenciales y PINs seguros para el personal de mostrador
          </p>
        </div>

        <button
          onClick={() => {
            generateRandomPin()
            setCreateModal(true)
          }}
          className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-brand text-brand-on font-semibold hover:bg-brand-hover active:scale-[0.98] transition shadow-card"
        >
          <Plus size={18} />
          <span>Registrar Nuevo Cajero</span>
        </button>
      </div>

      {/* Security notice */}
      <div className="rounded-xl border border-brand/20 bg-brand/5 p-4 text-xs text-ink-2 leading-relaxed flex items-start gap-3">
        <KeyRound size={20} className="text-brand shrink-0 mt-0.5" />
        <div>
          <strong className="text-ink-1 font-semibold block mb-0.5">Control de Acceso Cerrado y Auditado</strong>
          El personal de caja únicamente puede iniciar sesión con el usuario y PIN autorizados por el Administrador. No se permiten registros públicos ni autorizaciones externas para cajeros.
        </div>
      </div>

      {/* Cashier List */}
      <div className="space-y-3">
        {cashiers.length === 0 ? (
          <div className="text-center py-16 rounded-card border border-white/5 bg-surface-2/40">
            <User size={40} className="mx-auto text-ink-3 opacity-60 mb-2" />
            <p className="text-sm font-semibold text-ink-1">No hay cajeros registrados aún</p>
            <p className="text-xs text-ink-3 mt-1">Pulsa en Registrar Nuevo Cajero para asignar credenciales.</p>
          </div>
        ) : (
          cashiers.map((c) => {
            const isPinVisible = !!visiblePins[c.id]
            return (
              <div
                key={c.id}
                className={`p-4 sm:px-5 rounded-card border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  c.active
                    ? 'border-white/10 bg-surface-2 hover:border-white/20'
                    : 'border-white/5 bg-surface-2/40 opacity-60'
                }`}
              >
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <div
                    className={`w-11 h-11 rounded-xl grid place-items-center font-bold text-sm shrink-0 ${
                      c.active ? 'bg-brand/10 border border-brand/20 text-brand' : 'bg-surface-4 text-ink-3'
                    }`}
                  >
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-ink-1 truncate">{c.name}</span>
                      <span className="font-mono text-xs text-brand font-medium">@{c.username}</span>
                      {!c.active && (
                        <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-rose-500/20 text-rose-300">
                          Suspendido
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-ink-3 mt-0.5 flex items-center gap-2 flex-wrap">
                      {c.notes && <span>{c.notes} ·</span>}
                      <span>Creado por {c.createdBy}</span>
                      {c.email && <span>· {c.email}</span>}
                    </div>
                  </div>
                </div>

                {/* PIN and Actions */}
                <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-3 border border-white/5 font-mono text-xs">
                    <span className="text-ink-3">PIN:</span>
                    <span className="font-bold text-ink-1 tracking-wider">
                      {isPinVisible ? c.pin : '••••'}
                    </span>
                    <button
                      onClick={() => togglePinVisibility(c.id)}
                      className="ml-1 text-ink-3 hover:text-ink-1"
                      title={isPinVisible ? 'Ocultar PIN' : 'Mostrar PIN'}
                    >
                      {isPinVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>

                  <button
                    onClick={() => copyCredentials(c)}
                    className="p-2 rounded-lg bg-surface-3 border border-white/10 text-ink-2 hover:text-brand transition"
                    title="Copiar credenciales de acceso"
                  >
                    {copiedId === c.id ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                  </button>

                  <button
                    onClick={() => setEditingCashier(c)}
                    className="p-2 rounded-lg bg-surface-3 border border-white/10 text-ink-2 hover:text-brand transition"
                    title="Editar datos y PIN del cajero"
                  >
                    <Edit2 size={15} />
                  </button>

                  <button
                    onClick={() => handleToggleActive(c)}
                    className={`h-9 px-3 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition ${
                      c.active
                        ? 'border-white/10 bg-surface-3 text-ink-2 hover:text-rose-400'
                        : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                    }`}
                  >
                    {c.active ? <UserX size={15} /> : <UserCheck size={15} />}
                    <span>{c.active ? 'Suspender' : 'Reactivar'}</span>
                  </button>

                  <button
                    onClick={() => handleDelete(c)}
                    className="p-2 rounded-lg border border-white/10 text-ink-3 hover:text-rose-400 hover:bg-white/5 transition"
                    title="Eliminar cajero"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modal Registrar Cajero */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Registrar Acceso de Cajero">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-2 mb-1.5">Nombre Completo del Cajero *</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Juan Pérez López"
              className="w-full h-11 px-3.5 rounded-xl bg-surface-2 border border-white/10 text-xs text-ink-1 focus:outline-none focus:border-brand"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1.5">Usuario de Acceso *</label>
              <input
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                placeholder="ej. juan_caja"
                className="w-full h-11 px-3.5 rounded-xl bg-surface-2 border border-white/10 text-xs font-mono text-ink-1 focus:outline-none focus:border-brand"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-medium text-ink-2">PIN Seguro (4-6 dígitos) *</label>
                <button
                  type="button"
                  onClick={generateRandomPin}
                  className="text-[10px] text-brand hover:underline font-mono"
                >
                  Generar
                </button>
              </div>
              <input
                required
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="4 dígitos"
                className="w-full h-11 px-3.5 rounded-xl bg-surface-2 border border-white/10 text-sm font-mono font-bold tracking-widest text-ink-1 focus:outline-none focus:border-brand text-center"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-2 mb-1.5">Correo electrónico (opcional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="juan@kalosbillar.com"
              className="w-full h-11 px-3.5 rounded-xl bg-surface-2 border border-white/10 text-xs text-ink-1 focus:outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-2 mb-1.5">Turno o Asignación (opcional)</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Turno nocturno (18:00 a 02:00 hrs)"
              className="w-full h-11 px-3.5 rounded-xl bg-surface-2 border border-white/10 text-xs text-ink-1 focus:outline-none focus:border-brand"
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setCreateModal(false)}
              className="px-4 py-2 rounded-xl text-xs text-ink-3 hover:text-ink-1"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-brand text-brand-on font-semibold text-xs hover:bg-brand-hover active:scale-95 transition shadow-card"
            >
              Crear Credenciales
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Editar Cajero Existente */}
      {editingCashier && (
        <Modal
          open
          onClose={() => setEditingCashier(null)}
          title={`Editar Cajero: ${editingCashier.name}`}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              if (!editingCashier.name.trim() || !editingCashier.pin.trim()) return
              await store.saveCashier(editingCashier)
              notify(`Datos de ${editingCashier.name} actualizados`, 'success')
              setEditingCashier(null)
              await loadCashiers()
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1.5">Nombre Completo *</label>
              <input
                required
                value={editingCashier.name}
                onChange={(e) =>
                  setEditingCashier({ ...editingCashier, name: e.target.value })
                }
                className="w-full h-11 px-3.5 rounded-xl bg-surface-2 border border-white/10 text-xs text-ink-1 focus:outline-none focus:border-brand"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-ink-2 mb-1.5">Usuario (@)</label>
                <input
                  required
                  value={editingCashier.username}
                  onChange={(e) =>
                    setEditingCashier({
                      ...editingCashier,
                      username: e.target.value.toLowerCase().replace(/\s+/g, ''),
                    })
                  }
                  className="w-full h-11 px-3.5 rounded-xl bg-surface-2 border border-white/10 text-xs font-mono text-ink-1 focus:outline-none focus:border-brand"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-medium text-ink-2">PIN Acceso *</label>
                  <button
                    type="button"
                    onClick={() => {
                      const random = Math.floor(1000 + Math.random() * 9000).toString()
                      setEditingCashier({ ...editingCashier, pin: random })
                    }}
                    className="text-[10px] text-brand hover:underline font-mono"
                  >
                    Nuevo
                  </button>
                </div>
                <input
                  required
                  maxLength={6}
                  value={editingCashier.pin}
                  onChange={(e) =>
                    setEditingCashier({
                      ...editingCashier,
                      pin: e.target.value.replace(/\D/g, ''),
                    })
                  }
                  className="w-full h-11 px-3.5 rounded-xl bg-surface-2 border border-white/10 text-sm font-mono font-bold tracking-widest text-ink-1 focus:outline-none focus:border-brand text-center"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1.5">Correo Electrónico (opcional)</label>
              <input
                type="email"
                value={editingCashier.email || ''}
                onChange={(e) =>
                  setEditingCashier({ ...editingCashier, email: e.target.value || undefined })
                }
                className="w-full h-11 px-3.5 rounded-xl bg-surface-2 border border-white/10 text-xs text-ink-1 focus:outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1.5">Turno / Asignación</label>
              <input
                value={editingCashier.notes || ''}
                onChange={(e) =>
                  setEditingCashier({ ...editingCashier, notes: e.target.value || undefined })
                }
                className="w-full h-11 px-3.5 rounded-xl bg-surface-2 border border-white/10 text-xs text-ink-1 focus:outline-none focus:border-brand"
              />
            </div>

            <label className="flex items-center gap-3 text-xs text-ink-2 bg-surface-3 p-3 rounded-xl border border-white/5 cursor-pointer">
              <input
                type="checkbox"
                checked={editingCashier.active}
                onChange={(e) =>
                  setEditingCashier({ ...editingCashier, active: e.target.checked })
                }
                className="w-4 h-4 accent-[#E6B349]"
              />
              <div>
                <span className="font-semibold text-ink-1 block">Acceso Habilitado</span>
                <span className="text-[11px] text-ink-3">El cajero puede iniciar sesión y abrir turnos</span>
              </div>
            </label>

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingCashier(null)}
                className="px-4 py-2 rounded-xl text-xs text-ink-3 hover:text-ink-1"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-brand text-brand-on font-bold text-xs hover:bg-brand-hover active:scale-95 transition shadow-card"
              >
                Guardar Cambios
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
