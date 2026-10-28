import type { ReactNode } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { AppProvider, useApp } from './state/AppContext'
import { Shell } from './components/Shell'
import { Login } from './screens/Login'
import { Mesas } from './screens/Mesas'
import { MesasActivas } from './screens/MesasActivas'
import { CuentaMesa } from './screens/CuentaMesa'
import { MesaCliente } from './screens/MesaCliente'
import { Reservas } from './screens/Reservas'
import { Productos } from './screens/Productos'
import { Ventas } from './screens/Ventas'
import { Caja } from './screens/Caja'
import { Reportes } from './screens/Reportes'
import { Ajustes } from './screens/Ajustes'
import { GestionCajeros } from './screens/GestionCajeros'
import { PortalJugador } from './screens/PortalJugador'

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useApp()
  if (loading) return <Splash />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function Splash() {
  return (
    <div className="min-h-dvh grid place-items-center bg-bg">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
        <span className="text-xs font-mono text-ink-3">Conectando a Kalos POS...</span>
      </div>
    </div>
  )
}

function Toasts() {
  const { toasts } = useApp()
  return (
    <div className="fixed top-4 right-4 z-[70] space-y-2 w-[calc(100%-2rem)] max-w-xs pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex items-start gap-3 rounded-xl border border-white/10 bg-surface-4/95 backdrop-blur shadow-popover px-4 py-3 animate-rise"
        >
          {t.type === 'success' ? (
            <CheckCircle2 size={18} className="text-success shrink-0 mt-0.5" />
          ) : t.type === 'error' ? (
            <AlertCircle size={18} className="text-danger shrink-0 mt-0.5" />
          ) : (
            <Info size={18} className="text-info shrink-0 mt-0.5" />
          )}
          <span className="text-xs font-medium text-ink-1 flex-1 leading-snug">{t.message}</span>
        </div>
      ))}
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Routes>
          {/* Public guest view for table QR scan */}
          <Route path="/mesa-cliente/:tableId" element={<MesaCliente />} />
          <Route path="/portal-jugador" element={<PortalJugador />} />

          {/* Cashier / Staff routes */}
          <Route path="/login" element={<Login />} />
          <Route
            path="/mesa/:tabId"
            element={
              <RequireAuth>
                <CuentaMesa />
              </RequireAuth>
            }
          />
          <Route
            path="/"
            element={
              <RequireAuth>
                <Shell />
              </RequireAuth>
            }
          >
            <Route index element={<Mesas />} />
            <Route path="mesas-activas" element={<MesasActivas />} />
            <Route path="reservas" element={<Reservas />} />
            <Route path="productos" element={<Productos />} />
            <Route path="ventas" element={<Ventas />} />
            <Route path="caja" element={<Caja />} />
            <Route path="reportes" element={<Reportes />} />
            <Route path="ajustes" element={<Ajustes />} />
            <Route path="cajeros" element={<GestionCajeros />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toasts />
      </HashRouter>
    </AppProvider>
  )
}
