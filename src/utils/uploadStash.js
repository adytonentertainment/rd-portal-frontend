/**
 * Keeps an in-flight upload recoverable across the death of its tab.
 *
 * A transfer lives entirely in one tab's JavaScript. When that tab goes — a
 * crash, an OOM kill, an accidental reload — the loop vanishes mid-batch with
 * no error raised, because there is nothing left to raise one. Server logs show
 * exactly this: batch after batch answered 202, then a single 499 (client
 * closed the connection) and no further requests at all. Not one retry fired,
 * which is the tell: a live page with a failed request retries, a dead one
 * cannot.
 *
 * localStorage can hold the upload id, but an id alone still makes a human
 * re-drop thousands of files by hand. IndexedDB can hold the File handles
 * themselves — File is structured-cloneable — so the page can pick the transfer
 * up on its own, sending only what the server says is missing.
 *
 * Every call resolves rather than rejects. Recovery is a convenience layered
 * over a transfer that already works; it must never be the reason an upload
 * fails to start.
 */

const DB_NAME = 'rd-upload-stash';
const STORE = 'pending';
const KEY = 'current';
const DB_VERSION = 1;

const openDb = () =>
  new Promise((resolve) => {
    let req;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      resolve(null);
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
    req.onblocked = () => resolve(null);
  });

const withStore = async (mode, run) => {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    let tx;
    try {
      tx = db.transaction(STORE, mode);
    } catch {
      db.close();
      resolve(null);
      return;
    }
    let result = null;
    const req = run(tx.objectStore(STORE));
    if (req)
      req.onsuccess = () => {
        result = req.result;
      };
    tx.oncomplete = () => {
      db.close();
      resolve(result);
    };
    tx.onerror = () => {
      db.close();
      resolve(null);
    };
    tx.onabort = () => {
      db.close();
      resolve(null);
    };
  });
};

/** Remember which files belong to an upload that is currently transferring. */
export const stashUpload = (uploadId, files) =>
  withStore('readwrite', (store) => store.put({ uploadId, files: Array.from(files), stashedAt: Date.now() }, KEY));

/**
 * The interrupted upload, or null. Verifies the handles are still readable:
 * a File whose underlying file was moved or deleted since the stash survives
 * as an object but throws on read, and discovering that mid-resume would strand
 * the transfer a second time.
 */
export const loadStash = async () => {
  const row = await withStore('readonly', (store) => store.get(KEY));
  if (!row || !row.uploadId || !row.files?.length) return null;
  try {
    // Touching one byte is enough to prove the handles still resolve.
    await row.files[0].slice(0, 1).arrayBuffer();
  } catch {
    await clearStash();
    return null;
  }
  return row;
};

export const clearStash = () => withStore('readwrite', (store) => store.delete(KEY));
