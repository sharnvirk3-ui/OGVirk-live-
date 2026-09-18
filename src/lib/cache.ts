// Local Caching, API Caching, and Push Notification Manager

interface CachedFetchOptions extends RequestInit {
  ttlMs?: number; // Cache time-to-live in ms (default: 5 minutes)
  forceRefresh?: boolean;
}

const inflightRequests = new Map<string, Promise<any>>();

/**
 * Robust API Request Caching Mechanism
 * - Serves instant cached response from LocalStorage
 * - Deduplicates parallel identical inflight fetch requests
 * - Serves stale cache gracefully if offline or request fails
 * - Conserves API quota and network bandwidth
 */
export async function cachedFetch<T = any>(
  url: string,
  options: CachedFetchOptions = {}
): Promise<T> {
  const { ttlMs = 300000, forceRefresh = false, ...fetchOptions } = options;
  const cacheKey = `api_fetch_${url}_${JSON.stringify(fetchOptions.body || '')}`;
  const now = Date.now();

  // 1. Return cached response if valid and not expired
  if (!forceRefresh) {
    const cached = getLocalCache<{ timestamp: number; data: T } | null>(cacheKey, null);
    if (cached && cached.data && (now - cached.timestamp < ttlMs)) {
      return cached.data;
    }
  }

  // 2. Prevent duplicate parallel requests (Request Deduplication)
  if (inflightRequests.has(cacheKey)) {
    return inflightRequests.get(cacheKey);
  }

  // 3. Execute network request
  const requestPromise = (async () => {
    try {
      const response = await fetch(url, fetchOptions);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: T = await response.json();
      saveLocalCache(cacheKey, { timestamp: Date.now(), data });
      return data;
    } catch (err) {
      console.warn(`cachedFetch network error for ${url}, attempting stale cache fallback:`, err);
      const stale = getLocalCache<{ timestamp: number; data: T } | null>(cacheKey, null);
      if (stale && stale.data) {
        return stale.data;
      }
      throw err;
    } finally {
      inflightRequests.delete(cacheKey);
    }
  })();

  inflightRequests.set(cacheKey, requestPromise);
  return requestPromise;
}

export function safeLocalStorageGet(key: string, fallback: string = ''): string {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(key) ?? fallback;
    }
  } catch (err) {
    console.warn(`safeLocalStorageGet failed for ${key}:`, err);
  }
  return fallback;
}

export function safeLocalStorageSet(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(key, value);
    }
  } catch (err) {
    console.warn(`safeLocalStorageSet failed for ${key}:`, err);
  }
}

export function safeLocalStorageRemove(key: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(key);
    }
  } catch (err) {
    console.warn(`safeLocalStorageRemove failed for ${key}:`, err);
  }
}

export function saveLocalCache(key: string, data: any): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    localStorage.setItem(`app_cache_${key}`, JSON.stringify({
      timestamp: Date.now(),
      data
    }));
  } catch (err) {
    console.warn(`Local cache save failed for ${key}:`, err);
  }
}

export function getLocalCache<T>(key: string, fallback: T): T {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return fallback;
    const raw = localStorage.getItem(`app_cache_${key}`);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.data !== undefined && parsed.data !== null) {
      return parsed.data as T;
    }
  } catch (err) {
    console.warn(`Local cache read failed for ${key}:`, err);
  }
  return fallback;
}

export function clearAllLocalCache(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('app_cache_')) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch (err) {
    console.warn('Error clearing cache:', err);
  }
}

// Push Notification Utilities
export async function requestPushPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  try {
    if (Notification.permission === 'granted') {
      return true;
    }
    if (Notification.permission !== 'denied') {
      const res = await Notification.requestPermission();
      if (res === 'granted') {
        sendPushNotification('🔔 Notifications Enabled', 'You will now receive instant push alerts for updates, chat messages, and system logs!');
        return true;
      }
    }
  } catch (err) {
    console.error('Error requesting notification permission:', err);
  }
  return false;
}

export function getPushPermissionStatus(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export function sendPushNotification(title: string, body?: string, icon?: string): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title, {
            body: body || 'New update in app',
            icon: icon || '/icon.png',
            badge: '/icon.png',
            vibrate: [200, 100, 200]
          } as any);
        }).catch(() => {
          new Notification(title, { body: body || '', icon: icon || '/icon.png' });
        });
      } else {
        new Notification(title, {
          body: body || '',
          icon: icon || '/icon.png',
        });
      }
    } catch (err) {
      console.warn('Push notification delivery error:', err);
    }
  }
}
