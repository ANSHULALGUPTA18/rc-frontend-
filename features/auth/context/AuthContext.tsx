"use client";

/**
 * AuthContext — single source of truth for the authenticated user.
 *
 * IS_MOCK=true:  user info comes from StoredUser (written to storage on mock login).
 * IS_MOCK=false: user info comes from the MSAL account cached by Azure AD.
 *
 * Consumers call useAuth() to get { user, isAuthenticated, logout }.
 * The AuthProvider wraps the app tree inside AppProviders.
 *
 * Session persistence:
 *   - Mock: user JSON is in localStorage (rememberMe) or sessionStorage.
 *           Reading it on mount restores the session across page refreshes.
 *   - Azure: MSAL reads its token cache from localStorage automatically.
 *            useIsAuthenticated() returns true as long as the token is valid.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { useRouter } from "next/navigation";
import { IS_MOCK } from "@/lib/api/config";
import { clearAuth, getStoredUser, type StoredUser } from "@/lib/auth/storage";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  name: string;
  email: string;
  role?: string;
  tenantId?: string;
}

interface AuthContextValue {
  /** Authenticated user details, or null when logged out */
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** Signs the user out and redirects to /login */
  logout: () => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  logout: () => {},
});

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const router = useRouter();
  const { instance, accounts } = useMsal();
  const isAzureAuthenticated = useIsAuthenticated();

  /** Derive user from the right source depending on mode */
  const user: AuthUser | null = useMemo(() => {
    if (IS_MOCK) {
      const stored: StoredUser | null = getStoredUser();
      if (!stored) return null;
      return { name: stored.name, email: stored.email, role: stored.role };
    }
    const account = accounts[0];
    if (!account) return null;
    return {
      name: account.name ?? account.username,
      email: account.username,
      tenantId: account.tenantId,
    };
  }, [accounts]);

  const isAuthenticated = IS_MOCK ? Boolean(user) : isAzureAuthenticated;

  const logout = useCallback((): void => {
    clearAuth();
    if (IS_MOCK) {
      router.replace("/login");
    } else {
      void instance.logoutRedirect();
    }
  }, [instance, router]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
