import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import 'firebase/auth';
import { 
  getAuth, 
  GoogleAuthProvider, 
  GithubAuthProvider,
  Auth 
} from 'firebase/auth';
import { getFirestore, initializeFirestore, Firestore, enableIndexedDbPersistence, setLogLevel } from 'firebase/firestore';
import config from '../../firebase-applet-config.json';

export const firebaseConfig = config;

// Initialize Firebase App defensively
export const app: FirebaseApp = (() => {
  try {
    const apps = getApps();
    return apps.length > 0 ? getApp() : initializeApp(firebaseConfig);
  } catch (err) {
    console.warn('Firebase initializeApp notice:', err);
    try {
      return getApp();
    } catch {
      return initializeApp(firebaseConfig);
    }
  }
})();

// Silence non-fatal Firestore internal transport retry warnings
try {
  setLogLevel('silent');
} catch (e) {}

// Initialize Auth instance synchronously and defensively
function initAuth(): Auth {
  try {
    const authInstance = getAuth(app);
    return authInstance;
  } catch (err: any) {
    console.warn('Initial getAuth(app) notice, attempting fallback:', err);
    try {
      return getAuth();
    } catch (e2) {
      console.error('Firebase Auth initialization fallback (resilient mode):', e2);
      return (null as unknown) as Auth;
    }
  }
}

export const auth = initAuth();

// Helper to retrieve Auth safely if needed dynamically
export function getAuthInstance(): Auth | null {
  if (auth) return auth;
  try {
    return getAuth(app);
  } catch {
    return null;
  }
}

/**
 * Ensures Firebase Auth is fully initialized and its initial authentication
 * state (including persistence restoration) has resolved before dependent services run.
 */
export async function waitForAuthReady(): Promise<Auth> {
  const currentAuth = getAuthInstance();
  if (currentAuth && typeof currentAuth.authStateReady === 'function') {
    await currentAuth.authStateReady();
  }
  return currentAuth as Auth;
}

// Initialize Firestore instance with forced long-polling to prevent WebSocket connection failures in WebViews and iframes
function initFirestore(): Firestore {
  const dbId = config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)'
    ? config.firestoreDatabaseId
    : undefined;

  const settings = {
    experimentalForceLongPolling: true,
  };

  try {
    if (dbId) {
      return initializeFirestore(app, settings, dbId);
    }
    return initializeFirestore(app, settings);
  } catch (e) {
    console.warn('Firestore initialization fallback:', e);
    if (dbId) {
      return getFirestore(app, dbId);
    }
    return getFirestore(app);
  }
}

export const db: Firestore = initFirestore();

// Enable offline IndexedDB persistence to cache query results locally & reduce read/bandwidth limits
if (typeof window !== 'undefined' && db) {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.info('Multiple tabs open, Firestore persistence active in primary tab.');
    } else if (err.code === 'unimplemented') {
      console.warn('Current browser environment does not support IndexedDB Firestore caching.');
    } else {
      console.warn('IndexedDB persistence notice:', err);
    }
  });
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const githubProvider = new GithubAuthProvider();
githubProvider.addScope('user:email');
githubProvider.addScope('read:user');

