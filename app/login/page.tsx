import { LoginView } from "@/features/auth/components/LoginView";

/** Public login route — no auth required. */
export default function LoginPage(): React.ReactElement {
  return <LoginView />;
}
