"use client";

/**
 * Auth hooks — two login paths, one interface.
 *
 * IS_MOCK=true  (development)
 *   useLogin()  — useMutation wrapping the mock API client.
 *                 Email/password form; token stored in sessionStorage/localStorage.
 *
 * IS_MOCK=false (production)
 *   useAzureLogin()  — calls MSAL loginRedirect(). The browser leaves the app,
 *                      authenticates with Azure AD, and returns to redirectUri.
 *                      MsalProvider handles the callback automatically.
 *   useAzureLogout() — calls MSAL logoutRedirect().
 *   useAzureUser()   — returns the signed-in account from MSAL cache.
 *
 * The LoginView consumes useLogin (mock) or useMsal directly (Azure) based on
 * IS_MOCK, keeping the hook layer thin and testable.
 */

import { useMsal } from "@azure/msal-react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { login as apiLogin } from "@/features/auth/api/client";
import { IS_MOCK } from "@/lib/api/config";
import { loginRequest } from "@/lib/auth/msal";
import { clearAuth, clearSessionCookie, setToken, setUser } from "@/lib/auth/storage";

// ─── Mock login (IS_MOCK=true) ────────────────────────────────────────────────

interface LoginVariables {
  email: string;
  password: string;
  rememberMe: boolean;
}

/**
 * useLogin — wraps the mock email/password API in a TanStack mutation.
 * Used only in development (IS_MOCK=true).
 */
export function useLogin() {
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: ({ email, password }: LoginVariables) => apiLogin(email, password),
    onSuccess: (data, variables) => {
      setToken(data.token, variables.rememberMe);
      setUser({ name: data.user.name, email: data.user.email }, variables.rememberMe);
      router.push("/dashboard");
    },
  });

  return {
    login: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.error as Error | null,
  };
}

// ─── Azure AD login (IS_MOCK=false) ───────────────────────────────────────────

/**
 * useAzureLogin — triggers the MSAL loginRedirect flow.
 * Browser navigates to Microsoft login page; MsalProvider processes the
 * response when the user is redirected back.
 */
export function useAzureLogin() {
  const { instance } = useMsal();

  const handleLogin = (): void => {
    void instance.loginRedirect(loginRequest);
  };

  return { handleLogin };
}

/**
 * useAzureLogout — signs out from Azure AD and clears the MSAL token cache.
 * Redirects to /login after logout (configured in msalConfig.postLogoutRedirectUri).
 */
export function useAzureLogout() {
  const { instance } = useMsal();

  const handleLogout = (): void => {
    clearSessionCookie();
    void instance.logoutRedirect();
  };

  return { handleLogout };
}

/**
 * useLogout — unified logout that works in both mock and Azure mode.
 * Clears the session cookie, token storage, and redirects to /login.
 */
export function useLogout() {
  const router = useRouter();
  const { instance } = useMsal();

  const logout = (): void => {
    clearAuth();
    if (IS_MOCK) {
      router.replace("/login");
    } else {
      void instance.logoutRedirect();
    }
  };

  return { logout };
}

/**
 * useAzureUser — returns the active Azure AD account (name, email, tenantId).
 * Returns null when no account is signed in.
 */
export function useAzureUser() {
  const { accounts } = useMsal();
  const account = accounts[0] ?? null;

  if (!account) return null;

  return {
    name: account.name ?? "",
    email: account.username, // username is the UPN / email in Azure AD
    tenantId: account.tenantId,
  };
}
