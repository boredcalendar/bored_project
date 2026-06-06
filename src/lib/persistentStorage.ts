// Browsers may evict IndexedDB for "best-effort" origins under storage pressure.
// Asking for persistent storage tells the browser this data matters. Support and
// the answer vary by browser, so we expose the outcome rather than assume it.
export type PersistentStorageStatus = "granted" | "denied" | "unsupported";

function storageManager(): StorageManager | undefined {
  if (typeof navigator === "undefined") {
    return undefined;
  }
  return navigator.storage;
}

/** Report whether storage is already persisted, without prompting. */
export async function getPersistentStorageStatus(): Promise<PersistentStorageStatus> {
  const storage = storageManager();
  if (!storage?.persisted) {
    return "unsupported";
  }
  return (await storage.persisted()) ? "granted" : "denied";
}

/**
 * Request persistent storage. Returns the resulting status. Safe to call when
 * unsupported (returns "unsupported") and idempotent when already granted.
 */
export async function requestPersistentStorage(): Promise<PersistentStorageStatus> {
  const storage = storageManager();
  if (!storage?.persist) {
    return "unsupported";
  }
  if (storage.persisted && (await storage.persisted())) {
    return "granted";
  }
  return (await storage.persist()) ? "granted" : "denied";
}
