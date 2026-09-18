import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register Service Worker for offline capability & background session persistence (only on HTTP/HTTPS web origins)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('ServiceWorker registered with scope:', registration.scope);

        // Auto update worker on new build
        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  console.log('[Service Worker] New version available; activating immediately...');
                  installingWorker.postMessage({ type: 'SKIP_WAITING' });
                }
              }
            };
          }
        });

        // Register Periodic Background Sync for session keepalive if supported
        if ('periodicSync' in registration) {
          (registration as any).periodicSync.register('session-keepalive', {
            minInterval: 12 * 60 * 60 * 1000, // Every 12 hours
          }).catch((err: any) => console.log('Periodic sync registration error:', err));
        }

        // Register Background Sync for offline queue retry if supported
        if ('sync' in registration) {
          (registration as any).sync.register('sync-app-state')
            .catch((err: any) => console.log('Background sync registration error:', err));
        }
      })
      .catch((error) => {
        console.log('ServiceWorker registration notice:', error);
      });

    // Send periodic heartbeat ping to keep Service Worker active & prevent premature session drops
    setInterval(() => {
      try {
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: 'PING' });
        }
      } catch (e) {}
    }, 45000);

    // Listen for messages from Service Worker (e.g. background sync completed)
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'BACKGROUND_SYNC_TRIGGERED') {
        console.log('[App] Background sync signal received from Service Worker');
      }
    });
  });
}


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

