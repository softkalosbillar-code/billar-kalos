import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  CalendarDays,
  Coins,
  Ellipsis,
  LogOut,
  Package,
  Settings,
  Table2,
  TrendingUp,
  type LucideIcon,
  Flame,
  Users,
  Bell,
  ShieldCheck,
  UserCheck,
  Video,
} from 'lucide-react'
import { useApp } from '../state/AppContext'
import { Logo } from './Logo'
import { NotificationCenter } from './NotificationCenter'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  roles: Array<'admin' | 'cajero'>
  end?: boolean
}

// Menú configurado estrictamente según rol operativo
const ALL_NAV_ITEMS: NavItem[] = [
  // 1. Mesas: Exclusivo Cajero (abrir rentas, operar mesas de juego)
  { to: '/', label: 'Mesas', icon: Table2, roles: ['cajero'], end: true },

  // 2. Mesas Activas: Admin y Cajero (monitoreo en vivo por segundo, cobros, historial)
  { to: '/mesas-activas', label: 'Mesas Activas', icon: Flame, roles: ['admin', 'cajero'] },

  // 3. Replay en vivo: Exclusivo Administrador (cámaras de salón y marcadores de torneo)
  { to: '/replay-en-vivo', label: 'Replay en vivo', icon: Video, roles: ['admin'] },

  // 4. Productos: Exclusivo Administrador (control de precios, inventario y catálogo)
  { to: '/productos', label: 'Productos', icon: Package, roles: ['admin'] },

  // 5. Cajeros: Exclusivo Administrador (alta y control de credenciales de cajeros)
  { to: '/cajeros', label: 'Cajeros', icon: Users, roles: ['admin'] },

  // 6. Reservas: Admin y Cajero (programación y anticipos)
  { to: '/reservas', label: 'Reservas', icon: CalendarDays, roles: ['admin', 'cajero'] },

  // 7. Ventas: Admin y Cajero (tickets de cobro y liquidaciones)
  { to: '/ventas', label: 'Ventas', icon: TrendingUp, roles: ['admin', 'cajero'] },

  // 8. Caja: Cajero y Admin (arqueos y fondos de turno)
  { to: '/caja', label: 'Caja', icon: Coins, roles: ['cajero', 'admin'] },

  // 9. Reportes: Exclusivo Administrador (ingresos diarios y ocupación)
  { to: '/reportes', label: 'Reportes', icon: BarChart3, roles: ['admin'] },

  // 10. Ajustes: Exclusivo Administrador (tarifas y configuración del club)
  { to: '/ajustes', label: 'Ajustes', icon: Settings, roles: ['admin'] },
]

