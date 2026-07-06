import { AuthGuard } from "@/features/auth/components/AuthGuard";
import { DatabaseView } from "@/features/database/components/DatabaseView";

/**
 * /database — protected admin route.
 * Read-only viewer of stored backend data (all tables), for building toward
 * the future pricing engine. Data is fetched inside DatabaseView via the
 * admin database-viewer API.
 */
export default function DatabasePage(): React.ReactElement {
  return (
    <AuthGuard>
      <DatabaseView />
    </AuthGuard>
  );
}
