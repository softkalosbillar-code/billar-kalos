import { useEffect, useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Mail,
  ArrowLeft,
  KeyRound,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'
import { Logo } from '../components/Logo'
import {
  ADMIN_EMAIL,
  verifyResetCode,
  confirmResetPassword,
  sendAdminPasswordReset,
} from '../lib/firebase'
import { useApp } from '../state/AppContext'

export function RestablecerPassword() {
  const navigate = useNavigate()
  const location = useLocation()
  const { notify } = useApp()

  // Estado del código de recuperación
  const [oobCode, setOobCode] = useState('')
  const [manualCodeInput, setManualCodeInput] = useState('')
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)

  // Formulario de nueva contraseña
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [success, setSuccess] = useState(false)

  // Reenvío de correo
  const [resending, setResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  // Extraer el código oobCode de la URL (soporta hash, search o continueUrl)
  useEffect(() => {
    function extractCode(): string | null {
      // 1. Revisar query params globales en window.location.search
      const searchParams = new URLSearchParams(window.location.search)
      const codeFromSearch = searchParams.get('oobCode')
      if (codeFromSearch) return codeFromSearch

      // 2. Revisar search params dentro de la ruta hash (ej. #/restablecer-password?oobCode=...)
      if (location.search) {
        const hashParams = new URLSearchParams(location.search)
        const codeFromHash = hashParams.get('oobCode')
        if (codeFromHash) return codeFromHash
      }

      // 3. Revisar si está incrustado en el hash directamente
      const hashStr = window.location.hash
      const qIndex = hashStr.indexOf('?')
      if (qIndex !== -1) {
        const paramsInHash = new URLSearchParams(hashStr.substring(qIndex))
        const c = paramsInHash.get('oobCode')
        if (c) return c
      }

      return null
    }

    const code = extractCode()
    if (code) {
      setOobCode(code)
      validateCode(code)
    }
  }, [location.search])

  async function validateCode(code: string) {
    const clean = code.trim()
    if (!clean) return

    setVerifying(true)
    setVerifyError(null)
    try {
      const email = await verifyResetCode(clean)
      setVerifiedEmail(email || ADMIN_EMAIL)
      setOobCode(clean)
    } catch (err: any) {
      console.warn('Error al verificar código de acción:', err)
      let msg = 'El código o enlace de restablecimiento no es válido o ha expirado.'
      if (err?.code === 'auth/invalid-action-code') {
        msg = 'El código de seguridad no es válido o ya fue utilizado.'
      } else if (err?.code === 'auth/expired-action-code') {
        msg = 'El enlace de restablecimiento ha expirado. Solicita uno nuevo a continuación.'
      }
      setVerifyError(msg)
      setVerifiedEmail(null)
    } finally {
      setVerifying(false)
    }
  }

  function handleManualCodeSubmit(e: React.FormEvent) {
    e.preventDefault()
    let code = manualCodeInput.trim()
    if (!code) return

    // Si el usuario pegó la URL completa, extraer el parámetro oobCode
    if (code.includes('oobCode=')) {
      try {
        const urlObj = new URL(code)
        const param = urlObj.searchParams.get('oobCode')
        if (param) code = param
      } catch {
        const match = code.match(/oobCode=([^&]+)/)
        if (match && match[1]) code = decodeURIComponent(match[1])
      }
    }

    setOobCode(code)
    validateCode(code)
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!oobCode) {
      notify('Falta el código de verificación del correo', 'error')
      return
    }

    if (newPassword.length < 6) {
      notify('La contraseña debe tener al menos 6 caracteres', 'error')
      return
    }

    if (newPassword !== confirmPassword) {
      notify('Las contraseñas no coinciden', 'error')
      return
    }

    setUpdating(true)
    try {
      await confirmResetPassword(oobCode, newPassword)
      setSuccess(true)
      notify('Contraseña de administrador actualizada con éxito', 'success')
    } catch (err: any) {
      console.error('Error al confirmar cambio de contraseña:', err)
      let msg = 'No se pudo actualizar la contraseña. El código puede haber expirado.'
      if (err?.code === 'auth/weak-password') {
        msg = 'La contraseña es muy débil. Usa al menos 6 caracteres alfanuméricos.'
      }
      notify(msg, 'error')
      setVerifyError(msg)
    } finally {
      setUpdating(false)
    }
  }

  async function handleResendEmail() {
    setResending(true)
    setResendSuccess(false)
    try {
      await sendAdminPasswordReset(ADMIN_EMAIL)
      setResendSuccess(true)
      notify(`Nuevo correo de restablecimiento enviado a ${ADMIN_EMAIL}`, 'success')
      setTimeout(() => setResendSuccess(false), 9000)
    } catch (err: any) {
      notify(err?.message || 'Error al solicitar el enlace', 'error')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-dvh bg-bg grid place-items-center px-4 py-8 relative overflow-hidden">
      {/* Luz ambiental dorada */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <Logo variant="full" height={90} />
          <h1 className="mt-4 font-display text-xl sm:text-2xl font-extrabold text-ink-1 tracking-tight">
            Restablecer Contraseña
          </h1>
          <p className="mt-1 text-xs text-ink-2 max-w-xs font-mono text-brand">
            {verifiedEmail || ADMIN_EMAIL}
          </p>
        </div>

        {/* Tarjeta con Marco de Madera y Terciopelo Verde de Billar */}
        <div className="billiard-card-frame billiard-felt mt-6 p-2 shadow-modal animate-fade">
          <div className="billiard-pocket billiard-pocket-tl" />
          <div className="billiard-pocket billiard-pocket-tr" />
          <div className="billiard-pocket billiard-pocket-bl" />
          <div className="billiard-pocket billiard-pocket-br" />

          <div className="billiard-felt-inner p-5 space-y-4">
            {/* ESTADO 1: ÉXITO - CONTRASEÑA ACTUALIZADA */}
            {success ? (
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center animate-bounce">
                  <CheckCircle2 size={32} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-ink-1">¡Contraseña Cambiada con Éxito!</h2>
                  <p className="text-xs text-emerald-200/80 mt-1 leading-relaxed">
                    Tu acceso de Administrador para <strong>{ADMIN_EMAIL}</strong> ha sido actualizado correctamente.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/login', { replace: true })}
                  className="w-full h-11 rounded-xl bg-brand text-brand-on font-bold text-xs hover:bg-brand-hover active:scale-[0.98] transition shadow-card flex items-center justify-center gap-2"
                >
                  <Lock size={15} />
                  <span>Iniciar Sesión en el Punto de Venta</span>
                </button>
              </div>
            ) : verifiedEmail ? (
              /* ESTADO 2: CÓDIGO VERIFICADO - FORMULARIO PARA NUEVA CONTRASEÑA */
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs flex items-center gap-2.5">
                  <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-semibold block text-emerald-300">Identidad Verificada</span>
                    <span>Introduce tu nueva clave de acceso para {verifiedEmail}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-emerald-200/90 mb-1">
                    Nueva Contraseña (mínimo 6 caracteres)
                  </label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-3 text-emerald-300/60" />
                    <input
                      required
                      type={showPassword ? 'text' : 'password'}
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-11 pl-9 pr-10 rounded-xl bg-black/40 border border-emerald-500/30 text-xs text-ink-1 placeholder:text-emerald-300/40 focus:outline-none focus:border-brand"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3.5 top-3 text-emerald-300/60 hover:text-ink-1"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-emerald-200/90 mb-1">
                    Confirmar Nueva Contraseña
                  </label>
                  <div className="relative">
                    <KeyRound size={15} className="absolute left-3.5 top-3 text-emerald-300/60" />
                    <input
                      required
                      type={showPassword ? 'text' : 'password'}
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-11 pl-9 pr-10 rounded-xl bg-black/40 border border-emerald-500/30 text-xs text-ink-1 placeholder:text-emerald-300/40 focus:outline-none focus:border-brand"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={updating}
                  className="w-full h-11 rounded-xl bg-brand text-brand-on font-bold text-xs hover:bg-brand-hover active:scale-[0.98] transition shadow-card flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={16} />
                  <span>{updating ? 'Guardando...' : 'Guardar Nueva Contraseña'}</span>
                </button>
              </form>
            ) : (
              /* ESTADO 3: EN ESPERA O CÓDIGO NO VÁLIDO / MANUAL */
              <div className="space-y-4">
                {verifying ? (
                  <div className="py-8 text-center space-y-3">
                    <div className="w-8 h-8 mx-auto rounded-full border-2 border-brand border-t-transparent animate-spin" />
                    <p className="text-xs text-emerald-200/80 font-mono">
                      Validando código de seguridad...
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Alerta explicativa del error "El modo de página seleccionado no es válido" */}
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200/90 leading-relaxed space-y-1.5">
                      <div className="flex items-center gap-2 font-bold text-amber-300">
                        <AlertCircle size={16} className="shrink-0" />
                        <span>¿Viste el error "El modo de página seleccionado no es válido"?</span>
                      </div>
                      <p className="text-[11px] text-amber-100/80">
                        Ocurre cuando el cliente de correo abre el enlace externo con parámetros incompletos.
                        Puedes solucionarlo directamente aquí:
                      </p>
                    </div>

                    {verifyError && (
                      <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2">
                        <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                        <span>{verifyError}</span>
                      </div>
                    )}

                    {/* Opción 1: Pegar enlace o código de seguridad recibido */}
                    <form onSubmit={handleManualCodeSubmit} className="space-y-2">
                      <label className="block text-[11px] font-semibold text-emerald-200">
                        Pega aquí el enlace del correo o el código de restablecimiento:
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={manualCodeInput}
                          onChange={(e) => setManualCodeInput(e.target.value)}
                          placeholder="Pega la URL del correo o el código oobCode..."
                          className="flex-1 h-10 px-3 rounded-xl bg-black/40 border border-emerald-500/30 text-xs text-ink-1 placeholder:text-emerald-300/40 focus:outline-none focus:border-brand font-mono"
                        />
                        <button
                          type="submit"
                          className="h-10 px-4 rounded-xl bg-brand text-brand-on font-bold text-xs hover:bg-brand-hover active:scale-95 transition shrink-0"
                        >
                          Verificar
                        </button>
                      </div>
                    </form>

                    <div className="relative my-3">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/10" />
                      </div>
                      <div className="relative flex justify-center text-[10px] uppercase font-mono tracking-wider">
                        <span className="bg-emerald-950 px-2 text-emerald-300/70">O solicita un nuevo enlace</span>
                      </div>
                    </div>

                    {/* Opción 2: Reenviar correo */}
                    {resendSuccess ? (
                      <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                        <span>Nuevo correo enviado a {ADMIN_EMAIL}. Revisa tu bandeja de entrada o spam.</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={resending}
                        onClick={handleResendEmail}
                        className="w-full h-10 rounded-xl bg-black/30 border border-white/10 hover:border-white/20 text-emerald-200/90 hover:text-ink-1 text-xs font-medium flex items-center justify-center gap-2 transition"
                      >
                        <Mail size={14} className="text-brand" />
                        <span>{resending ? 'Enviando correo...' : 'Reenviar Correo de Restablecimiento'}</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Pie de página con botón volver */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-emerald-200/70">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 hover:text-ink-1 transition"
              >
                <ArrowLeft size={13} />
                <span>Volver al inicio de sesión</span>
              </Link>
              <span className="text-[10px] font-mono opacity-60">Terminal Kalos</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
