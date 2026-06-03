import { AuthGuard } from "@/features/auth/components/AuthGuard";
import { PromptTemplateView } from "@/features/prompt-template/components/PromptTemplateView";

/**
 * /prompt-template — protected route.
 * Renders the prompt template card grid where users can create, set default,
 * and delete AI instruction sets used in the pricing workflow.
 */
export default function PromptTemplatePage(): React.ReactElement {
  return (
    <AuthGuard>
      <PromptTemplateView />
    </AuthGuard>
  );
}
