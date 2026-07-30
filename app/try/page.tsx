"use client";

/**
 * /try — public deep-link from the marketing site.
 *
 * No standalone landing here. We auto-provision a preview org and drop the
 * visitor straight onto /dashboard, where the Variant-C hero copy lives for
 * preview-kind orgs. Rationale: avoiding two competing landing pages — the
 * marketing site IS the landing; /try is just "start the preview now."
 *
 * If a visitor is already signed in we send them to /dashboard untouched.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { fetchMe, startPreviewSession } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";


export default function TryPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const setTokens = useAuthStore((s) => s.setTokens);
  const setMe = useAuthStore((s) => s.setMe);
  const [error, setError] = React.useState<string | null>(null);
  // Run once flag — React 18 strict-mode double-invokes effects in dev, which
  // would otherwise hit /auth/preview-session twice and waste a row.
  const startedRef = React.useRef(false);

  React.useEffect(() => {
    if (accessToken) {
      router.replace("/dashboard");
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;
    (async () => {
      try {
        const tokens = await startPreviewSession();
        setTokens({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
        });
        const me = await fetchMe();
        setMe(me);
        router.replace("/dashboard");
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Не удалось запустить пробную сессию",
        );
      }
    })();
  }, [accessToken, router, setTokens, setMe]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-center">
        {error ? (
          <>
            <div className="text-sm text-destructive">{error}</div>
            <button
              type="button"
              onClick={() => {
                setError(null);
                startedRef.current = false;
                // Trigger effect by remounting via reload — simplest reliable
                // path here; an explicit retry would duplicate the bootstrap
                // logic and is not worth the extra complexity for an edge.
                router.refresh();
              }}
              className="rounded-md border border-border bg-card/50 px-3 py-1.5 text-[12px] font-medium hover:bg-card/70"
            >
              Повторить
            </button>
            <a
              href="/login"
              className="text-[12px] text-muted-foreground underline hover:text-foreground"
            >
              Уже есть аккаунт? Войти
            </a>
          </>
        ) : (
          <>
            <Loader2 size={28} className="animate-spin text-warn" />
            <div className="text-sm text-muted-foreground">
              Готовим твою песочницу…
            </div>
          </>
        )}
      </div>
    </div>
  );
}
