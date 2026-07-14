import { AuthGuard } from "@/features/auth/components/AuthGuard";
import { CacheView } from "@/features/cache/components/CacheView";

export default function SettingsCachePage(): React.ReactElement {
  return (
    <AuthGuard>
      <CacheView />
    </AuthGuard>
  );
}
