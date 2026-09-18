import { createClient, SupabaseClient, User as SupabaseUser, Session as SupabaseSession, AuthChangeEvent } from '@supabase/supabase-js';
import { getLocalCache, saveLocalCache } from './cache';
import { setLocalMedia } from './idb';
import { AppUser } from '../types';

// Active Supabase client instance (initialized asynchronously via server-side API route)
let activeClient: SupabaseClient | null = null;
let currentSupabaseUrl: string = '';
let isConfiguredState: boolean = false;
let configFetchPromise: Promise<{ url: string; anonKey: string } | null> | null = null;

/**
 * Retrieve current active Supabase URL
 */
export const getStoredSupabaseUrl = (): string => {
  if (currentSupabaseUrl) return currentSupabaseUrl;
  const win = typeof window !== 'undefined' ? (window as any) : {};
  const configUrl = win.APP_CONFIG?.supabaseUrl ||
                    win.APP_CONFIG?.SUPABASE_URL ||
                    win.APP_CONFIG?.supabase_url;

  return configUrl || getLocalCache('custom_supabase_url', '');
};

export const isSupabaseConfigured = (): boolean => isConfiguredState || Boolean(activeClient);

function createSupabaseInstance(url: string, key: string): SupabaseClient {
  const isBrowser = typeof window !== 'undefined';
  const client = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: isBrowser,
      flowType: 'pkce',
      storage: isBrowser ? window.localStorage : undefined,
    },
    global: {
      headers: {
        'x-client-info': 'ogvirk-live-web-app',
      },
    },
  });

  currentSupabaseUrl = url;
  isConfiguredState = true;
  console.log(`[Supabase] Client initialized and connected to project: ${url}`);

  client.auth.getSession().then(({ error }) => {
    if (!error) {
      console.log(`[Supabase] Successfully connected to project session endpoint: ${url}`);
    }
  }).catch((err) => {
    console.warn('[Supabase] Connection notice:', err);
  });

  return client;
}

/**
 * Fetch Supabase URL and Anon Key server-side through /api/supabase-config
 * Ensures the API key is not included in the client-side bundle.
 */
export async function fetchServerSupabaseConfig(): Promise<{ url: string; anonKey: string } | null> {
  if (configFetchPromise) return configFetchPromise;

  configFetchPromise = (async () => {
    // 1. Check window.APP_CONFIG first if provided by container
    const win = typeof window !== 'undefined' ? (window as any) : {};
    const appConfigUrl = win.APP_CONFIG?.supabaseUrl || win.APP_CONFIG?.SUPABASE_URL;
    const appConfigKey = win.APP_CONFIG?.supabaseAnonKey || win.APP_CONFIG?.SUPABASE_ANON_KEY || win.APP_CONFIG?.anonKey;

    if (appConfigUrl && appConfigKey) {
      activeClient = createSupabaseInstance(appConfigUrl, appConfigKey);
      return { url: appConfigUrl, anonKey: appConfigKey };
    }

    // 2. Fetch from server-side API route (/api/supabase-config)
    try {
      const res = await fetch('/api/supabase-config');
      if (res.ok) {
        const data = await res.json();
        if (data && data.url && data.anonKey) {
          activeClient = createSupabaseInstance(data.url, data.anonKey);
          return data;
        }
      }
    } catch (err) {
      console.warn('[Supabase] Fetching /api/supabase-config notice:', err);
    }

    // 3. Fallback to custom user override from local storage if previously saved
    const cachedUrl = getLocalCache('custom_supabase_url', '');
    const cachedKey = getLocalCache('custom_supabase_key', '');
    if (cachedUrl && cachedKey) {
      activeClient = createSupabaseInstance(cachedUrl, cachedKey);
      return { url: cachedUrl, anonKey: cachedKey };
    }

    return null;
  })();

  return configFetchPromise;
}

// Auto-trigger fetch on client startup
if (typeof window !== 'undefined') {
  fetchServerSupabaseConfig().catch(() => {});
}

/**
 * Ensures the Supabase client is initialized before operations run
 */
export async function ensureSupabaseReady(): Promise<SupabaseClient | null> {
  if (activeClient) return activeClient;
  await fetchServerSupabaseConfig();
  return activeClient;
}

