"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { AUTH_DISABLED } from "@/lib/api/config";
import { useMsalTokenContext } from "@/lib/auth/useMsalTokenContext";

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "RECRUITER";
}

export function useCurrentUser() {
  const msal = useMsalTokenContext();

  return useQuery<CurrentUser>({
    queryKey: ["current-user"],
    queryFn: async () => {
      if (AUTH_DISABLED) {
        return { id: "dev", email: "dev@rc-pricing.local", name: "Dev User", role: "ADMIN" };
      }
      return apiFetch<CurrentUser>("/v1/users/me", { msal });
    },
    staleTime: 5 * 60 * 1000,
  });
}
