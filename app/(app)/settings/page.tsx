"use client";

/**
 * Settings — port of `THE CONTENT-2/phase3-screens.jsx#SettingsScreen`.
 * Left sidebar with 6 sections, right content panel. Existing functional
 * forms (BrandContext, VoiceTraining, TelegramTargets) live inside the
 * appropriate sections.
 */

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  Chrome,
  CreditCard,
  Keyboard,
  Loader2,
  Mic,
  Palette,
  RefreshCw,
  Save,
  Sparkles,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { getBrandContext, updateBrandContext } from "@/lib/brand-context";
import { useAuthStore } from "@/stores/auth";
import type { BrandContextOut } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { VoiceTrainingSection } from "@/components/VoiceTrainingSection";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const schema = z.object({
  author_name: z.string().optional(),
  author_handle: z.string().optional(),
  manifesto: z.string().optional(),
  voice_rules: z.string().optional(),
  taboo_list: z.string().optional(),
  cta_keywords: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type Section =
  | "profile"
  | "billing"
  | "shortcuts";

// «Мой голос» отсюда убран: он работал с теми же voice_samples и
// brand_context, что и модуль «Голос», но без автоимпорта и редполитики —
// то есть был усечённой копией. Два входа в одни данные расходятся по
// возможностям и путают.
//
// «AI-провайдер» убран потому, что выбирать было нечего: список моделей
// нередактируемый, активна серверная. Строка с активной моделью переехала
// в профиль — она нужна, когда ноды ведут себя неожиданно.
//
// «Внешний вид» был заглушкой: переключатель темы живёт в шапке.
const SECTIONS: { id: Section; label: string; Icon: LucideIcon }[] = [
  { id: "profile", label: t.settings.sections.profile, Icon: User },
  { id: "billing", label: t.settings.sections.billing, Icon: CreditCard },
  {
    id: "shortcuts",
    label: t.settings.sections.shortcuts,
    Icon: Keyboard,
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initial tab comes from `?tab=` so deep-links from elsewhere (the trial
  // badge's "Тарифы" CTA, or links inside the app) open on the right
  // section. "subscription" is the public-facing slug for the billing tab
  // — we accept both for resilience.
  const initialTab: Section = React.useMemo(() => {
    const raw = searchParams.get("tab");
    if (raw === "subscription" || raw === "billing") return "billing";
    // Старые слаги удалённых разделов не роняем в 404, а уводим по смыслу:
    // «голос» — на свой модуль, остальные — в профиль.
    if (raw === "voice") return "profile";
    if (raw === "ai" || raw === "appearance") return "profile";
    if (raw === "profile" || raw === "shortcuts") return raw;
    return "profile";
  }, [searchParams]);
  const [tab, setTab] = React.useState<Section>(initialTab);
  // Keep the URL in sync when the user clicks a different tab, so refreshing
  // / back-button-ing lands them on the same screen.
  const setTabAndUrl = React.useCallback(
    (next: Section) => {
      setTab(next);
      const slug = next === "billing" ? "subscription" : next;
      const params = new URLSearchParams(searchParams.toString());
      if (next === "profile") params.delete("tab");
      else params.set("tab", slug);
      const qs = params.toString();
      router.replace(`/settings${qs ? `?${qs}` : ""}`);
    },
    [router, searchParams],
  );

  // Defense-in-depth: preview (anonymous) users get bounced away from
  // settings. Direct URL hits, bookmarks, stale gear buttons we might
  // have missed elsewhere — all funnel back to /dashboard.
  const isPreview = useAuthStore((s) => s.organization?.kind === "preview");
  React.useEffect(() => {
    if (isPreview) router.replace("/dashboard");
  }, [isPreview, router]);
  if (isPreview) return null;

  return (
    <div className="co-settings-screen">
      <div className="co-settings-topbar">
        <button
          type="button"
          className="co-iconbtn"
          onClick={() => router.push("/dashboard")}
          title={t.settings.back}
        >
          <ArrowLeft size={16} />
        </button>
        <div className="co-settings-title">{t.settings.title}</div>
        <div style={{ width: 28 }} />
      </div>
      <div className="co-settings-layout">
        <aside className="co-settings-sidebar">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={cn("co-settings-tab", tab === s.id && "active")}
              onClick={() => setTabAndUrl(s.id)}
            >
              <s.Icon size={15} />
              {s.label}
            </button>
          ))}
        </aside>
        <main className="co-settings-content">
          {tab === "profile" && <ProfileSection />}
          {tab === "billing" && <BillingSection />}
          {tab === "shortcuts" && <ShortcutsSection />}
        </main>
      </div>
    </div>
  );
}

// =========================================================================
// Profile section — uses the existing BrandContext form (still drives the
// AI brand voice). Visual chrome is the prototype profile card pattern.
// =========================================================================
function ProfileSection() {
  const user = useAuthStore((s) => s.user);
  const query = useQuery({
    queryKey: ["brand-context"],
    queryFn: getBrandContext,
  });

  const initials = React.useMemo(() => {
    const source = user?.display_name || user?.email || "?";
    return source
      .split(/[\s@]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("");
  }, [user]);

  return (
    <div className="co-settings-block">
      <div className="co-settings-h">{t.settings.sections.profile}</div>
      <div className="co-settings-sub">{t.settings.profile.sub}</div>
      <div className="co-profile-row">
        <div className="co-profile-avatar-lg">{initials}</div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 500,
              color: "var(--text-primary)",
              marginBottom: 4,
            }}
          >
            {user?.display_name ?? user?.email ?? "—"}
          </div>
          <div
            style={{
              fontSize: 12.5,
              color: "var(--text-tertiary)",
              marginBottom: 8,
            }}
          >
            {user?.email}
          </div>
          <button
            type="button"
            className="co-btn co-btn-ghost"
            style={{ fontSize: 11.5 }}
          >
            {t.settings.profile.replaceAvatar}
          </button>
        </div>
      </div>

      {query.isPending ? (
        <SettingsSkeleton />
      ) : query.isError ? (
        <ErrorBlock
          detail={
            query.error instanceof ApiError
              ? query.error.detail
              : "Не удалось загрузить контекст бренда."
          }
          onRetry={() => query.refetch()}
        />
      ) : query.data ? (
        <BrandContextForm context={query.data} />
      ) : null}

      <ActiveModelNote />
    </div>
  );
}

