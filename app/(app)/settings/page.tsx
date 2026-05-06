"use client";

/**
 * Settings — port of `THE CONTENT-2/phase3-screens.jsx#SettingsScreen`.
 * Left sidebar with 6 sections, right content panel. Existing functional
 * forms (BrandContext, VoiceTraining, TelegramTargets) live inside the
 * appropriate sections.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
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
import { TelegramTargetsSection } from "@/components/TelegramTargetsSection";
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
  | "voice"
  | "ai"
  | "billing"
  | "appearance"
  | "shortcuts";

const SECTIONS: { id: Section; label: string; Icon: LucideIcon }[] = [
  { id: "profile", label: t.settings.sections.profile, Icon: User },
  { id: "voice", label: t.settings.sections.voice, Icon: Mic },
  { id: "ai", label: t.settings.sections.ai, Icon: Sparkles },
  { id: "billing", label: t.settings.sections.billing, Icon: CreditCard },
  { id: "appearance", label: t.settings.sections.appearance, Icon: Palette },
  {
    id: "shortcuts",
    label: t.settings.sections.shortcuts,
    Icon: Keyboard,
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const [tab, setTab] = React.useState<Section>("profile");

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
              onClick={() => setTab(s.id)}
            >
              <s.Icon size={15} />
              {s.label}
            </button>
          ))}
        </aside>
        <main className="co-settings-content">
          {tab === "profile" && <ProfileSection />}
          {tab === "voice" && <VoiceSection />}
          {tab === "ai" && <AISection />}
          {tab === "billing" && <BillingSection />}
          {tab === "appearance" && <AppearanceSection />}
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

function AISection() {
  const [selected, setSelected] = React.useState("claude");
  return (
    <div className="co-settings-block">
      <div className="co-settings-h">{t.settings.sections.ai}</div>
      <div className="co-settings-sub">{t.settings.ai.sub}</div>
      <div className="co-ai-providers">
        {t.settings.ai.providers.map((p) => (
          <button
            key={p.id}
            type="button"
            className={cn("co-ai-card", selected === p.id && "selected")}
            onClick={() => setSelected(p.id)}
          >
            <div
              className={cn("co-radio-circle", selected === p.id && "checked")}
            >
              {selected === p.id ? <span style={{ fontSize: 9 }}>✓</span> : null}
            </div>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div className="flex items-center gap-2">
                <div style={{ fontSize: 13.5, fontWeight: 500 }}>{p.name}</div>
                {p.badge && <span className="co-badge-pill">{p.badge}</span>}
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  color: "var(--text-tertiary)",
                  marginTop: 3,
                }}
              >
                {p.sub}
              </div>
            </div>
          </button>
        ))}
      </div>
      <div style={{ marginTop: 28 }}>
        <div className="co-voice-section-h">{t.settings.ai.apiKeyHeader}</div>
        <div className="co-settings-field">
          <input
            className="co-field-input"
            type="password"
            placeholder="sk-ant-..."
          />
          <div
            style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}
          >
            {t.settings.ai.apiKeyHint}
          </div>
        </div>
      </div>
    </div>
  );
}

function BillingSection() {
  return (
    <div className="co-settings-block">
      <div className="co-settings-h">{t.settings.sections.billing}</div>
      <div className="co-settings-sub">{t.settings.billing.sub}</div>
      <div className="co-billing-card">
        <div className="co-plan-pill">{t.settings.billing.pro}</div>
        <div className="co-plan-price">
          <span className="co-plan-price-num">$24</span>
          <span className="co-plan-price-per">{t.settings.billing.perMonth}</span>
        </div>
        <div className="co-plan-charge">Следующее списание · 28 ноября 2025</div>
      </div>
      <div style={{ marginTop: 28 }}>
        <TelegramTargetsSection />
      </div>
    </div>
  );
}

function AppearanceSection() {
  return (
    <div className="co-settings-block">
      <div className="co-settings-h">{t.settings.sections.appearance}</div>
      <div className="co-settings-sub">{t.settings.appearance.sub}</div>
      <div
        style={{
          fontSize: 12.5,
          color: "var(--text-tertiary)",
          padding: 14,
          background: "rgba(255,255,255,0.025)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 12,
        }}
      >
        {t.settings.appearance.stub}
      </div>
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
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/5 text-muted-foreground">
            <Chrome size={16} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="text-[14px] font-medium">{t.extension.title}</div>
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
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
