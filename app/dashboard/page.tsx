import { AuthGuard } from "@/features/auth/components/AuthGuard";
import { DashboardView } from "@/features/dashboard/components/DashboardView";

/**
 * /dashboard — protected route.
 * AuthGuard redirects to /login if the user is not authenticated.
 * All KPI data, approvals, and reports are fetched inside DashboardView
 * via TanStack Query using the API client (mock or real based on IS_MOCK).
 */
export default function DashboardPage(): React.ReactElement {
  return (
    <AuthGuard>
      <DashboardView />
    </AuthGuard>
  );
}
