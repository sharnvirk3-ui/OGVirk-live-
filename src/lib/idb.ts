import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { compressBase64Image } from './mediaCompressor';

// Simple IndexedDB utility for storing large media files locally
const DB_NAME = 'AppletMediaStore';
const STORE_NAME = 'media_files';

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const idbInstance = request.result;
      if (!idbInstance.objectStoreNames.contains(STORE_NAME)) {
        idbInstance.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function setLocalMedia(key: string, data: string | Blob): Promise<void> {
  try {
    const idbInstance = await getDB();
    return new Promise((resolve, reject) => {
      const tx = idbInstance.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(data, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('IndexedDB set error:', err);
  }
}

export async function getLocalMedia(key: string): Promise<string | Blob | null> {
  try {
    const idbInstance = await getDB();
    return new Promise((resolve) => {
      const tx = idbInstance.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.error('IndexedDB get error:', err);
    return null;
  }
}

let isQuotaExceededInIdb = false;

// Save large media (video/image base64) to Firestore so all users can receive it
export async function saveGlobalMediaToFirestore(mediaId: string, base64Data: string): Promise<string> {
  // Auto-compress image before storing to reduce size by up to 90%
  const processedData = await compressBase64Image(base64Data);
  const idbKey = `idb_${mediaId}`;
  await setLocalMedia(idbKey, processedData);

  if (isQuotaExceededInIdb) {
    return `idb://${idbKey}`;
  }

  try {
    const CHUNK_SIZE = 450000; // ~450KB chunks to safely fit in Firestore document limits
    const totalChunks = Math.ceil(processedData.length / CHUNK_SIZE);

    if (totalChunks <= 1) {
      await setDoc(doc(db, 'globalMedia', mediaId), {
        data: processedData,
        chunksCount: 1,
        updatedAt: serverTimestamp()
      });
    } else {
      await setDoc(doc(db, 'globalMedia', mediaId), {
        chunksCount: totalChunks,
        totalLength: processedData.length,
        updatedAt: serverTimestamp()
      });
      for (let i = 0; i < totalChunks; i++) {
        const chunk = processedData.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        await setDoc(doc(db, 'globalMedia', `${mediaId}_chunk_${i}`), {
          chunkData: chunk,
          index: i
        });
      }
    }
    // Also store in local IndexedDB for instant local playback
    await setLocalMedia(`cached_${mediaId}`, processedData);
    return `firestore_media://${mediaId}`;
  } catch (err: any) {
    const errStr = err instanceof Error ? err.message : String(err);
    if (errStr.includes('resource-exhausted') || errStr.toLowerCase().includes('quota')) {
      isQuotaExceededInIdb = true;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('firestore-quota-exceeded', { detail: { message: errStr } }));
      }
    } else {
      console.warn('Fallback to local IndexedDB media storage:', errStr);
    }
    return `idb://${idbKey}`;
  }
}

// Load media from Firestore globally across all users
export async function loadGlobalMediaFromFirestore(mediaId: string): Promise<string> {
  try {
    // Check local IndexedDB cache first
    const cached = await getLocalMedia(`cached_${mediaId}`);
    if (cached && typeof cached === 'string') {
      return cached;
    }

    const mainSnap = await getDoc(doc(db, 'globalMedia', mediaId));
    if (!mainSnap.exists()) return '';
    const mainData = mainSnap.data();

    if (mainData.data) {
      await setLocalMedia(`cached_${mediaId}`, mainData.data);
      return mainData.data;
    }

    const chunksCount = mainData.chunksCount || 0;
    if (chunksCount <= 0) return '';

    let fullBase64 = '';
    for (let i = 0; i < chunksCount; i++) {
      const chunkSnap = await getDoc(doc(db, 'globalMedia', `${mediaId}_chunk_${i}`));
      if (chunkSnap.exists()) {
        fullBase64 += (chunkSnap.data().chunkData || '');
      }
    }
    if (fullBase64) {
      await setLocalMedia(`cached_${mediaId}`, fullBase64);
    }
    return fullBase64;
  } catch (err) {
    console.error('Error loading global media from firestore:', err);
    return '';
  }
}

export async function sanitizePayloadForFirestore(obj: Record<string, any>): Promise<Record<string, any>> {
  const sanitized: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (typeof val === 'string' && val.length > 250000 && !val.startsWith('http://') && !val.startsWith('https://') && !val.startsWith('firestore_media://') && !val.startsWith('idb://')) {
      const mediaRef = await saveGlobalMediaToFirestore(`field_${key}`, val);
      sanitized[key] = mediaRef;
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized;
}

export async function resolveIdbMedia(url: string | null | undefined): Promise<string> {
  if (!url) return '';
  if (url.startsWith('firestore_media://')) {
    const mediaId = url.replace('firestore_media://', '');
    return await loadGlobalMediaFromFirestore(mediaId);
  }
  if (url.startsWith('idb://')) {
    const key = url.replace('idb://', '');
    const data = await getLocalMedia(key);
    if (data && typeof data === 'string') {
      return data;
    } else if (data instanceof Blob) {
      return URL.createObjectURL(data);
    }
    return '';
  }
  return url;
}
