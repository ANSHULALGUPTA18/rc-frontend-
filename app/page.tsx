import { redirect } from "next/navigation";

/**
 * Root redirect → /login
 *
 * Always send users to the login page first.
 * AzureLoginPanel (or mock login) will redirect to /dashboard after auth.
 * This prevents unauthenticated users from ever landing on a protected route
 * directly from the root URL.
 */
export default function HomePage(): never {
  redirect("/login");
}
