import { AuthGuard } from "@/features/auth/components/AuthGuard";
import { SettingsView } from "@/features/settings/components/SettingsView";

export default function SettingsPage(): React.ReactElement {
  return (
    <AuthGuard>
      <SettingsView />
    </AuthGuard>
  );
}
