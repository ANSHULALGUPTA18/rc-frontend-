/**
 * Shared apiFetch() — the single entry point for calling the RC Pricing
 * backend from feature code.
 *
 * - Prefixes API_BASE onto `path`.
 * - Sets Content-Type: application/json for JSON bodies.
 * - Attaches `Authorization: Bearer <token>` (mock dev JWT or MSAL-acquired
 *   token — see lib/auth/token-storage.ts) unless IS_MOCK.
 * - Throws ApiError (lib/api/error.ts) for non-OK responses.
 *
 * Feature-level api/client.ts files currently return mock data directly and
 * do not call this yet — it is additive infrastructure for the upcoming
 * real-backend integration.
 */

import { API_BASE, IS_MOCK } from "@/lib/api/config";
import { parseApiErrorResponse } from "@/lib/api/error";
import { getAccessToken, type MsalTokenContext } from "@/lib/auth/token-storage";

export interface ApiFetchOptions extends Omit<RequestInit, "headers"> {
  headers?: HeadersInit;
  /** MSAL instance/account used to acquire a backend token. Ignored when IS_MOCK. */
  msal?: MsalTokenContext;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { msal, headers, body, ...rest } = options;

  const requestHeaders = new Headers(headers);
  if (body !== undefined && !(body instanceof FormData) && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (!IS_MOCK) {
    const token = await getAccessToken(msal);
    if (token) {
      requestHeaders.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    body,
    headers: requestHeaders,
  });

  if (!response.ok) {
    throw await parseApiErrorResponse(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
