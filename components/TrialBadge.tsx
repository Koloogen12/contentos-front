"use client";

/**
 * Preview / Trial / Regular state-aware badge in the app shell topbar.
 *
 *   - kind="preview": shows "Preview · 3 AI / 1 render" counters,
 *     no timer, "Зарегистрироваться" CTA. After the user runs their
 *     first Format-node (trial_ai_runs_used >= 1), the modal pops
 *     UNCLOSABLE — registration is mandatory to continue. After the
 *     hard cap is hit, the modal pops anyway with a stronger headline.
 *
 *   - kind="trial": shows "Триал · 23ч осталось" countdown. No
 *     operation counters because trial = unlimited within the 24h
 *     window. "Подключить тариф" CTA opens the (Phase-2-to-be-wired)
 *     pricing screen — for now we just route to /settings.
 *
 *   - kind="regular": returns null. No badge.
 */

import * as React from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Clock, Loader2, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";

import {
  ApiError,
  fetchMe,
  registerFromPreview,
} from "@/lib/api";
import { useAuthStore } from "@/stores/auth";


const POLL_MS = 30_000;
const PREVIEW_AI_CAP = 3;
const PREVIEW_RENDER_CAP = 1;


export function TrialBadge() {
  const org = useAuthStore((s) => s.organization);
  const setMe = useAuthStore((s) => s.setMe);
  const router = useRouter();
  const [modalOpen, setModalOpen] = React.useState(false);
  const [autoTriggered, setAutoTriggered] = React.useState(false);

  const kind = org?.kind ?? "regular";
  const isPreview = kind === "preview";
  const isTrial = kind === "trial";
  const isRegular = kind === "regular";
  // Preview/trial users need the live counter + auto-popping conversion
  // modal. Regular users only get a "Тарифы" link in the same slot so
  // there's always a discoverable path to subscription settings.
  const shouldShow = isPreview || isTrial;

  // Poll /me while preview/trial active so badge stays current across
  // tabs and reflects backend-side counter / clock changes.
  const meQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: fetchMe,
    enabled: shouldShow,
    refetchInterval: shouldShow ? POLL_MS : false,
    staleTime: 0,
  });

  React.useEffect(() => {
    if (meQuery.data) {
      setMe({
        user: meQuery.data.user,
        organization: meQuery.data.organization,
      });
    }
  }, [meQuery.data, setMe]);

  // Preview users: auto-open the registration modal once they've run
  // at least one AI op (≈ Format-node completion). Once auto-opened
  // we stop re-triggering — but for preview-mandatory mode the modal
  // also can't be dismissed by clicking outside, see ConvertModal.
  React.useEffect(() => {
    if (!isPreview || autoTriggered) return;
    const used = org?.trial_ai_runs_used ?? 0;
    if (used >= 1) {
      setModalOpen(true);
      setAutoTriggered(true);
    }
  }, [isPreview, org?.trial_ai_runs_used, autoTriggered]);

  // Regular kind: render just a low-weight "Тарифы" pill so the user can
  // always reach the subscription page from the topbar (without it the
  // only entry point is the settings cog → billing tab, easy to miss).
  if (isRegular && org) {
    return (
      <button
        type="button"
        className="rounded-full border border-border bg-foreground/[0.04] px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:border-border hover:text-foreground"
        onClick={() => router.push("/settings?tab=subscription")}
        title="Тарифы и подписка"
      >
        Тарифы
      </button>
    );
  }

  if (!shouldShow || !org) return null;

  // ---------- PREVIEW BADGE ----------
  if (isPreview) {
    const aiUsed = org.trial_ai_runs_used ?? 0;
    const rendersUsed = org.trial_renders_used ?? 0;
    const aiLeft = Math.max(0, PREVIEW_AI_CAP - aiUsed);
    const rendersLeft = Math.max(0, PREVIEW_RENDER_CAP - rendersUsed);
    const exhausted = aiLeft === 0 && rendersLeft === 0;

    return (
      <>
        <div className="flex items-center gap-2 rounded-full border border-warn/40 bg-warn/[0.08] px-2.5 py-1 text-[11px] font-medium text-warn">
          <span className="rounded-sm bg-warn/30 px-1.5 py-0.5 text-[9px] uppercase tracking-wider">
            Preview
          </span>
          <span className="inline-flex items-center gap-1" title="AI-запросы">
            <Sparkles size={11} /> {aiLeft}/{PREVIEW_AI_CAP}
          </span>
          <span className="inline-flex items-center gap-1" title="Карусели">
            <Wand2 size={11} /> {rendersLeft}/{PREVIEW_RENDER_CAP}
          </span>
          <button
            type="button"
            className="ml-1 rounded-full border border-warn/30 bg-warn/15 px-2 py-0.5 text-[10px] font-semibold text-warn hover:bg-warn/25"
            onClick={() => setModalOpen(true)}
          >
            Зарегистрироваться
          </button>
        </div>

        {modalOpen && (
          <ConvertModal
            // After the first AI op (auto-trigger) OR when caps are
            // exhausted, the modal is MANDATORY — no close button.
            mandatory={autoTriggered || exhausted}
            onClose={() => setModalOpen(false)}
          />
        )}
      </>
    );
  }

  // ---------- TRIAL BADGE ----------
  const expiresAt = org.trial_expires_at
    ? new Date(org.trial_expires_at).getTime()
    : 0;
  const secondsLeft = expiresAt
    ? Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
    : 0;
  const hoursLeft = Math.floor(secondsLeft / 3600);
  const minsLeft = Math.floor((secondsLeft % 3600) / 60);
  const trialExpired = secondsLeft === 0 && expiresAt > 0;

  return (
    <div
      className={`flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
        trialExpired
          ? "border-destructive/40 bg-destructive/[0.08] text-destructive"
          : "border-success/40 bg-success/[0.08] text-success"
      }`}
    >
      <span
        className={`rounded-sm px-1.5 py-0.5 text-[9px] uppercase tracking-wider ${
          trialExpired ? "bg-destructive/30" : "bg-success/30"
        }`}
      >
        {trialExpired ? "Trial истёк" : "Trial"}
      </span>
      {!trialExpired && (
        <span className="inline-flex items-center gap-1" title="До конца триала">
          <Clock size={11} />
          {hoursLeft > 0 ? `${hoursLeft}ч ${minsLeft}м` : `${minsLeft}м`}
        </span>
      )}
      <button
        type="button"
        className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
          trialExpired
            ? "border border-destructive/30 bg-destructive/15 text-destructive hover:bg-destructive/25"
            : "border border-success/30 bg-success/15 text-success hover:bg-success/25"
        }`}
        onClick={() => router.push("/settings?tab=subscription")}
      >
        Тарифы
      </button>
    </div>
  );
}


// =============================================================================
// Conversion modal — preview → registered trial
// =============================================================================

function ConvertModal({
  mandatory,
  onClose,
}: {
  mandatory: boolean;
  onClose: () => void;
}) {
  const setTokens = useAuthStore((s) => s.setTokens);
  const setMe = useAuthStore((s) => s.setMe);
  const qc = useQueryClient();
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [displayName, setDisplayName] = React.useState("");

  const convert = useMutation({
    mutationFn: () =>
      registerFromPreview({
        email: email.trim(),
        password,
        display_name: displayName.trim() || undefined,
      }),
    onSuccess: async (tokens) => {
      setTokens({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
      });
      const me = await fetchMe();
      setMe(me);
      void qc.invalidateQueries();
      toast.success("Готово! Триал на 24 часа активирован.");
      onClose();
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError
          ? err.detail
          : "Не удалось завершить регистрацию",
      ),
  });

  const canSubmit =
    email.trim().includes("@") &&
    password.length >= 8 &&
    !convert.isPending;

  if (typeof window === "undefined") return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center overflow-y-auto bg-black/85 px-4 py-6 backdrop-blur"
      onClick={(e) => {
        // Mandatory modal: clicking outside doesn't close. The user
        // either registers or stays here. Aggressive but matches the
        // product spec — preview is a one-shot demo, conversion is the
        // only path forward.
        if (!mandatory && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="my-auto w-full max-w-md rounded-2xl border border-warn/30 bg-muted p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 text-xs uppercase tracking-wider text-warn">
          {mandatory ? "Шаг 2 из 2" : "Сохрани работу"}
        </div>
        <h2 className="mb-2 text-xl font-semibold tracking-tight">
          Регистрация откроет 24 часа без ограничений
        </h2>
        <p className="mb-5 text-sm text-muted-foreground">
          Твой превью-канвас сохранится. Сразу получишь 24 часа триала
          с полным доступом ко всем фичам — голосовая тренировка, метрики,
          контент-план, неограниченные генерации. После триала — выбираешь
          тариф (можно бесплатный).
        </p>

        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) convert.mutate();
          }}
        >
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Email
            </label>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-warn/60 focus:outline-none"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Пароль (от 8 символов)
            </label>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-warn/60 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Имя (необязательно)
            </label>
            <input
              type="text"
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-warn/60 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canSubmit}
            >
              {convert.isPending && (
                <Loader2 size={14} className="animate-spin" />
              )}
              Создать аккаунт и активировать триал
            </button>
            {!mandatory && (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-md border border-border bg-card/40 px-4 py-2 text-sm font-medium hover:bg-card/60"
              >
                Позже
              </button>
            )}
          </div>
        </form>

        <p className="mt-4 text-[11px] text-muted-foreground">
          Бесплатно. Без карты. Удалить аккаунт — один клик в настройках.
          {" "}
          <button
            type="button"
            onClick={() => {
              onClose();
              router.push("/login");
            }}
            className="text-warn underline hover:text-warn"
          >
            Уже есть аккаунт? Войти
          </button>
        </p>
      </div>
    </div>,
    document.body,
  );
}
