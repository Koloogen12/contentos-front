"use client";

/**
 * LinkedIn-аккаунты — список подключённых через OAuth + кнопка
 * "Подключить", которая открывает LinkedIn consent в новом окне.
 *
 * Flow:
 *   1. User clicks "Подключить".
 *   2. POST /api/v1/linkedin/auth/start → authorize_url.
 *   3. We open authorize_url in a new tab.
 *   4. After consent, LinkedIn redirects to our backend callback, which
 *      stores the tokens and 302s back to this page with
 *      `?linkedin=connected` (or `?linkedin=error&reason=...`).
 *   5. On mount we read the query params, show a toast, and clear them
 *      via router.replace so a refresh doesn't re-toast.
 *   6. After the toast fires, the accounts query is invalidated so the
 *      newly-connected account appears in the list.
 *
 * Why a new tab and not a popup window: popup blockers fire on second
 * clicks, and LinkedIn's consent screen explicitly recommends a top-level
 * window in their docs. The user is briefly off our app and lands back
 * with the query-param signal — no postMessage choreography needed.
 */

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Linkedin,
  Loader2,
  Plus,
  Star,
  StarOff,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { ApiError } from "@/lib/api";
import {
  deleteLinkedInAccount,
  listLinkedInAccounts,
  setDefaultLinkedInAccount,
  startLinkedInOAuth,
  type LinkedInAccountOut,
} from "@/lib/linkedin";
import { Button } from "@/components/ui/button";

const QUERY_KEY = ["linkedin-accounts"] as const;


// Map LinkedIn's `error.reason` query param (from the callback redirect)
// to user-facing Russian copy. Unknown reasons get a generic toast.
const ERROR_REASONS: Record<string, string> = {
  bad_state:
    "Сессия подключения истекла. Попробуй ещё раз.",
  missing_state: "Сессия подключения истекла. Попробуй ещё раз.",
  missing_code: "LinkedIn не вернул код авторизации.",
  token_exchange_failed:
    "LinkedIn отклонил обмен кода на токен — проверь настройки приложения.",
  userinfo_failed:
    "Не удалось получить профиль из LinkedIn после авторизации.",
  bad_token_response:
    "LinkedIn вернул некорректный ответ при обмене токенов.",
  missing_sub: "LinkedIn не вернул идентификатор пользователя.",
  // LinkedIn's own error codes (rare in practice, mostly user-cancel).
  user_cancelled_login: "Ты отменил вход в LinkedIn.",
  user_cancelled_authorize: "Ты не дал согласие на доступ.",
  access_denied: "Доступ отклонён.",
};


export function LinkedInAccountsSection() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: listLinkedInAccounts,
  });

  // React to the post-callback query params (set by our backend redirect).
  React.useEffect(() => {
    const status = searchParams.get("linkedin");
    if (!status) return;
    if (status === "connected") {
      toast.success("LinkedIn-аккаунт подключён");
      void qc.invalidateQueries({ queryKey: QUERY_KEY });
    } else if (status === "error") {
      const reason = searchParams.get("reason") || "";
      toast.error(
        ERROR_REASONS[reason] ||
          "Не удалось подключить LinkedIn. Попробуй ещё раз.",
      );
    }
    // Strip the params so a page refresh doesn't re-toast / re-invalidate.
    const params = new URLSearchParams(searchParams.toString());
    params.delete("linkedin");
    params.delete("reason");
    const q = params.toString();
    router.replace(q ? `?${q}` : "?");
  }, [searchParams, router, qc]);

  const connectMutation = useMutation({
    mutationFn: () =>
      // Use the current page URL as the post-callback redirect so the user
      // lands back exactly here (with the query-param signal). The backend
      // validates this against the CORS allowlist before honouring it.
      startLinkedInOAuth(window.location.href),
    onSuccess: (data) => {
      // Same-tab navigation: simpler than popup orchestration and avoids
      // popup-blocker issues. The user comes back via the callback redirect.
      window.location.href = data.authorize_url;
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError
          ? err.detail
          : "Не удалось запустить подключение LinkedIn",
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteLinkedInAccount(id),
    onSuccess: () => {
      toast.success("Аккаунт отключён");
      void qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : "Не удалось отключить аккаунт",
      ),
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => setDefaultLinkedInAccount(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : "Не удалось обновить",
      ),
  });

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">
            LinkedIn-аккаунты
          </h2>
          <p className="text-sm text-muted-foreground">
            Подключи свой профиль, чтобы публиковать посты и карусели
            прямо из канваса.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => connectMutation.mutate()}
          disabled={connectMutation.isPending}
        >
          {connectMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}{" "}
          Подключить
        </Button>
      </div>

      {query.isPending ? (
        <AccountsSkeleton />
      ) : query.isError ? (
        <ErrorBlock
          detail={
            query.error instanceof ApiError
              ? query.error.detail
              : "Не удалось загрузить аккаунты"
          }
          onRetry={() => query.refetch()}
        />
      ) : query.data && query.data.length > 0 ? (
        <AccountsTable
          accounts={query.data}
          onDelete={(id) => deleteMutation.mutate(id)}
          onSetDefault={(id) => setDefaultMutation.mutate(id)}
          isDeleting={deleteMutation.isPending}
        />
      ) : (
        <EmptyState />
      )}
    </section>
  );
}


