"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { fetchMe } from "@/lib/api";
import { decidePostAuthRoute } from "@/lib/post-auth-redirect";

/**
 * Приёмник токенов после входа через Яндекс.
 *
 * Бэкенд возвращает их во фрагменте URL (`#access_token=…`), а не в query:
 * фрагмент не уходит на сервер, поэтому не попадает в логи доступа, в прокси
 * и в заголовок Referer при переходе со страницы. Читаем его на клиенте,
 * складываем в стор и сразу чистим адресную строку через replaceState —
 * чтобы токены не остались в истории браузера.
 */
export default function YandexCallbackPage() {
  const router = useRouter();
  const setTokens = useAuthStore((s) => s.setTokens);
  const setMe = useAuthStore((s) => s.setMe);
  const setHydrating = useAuthStore((s) => s.setHydrating);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const run = async () => {
      const raw = window.location.hash.replace(/^#/, "");
      const params = new URLSearchParams(raw);
      const access = params.get("access_token");
      const refresh = params.get("refresh_token");
      const next = params.get("next");

      // Убираем фрагмент до любых await — если что-то дальше упадёт, токены
      // всё равно не останутся видимыми в адресной строке.
      window.history.replaceState(null, "", window.location.pathname);

      if (!access || !refresh) {
        setError("Ссылка не содержит токенов. Попробуй войти заново.");
        return;
      }

      try {
        setTokens({ accessToken: access, refreshToken: refresh });
        const me = await fetchMe();
        setMe({ user: me.user, organization: me.organization });
        setHydrating(false);
        router.replace(await decidePostAuthRoute({ next }));
      } catch {
        setError("Не удалось загрузить профиль. Попробуй войти заново.");
      }
    };
    void run();
  }, [router, setHydrating, setMe, setTokens]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      {error ? (
        <div className="max-w-sm text-center">
          <p className="text-sm text-destructive">{error}</p>
          <a
            href="/login"
            className="mt-4 inline-block text-sm font-medium text-foreground hover:text-primary"
          >
            На страницу входа
          </a>
        </div>
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Входим…
        </p>
      )}
    </div>
  );
}
