import { requestFCMToken, subscribeToFCM } from './firebase'
import type { StaffNotification, NotificationType } from './types'

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (AudioContextClass) {
      audioCtx = new AudioContextClass()
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

/**
 * Sintetiza un sonido de timbre de servicio de billar para alertas de pedidos nuevos
 */
export function playOrderAlertSound() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()

    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(880, now) // A5
    osc1.frequency.exponentialRampToValueAtTime(1320, now + 0.15) // E6

    gain1.gain.setValueAtTime(0.3, now)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5)

    osc1.connect(gain1)
    gain1.connect(ctx.destination)

    osc1.start(now)
    osc1.stop(now + 0.5)

    // Second bell stroke
    setTimeout(() => {
      if (!ctx) return
      const t = ctx.currentTime
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.type = 'triangle'
      osc2.frequency.setValueAtTime(1320, t)
      osc2.frequency.exponentialRampToValueAtTime(1760, t + 0.2) // A6
      gain2.gain.setValueAtTime(0.35, t)
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.7)
      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      osc2.start(t)
      osc2.stop(t + 0.7)
    }, 180)
  } catch (e) {
    console.warn('Audio feedback failed:', e)
  }
}

/**
 * Sintetiza un tono de alerta suave cuando el tiempo de una mesa finaliza o se acerca
 */
export function playTimeWarningSound() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(587.33, now) // D5
    osc.frequency.setValueAtTime(523.25, now + 0.2) // C5
    osc.frequency.setValueAtTime(659.25, now + 0.4) // E5

    gain.gain.setValueAtTime(0.25, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.8)
  } catch (e) {
    console.warn('Time alert sound failed:', e)
  }
}

/**
 * Sintetiza un sonido de billar elegante cuando se liquida un pago (monedas/caja registradora)
 */
export function playPaymentChime() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime

    // Dos tonos cristalinos de cobro
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'triangle'
    osc1.frequency.setValueAtTime(1046.5, now) // C6
    osc1.frequency.exponentialRampToValueAtTime(1567.98, now + 0.12) // G6
    gain1.gain.setValueAtTime(0.35, now)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.6)

    setTimeout(() => {
      if (!ctx) return
      const t = ctx.currentTime
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(2093, t) // C7
      gain2.gain.setValueAtTime(0.3, t)
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.8)
      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      osc2.start(t)
      osc2.stop(t + 0.8)
    }, 120)
  } catch (e) {
    console.warn('Payment chime failed:', e)
  }
}

/**
 * Sintetiza el golpe seco característico de bola entrando a la tronera + campana de cierre
 */
export function playTableCloseChime() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime

    // Impacto de bola en tronera de billar (golpe suave resonante)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(160, now)
    osc1.frequency.exponentialRampToValueAtTime(45, now + 0.18)
    gain1.gain.setValueAtTime(0.4, now)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.25)

    // Campana de finalización
    setTimeout(() => {
      if (!ctx) return
      const t = ctx.currentTime
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(880, t)
      osc2.frequency.exponentialRampToValueAtTime(1174.66, t + 0.25)
      gain2.gain.setValueAtTime(0.25, t)
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.7)
      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      osc2.start(t)
      osc2.stop(t + 0.7)
    }, 100)
  } catch (e) {
    console.warn('Table close chime failed:', e)
  }
}

type NotificationListener = (notif: StaffNotification) => void
const listeners = new Set<NotificationListener>()

export function onStaffNotification(listener: NotificationListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const STORAGE_KEY = 'kalos_staff_notifications_v1'

export function getStoredNotifications(): StaffNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

export function saveStoredNotifications(list: StaffNotification[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 100)))
  } catch {}
}

/**
 * Despacha una notificación al navegador / push y reproduce sonido según el tipo
 */
export function dispatchStaffAlert(
  title: string,
  body: string,
  type: NotificationType = 'order',
  tableId?: string,
  tableName?: string,
  meta?: { amount?: number; cashierName?: string; paymentMethod?: string }
): StaffNotification {
  const notification: StaffNotification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title,
    body,
    type,
    tableId,
    tableName,
    amount: meta?.amount,
    cashierName: meta?.cashierName,
    paymentMethod: meta?.paymentMethod,
    createdAt: Date.now(),
    read: false,
  }

  // Reproducir sonido de alerta
  if (type === 'order' || type === 'call_waiter') {
    playOrderAlertSound()
  } else if (type === 'time_warning') {
    playTimeWarningSound()
  } else if (type === 'payment') {
    playPaymentChime()
  } else if (type === 'close_tab') {
    playTableCloseChime()
  }

  // Almacenar en historial local
  const current = getStoredNotifications()
  saveStoredNotifications([notification, ...current])

  // Notificar a observadores en la app
  listeners.forEach((fn) => {
    try {
      fn(notification)
    } catch {}
  })

  // Si el navegador tiene permisos de notificación del sistema, mostrar push
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/logo-black.png',
        badge: '/icons/icon-192.png',
        tag: tableId || type,
      })
    } catch {
      // Ignorar restricciones en iframes
    }
  }

  return notification
}

