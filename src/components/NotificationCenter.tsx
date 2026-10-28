import { useMemo, useState } from 'react'
import {
  Bell,
  CheckCircle2,
  Receipt,
  Coins,
  Clock,
  Beer,
  Trash2,
  CheckCheck,
  Volume2,
  X,
  Filter,
} from 'lucide-react'
import { useApp } from '../state/AppContext'
import { playPaymentChime, playTableCloseChime } from '../lib/notifications'
import type { StaffNotification } from '../lib/types'
import { money } from '../lib/format'

interface NotificationCenterProps {
  open: boolean
  onClose: () => void
}

export function NotificationCenter({ open, onClose }: NotificationCenterProps) {
  const { notifications, unreadNotifCount, markAllNotificationsRead, clearNotifications } = useApp()
  const [filter, setFilter] = useState<'todas' | 'cierres_pagos' | 'pedidos' | 'tiempos'>('todas')

  const filtered = useMemo(() => {
    if (filter === 'cierres_pagos') {
      return notifications.filter((n) => n.type === 'close_tab' || n.type === 'payment')
    }
    if (filter === 'pedidos') {
      return notifications.filter((n) => n.type === 'order' || n.type === 'call_waiter')
    }
    if (filter === 'tiempos') {
      return notifications.filter((n) => n.type === 'time_warning')
    }
    return notifications
  }, [notifications, filter])

  if (!open) return null

  function formatTime(timestamp: number) {
    const diffSec = Math.floor((Date.now() - timestamp) / 1000)
    if (diffSec < 60) return 'Hace unos segundos'
    const diffMin = Math.floor(diffSec / 60)
    if (diffMin < 60) return `Hace ${diffMin} min`
    const diffHours = Math.floor(diffMin / 60)
    if (diffHours < 24) return `Hace ${diffHours} h`
    return new Date(timestamp).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function getNotifMeta(n: StaffNotification) {
    switch (n.type) {
      case 'close_tab':
        return {
          icon: Receipt,
          color: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
          badge: 'Cierre de Mesa',
        }
      case 'payment':
        return {
          icon: Coins,
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
          badge: 'Cierre de Pago',
        }
      case 'order':
        return {
          icon: Beer,
          color: 'text-brand bg-brand/10 border-brand/20',
          badge: 'Pedido de Mesa',
        }
      case 'time_warning':
        return {
          icon: Clock,
          color: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
          badge: 'Tiempo',
        }
      default:
        return {
          icon: Bell,
          color: 'text-ink-2 bg-white/5 border-white/10',
          badge: 'Alerta',
        }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade">
      <div
        className="relative w-full max-w-md bg-surface-1 border-l border-white/10 shadow-2xl flex flex-col h-full animate-rise"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-surface-2/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand/10 text-brand border border-brand/20">
              <Bell size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-base text-ink-1">
                  Notificaciones del Billar
                </h2>
                {unreadNotifCount > 0 && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500 text-white animate-pulse">
                    {unreadNotifCount} nuevas
                  </span>
                )}
              </div>
              <p className="text-[11px] text-ink-3">
                Cierres de mesas, liquidaciones y alertas en vivo
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-ink-3 hover:text-ink-1 hover:bg-white/5 transition"
            title="Cerrar panel"
          >
            <X size={20} />
          </button>
        </div>

        {/* Toolbar de Filtros y Acciones */}
        <div className="p-3 border-b border-white/5 bg-surface-2/30 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setFilter('todas')}
              className={`px-2.5 py-1 rounded-lg font-medium transition shrink-0 ${
                filter === 'todas'
                  ? 'bg-brand text-brand-on font-bold shadow-sm'
                  : 'text-ink-3 hover:text-ink-1 bg-surface-3'
              }`}
            >
              Todas ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('cierres_pagos')}
              className={`px-2.5 py-1 rounded-lg font-medium transition shrink-0 ${
                filter === 'cierres_pagos'
                  ? 'bg-brand text-brand-on font-bold shadow-sm'
                  : 'text-ink-3 hover:text-ink-1 bg-surface-3'
              }`}
            >
              Cierres & Pagos
            </button>
            <button
              onClick={() => setFilter('pedidos')}
              className={`px-2.5 py-1 rounded-lg font-medium transition shrink-0 ${
                filter === 'pedidos'
                  ? 'bg-brand text-brand-on font-bold shadow-sm'
                  : 'text-ink-3 hover:text-ink-1 bg-surface-3'
              }`}
            >
              Pedidos
            </button>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => {
                playTableCloseChime()
                setTimeout(() => playPaymentChime(), 300)
              }}
              className="p-1.5 rounded-lg text-ink-3 hover:text-brand hover:bg-white/5 transition"
              title="Probar sonido de campana / billar"
            >
              <Volume2 size={16} />
            </button>
            {unreadNotifCount > 0 && (
              <button
                onClick={markAllNotificationsRead}
                className="inline-flex items-center gap-1 text-[11px] text-brand hover:underline font-semibold"
                title="Marcar todas como leídas"
              >
                <CheckCheck size={14} />
                <span>Leídas</span>
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearNotifications}
                className="p-1.5 rounded-lg text-ink-3 hover:text-rose-400 hover:bg-white/5 transition"
                title="Limpiar historial"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Lista de Notificaciones */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-12 h-12 rounded-full bg-surface-3 text-ink-3 grid place-items-center mx-auto mb-2 opacity-50">
                <Bell size={24} />
              </div>
              <p className="text-xs font-semibold text-ink-2">No hay notificaciones en esta categoría</p>
              <p className="text-[11px] text-ink-3 mt-0.5">
                Los avisos de cierres de mesas y cobros aparecerán aquí automáticamente en tiempo real.
              </p>
            </div>
          ) : (
            filtered.map((item) => {
              const meta = getNotifMeta(item)
              const Icon = meta.icon

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    !item.read
                      ? 'border-brand/30 bg-surface-3 shadow-md'
                      : 'border-white/5 bg-surface-2/60 opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-xl border shrink-0 ${meta.color}`}>
                      <Icon size={18} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-ink-1 truncate">{item.title}</span>
                        <span className="text-[10px] text-ink-3 shrink-0 font-mono">
                          {formatTime(item.createdAt)}
                        </span>
                      </div>

                      <p className="text-xs text-ink-2 mt-1 leading-snug break-words">
                        {item.body}
                      </p>

                      <div className="mt-2 flex items-center gap-2 flex-wrap text-[10px]">
                        <span className={`px-2 py-0.5 rounded-full border font-semibold ${meta.color}`}>
                          {meta.badge}
                        </span>
                        {item.amount != null && (
                          <span className="font-mono font-bold text-emerald-400">
                            {money(item.amount)}
                          </span>
                        )}
                        {item.cashierName && (
                          <span className="text-ink-3">
                            Cajero: <strong className="text-ink-2">{item.cashierName}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
