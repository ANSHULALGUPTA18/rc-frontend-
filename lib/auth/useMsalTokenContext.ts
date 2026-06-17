"use client";

/**
 * useMsalTokenContext — the MsalTokenContext shape that apiFetch()/getAccessToken()
 * expect, sourced from the active MSAL account.
 *
 * Feature hooks/components pass the result of this hook as `msal` into
 * api/client.ts functions, which forward it to apiFetch({ msal }).
 */

import { useMsal } from "@azure/msal-react";
import type { MsalTokenContext } from "@/lib/auth/token-storage";

export function useMsalTokenContext(): MsalTokenContext {
  const { instance, accounts } = useMsal();
  return { instance, account: accounts[0] ?? null };
}
