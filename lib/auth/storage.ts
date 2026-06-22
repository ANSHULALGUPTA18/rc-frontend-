/**
 * Auth storage utilities — tokens, user info, and session cookie.
 *
 * Three separate pieces:
 *   Token        — JWT stored in localStorage (rememberMe) or sessionStorage.
 *   User         — Serialised user object stored alongside the token so the
 *                  app can display name/email without calling the API again.
 *                  In Azure mode, user info comes from MSAL instead.
 *   Session flag — "rc_session=1" cookie readable by Edge Middleware so it can
 *                  gate protected routes without access to localStorage.
 */

const TOKEN_KEY = "rc_auth_token";
const USER_KEY = "rc_auth_user";
const SESSION_COOKIE = "rc_session";

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface StoredUser {
  name: string;
  email: string;
  role?: string;
}

// ─── Token ────────────────────────────────────────────────────────────────────

export function setToken(token: string, rememberMe: boolean): void {
  const storage = rememberMe ? localStorage : sessionStorage;
  const other = rememberMe ? sessionStorage : localStorage;
  storage.setItem(TOKEN_KEY, token);
  other.removeItem(TOKEN_KEY);
  setSessionCookie();
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
}

// ─── User ─────────────────────────────────────────────────────────────────────

export function setUser(user: StoredUser, rememberMe: boolean): void {
  const storage = rememberMe ? localStorage : sessionStorage;
  const other = rememberMe ? sessionStorage : localStorage;
  storage.setItem(USER_KEY, JSON.stringify(user));
  other.removeItem(USER_KEY);
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

// ─── Clear all ────────────────────────────────────────────────────────────────

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(USER_KEY);
  clearSessionCookie();
}

// ─── Session cookie (read by Edge Middleware) ─────────────────────────────────

/** Presence flag — does NOT contain the actual token */
export function setSessionCookie(): void {
  document.cookie = `${SESSION_COOKIE}=1; path=/; SameSite=Strict; Max-Age=28800`;
}

export function clearSessionCookie(): void {
  document.cookie = `${SESSION_COOKIE}=; path=/; SameSite=Strict; Max-Age=0`;
}