// Global active Supabase singleton proxy
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (activeClient) {
      const val = (activeClient as any)[prop];
      return typeof val === 'function' ? val.bind(activeClient) : val;
    }
    if (prop === 'auth') {
      return new Proxy({}, {
        get(_authTarget, authProp) {
          return async (...args: any[]) => {
            const client = await ensureSupabaseReady();
            if (client) {
              const fn = (client.auth as any)[authProp];
              if (typeof fn === 'function') return fn.apply(client.auth, args);
            }
            return { data: null, error: new Error('Supabase client is initializing') };
          };
        }
      });
    }
    return (...args: any[]) => {
      console.warn(`[Supabase] Invoked ${String(prop)} while client is initializing.`);
    };
  }
});

export const getSupabase = (): SupabaseClient | null => activeClient;

/**
 * Configure Supabase credentials at runtime if user wants to connect custom project
 */
export function configureSupabaseCredentials(url: string, key: string): boolean {
  if (!url || !key) return false;
  saveLocalCache('custom_supabase_url', url);
  saveLocalCache('custom_supabase_key', key);
  try {
    activeClient = createSupabaseInstance(url, key);
    return true;
  } catch (e) {
    console.error('Failed to configure Supabase:', e);
    return false;
  }
}

/**
 * Maps a Supabase user object into the standard AppUser contract
 */
export function mapSupabaseUserToAppUser(user: SupabaseUser): AppUser {
  const meta = user.user_metadata || {};
  const fullName = meta.full_name || meta.name || `${meta.first_name || ''} ${meta.last_name || ''}`.trim();
  const fallbackName = user.email ? user.email.split('@')[0] : 'Gamer';
  
  return {
    uid: user.id,
    email: user.email || null,
    displayName: fullName || fallbackName,
    photoURL: meta.avatar_url || meta.picture || null,
    provider: 'supabase',
    emailVerified: Boolean(user.email_confirmed_at),
  };
}

/**
 * Format raw Supabase error messages into clean, actionable user feedback
 */
export function formatSupabaseAuthError(err: any): string {
  if (!err) return 'An error occurred with Supabase authentication.';
  const msg: string = (err.message || err.error_description || String(err)).trim();
  const lower = msg.toLowerCase();

  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
    return 'Invalid email or password. Please verify your credentials or click "Sign Up" to create an account.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Your email address has not been confirmed yet. Please check your inbox for the confirmation link.';
  }
  if (lower.includes('user already registered') || lower.includes('already exists')) {
    return 'An account with this email address already exists in Supabase. Please sign in instead.';
  }
  if (lower.includes('password should be at least')) {
    return 'Password must be at least 6 characters long.';
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Too many authentication attempts. Please wait a moment and try again.';
  }
  if (lower.includes('failed to fetch') || lower.includes('network')) {
    return 'Unable to reach the Supabase server. Please verify your internet connection.';
  }

  return msg;
}

/**
 * Sign in with email and password via Supabase Auth
 */
export async function signInWithSupabase(email: string, password: string) {
  const client = await ensureSupabaseReady();
  if (!client) throw new Error('Supabase authentication service is initializing. Please try again in a moment.');
  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password: password.trim(),
  });
  if (error) throw error;
  return data;
}

/**
 * Sign up with email, password, and custom gamer metadata via Supabase Auth
 */
export async function signUpWithSupabase(
  email: string, 
  password: string, 
  profileData?: { firstName?: string; lastName?: string; displayName?: string; avatarUrl?: string }
) {
  const client = await ensureSupabaseReady();
  if (!client) throw new Error('Supabase authentication service is initializing. Please try again in a moment.');
  const fullName = profileData?.displayName || `${profileData?.firstName || ''} ${profileData?.lastName || ''}`.trim();
  const { data, error } = await client.auth.signUp({
    email: email.trim().toLowerCase(),
    password: password.trim(),
    options: {
      data: {
        first_name: profileData?.firstName || '',
        last_name: profileData?.lastName || '',
        full_name: fullName,
        avatar_url: profileData?.avatarUrl || '',
      },
    },
  });
  if (error) throw error;
  return data;
}

/**
 * Send password reset email via Supabase Auth
 */
export async function sendSupabasePasswordReset(email: string) {
  const client = await ensureSupabaseReady();
  if (!client) throw new Error('Supabase authentication service is initializing. Please try again in a moment.');
  const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
  const { data, error } = await client.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo,
  });
  if (error) throw error;
  return data;
}

