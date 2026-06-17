/**
 * Single source of truth for the mock/real API switch.
 *
 * Set NEXT_PUBLIC_USE_MOCK=true  → all api/client.ts functions return mock data.
 * Set NEXT_PUBLIC_USE_MOCK=false → all functions call the real backend.
 *
 * When IS_MOCK is false and the backend is unreachable, views show an error
 * state with a Retry button — there is intentionally NO fallback to mock data.
 */
export const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

/**
 * Kill-switch for the entire auth layer (middleware redirect, AuthGuard,
 * MSAL token acquisition).  Set NEXT_PUBLIC_AUTH_DISABLED=true in .env.local
 * to bypass everything — the app behaves as if a user called "Dev User" is
 * always signed in.  Flip back to false (or remove the var) to restore the
 * full Azure AD / mock-login flow.
 */
export const AUTH_DISABLED = process.env.NEXT_PUBLIC_AUTH_DISABLED === "true";

/** Base URL prepended to every apiFetch() call. Empty string = relative URLs (same origin). */
export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

/**
 * OAuth2 scope for the RC Pricing backend's Azure App Registration
 * (e.g. "api://<backend-client-id>/access_as_user").
 *
 * Empty until that App Registration exists — token-storage.ts treats an
 * empty scope as "no API token to acquire" rather than erroring.
 */
export const BACKEND_API_SCOPE = process.env.NEXT_PUBLIC_AZURE_API_SCOPE ?? "";
