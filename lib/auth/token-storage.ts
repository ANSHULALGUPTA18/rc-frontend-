/**
 * Access-token acquisition for apiFetch().
 *
 * IS_MOCK=true:  returns the dev JWT written to storage on mock login
 *                (see lib/auth/storage.ts).
 * IS_MOCK=false: acquires an access token for the RC Pricing backend via
 *                MSAL (acquireTokenSilent).
 *
 * If silent acquisition fails with InteractionRequiredAuthError, this throws
 * a descriptive Error rather than calling acquireTokenRedirect: a redirect
 * mid-page navigates away from the current screen (losing any in-memory
 * wizard state) and bounces back through /login, which from the user's
 * perspective looks like "nothing happened". Throwing lets the calling
 * feature surface a clear, actionable error instead — InteractionRequired
 * here almost always means the backend API permission/scope hasn't been
 * granted or consented for this app registration in Azure AD yet.
 *
 * The MSAL instance/account are passed in by the caller (obtained from
 * useMsal()) — this module never touches MSAL at module scope, since MSAL
 * is client-only.
 */

import {
  InteractionRequiredAuthError,
  type AccountInfo,
  type IPublicClientApplication,
} from "@azure/msal-browser";

import { AUTH_DISABLED, IS_MOCK } from "@/lib/api/config";
import { apiTokenRequest } from "@/lib/auth/msal";
import { getToken as getMockToken } from "@/lib/auth/storage";

export interface MsalTokenContext {
  instance: IPublicClientApplication;
  account: AccountInfo | null;
}

/**
 * Resolve the bearer token to send with backend API requests.
 *
 * Returns `null` when no token is available (mock mode with no stored
 * session, Azure mode with no signed-in account, or no backend API scope
 * configured yet) — callers should send the request without an
 * Authorization header in that case.
 */
export async function getAccessToken(msal?: MsalTokenContext): Promise<string | null> {
  if (AUTH_DISABLED) {
    return "dev-no-auth";
  }

  if (IS_MOCK) {
    return getMockToken();
  }

  if (apiTokenRequest.scopes.length === 0) {
    return null;
  }

  if (!msal?.account) {
    return null;
  }

  const request = { ...apiTokenRequest, account: msal.account };

  try {
    const result = await msal.instance.acquireTokenSilent(request);
    return result.accessToken;
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      throw new Error(
        `Unable to get permission to call the RC Pricing API (scope: ${apiTokenRequest.scopes[0]}). ` +
          "This usually means the API permission for this scope hasn't been granted/consented in Azure AD yet. " +
          "Contact your administrator."
      );
    }
    throw error;
  }
}
