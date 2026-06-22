import { AuthGuard } from "@/features/auth/components/AuthGuard";
import { UserManagementView } from "@/features/admin/components/UserManagementView";

export default function UserManagementPage(): React.ReactElement {
  return (
    <AuthGuard>
      <UserManagementView />
    </AuthGuard>
  );
}
