"use client";

import * as React from "react";
import { fetchMe, refreshOnce } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";

/**
 * Runs once on mount: if a refreshToken survived in localStorage, exchange it
 * for a fresh access token and hydrate `user`/`organization`. Until this
 * settles, `isHydrating` is true so guarded pages can show a spinner instead
 * of bouncing to /login.
 */
export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const setTokens = useAuthStore((s) => s.setTokens);
  const setMe = useAuthStore((s) => s.setMe);
  const setHydrating = useAuthStore((s) => s.setHydrating);
  const logout = useAuthStore((s) => s.logout);

  React.useEffect(() => {
    let cancelled = false;
    // 8s ceiling on the rehydration handshake — if the API is unreachable,
    // don't leave the whole app stuck on a "Loading workspace…" spinner.
    const watchdog = setTimeout(() => {
      if (!cancelled) {
        logout();
        setHydrating(false);
      }
    }, 8000);
    (async () => {
      const refreshToken = useAuthStore.getState().refreshToken;
      if (!refreshToken) {
        clearTimeout(watchdog);
        setHydrating(false);
        return;
      }
      try {
        const tokens = await refreshOnce(refreshToken);
        if (cancelled) return;
        setTokens({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
        });
        const me = await fetchMe();
        if (cancelled) return;
        setMe({ user: me.user, organization: me.organization });
      } catch {
        if (!cancelled) logout();
      } finally {
        clearTimeout(watchdog);
        if (!cancelled) setHydrating(false);
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(watchdog);
    };
  }, [logout, setHydrating, setMe, setTokens]);

  return <>{children}</>;
}
