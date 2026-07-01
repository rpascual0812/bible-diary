/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChatSession } from "../App";

const DB_NAME = "DailyHealingWordDB_v2";
const STORE_NAME = "sessions";
const LOCAL_BIBLE_STORE_NAME = "localBible";
const DB_VERSION = 2;

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not supported"));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(LOCAL_BIBLE_STORE_NAME)) {
        db.createObjectStore(LOCAL_BIBLE_STORE_NAME);
      }
    };
  });
}

/**
 * Saves chat sessions to IndexedDB as a durable local backup.
 */
export async function saveSessionsToIndexedDB(sessions: ChatSession[]): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      
      const clearReq = store.clear();
      clearReq.onsuccess = () => {
        if (sessions.length === 0) {
          resolve();
          return;
        }
        
        let completed = 0;
        let hasError = false;
        
        sessions.forEach((session) => {
          const req = store.put(session);
          req.onsuccess = () => {
            completed++;
            if (completed === sessions.length && !hasError) {
              resolve();
            }
          };
          req.onerror = () => {
            if (!hasError) {
              hasError = true;
              reject(req.error);
            }
          };
        });
      };
      
      clearReq.onerror = () => reject(clearReq.error);
    });
  } catch (err) {
    console.error("Failed to back up sessions to IndexedDB:", err);
  }
}

/**
 * Loads chat sessions from IndexedDB.
 */
export async function loadSessionsFromIndexedDB(): Promise<ChatSession[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        const results = (request.result || []) as ChatSession[];
        results.sort((a, b) => b.created_at - a.created_at);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("Failed to load sessions from IndexedDB:", err);
    return [];
  }
}

export async function getLocalBibleItemFromIndexedDB(
  key: string,
): Promise<string | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(LOCAL_BIBLE_STORE_NAME, "readonly");
      const store = transaction.objectStore(LOCAL_BIBLE_STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => resolve((request.result as string | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

export async function setLocalBibleItemInIndexedDB(
  key: string,
  value: string,
): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(LOCAL_BIBLE_STORE_NAME, "readwrite");
    const store = transaction.objectStore(LOCAL_BIBLE_STORE_NAME);
    const request = store.put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function removeLocalBibleItemFromIndexedDB(
  key: string,
): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(LOCAL_BIBLE_STORE_NAME, "readwrite");
    const store = transaction.objectStore(LOCAL_BIBLE_STORE_NAME);
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
