import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'
import {
  getAuth,
  type Auth,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  updatePassword,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import { getMessaging, getToken, onMessage, isSupported, type Messaging } from 'firebase/messaging'
import firebaseConfig from '../../firebase-applet-config.json'

let app: FirebaseApp | null = null
let dbInstance: Firestore | null = null
let authInstance: Auth | null = null
let messagingInstance: Messaging | null = null

export const ADMIN_EMAIL = 'softkalosbillar@gmail.com'

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId)
}

export function getApp(): FirebaseApp {
  if (!app) {
    app = initializeApp(firebaseConfig)
  }
  return app
}

export function getDb(): Firestore {
  if (!dbInstance) {
    const a = getApp()
    // CRITICAL: firestoreDatabaseId must be passed to connect to the provisioned database
    dbInstance = getFirestore(a, firebaseConfig.firestoreDatabaseId)
  }
  return dbInstance
}

export function getAuthInstance(): Auth {
  if (!authInstance) {
    authInstance = getAuth(getApp())
  }
  return authInstance
}

export async function signInWithGoogle(): Promise<{ uid: string; email: string | null; displayName: string | null; isAdminEmail: boolean }> {
  const auth = getAuthInstance()
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  const result = await signInWithPopup(auth, provider)
  const email = result.user.email?.toLowerCase() || null
  const isAdminEmail = email === ADMIN_EMAIL.toLowerCase()
  return {
    uid: result.user.uid,
    email,
    displayName: result.user.displayName,
    isAdminEmail,
  }
}

/**
 * Envía un correo electrónico de recuperación / cambio de contraseña seguro
 * exclusivo para softkalosbillar@gmail.com
 */
export async function sendAdminPasswordReset(targetEmail = ADMIN_EMAIL): Promise<void> {
  const auth = getAuthInstance()
  await sendPasswordResetEmail(auth, targetEmail)
}

/**
 * Permite cambiar la contraseña directamente si el usuario tiene sesión activa
 */
export async function updateAdminUserPassword(newPassword: string): Promise<void> {
  const auth = getAuthInstance()
  if (!auth.currentUser) throw new Error('No hay usuario autenticado')
  await updatePassword(auth.currentUser, newPassword)
}

/**
 * Inicialización de Firebase Cloud Messaging (Web Push)
 */
export async function requestFCMToken(): Promise<string | null> {
  try {
    const supported = await isSupported()
    if (!supported || typeof window === 'undefined' || !('Notification' in window)) {
      return null
    }

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      return null
    }

    if (!messagingInstance) {
      messagingInstance = getMessaging(getApp())
    }

    // Registrar service worker
    let swReg: ServiceWorkerRegistration | undefined
    if ('serviceWorker' in navigator) {
      swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
    }

    const currentToken = await getToken(messagingInstance, {
      serviceWorkerRegistration: swReg,
    }).catch(() => null)

    return currentToken
  } catch (err) {
    console.warn('FCM registration skipped or unsupported in iframe:', err)
    return null
  }
}

export function subscribeToFCM(onPayload: (payload: any) => void): (() => void) | null {
  try {
    if (!messagingInstance) {
      messagingInstance = getMessaging(getApp())
    }
    return onMessage(messagingInstance, (payload) => {
      onPayload(payload)
    })
  } catch {
    return null
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string
  operationType: OperationType
  path: string | null
  authInfo: {
    userId?: string | null
    email?: string | null
    emailVerified?: boolean | null
    isAnonymous?: boolean | null
    tenantId?: string | null
    providerInfo?: {
      providerId?: string | null
      email?: string | null
    }[]
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const auth = getAuthInstance()
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo))
  throw new Error(JSON.stringify(errInfo))
}
