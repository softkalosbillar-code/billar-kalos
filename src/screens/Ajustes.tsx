import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Save,
  Cloud,
  Database,
  Cpu,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  Mail,
  ExternalLink,
} from 'lucide-react'
import { useApp } from '../state/AppContext'
import { ADMIN_EMAIL } from '../lib/firebase'
import { ROUNDING_LABELS } from '../lib/time'
import type { RoundingMode } from '../lib/types'
import firebaseConfig from '../../firebase-applet-config.json'

export function Ajustes() {
  const {
    settings,
    saveSettings,
    notify,
    refresh,
    store,
    changeAdminPasswordDirectly,
    sendAdminResetEmail,
  } = useApp()
  const [draft, setDraft] = useState(settings)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)

  // Cambio directo de contraseña
  const [newAdminPass, setNewAdminPass] = useState('')
  const [confirmAdminPass, setConfirmAdminPass] = useState('')
  const [showAdminPass, setShowAdminPass] = useState(false)
  const [updatingPass, setUpdatingPass] = useState(false)
  const [passSuccess, setPassSuccess] = useState(false)
  const [sendingReset, setSendingReset] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newAdminPass.length < 6) {
      notify('La contraseña debe tener mínimo 6 caracteres', 'error')
      return
    }
    if (newAdminPass !== confirmAdminPass) {
      notify('Las contraseñas no coinciden', 'error')
      return
    }

    setUpdatingPass(true)
    try {
      await changeAdminPasswordDirectly(newAdminPass)
      setPassSuccess(true)
      setNewAdminPass('')
      setConfirmAdminPass('')
      setTimeout(() => setPassSuccess(false), 8000)
    } catch {
      // Error notificado
    } finally {
      setUpdatingPass(false)
    }
  }

  async function handleSendResetEmail() {
    setSendingReset(true)
    try {
      await sendAdminResetEmail(ADMIN_EMAIL)
      setResetSent(true)
      setTimeout(() => setResetSent(false), 8000)
    } catch {
      // Error notificado
    } finally {
      setSendingReset(false)
    }
  }

  async function save() {
    setSaving(true)
    await saveSettings(draft)
    notify('Ajustes guardados correctamente', 'success')
    setSaving(false)
  }

  async function handleResync() {
    setSyncing(true)
    await refresh()
    notify('Datos y catálogo sincronizados con la red del club', 'success')
    setSyncing(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-1">Ajustes & Configuración</h1>
          <p className="text-sm text-ink-2 mt-1">
            Tarifas de renta, reglas de redondeo, impuestos e infraestructura
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-brand text-brand-on font-semibold hover:bg-brand-hover active:scale-[0.98] disabled:opacity-50 transition shadow-card"
        >
          <Save size={18} />
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Formulario de negocio */}
        <div className="lg:col-span-7 space-y-4 rounded-card border border-white/10 bg-surface-2 p-5 shadow-card">
          <h3 className="font-display text-base font-semibold text-ink-1 border-b border-white/5 pb-2">
            Reglas de Facturación y Salón
          </h3>

          <Field label="Nombre Comercial">
            <input
              value={draft.venueName}
              onChange={(e) => setDraft({ ...draft, venueName: e.target.value })}
              className={inputCls}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3.5">
            <Field label={`${draft.taxName} (%)`}>
              <input
                inputMode="decimal"
                value={String(Math.round(draft.defaultTaxRate * 100))}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    defaultTaxRate: (Number(e.target.value) || 0) / 100,
                  })
                }
                className={inputCls}
              />
            </Field>
            <Field label="Mínimo Facturable (min)">
              <input
                inputMode="numeric"
                value={String(draft.minimumMinutes)}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    minimumMinutes: Math.max(0, Number(e.target.value) || 0),
                  })
                }
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="Regla de Redondeo de Tiempo">
            <select
              value={draft.rounding}
              onChange={(e) =>
                setDraft({ ...draft, rounding: e.target.value as RoundingMode })
              }
              className={inputCls}
            >
              {(Object.keys(ROUNDING_LABELS) as RoundingMode[]).map((m) => (
                <option key={m} value={m} className="bg-surface-4 text-ink-1">
                  {ROUNDING_LABELS[m]}
                </option>
              ))}
            </select>
          </Field>

          <label className="flex items-center gap-3 text-xs text-ink-1 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={draft.tipEnabled}
              onChange={(e) => setDraft({ ...draft, tipEnabled: e.target.checked })}
              className="w-4 h-4 accent-[#E6B349] rounded cursor-pointer"
            />
            <span>Habilitar sugerencia de propina voluntaria al liquidar</span>
          </label>

          <div className="rounded-xl border border-white/5 bg-surface-1 p-3.5 text-xs text-ink-3 leading-relaxed">
            <strong className="text-ink-2 block mb-1">Ejemplo de cálculo automático:</strong>
            Mesa de $60/h con mínimo de 30 min y redondeo a cuarto de hora: Una sesión de 1h 04m se factura exactamente como 1h 15m (1.25 horas) = <strong className="text-brand">$75.00</strong> + IVA.
          </div>
        </div>

        {/* Panel de Conexión del Club de Billar */}
        <div className="lg:col-span-5 space-y-4">
          <div className="billiard-card-frame billiard-felt p-2 shadow-card">
            <div className="billiard-pocket billiard-pocket-tl" />
            <div className="billiard-pocket billiard-pocket-tr" />
            <div className="billiard-pocket billiard-pocket-bl" />
            <div className="billiard-pocket billiard-pocket-br" />

            <div className="billiard-felt-inner p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <h3 className="font-display text-base font-semibold text-ink-1 flex items-center gap-2">
                  <Database size={18} className="text-brand" />
                  Red Central del Club
                </h3>
                <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Conectado en Vivo
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-white/10">
                  <span className="text-emerald-200/80">Terminal Activa:</span>
                  <span className="font-semibold text-ink-1 uppercase font-mono">
                    {store.mode === 'firestore' ? 'Terminal Oficial (Club en Vivo)' : 'Terminal Demo'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/10">
                  <span className="text-emerald-200/80">Salón Asignado:</span>
                  <span className="font-mono text-ink-1 font-semibold">
                    Kalos Billar Centro
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/10">
                  <span className="text-emerald-200/80">Tiempo de Respuesta:</span>
                  <span className="font-mono text-emerald-400 font-bold">&lt; 10ms (Inmediato)</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-emerald-200/80">Seguridad & Cifrado:</span>
                  <span className="text-brand font-semibold flex items-center gap-1">
                    <ShieldCheck size={14} />
                    Protegido y auditado
                  </span>
                </div>
              </div>

              <button
                onClick={handleResync}
                disabled={syncing}
                className="w-full h-11 rounded-xl bg-black/40 border border-white/15 text-xs font-semibold text-ink-1 hover:border-brand/50 flex items-center justify-center gap-2 transition"
              >
                <RefreshCw size={15} className={syncing ? 'animate-spin text-brand' : ''} />
                {syncing ? 'Sincronizando...' : 'Actualizar Catálogo del Club'}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-surface-2 p-4 text-xs text-ink-3 leading-relaxed space-y-2">
            <div className="font-semibold text-ink-2 flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-emerald-400" />
              Sincronización en tiempo real
            </div>
            <p>
              Los cobros, tiempos de renta y pedidos de botana se transmiten instantáneamente entre el mostrador, la barra y los teléfonos móviles de los jugadores.
            </p>
          </div>

          {/* Tarjeta de Seguridad y Cambio de Contraseña del Administrador */}
          <div className="billiard-card-frame billiard-felt p-2 shadow-card">
            <div className="billiard-pocket billiard-pocket-tl" />
            <div className="billiard-pocket billiard-pocket-tr" />
            <div className="billiard-pocket billiard-pocket-bl" />
            <div className="billiard-pocket billiard-pocket-br" />

            <div className="billiard-felt-inner p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <h3 className="font-display text-base font-semibold text-ink-1 flex items-center gap-2">
                  <ShieldCheck size={18} className="text-brand" />
                  Seguridad de la Cuenta Admin
                </h3>
                <span className="text-[10px] font-mono text-brand font-semibold">
                  {ADMIN_EMAIL}
                </span>
              </div>

              {passSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  <span>Contraseña actualizada correctamente en la terminal</span>
                </div>
              )}

              {/* Formulario de cambio directo (sin esperar correo) */}
              <form onSubmit={handleChangePassword} className="space-y-3">
                <p className="text-[11px] text-emerald-200/80 leading-relaxed">
                  Puedes cambiar tu contraseña directamente aquí sin necesidad de esperar un correo:
                </p>

                <div>
                  <label className="block text-[11px] font-semibold text-emerald-200/90 mb-1">
                    Nueva Contraseña (mínimo 6 caracteres)
                  </label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-3 text-emerald-300/60" />
                    <input
                      required
                      type={showAdminPass ? 'text' : 'password'}
                      minLength={6}
                      value={newAdminPass}
                      onChange={(e) => setNewAdminPass(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-11 pl-9 pr-10 rounded-xl bg-black/40 border border-emerald-500/30 text-xs text-ink-1 placeholder:text-emerald-300/40 focus:outline-none focus:border-brand"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPass((v) => !v)}
                      className="absolute right-3.5 top-3 text-emerald-300/60 hover:text-ink-1"
                    >
                      {showAdminPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-emerald-200/90 mb-1">
                    Confirmar Nueva Contraseña
                  </label>
                  <div className="relative">
                    <KeyRound size={15} className="absolute left-3.5 top-3 text-emerald-300/60" />
                    <input
                      required
                      type={showAdminPass ? 'text' : 'password'}
                      minLength={6}
                      value={confirmAdminPass}
                      onChange={(e) => setConfirmAdminPass(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-11 pl-9 pr-10 rounded-xl bg-black/40 border border-emerald-500/30 text-xs text-ink-1 placeholder:text-emerald-300/40 focus:outline-none focus:border-brand"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={updatingPass}
                  className="w-full h-11 rounded-xl bg-brand text-brand-on font-bold text-xs hover:bg-brand-hover active:scale-[0.98] transition shadow-card flex items-center justify-center gap-2"
                >
                  <KeyRound size={15} />
                  <span>{updatingPass ? 'Guardando...' : 'Cambiar Contraseña Ahora'}</span>
                </button>
              </form>

              {/* Opción de restablecimiento por correo / pantalla externa */}
              <div className="pt-3 border-t border-white/10 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-emerald-200/70">Opciones adicionales de acceso:</span>
                  <Link
                    to="/restablecer-password"
                    className="text-brand hover:underline font-semibold flex items-center gap-1"
                  >
                    <span>Pantalla de Recuperación</span>
                    <ExternalLink size={11} />
                  </Link>
                </div>

                {resetSent ? (
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 text-xs flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                    <span>Correo de restablecimiento enviado a {ADMIN_EMAIL}</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={sendingReset}
                    onClick={handleSendResetEmail}
                    className="w-full h-9 rounded-xl bg-black/30 border border-white/10 hover:border-white/20 text-emerald-200/80 hover:text-ink-1 text-xs font-medium flex items-center justify-center gap-2 transition"
                  >
                    <Mail size={13} className="text-brand" />
                    <span>
                      {sendingReset ? 'Enviando...' : 'Enviar correo de cambio de contraseña'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const inputCls =
  'mt-1.5 w-full h-11 px-3.5 rounded-xl bg-surface-3 border border-white/10 text-ink-1 text-xs focus:outline-none focus:border-brand/60 transition'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="text-xs text-ink-3 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  )
}
