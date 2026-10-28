import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ChevronRight,
  ShieldCheck,
  UserRound,
  Zap,
  Sparkles,
  KeyRound,
  Mail,
  Lock,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react'
import { useApp } from '../state/AppContext'
import { Logo } from '../components/Logo'
import { ADMIN_EMAIL } from '../lib/firebase'
import type { Role } from '../lib/types'

export function Login() {
  const { signIn, signInGoogle, loginCashier, sendAdminResetEmail, user, store } = useApp()
  const navigate = useNavigate()

  // Tabs de Login: 'cajero' | 'admin' | 'jugador'
  const [selectedRole, setSelectedRole] = useState<'cajero' | 'admin' | 'jugador'>('cajero')

  // Cajero Form
  const [cashierUser, setCashierUser] = useState('')
  const [cashierPin, setCashierPin] = useState('')
  const [loadingCashier, setLoadingCashier] = useState(false)

  // Admin Google Form
  const [loadingAdminGoogle, setLoadingAdminGoogle] = useState(false)
  const [resetEmailSent, setResetEmailSent] = useState(false)
  const [sendingReset, setSendingReset] = useState(false)

  // Jugador Google Form
  const [loadingJugadorGoogle, setLoadingJugadorGoogle] = useState(false)

  useEffect(() => {
    if (user) {
      if (user.role === 'jugador') {
        navigate('/portal-jugador', { replace: true })
      } else {
        navigate('/', { replace: true })
      }
    }
  }, [user, navigate])

  // Iniciar sesión de cajero con credenciales asignadas por Administrador
  async function handleCashierLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!cashierUser.trim() || !cashierPin.trim()) return

    setLoadingCashier(true)
    try {
      await loginCashier(cashierUser.trim(), cashierPin.trim())
      navigate('/', { replace: true })
    } catch {
      // Error es notificado por notify() en AppContext
    } finally {
      setLoadingCashier(false)
    }
  }

  // Iniciar sesión con Google para el Administrador (softkalosbillar@gmail.com)
  async function handleAdminGoogleLogin() {
    setLoadingAdminGoogle(true)
    try {
      await signInGoogle('admin')
      navigate('/', { replace: true })
    } catch {
      // Notificado por AppContext
    } finally {
      setLoadingAdminGoogle(false)
    }
  }

  // Iniciar sesión con Google para Jugador
  async function handleJugadorGoogleLogin() {
    setLoadingJugadorGoogle(true)
    try {
      await signInGoogle('jugador')
      navigate('/portal-jugador', { replace: true })
    } catch {
      // Notificado por AppContext
    } finally {
      setLoadingJugadorGoogle(false)
    }
  }

  // Solicitud de cambio / verificación de contraseña para softkalosbillar@gmail.com
  async function handleAdminPasswordReset() {
    setSendingReset(true)
    try {
      await sendAdminResetEmail(ADMIN_EMAIL)
      setResetEmailSent(true)
      setTimeout(() => setResetEmailSent(false), 8000)
    } catch {
      // Error notificado
    } finally {
      setSendingReset(false)
    }
  }

  return (
    <div className="min-h-dvh bg-bg grid place-items-center px-4 py-8 relative overflow-hidden">
      {/* Background ambient gold glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <Logo variant="full" height={105} />
          <h1 className="mt-5 font-display text-2xl font-extrabold text-ink-1 tracking-tight">
            Punto de Venta & Control
          </h1>
          <p className="mt-1 text-xs text-ink-2 max-w-xs">
            Renta de mesas por tiempo · despacho de barra · auditoría en vivo
          </p>

          <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-2 border border-brand/20 text-[11px] font-mono text-brand">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Cloud Firestore · Latencia &lt;100ms</span>
          </div>
        </div>

        {/* Role Segmented Selector */}
        <div className="mt-6 p-1 rounded-xl bg-surface-2 border border-white/10 grid grid-cols-3 gap-1">
          <button
            type="button"
            onClick={() => setSelectedRole('cajero')}
            className={`py-2 px-1 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
              selectedRole === 'cajero'
                ? 'bg-brand text-brand-on shadow-sm'
                : 'text-ink-3 hover:text-ink-1'
            }`}
          >
            <UserRound size={14} />
            <span>Cajero</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRole('admin')}
            className={`py-2 px-1 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
              selectedRole === 'admin'
                ? 'bg-brand text-brand-on shadow-sm'
                : 'text-ink-3 hover:text-ink-1'
            }`}
          >
            <ShieldCheck size={14} />
            <span>Admin</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRole('jugador')}
            className={`py-2 px-1 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
              selectedRole === 'jugador'
                ? 'bg-brand text-brand-on shadow-sm'
                : 'text-ink-3 hover:text-ink-1'
            }`}
          >
            <CalendarDays size={14} />
            <span>Jugador</span>
          </button>
        </div>

        {/* ============================================================== */}
        {/* 1. ACCESO CAJERO                                               */}
        {/* ============================================================== */}
        {selectedRole === 'cajero' && (
          <div className="mt-5 p-5 rounded-2xl bg-surface-2/80 border border-white/10 shadow-card space-y-4 animate-fade">
            <div className="text-center">
              <h2 className="text-sm font-bold text-ink-1">Acceso de Personal de Mostrador</h2>
              <p className="text-[11px] text-ink-3 mt-0.5">
                Ingresa con el usuario y PIN asignados por la administración
              </p>
            </div>

            <form onSubmit={handleCashierLogin} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-ink-2 mb-1">
                  Usuario del Cajero
                </label>
                <div className="relative">
                  <UserRound size={15} className="absolute left-3.5 top-3 text-ink-3" />
                  <input
                    required
                    value={cashierUser}
                    onChange={(e) => setCashierUser(e.target.value)}
                    placeholder="ej. cajero1"
                    className="w-full h-11 pl-9 pr-3.5 rounded-xl bg-surface-3 border border-white/10 text-xs text-ink-1 placeholder:text-ink-3 font-mono focus:outline-none focus:border-brand"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-ink-2 mb-1">
                  PIN de Acceso (4-6 dígitos)
                </label>
                <div className="relative">
                  <KeyRound size={15} className="absolute left-3.5 top-3 text-ink-3" />
                  <input
                    required
                    type="password"
                    maxLength={6}
                    value={cashierPin}
                    onChange={(e) => setCashierPin(e.target.value)}
                    placeholder="••••"
                    className="w-full h-11 pl-9 pr-3.5 rounded-xl bg-surface-3 border border-white/10 text-sm text-ink-1 placeholder:text-ink-3 font-mono font-bold tracking-widest focus:outline-none focus:border-brand"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loadingCashier}
                className="w-full h-11 rounded-xl bg-brand text-brand-on font-bold text-xs hover:bg-brand-hover active:scale-[0.98] transition shadow-card flex items-center justify-center gap-2"
              >
                <UserRound size={16} />
                <span>{loadingCashier ? 'Verificando...' : 'Iniciar Turno de Caja'}</span>
              </button>
            </form>

            <div className="pt-2 border-t border-white/5 text-[11px] text-ink-3 text-center leading-relaxed">
              ¿No tienes credenciales? Solicita tu usuario y PIN al Administrador de Kalos Billar.
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 2. ACCESO ADMINISTRADOR                                        */}
        {/* ============================================================== */}
        {selectedRole === 'admin' && (
          <div className="mt-5 p-5 rounded-2xl bg-surface-2/80 border border-brand/20 shadow-card space-y-4 animate-fade">
            <div className="text-center">
              <h2 className="text-sm font-bold text-ink-1 flex items-center justify-center gap-1.5">
                <ShieldCheck size={16} className="text-brand" />
                Acceso Exclusivo de Administrador
              </h2>
              <p className="text-[11px] text-ink-3 mt-0.5 font-mono text-brand">
                {ADMIN_EMAIL}
              </p>
            </div>

            {/* Google Login for Admin */}
            <button
              disabled={loadingAdminGoogle}
              onClick={handleAdminGoogleLogin}
              className="w-full h-12 rounded-xl bg-surface-3 border border-brand/30 hover:border-brand text-ink-1 font-semibold text-xs flex items-center justify-center gap-2.5 active:scale-[0.98] transition shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{loadingAdminGoogle ? 'Autenticando...' : 'Iniciar con Google (Admin)'}</span>
            </button>

            {/* Password Reset / Change via Email */}
            <div className="pt-2 border-t border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-ink-3">¿Cambiar o restablecer contraseña?</span>
              </div>

              {resetEmailSent ? (
                <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>Enlace de autenticación enviado a {ADMIN_EMAIL}. Revisa tu bandeja.</span>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={sendingReset}
                  onClick={handleAdminPasswordReset}
                  className="w-full h-10 rounded-xl bg-surface-3/60 border border-white/10 hover:border-white/20 text-ink-2 hover:text-ink-1 text-xs font-medium flex items-center justify-center gap-2 transition"
                >
                  <Mail size={14} className="text-brand" />
                  <span>
                    {sendingReset ? 'Enviando correo...' : 'Enviar correo de cambio de contraseña'}
                  </span>
                </button>
              )}
            </div>

            <p className="text-[10px] text-ink-3 text-center leading-relaxed">
              El rol administrador gestiona ingresos, auditoría de mesas y el alta de cajeros.
            </p>
          </div>
        )}

        {/* ============================================================== */}
        {/* 3. ACCESO JUGADOR / CLIENTE                                    */}
        {/* ============================================================== */}
        {selectedRole === 'jugador' && (
          <div className="mt-5 p-5 rounded-2xl bg-surface-2/80 border border-white/10 shadow-card space-y-4 animate-fade">
            <div className="text-center">
              <h2 className="text-sm font-bold text-ink-1">Portal de Clientes & Jugadores</h2>
              <p className="text-[11px] text-ink-3 mt-0.5">
                Reserva mesas, pre-ordena bebidas y sigue tu partida en tiempo real
              </p>
            </div>

            <button
              disabled={loadingJugadorGoogle}
              onClick={handleJugadorGoogleLogin}
              className="w-full h-12 rounded-xl bg-surface-3 border border-white/15 hover:border-brand/40 text-ink-1 font-semibold text-xs flex items-center justify-center gap-2.5 active:scale-[0.98] transition shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{loadingJugadorGoogle ? 'Autenticando...' : 'Entrar con Google como Jugador'}</span>
            </button>

            <div className="relative py-1 flex items-center justify-center">
              <div className="absolute inset-x-0 h-px bg-white/10" />
              <span className="relative bg-bg px-3 text-[10px] text-ink-3 uppercase tracking-wider">
                o entrar como invitado
              </span>
            </div>

            <Link
              to="/portal-jugador"
              className="w-full h-11 rounded-xl bg-brand text-brand-on font-semibold text-xs flex items-center justify-center gap-2 hover:bg-brand-hover active:scale-[0.98] transition shadow-card"
            >
              <CalendarDays size={16} />
              <span>Abrir Portal de Reservas y Partida</span>
            </Link>
          </div>
        )}

        <p className="mt-7 text-center text-[11px] text-ink-3">
          Kalos Billar Club · Desarrollado para tablet de mostrador y móviles
        </p>
      </div>
    </div>
  )
}
