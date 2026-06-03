"use client";

/**
 * AppProviders — root client-side provider tree.
 *
 * Provider order:
 *   MsalProvider    — must be outermost; required by useIsAuthenticated / useMsal
 *   AuthProvider    — reads MSAL accounts → exposes useAuth() to the whole tree
 *   QueryClientProvider — TanStack Query for data fetching
 *
 * MSAL is initialised in useState() so it only ever runs on the client.
 * Calling new PublicClientApplication() at module level would crash during
 * Next.js server-side rendering (no window / localStorage in Node.js).
 */

import { useState } from "react";
import { MsalProvider } from "@azure/msal-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMsalInstance } from "@/lib/auth/msal";
import { AuthProvider } from "@/features/auth/context/AuthContext";

export function AppProviders({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [msalInstance] = useState(() => createMsalInstance());
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
      }),
  );

  return (
    <MsalProvider instance={msalInstance}>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </AuthProvider>
    </MsalProvider>
  );
}
