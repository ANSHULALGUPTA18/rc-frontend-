"use client";

/**
 * AuthGuard — client-side route protection.
 *
 * Reads auth state from AuthContext (which unifies mock + Azure).
 * Waits for MSAL to finish its startup sequence before redirecting so that
 * a valid cached Azure session is not mistakenly treated as unauthenticated.
 *
 * On failure: clears stale auth data → redirects to /login.
 * On success: renders children.
 *
 * Usage:
 *   export default function DashboardPage() {
 *     return <AuthGuard><DashboardView /></AuthGuard>;
 *   }
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMsal } from "@azure/msal-react";
import { InteractionStatus } from "@azure/msal-browser";
import { IS_MOCK } from "@/lib/api/config";
import { clearAuth } from "@/lib/auth/storage";
import { useAuth } from "@/features/auth/context/AuthContext";
import { LoadingSpinner } from "@/components/ui/query-states";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps): React.ReactElement | null {
  const router = useRouter();
  const { inProgress } = useMsal();
  const { isAuthenticated } = useAuth();

  // MSAL reads its token cache from localStorage asynchronously on startup.
  // Wait until it finishes before treating !isAuthenticated as "not logged in".
  const isMsalBusy = !IS_MOCK && inProgress !== InteractionStatus.None;

  useEffect(() => {
    if (isMsalBusy) return;
    if (!isAuthenticated) {
      clearAuth(); // remove stale cookie so middleware doesn't loop
      router.replace("/login");
    }
  }, [isMsalBusy, isAuthenticated, router]);

  if (isMsalBusy) return <LoadingSpinner />;
  if (!isAuthenticated) return null;
  return <>{children}</>;
}
