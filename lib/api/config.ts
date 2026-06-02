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

/** Base URL prepended to every apiFetch() call. Empty string = relative URLs (same origin). */
export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";