/**
 * Строка об активной модели — всё, что осталось от раздела «AI-провайдер».
 *
 * Сам раздел был списком, в котором нечего выбирать: модель задаётся на
 * сервере, остальные пункты помечены как недоступные. Но знать, на чём
 * считают ноды, нужно — без этого непонятно, почему текст поменял характер
 * после обновления. Поэтому список ушёл, а факт остался.
 */
function ActiveModelNote() {
  const active = t.settings.ai.providers.find((p) => p.badge === "АКТИВНА");
  if (!active) return null;
  return (
    <div className="kmeta" style={{ marginTop: 20 }}>
      Ноды работают на модели {active.name}. Она задаётся на сервере — выбор
      на уровне аккаунта появится позже.
    </div>
  );
}

function VoiceSection() {
  return (
    <div className="co-settings-block">
      <div className="co-settings-h">{t.settings.sections.voice}</div>
      <div className="co-settings-sub">{t.settings.voice.sub}</div>
      <VoiceTrainingSection />
    </div>
  );
}

function BillingSection() {
  const org = useAuthStore((s) => s.organization);
  const kind = org?.kind ?? "regular";

  // Current plan block — driven entirely by org.kind so we never lie
  // about the user's state. Trial countdown is recomputed locally
  // because the parent doesn't poll /me here and we don't want to add
  // a separate query just for this card.
  let currentPlan: {
    badge: string;
    badgeTone: "amber" | "emerald" | "violet";
    title: string;
    sub: string;
  };
  if (kind === "trial") {
    const expiresAt = org?.trial_expires_at
      ? new Date(org.trial_expires_at).getTime()
      : 0;
    const secondsLeft = expiresAt
      ? Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
      : 0;
    const hours = Math.floor(secondsLeft / 3600);
    const mins = Math.floor((secondsLeft % 3600) / 60);
    const left =
      hours > 0 ? `${hours}ч ${mins}м` : mins > 0 ? `${mins}м` : "истёк";
    currentPlan = {
      badge: "TRIAL",
      badgeTone: "emerald",
      title: "Триал · 24 часа без лимитов",
      sub: `До конца ${left}. После — выбери тариф ниже или перейдёшь на Free.`,
    };
  } else if (kind === "preview") {
    currentPlan = {
      badge: "PREVIEW",
      badgeTone: "amber",
      title: "Превью без регистрации",
      sub: "Хардкап: 1 канвас, 3 AI-операции, 1 рендер. Зарегистрируйся, чтобы получить триал.",
    };
  } else {
    currentPlan = {
      badge: "FREE",
      badgeTone: "violet",
      title: "Free план",
      sub: "Базовые лимиты. Подписки с расширенными опциями появятся ниже — Phase 2 (T-Bank, recurring).",
    };
  }

  return (
    <div className="co-settings-block">
      <div className="co-settings-h">{t.settings.sections.billing}</div>
      <div className="co-settings-sub">{t.settings.billing.sub}</div>

      <CurrentPlanCard plan={currentPlan} />

      <div className="mt-6">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Тарифы
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <PlanPreview
            name="Solo"
            price="990 ₽"
            features={[
              "Безлимит AI-операций",
              "До 30 рендеров каруселей/мес",
              "Все платформы",
            ]}
          />
          <PlanPreview
            name="Pro"
            price="2 490 ₽"
            highlight
            features={[
              "Всё из Solo",
              "Безлимит рендеров",
              "Метрики Telegram + LinkedIn",
              "Приоритетные модели",
            ]}
          />
          <PlanPreview
            name="Team"
            price="4 990 ₽"
            features={[
              "Всё из Pro",
              "До 5 пользователей",
              "Shared brand voice",
              "Поддержка в Telegram",
            ]}
          />
        </div>
        <p className="mt-3 text-[12px] text-muted-foreground">
          Подключение карт через Т-Банк появится в ближайшем апдейте
          (Phase 2). Сейчас можно остаться на Free после окончания триала
          без каких-либо действий.
        </p>
      </div>

      {/* Подключения площадок переехали в свой модуль: к тарифу они
          отношения не имеют, а искали их не здесь. */}
      <p className="mt-6 text-[12px] text-muted-foreground">
        Подключение Telegram, LinkedIn и остальных площадок — в разделе{" "}
        <Link href="/connections" className="underline">
          Подключения
        </Link>
        .
      </p>
    </div>
  );
}

