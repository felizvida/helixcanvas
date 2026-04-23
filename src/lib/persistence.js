export function isQuotaExceededError(error) {
  return (
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED")
  );
}

export function readStoredJson(storage, key, fallback) {
  if (!storage) {
    return fallback;
  }

  try {
    const value = storage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function readStoredJsonEntry(storage, key) {
  if (!storage) {
    return { found: false, value: null, error: null };
  }

  try {
    const value = storage.getItem(key);

    if (value == null) {
      return { found: false, value: null, error: null };
    }

    return { found: true, value: JSON.parse(value), error: null };
  } catch (error) {
    return { found: false, value: null, error };
  }
}

export function safeWriteStoredJson(storage, key, value) {
  if (!storage) {
    return { ok: false, error: new Error("Storage is unavailable."), quotaExceeded: false };
  }

  try {
    storage.setItem(key, JSON.stringify(value));
    return { ok: true, error: null, quotaExceeded: false };
  } catch (error) {
    return {
      ok: false,
      error,
      quotaExceeded: isQuotaExceededError(error),
    };
  }
}

export function safeRemoveStoredValue(storage, key) {
  if (!storage) {
    return { ok: false, error: new Error("Storage is unavailable.") };
  }

  try {
    storage.removeItem(key);
    return { ok: true, error: null };
  } catch (error) {
    return { ok: false, error };
  }
}
