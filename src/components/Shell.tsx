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
} from 'lucide-react'
import { useApp } from '../state/AppContext'
import { Logo } from './Logo'
import { NotificationCenter } from './NotificationCenter'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  admin?: boolean
  end?: boolean
}

const PRIMARY: NavItem[] = [
  { to: '/', label: 'Mesas', icon: Table2, end: true },
  { to: '/mesas-activas', label: 'Mesas Activas', icon: Flame },
  { to: '/reservas', label: 'Reservas', icon: CalendarDays },
  { to: '/productos', label: 'Productos', icon: Package },
  { to: '/ventas', label: 'Ventas', icon: TrendingUp },
  { to: '/caja', label: 'Caja', icon: Coins },
]

const SECONDARY: NavItem[] = [
  { to: '/cajeros', label: 'Cajeros', icon: Users, admin: true },
  { to: '/reportes', label: 'Reportes', icon: BarChart3, admin: true },
  { to: '/ajustes', label: 'Ajustes', icon: Settings, admin: true },
]

function isAdmin(role: string | undefined) {
  return role === 'admin'
}

export function Shell() {
  const { user, signOut, store, tables, unreadNotifCount } = useApp()
  const navigate = useNavigate()
  const [moreOpen, setMoreOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)

  const admin = isAdmin(user?.role)
  const visible = [...PRIMARY, ...SECONDARY.filter((i) => !i.admin || admin)]

  const occupiedTables = tables.filter(
    (t) => t.status === 'ocupada' || t.status === 'pausada',
  ).length

  async function onSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-dvh bg-bg text-ink-1">
      {/* Sidebar rail (escritorio) */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-20 flex-col items-center border-r border-white/10 bg-surface-1 z-40">
        <div className="py-5">
          <Logo variant="mark" height={40} className="rounded-xl shadow-card" />
        </div>
        <nav className="flex-1 flex flex-col items-center gap-1 w-full px-2">
          {visible.map((item) => (
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
            <div className="hidden md:flex items-center gap-1.5 text-xs text-ink-3 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{store.mode === 'firestore' ? 'Cloud Firestore' : 'Modo Demo'}</span>
            </div>

            {/* Campana de Notificaciones en vivo */}
            <button
              onClick={() => setNotifOpen(true)}
              className="relative p-2.5 rounded-xl bg-surface-2 border border-white/10 hover:border-brand/40 text-ink-2 hover:text-ink-1 transition shadow-sm"
              title="Notificaciones en vivo (Cierres de mesas y pagos)"
            >
              <Bell size={18} />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white font-mono text-[10px] font-black grid place-items-center animate-pulse border-2 border-bg shadow-sm">
                  {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                </span>
              )}
            </button>

            <div className="flex items-center gap-2 rounded-full bg-surface-2 border border-white/10 pl-1 pr-3 py-1">
              <div className="w-7 h-7 rounded-full bg-brand text-brand-on grid place-items-center text-xs font-bold uppercase shadow-sm">
                {user?.name?.charAt(0) ?? 'U'}
              </div>
              <div className="leading-tight">
                <div className="text-xs font-semibold text-ink-1 max-w-[110px] truncate">{user?.name}</div>
                <div className="text-[10px] text-ink-3 capitalize">{user?.role}</div>
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

      {/* Bottom nav (móvil/tablet) */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-white/10 bg-surface-1/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-7 h-16">
          {PRIMARY.map((item) => (
            <BottomLink key={item.to} item={item} />
          ))}
          <button
            onClick={() => setMoreOpen((v) => !v)}
            className="flex flex-col items-center justify-center gap-1 text-ink-3 hover:text-ink-1 transition"
          >
            <Ellipsis size={20} />
            <span className="text-[9px] font-medium">Más</span>
          </button>
        </div>
        {moreOpen && (
          <div className="absolute bottom-20 right-3 left-3 sm:left-auto sm:w-64 rounded-modal bg-surface-4 border border-white/10 shadow-popover p-2 animate-rise">
            {SECONDARY.filter((i) => !i.admin || admin).map((item) => (
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
            ? 'bg-brand-soft text-brand font-semibold'
            : 'text-ink-3 hover:text-ink-1 hover:bg-white/5'
        }`
      }
      title={item.label}
    >
      <item.icon size={22} />
      <span>{item.label}</span>
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
          isActive ? 'text-brand font-semibold' : 'text-ink-3 hover:text-ink-1'
        }`
      }
    >
      <item.icon size={20} />
      <span className="text-[10px] truncate">{item.label}</span>
    </NavLink>
  )
}
