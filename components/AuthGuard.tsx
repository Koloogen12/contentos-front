"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { Spinner } from "@/components/ui/spinner";

/**
 * Client-side gate. Waits for AuthBootstrap to finish; if there's no user
 * after that, kicks back to /login.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isHydrating = useAuthStore((s) => s.isHydrating);
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);

  React.useEffect(() => {
    if (!isHydrating && (!accessToken || !user)) {
      router.replace("/login");
    }
  }, [isHydrating, accessToken, user, router]);

  if (isHydrating || !accessToken || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size={20} label="Loading workspace…" />
      </div>
    );
  }

  return <>{children}</>;
}
