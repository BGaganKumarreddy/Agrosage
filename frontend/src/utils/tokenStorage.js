/**
 * Centralized authentication token storage management for AgroSage.
 *
 * Enforces the canonical storage key `rythusaathi_auth_token` while providing
 * transparent, one-time backward-compatible migration for any legacy session
 * stored under `rythusaathi_token`.
 */

export const AUTH_TOKEN_KEY = 'rythusaathi_auth_token';
export const LEGACY_AUTH_TOKEN_KEY = 'rythusaathi_token';

/**
 * Retrieve the active authentication token, migrating from legacy key if present.
 * Never throws; returns null if storage is unavailable or token is absent.
 */
export const getStoredToken = () => {
  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) return token;

    // One-time migration: if legacy key exists, migrate and delete old key
    const legacy = localStorage.getItem(LEGACY_AUTH_TOKEN_KEY);
    if (legacy) {
      localStorage.setItem(AUTH_TOKEN_KEY, legacy);
      localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
      return legacy;
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Persist the active authentication token and clean up any legacy key.
 */
export const setStoredToken = (token) => {
  try {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
    // Clean up legacy key if still present
    localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
  } catch {}
};

/**
 * Remove all active and legacy authentication tokens from local storage.
 */
export const clearStoredToken = () => {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
  } catch {}
};
