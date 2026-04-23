const DB_NAME = "helixcanvas-workspace-v1";
const STORE_NAME = "workspace-state";

function hasIndexedDb() {
  return typeof indexedDB !== "undefined";
}

function openWorkspaceDb() {
  return new Promise((resolve, reject) => {
    if (!hasIndexedDb()) {
      reject(new Error("IndexedDB is unavailable."));
      return;
    }

    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open workspace database."));
  });
}

async function withStore(mode, callback) {
  const db = await openWorkspaceDb();

  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, mode);
      const store = transaction.objectStore(STORE_NAME);

      transaction.oncomplete = () => resolve(undefined);
      transaction.onerror = () =>
        reject(transaction.error || new Error("Workspace transaction failed."));

      Promise.resolve(callback(store, resolve, reject)).catch(reject);
    });
  } finally {
    db.close();
  }
}

export async function loadWorkspaceState(key) {
  if (!hasIndexedDb()) {
    return { found: false, value: null };
  }

  const value = await withStore("readonly", (store, resolve, reject) => {
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error(`Could not read workspace state for ${key}.`));
  });

  return value === undefined ? { found: false, value: null } : { found: true, value };
}

export async function saveWorkspaceState(key, value) {
  if (!hasIndexedDb()) {
    throw new Error("IndexedDB is unavailable.");
  }

  await withStore("readwrite", (store, resolve, reject) => {
    const request = store.put(value, key);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error || new Error(`Could not save workspace state for ${key}.`));
  });
}

export async function deleteWorkspaceState(key) {
  if (!hasIndexedDb()) {
    return;
  }

  await withStore("readwrite", (store, resolve, reject) => {
    const request = store.delete(key);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error || new Error(`Could not delete workspace state for ${key}.`));
  });
}

export function workspaceStoreAvailable() {
  return hasIndexedDb();
}