export function Shell() {
  const { user, signOut, tables, unreadNotifCount } = useApp()
  const navigate = useNavigate()
  const [moreOpen, setMoreOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)

  const currentRole = (user?.role === 'admin' ? 'admin' : 'cajero') as 'admin' | 'cajero'

  // Filtrar navegación según rol
  const visibleItems = ALL_NAV_ITEMS.filter((item) => item.roles.includes(currentRole))

  const occupiedTables = tables.filter(
    (t) => t.status === 'ocupada' || t.status === 'pausada',
  ).length

  async function onSignOut() {
    await signOut()
    navigate('/login')
  }

  // Segmentación móvil: Primeros 4 ítems directos + botón Más
  const mobilePrimary = visibleItems.slice(0, 4)
  const mobileSecondary = visibleItems.slice(4)

  return (
    <div className="min-h-dvh bg-bg text-ink-1">
      {/* Sidebar rail (escritorio) */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-20 flex-col items-center border-r border-white/10 bg-surface-1 z-40">
        <div className="py-5">
          <Logo variant="mark" height={40} className="rounded-xl shadow-card" />
        </div>
        <nav className="flex-1 flex flex-col items-center gap-1 w-full px-2 overflow-y-auto scrollbar-none">
          {visibleItems.map((item) => (
            <RailLink key={item.to} item={item} />
          ))}
        </nav>
        <button
          onClick={onSignOut}
          className="mb-5 p-3 rounded-xl text-ink-3 hover:text-rose-400 hover:bg-white/5 transition-colors"
          title="Cerrar sesión"
        >
          <LogOut size={22} />
        </button>
      </aside>

      {/* Main Container */}
      <div className="lg:pl-20 flex flex-col min-h-dvh">
        <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 h-16 border-b border-white/10 bg-bg/80 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <Logo variant="full" height={30} className="lg:hidden" />
            <span className="hidden lg:flex items-center gap-2">
              <Logo variant="mark" height={24} className="rounded-md opacity-90" />
              <span className="font-display font-bold text-ink-1 tracking-tight">
                Kalos Billar Club
              </span>
            </span>
            {occupiedTables > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-brand bg-brand/10 border border-brand/20 px-2.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                {occupiedTables} {occupiedTables === 1 ? 'mesa activa' : 'mesas activas'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {/* Estado del Sistema (lenguaje 100% de billar / terminal) */}
            <div className="hidden md:flex items-center gap-1.5 text-xs text-ink-3 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Sistema Oficial · Modo Club</span>
            </div>

            {/* Campana de Notificaciones en vivo */}
            <button
              onClick={() => setNotifOpen(true)}
              className="relative p-2.5 rounded-xl bg-surface-2 border border-white/10 hover:border-brand/40 text-ink-2 hover:text-ink-1 transition shadow-sm"
              title="Notificaciones de Mesas y Cobros"
            >
              <Bell size={18} />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white font-mono text-[10px] font-black grid place-items-center animate-pulse border-2 border-bg shadow-sm">
                  {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                </span>
              )}
            </button>

            {/* Usuario Activo con Distintivo de Rol */}
            <div className="flex items-center gap-2 rounded-full bg-surface-2 border border-white/10 pl-1 pr-3 py-1">
              <div
                className={`w-7 h-7 rounded-full grid place-items-center text-xs font-bold uppercase shadow-sm ${
                  user?.role === 'admin'
                    ? 'bg-brand text-brand-on'
                    : 'bg-emerald-600 text-white'
                }`}
              >
                {user?.role === 'admin' ? (
                  <ShieldCheck size={14} />
                ) : (
                  <UserCheck size={14} />
                )}
              </div>
              <div className="leading-tight">
                <div className="text-xs font-semibold text-ink-1 max-w-[110px] truncate">
                  {user?.name}
                </div>
                <div className="text-[10px] text-ink-3 capitalize font-medium">
                  {user?.role === 'admin' ? 'Administrador' : 'Cajero'}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 py-5 pb-28 lg:pb-8 max-w-6xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Drawer de Notificaciones */}
      <NotificationCenter open={notifOpen} onClose={() => setNotifOpen(false)} />

      {/* Bottom nav (móvil/tablet) filtrado por rol */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-white/10 bg-surface-1/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
        <div
          className={`grid h-16 ${
            mobileSecondary.length > 0 ? 'grid-cols-5' : `grid-cols-${mobilePrimary.length}`
          }`}
        >
          {mobilePrimary.map((item) => (
            <BottomLink key={item.to} item={item} />
          ))}

          {mobileSecondary.length > 0 && (
            <button
              onClick={() => setMoreOpen((v) => !v)}
              className="flex flex-col items-center justify-center gap-1 text-ink-3 hover:text-ink-1 transition"
            >
              <Ellipsis size={20} />
              <span className="text-[9px] font-medium">Más</span>
            </button>
          )}
        </div>

        {moreOpen && (
          <div className="absolute bottom-20 right-3 left-3 sm:left-auto sm:w-64 rounded-modal bg-surface-4 border border-white/10 shadow-popover p-2 animate-rise space-y-1">
            {mobileSecondary.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMoreOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
                    isActive ? 'bg-brand-soft text-brand font-semibold' : 'text-ink-2 hover:text-ink-1'
                  }`
                }
              >
                <item.icon size={20} />
                {item.label}
              </NavLink>
            ))}
            <button
              onClick={() => {
                setMoreOpen(false)
                onSignOut()
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-rose-400 hover:bg-white/5 transition"
            >
              <LogOut size={20} />
              Cerrar sesión
            </button>
          </div>
        )}
      </nav>
    </div>
  )
}

function RailLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center gap-1 w-full py-2.5 rounded-xl text-[11px] font-medium transition ${
          isActive
            ? 'bg-brand-soft text-brand font-bold shadow-sm'
            : 'text-ink-3 hover:text-ink-1 hover:bg-white/5'
        }`
      }
      title={item.label}
    >
      <item.icon size={21} />
      <span className="truncate max-w-[70px]">{item.label}</span>
    </NavLink>
  )
}

function BottomLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center gap-1 transition ${
          isActive ? 'text-brand font-bold' : 'text-ink-3 hover:text-ink-1'
        }`
      }
    >
      <item.icon size={20} />
      <span className="text-[10px] truncate max-w-[65px]">{item.label}</span>
    </NavLink>
  )
}
