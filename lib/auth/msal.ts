/**
 * MSAL (Microsoft Authentication Library) configuration for Azure AD SSO.
 *
 * Required environment variables — set these in .env.local:
 *   NEXT_PUBLIC_AZURE_CLIENT_ID    Application (client) ID from Azure App Registration
 *   NEXT_PUBLIC_AZURE_TENANT_ID    Directory (tenant) ID  — use your Techgene tenant ID
 *   NEXT_PUBLIC_AZURE_REDIRECT_URI Post-login redirect URL (e.g. http://localhost:3000)
 *
 * Azure Portal setup checklist:
 *   1. Azure Active Directory → App registrations → New registration
 *   2. Name: "RC Pricing Frontend"
 *   3. Supported account types: "Accounts in this organizational directory only"
 *      (Single tenant — Techgene employees only)
 *   4. Redirect URI: Single-page application → http://localhost:3000 (dev)
 *                                              → https://your-domain.com (prod)
 *   5. API permissions: Microsoft Graph → openid, profile, email, User.Read
 *
 * The msalInstance is a singleton — safe to import anywhere on the client.
 * DO NOT import this in server components; it references browser globals.
 */

import {
  LogLevel,
  PublicClientApplication,
  type Configuration,
  type RedirectRequest,
  type SilentRequest,
} from "@azure/msal-browser";

import { BACKEND_API_SCOPE } from "@/lib/api/config";

// ─── MSAL application configuration ──────────────────────────────────────────

export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID ?? "00000000-0000-0000-0000-000000000000", // placeholder — replace via env
    authority: `https://login.microsoftonline.com/${
      process.env.NEXT_PUBLIC_AZURE_TENANT_ID ?? "common"
    }`,
    /**
     * MUST point to /login, not the app root.
     *
     * After Azure authenticates the user, it sends them back here with auth
     * tokens in the URL. This page is:
     *   1. Public (middleware doesn't redirect it)
     *   2. Has MsalProvider mounted (via AppProviders in layout.tsx)
     * So MSAL can call handleRedirectPromise() and store the account.
     *
     * If you use "/" instead, Next.js middleware redirects to /login before
     * MSAL gets to read the tokens → auth fails silently.
     *
     * Azure Portal must register the same URI under:
     *   App registrations → Authentication → Single-page application redirect URIs
     */
    redirectUri:
      process.env.NEXT_PUBLIC_AZURE_REDIRECT_URI ??
      (typeof window !== "undefined" ? `${window.location.origin}/login` : "/login"),
    postLogoutRedirectUri: "/login",
  },
  cache: {
    // localStorage keeps the session alive across browser restarts
    // (equivalent to "Remember Me" for Microsoft accounts)
    cacheLocation: "localStorage",
  },
  system: {
    loggerOptions: {
      logLevel: LogLevel.Warning,
      loggerCallback: (level, message) => {
        if (process.env.NODE_ENV === "development") {
          // eslint-disable-next-line no-console
          console.log(`[MSAL ${LogLevel[level]}]`, message);
        }
      },
    },
  },
};

// ─── Login request scopes ─────────────────────────────────────────────────────

/**
 * Scopes requested when the user signs in.
 * - openid / profile / email: standard OIDC claims (name, email, etc.)
 * - User.Read: allows reading the signed-in user's profile from Microsoft Graph
 */
export const loginRequest: RedirectRequest = {
  scopes: ["openid", "profile", "email", "User.Read"],
};

// ─── RC Pricing backend API scope ──────────────────────────────────────────────

/**
 * Scope(s) requested when acquiring a token to call the RC Pricing backend.
 *
 * NEXT_PUBLIC_AZURE_API_SCOPE is empty until the backend's Azure App
 * Registration exists — `scopes` is then `[]`, which token-storage.ts
 * treats as "no backend token to acquire" rather than calling MSAL.
 */
export const apiTokenRequest: SilentRequest = {
  scopes: BACKEND_API_SCOPE ? [BACKEND_API_SCOPE] : [],
};

// ─── Instance factory ─────────────────────────────────────────────────────────

/**
 * Creates the shared PublicClientApplication.
 *
 * Called once inside AppProviders via useState(() => createMsalInstance())
 * so it only ever runs on the client (useState initialiser is client-only in
 * Next.js App Router). Never call at module level — browser APIs are not
 * available in the server/edge runtime that Next.js uses for SSR.
 */
export function createMsalInstance(): PublicClientApplication {
  return new PublicClientApplication(msalConfig);
}
