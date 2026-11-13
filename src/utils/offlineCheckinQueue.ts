import { markVisitorCheckInByToken } from '../data/store';

export interface QueuedCheckInItem {
  id: string;
  qr_token: string;
  scanned_at: string;
  gate_note: string;
  synced: boolean;
  synced_at: string | null;
}

const DB_NAME = 'expo_lagrita_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'checkin_sync_queue';

// Fallback in-memory queue for non-browser / Node test environments
const memoryQueue = new Map<string, QueuedCheckInItem>();

function openCheckinDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve, reject) => {
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('qr_token', 'qr_token', { unique: false });
        store.createIndex('synced', 'synced', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueueOfflineCheckIn(
  qrToken: string,
  gateNote = 'Puerta Principal · Vía Llano Los Zambranos'
): Promise<QueuedCheckInItem> {
  const normalizedToken = qrToken.trim().toUpperCase();
  const item: QueuedCheckInItem = {
    id: `chk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    qr_token: normalizedToken,
    scanned_at: new Date().toISOString(),
    gate_note: gateNote,
    synced: false,
    synced_at: null,
  };

  const db = await openCheckinDb();
  if (!db) {
    memoryQueue.set(item.id, item);
    return item;
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(item);
    tx.oncomplete = () => {
      db.close();
      resolve(item);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function getOfflineCheckInQueue(): Promise<QueuedCheckInItem[]> {
  const db = await openCheckinDb();
  if (!db) {
    return Array.from(memoryQueue.values()).sort((a, b) =>
      b.scanned_at.localeCompare(a.scanned_at)
    );
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => {
      db.close();
      const list = (req.result as QueuedCheckInItem[]) || [];
      resolve(list.sort((a, b) => b.scanned_at.localeCompare(a.scanned_at)));
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function flushOfflineCheckInQueue(): Promise<{
  syncedCount: number;
  items: QueuedCheckInItem[];
}> {
  const all = await getOfflineCheckInQueue();
  const pending = all.filter((i) => !i.synced);
  if (pending.length === 0) {
    return { syncedCount: 0, items: all };
  }

  const nowIso = new Date().toISOString();
  const db = await openCheckinDb();

  let syncedCount = 0;
  for (const item of pending) {
    markVisitorCheckInByToken(item.qr_token, item.scanned_at);
    const updated: QueuedCheckInItem = {
      ...item,
      synced: true,
      synced_at: nowIso,
    };
    syncedCount++;

    if (!db) {
      memoryQueue.set(updated.id, updated);
    } else {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(updated);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }
  }

  if (db) db.close();
  const updatedList = await getOfflineCheckInQueue();
  return { syncedCount, items: updatedList };
}

export async function clearSyncedFromOfflineQueue(): Promise<void> {
  const all = await getOfflineCheckInQueue();
  const db = await openCheckinDb();
  if (!db) {
    for (const [k, v] of memoryQueue.entries()) {
      if (v.synced) memoryQueue.delete(k);
    }
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    all.filter((i) => i.synced).forEach((i) => store.delete(i.id));
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}