function CurrentPlanCard({
  plan,
}: {
  plan: {
    badge: string;
    badgeTone: "amber" | "emerald" | "violet";
    title: string;
    sub: string;
  };
}) {
  const tone = {
    amber:
      "border-warn/30 bg-warn/[0.06] text-warn",
    emerald:
      "border-success/30 bg-success/[0.06] text-success",
    violet:
      "border-content/30 bg-content/[0.06] text-content",
  }[plan.badgeTone];
  const pillTone = {
    amber: "bg-warn/20 text-warn",
    emerald: "bg-success/20 text-success",
    violet: "bg-content/20 text-content",
  }[plan.badgeTone];

  return (
    <div className={cn("rounded-xl border p-5", tone)}>
      <div className="mb-2 inline-flex items-center gap-2">
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            pillTone,
          )}
        >
          {plan.badge}
        </span>
      </div>
      <div className="text-[15px] font-semibold tracking-tight text-foreground">
        {plan.title}
      </div>
      <div className="mt-1 text-[13px] leading-snug text-muted-foreground">
        {plan.sub}
      </div>
    </div>
  );
}

function PlanPreview({
  name,
  price,
  features,
  highlight,
}: {
  name: string;
  price: string;
  features: string[];
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition",
        highlight
          ? "border-primary/40 bg-primary/[0.05]"
          : "border-border bg-card/40",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-[14px] font-semibold tracking-tight">
          {name}
        </div>
        {highlight && (
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary">
            Популярный
          </span>
        )}
      </div>
      <div className="mt-1 text-[20px] font-semibold tracking-tight text-foreground">
        {price}
        <span className="ml-1 text-[12px] font-normal text-muted-foreground">
          /мес
        </span>
      </div>
      <ul className="mt-3 space-y-1 text-[12px] text-muted-foreground">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-1.5">
            <span className="text-primary/70">·</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled
        className="mt-4 w-full cursor-not-allowed rounded-md border border-border bg-background/40 px-3 py-1.5 text-[12px] font-medium text-muted-foreground opacity-70"
        title="Появится в ближайшем апдейте"
      >
        Скоро через Т-Банк
      </button>
    </div>
  );
}

