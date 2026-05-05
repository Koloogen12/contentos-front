import { AuthGuard } from "@/components/AuthGuard";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

/**
 * Bare onboarding layout — no AppShell. Auth-gated, but otherwise a clean
 * focused page. The wizard handles its own freshness check on mount: if the
 * account isn't fresh, it redirects to /dashboard.
 */
export default function OnboardingPage() {
  return (
    <AuthGuard>
      <OnboardingWizard />
    </AuthGuard>
  );
}
