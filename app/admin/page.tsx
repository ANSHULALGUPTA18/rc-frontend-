import { AuthGuard } from "@/features/auth/components/AuthGuard";
import { ApprovalQueueView } from "@/features/admin/components/ApprovalQueueView";

export default function AdminPage(): React.ReactElement {
  return (
    <AuthGuard>
      <ApprovalQueueView />
    </AuthGuard>
  );
}