function ShortcutsSection() {
  return (
    <div className="co-settings-block">
      <div
        className="rounded-xl border border-[color:var(--border-subtle)] bg-background/40 p-4"
        style={{ marginBottom: 24 }}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-foreground/5 text-muted-foreground">
            <Chrome size={16} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="text-[14px] font-medium">{t.extension.title}</div>
              <span className="rounded-full bg-warn/15 px-2 py-0.5 text-[10px] font-semibold text-warn">
                {t.extension.soon}
              </span>
            </div>
            <div className="mt-0.5 text-[12.5px] text-[color:var(--text-muted)]">
              {t.extension.desc}
            </div>
          </div>
        </div>
      </div>
      <div className="co-settings-h">{t.settings.sections.shortcuts}</div>
      <div className="co-settings-sub">{t.settings.shortcuts.sub}</div>
      {t.settings.shortcuts.groups.map((g) => (
        <div key={g.title} style={{ marginBottom: 22 }}>
          <div className="co-voice-section-h">{g.title}</div>
          <div
            style={{
              border: "1px solid var(--border-subtle)",
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            {g.rows.map(([k, v], i) => (
              <div
                key={k}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "9px 14px",
                  fontSize: 12.5,
                  borderBottom:
                    i < g.rows.length - 1
                      ? "1px solid var(--border-subtle)"
                      : "none",
                }}
              >
                <span style={{ color: "var(--text-secondary)" }}>{k}</span>
                <span
                  style={{
                    color: "var(--text-tertiary)",
                    fontFamily: "ui-monospace, Menlo, monospace",
                    fontSize: 11.5,
                  }}
                >
                  {v}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// =========================================================================
// Brand context form (existing wiring, just restyled with prototype tokens)
// =========================================================================
function BrandContextForm({ context }: { context: BrandContextOut }) {
  const qc = useQueryClient();
  const data = context.data ?? {};
  const initialKeywords = (data.cta_keywords ?? []).join(", ");

  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty, errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      author_name: data.author_name ?? "",
      author_handle: data.author_handle ?? "",
      manifesto: data.manifesto ?? "",
      voice_rules: data.voice_rules ?? "",
      taboo_list: data.taboo_list ?? "",
      cta_keywords: initialKeywords,
    },
  });

  React.useEffect(() => {
    reset({
      author_name: data.author_name ?? "",
      author_handle: data.author_handle ?? "",
      manifesto: data.manifesto ?? "",
      voice_rules: data.voice_rules ?? "",
      taboo_list: data.taboo_list ?? "",
      cta_keywords: initialKeywords,
    });
  }, [
    data.author_name,
    data.author_handle,
    data.manifesto,
    data.voice_rules,
    data.taboo_list,
    initialKeywords,
    reset,
  ]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      updateBrandContext({
        ...data,
        author_name: values.author_name?.trim() || undefined,
        author_handle: values.author_handle?.trim() || undefined,
        manifesto: values.manifesto?.trim() || undefined,
        voice_rules: values.voice_rules?.trim() || undefined,
        taboo_list: values.taboo_list?.trim() || undefined,
        cta_keywords: values.cta_keywords
          ? values.cta_keywords
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
      }),
    onSuccess: (next) => {
      qc.setQueryData(["brand-context"], next);
      toast.success("Сохранено");
      reset({
        author_name: next.data.author_name ?? "",
        author_handle: next.data.author_handle ?? "",
        manifesto: next.data.manifesto ?? "",
        voice_rules: next.data.voice_rules ?? "",
        taboo_list: next.data.taboo_list ?? "",
        cta_keywords: (next.data.cta_keywords ?? []).join(", "),
      });
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.detail : "Не удалось сохранить"),
  });

  return (
    <form
      className="co-settings-fieldset"
      onSubmit={handleSubmit((v) => mutation.mutate(v))}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="co-settings-field">
          <label htmlFor="author_name">{t.settings.profile.fields.name}</label>
          <input
            className="co-field-input"
            id="author_name"
            {...register("author_name")}
          />
        </div>
        <div className="co-settings-field">
          <label htmlFor="author_handle">
            {t.settings.profile.fields.handle}
          </label>
          <input
            className="co-field-input"
            id="author_handle"
            placeholder="@kochnefff"
            {...register("author_handle")}
          />
        </div>
      </div>
      <div className="co-settings-field">
        <label htmlFor="manifesto">Манифест</label>
        <textarea
          className="co-field-input"
          id="manifesto"
          rows={4}
          style={{ minHeight: 80, resize: "vertical" }}
          {...register("manifesto")}
        />
      </div>
      <div className="co-settings-field">
        <label htmlFor="voice_rules">Правила голоса</label>
        <textarea
          className="co-field-input"
          id="voice_rules"
          rows={3}
          style={{ minHeight: 70, resize: "vertical" }}
          {...register("voice_rules")}
        />
      </div>
      <div className="co-settings-field">
        <label htmlFor="taboo_list">Табу</label>
        <textarea
          className="co-field-input"
          id="taboo_list"
          rows={3}
          style={{ minHeight: 70, resize: "vertical" }}
          {...register("taboo_list")}
        />
      </div>
      <div className="co-settings-field">
        <label htmlFor="cta_keywords">CTA-слова (через запятую)</label>
        <input
          className="co-field-input"
          id="cta_keywords"
          {...register("cta_keywords")}
        />
        {errors.cta_keywords && (
          <div style={{ fontSize: 11, color: "var(--status-error)" }}>
            {errors.cta_keywords.message}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="co-btn co-btn-primary"
          disabled={!isDirty || mutation.isPending}
        >
          {mutation.isPending ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Save size={13} />
          )}
          {t.common.save}
        </button>
      </div>
    </form>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-20 w-full" />
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
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
      <div style={{ fontSize: 13, color: "var(--text-primary)" }}>{detail}</div>
      <Button onClick={onRetry} variant="outline" size="sm" className="mt-3">
        <RefreshCw className="h-4 w-4" /> {t.dash.retry}
      </Button>
    </div>
  );
}