function AccountsTable({
  accounts,
  onDelete,
  onSetDefault,
  isDeleting,
}: {
  accounts: LinkedInAccountOut[];
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
  isDeleting: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card/40">
      <ul className="divide-y divide-border">
        {accounts.map((acc) => {
          const expiresInDays = Math.max(
            0,
            Math.round(
              (new Date(acc.access_expires_at).getTime() - Date.now()) /
                (1000 * 60 * 60 * 24),
            ),
          );
          const hasPostScope = acc.scopes.includes("w_member_social");
          return (
            <li
              key={acc.id}
              className="flex items-center gap-3 px-4 py-3"
            >
              {acc.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={acc.avatar_url}
                  alt={acc.display_name}
                  className="h-9 w-9 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Linkedin className="h-4 w-4" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">
                    {acc.display_name}
                  </span>
                  {acc.is_default && (
                    <span className="rounded-sm bg-primary/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-primary">
                      По умолчанию
                    </span>
                  )}
                  {!hasPostScope && (
                    <span
                      className="rounded-sm bg-warn/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-warn"
                      title="Не выдано право w_member_social — публикация недоступна"
                    >
                      Только чтение
                    </span>
                  )}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {acc.email ?? acc.sub}
                  {" · "}
                  токен истекает через {expiresInDays} д
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!acc.is_default && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSetDefault(acc.id)}
                    title="Сделать аккаунтом по умолчанию"
                  >
                    <StarOff className="h-4 w-4" />
                  </Button>
                )}
                {acc.is_default && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled
                    title="Текущий аккаунт по умолчанию"
                  >
                    <Star className="h-4 w-4 fill-current" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(acc.id)}
                  disabled={isDeleting}
                  title="Отключить"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}


function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 px-6 py-10 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
        <Linkedin className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-medium text-foreground">
        Аккаунтов LinkedIn пока нет
      </h3>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">
        Подключи профиль через OAuth — это безопасно и можно отозвать в
        один клик. Токен хранится в зашифрованном виде.
      </p>
    </div>
  );
}


function AccountsSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl border border-border bg-card/40 px-4 py-3"
        >
          <div className="h-9 w-9 rounded-full bg-muted/60" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-40 rounded bg-muted/60" />
            <div className="h-3 w-24 rounded bg-muted/40" />
          </div>
        </div>
      ))}
    </div>
  );
}


function ErrorBlock({
  detail,
  onRetry,
}: {
  detail: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/[0.06] px-4 py-3 text-sm text-destructive">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <div className="flex-1">{detail}</div>
      <Button variant="ghost" size="sm" onClick={onRetry}>
        Повторить
      </Button>
    </div>
  );
}
