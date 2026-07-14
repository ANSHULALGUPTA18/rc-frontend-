import { AuthGuard } from "@/features/auth/components/AuthGuard";
import { DatabaseView } from "@/features/database/components/DatabaseView";

export default function SettingsDatabasePage(): React.ReactElement {
  return (
    <AuthGuard>
      <DatabaseView />
    </AuthGuard>
  );
}
