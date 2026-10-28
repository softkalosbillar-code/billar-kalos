import { isFirebaseConfigured } from '../lib/firebase'
import { FirestoreStore } from './firestoreStore'
import { LocalStore } from './localStore'
import type { Store } from './store'

let storeInstance: Store | null = null

/**
 * Devuelve la implementación activa:
 *  - Por defecto usa FirestoreStore si Firebase está configurado (con caché local <100ms y tiempo real).
 *  - Si se fuerza VITE_DEMO_MODE=true o no hay credenciales, usa LocalStore (demo).
 */
export function getStore(): Store {
  if (storeInstance) return storeInstance

  const forceDemo = import.meta.env.VITE_DEMO_MODE === 'true'
  if (!forceDemo && isFirebaseConfigured()) {
    try {
      storeInstance = new FirestoreStore()
    } catch (err) {
      console.warn('Fallo al inicializar FirestoreStore, usando LocalStore de respaldo:', err)
      storeInstance = new LocalStore()
    }
  } else {
    storeInstance = new LocalStore()
  }
  return storeInstance
}

export type { Store }
