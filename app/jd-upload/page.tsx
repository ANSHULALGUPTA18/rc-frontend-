import { AuthGuard } from "@/features/auth/components/AuthGuard";
import { JdWorkshopFlow } from "@/features/jd-upload/components/JdWorkshopFlow";

/**
 * /jd-upload — protected route.
 * Entry point for the 3-stage pricing wizard (Upload → Prompt Selection → Pricing).
 * JdWorkshopFlow manages stage transitions and holds uploaded File objects in
 * memory — they are never serialised to the URL because File is not serialisable.
 */
export default function JdUploadPage(): React.ReactElement {
  return (
    <AuthGuard>
      <JdWorkshopFlow />
    </AuthGuard>
  );
}