/**
 * Sign in with GitHub OAuth via Supabase Auth
 */
export async function signInWithGithubSupabase() {
  const client = await ensureSupabaseReady();
  if (!client) throw new Error('Supabase authentication service is initializing. Please try again in a moment.');
  const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo,
      scopes: 'read:user user:email',
    },
  });
  if (error) throw error;
  return data;
}

/**
 * Sign out of active Supabase session
 */
export async function signOutSupabase() {
  const client = await ensureSupabaseReady();
  if (!client) return true;
  const { error } = await client.auth.signOut();
  if (error) {
    console.warn('Supabase sign out warning:', error.message);
  }
  return true;
}

/**
 * Retrieve current active Supabase session
 */
export async function getSupabaseSession(): Promise<SupabaseSession | null> {
  try {
    const client = await ensureSupabaseReady();
    if (!client) return null;
    const { data, error } = await client.auth.getSession();
    if (error) {
      console.warn('Get Supabase session error:', error.message);
      return null;
    }
    return data.session;
  } catch (e) {
    console.warn('Supabase getSession exception:', e);
    return null;
  }
}

/**
 * Subscribe to Supabase auth state changes
 */
export function onSupabaseAuthStateChange(callback: (event: AuthChangeEvent, session: SupabaseSession | null) => void) {
  let innerSub: { unsubscribe: () => void } | null = null;
  let isCancelled = false;

  if (activeClient) {
    const { data } = activeClient.auth.onAuthStateChange(callback);
    return data.subscription;
  }

  ensureSupabaseReady().then((client) => {
    if (isCancelled || !client) return;
    const { data } = client.auth.onAuthStateChange(callback);
    innerSub = data.subscription;
  });

  return {
    unsubscribe: () => {
      isCancelled = true;
      if (innerSub) innerSub.unsubscribe();
    },
  };
}

/**
 * Test Supabase connectivity and service latency
 */
export async function testSupabaseConnection(): Promise<{ ok: boolean; latencyMs: number; message: string }> {
  const start = Date.now();
  try {
    const client = await ensureSupabaseReady();
    if (!client) {
      return { ok: false, latencyMs: 0, message: 'Supabase client is initializing from server configuration' };
    }
    const { error } = await client.auth.getSession();
    const latencyMs = Date.now() - start;
    if (error) {
      return { ok: false, latencyMs, message: error.message };
    }
    return { ok: true, latencyMs, message: `Connected to Supabase (${latencyMs}ms)` };
  } catch (err: any) {
    return { ok: false, latencyMs: Date.now() - start, message: err?.message || 'Connection failed' };
  }
}

/**
 * Hybrid Sync Assistant
 */
export async function syncHybridRecord(table: string, id: string, payload: any) {
  if (payload.base64 || payload.mediaUrl || payload.avatar) {
    const mediaKey = `${table}_${id}_media`;
    await setLocalMedia(mediaKey, payload.base64 || payload.mediaUrl || payload.avatar);
  }

  const existingList = getLocalCache(`hybrid_${table}`, []);
  const updatedList = [payload, ...existingList.filter((item: any) => item.id !== id)];
  saveLocalCache(`hybrid_${table}`, updatedList);

  const client = await ensureSupabaseReady();
  if (client) {
    try {
      const { error } = await client
        .from(table)
        .upsert({ id, data: payload, updated_at: new Date().toISOString() });
      if (error) {
        console.warn(`Supabase sync info [${table}]:`, error.message);
      }
    } catch (err) {
      console.warn(`Supabase offline fallback active for ${table}:`, err);
    }
  }

  return true;
}

/**
 * Fetch records using Hybrid Failover Strategy
 */
export async function fetchHybridRecords(table: string): Promise<any[]> {
  const localRecords = getLocalCache(`hybrid_${table}`, []);
  const client = await ensureSupabaseReady();
  
  if (client) {
    try {
      const { data, error } = await client
        .from(table)
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(50);
        
      if (!error && data && data.length > 0) {
        const records = data.map(row => row.data || row);
        saveLocalCache(`hybrid_${table}`, records);
        return records;
      }
    } catch (err) {
      console.warn(`Supabase fetch fallback to local cache for ${table}:`, err);
    }
  }

  return localRecords;
}
