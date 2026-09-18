import OneSignal from 'react-onesignal';

export const ONESIGNAL_APP_ID = 'ca8fb571-450e-422b-a1b9-739f60379f98';

let isInitialized = false;

export async function initOneSignal(): Promise<void> {
  if (typeof window === 'undefined' || isInitialized) return;
  try {
    await OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true,
      serviceWorkerPath: 'sw.js',
      serviceWorkerParam: { scope: '/' },
      notifyButton: {
        enable: false
      }
    } as any);
    isInitialized = true;
    console.log('✅ OneSignal Push Notification SDK initialized successfully. App ID:', ONESIGNAL_APP_ID);
  } catch (err) {
    console.warn('OneSignal initialization warning:', err);
  }
}

export async function promptOneSignalPushPermission(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    if (!isInitialized) {
      await initOneSignal();
    }
    await OneSignal.Notifications.requestPermission();
    const granted = OneSignal.Notifications.permission;
    return granted;
  } catch (err) {
    console.warn('OneSignal permission prompt error:', err);
    return false;
  }
}

export function isOneSignalSupported(): boolean {
  return typeof window !== 'undefined' && ('Notification' in window);
}
