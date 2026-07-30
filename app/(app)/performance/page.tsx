"use client";

/**
 * Performance dashboard — Sprint 3 Task C MVP.
 *
 * Reads the org's recent posting performance baseline (computed
 * server-side from Track-B metrics) and lists posts ranked by tier
 * (top → good → median → low). Each top-tier post has a one-click
 * "Добавить в Voice samples" button: it copies the post text into the
 * voice-samples table so the few-shot retrieval at format time starts
 * pulling from posts that actually performed.
 *
 * Not in scope for MVP:
 *   - Auto-bumping `KnowledgeItem.viral_score` based on linked post
 *     performance (needs a node → knowledge_item linkage we don't track)
 *   - Performance-weighted what-to-write ranking (depends on the above)
 *   - Per-pillar / per-platform breakdowns (single Telegram for now)
 */

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Check,
  Forward,
  Eye,
  Loader2,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { ApiError } from "@/lib/api";
import {
  getPerformanceOverview,
  promoteToVoiceSample,
  type PerformanceOverviewOut,
  type PerformanceTier,
  type PostPerformanceOut,
} from "@/lib/performance";
import { TrialRedirect } from "@/components/TrialRedirect";


const QUERY_KEY = ["performance", "overview"] as const;


// Tier styling — colour-coded chips. Top = amber (matches our brand
// accent), good = emerald, median = neutral, low = red, unknown = gray.
const TIER_STYLE: Record<PerformanceTier, { label: string; cls: string }> = {
  top: {
    label: "Топ",
    cls: "bg-warn/20 text-warn border-warn/40",
  },
  good: {
    label: "Хороший",
    cls: "bg-success/20 text-success border-success/40",
  },
  median: {
    label: "Медиана",
    cls: "bg-muted/20 text-foreground border-border/40",
  },
  low: {
    label: "Слабый",
    cls: "bg-destructive/15 text-destructive border-destructive/40",
  },
  unknown: {
    label: "Без метрик",
    cls: "bg-foreground/5 text-muted-foreground border-border",
  },
};


function formatN(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n < 1000) return String(n);
  if (n < 10_000) return (n / 1000).toFixed(1).replace(".0", "") + "K";
  if (n < 1_000_000) return Math.round(n / 1000) + "K";
  return (n / 1_000_000).toFixed(1).replace(".0", "") + "M";
}


export default function PerformancePage() {
  const qc = useQueryClient();
  // Track which logs the user has already promoted in THIS session, so
  // we can flip the button to "В банке голоса" without a refetch race.
  const [promoted, setPromoted] = React.useState<Set<string>>(new Set());

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: getPerformanceOverview,
  });

  const promoteMutation = useMutation({
    mutationFn: (publishLogId: string) => promoteToVoiceSample(publishLogId),
    onSuccess: (_data, publishLogId) => {
      setPromoted((prev) => {
        const next = new Set(prev);
        next.add(publishLogId);
        return next;
      });
      toast.success("Добавлено в Voice samples");
      void qc.invalidateQueries({ queryKey: ["voice-samples"] });
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : "Не удалось добавить",
      ),
  });

  if (query.isPending) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <TrialRedirect />
        <PageHeader />
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-card/40 px-4 py-10 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" />
          Считаю метрики…
        </div>
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <TrialRedirect />
        <PageHeader />
        <div className="flex items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/[0.06] px-4 py-3 text-sm text-destructive">
          <AlertCircle size={16} />
          {query.error instanceof ApiError
            ? query.error.detail
            : "Не удалось загрузить performance"}
        </div>
      </div>
    );
  }

  const data = query.data!;
  const noData = data.total_posts === 0;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <TrialRedirect />
      <PageHeader />

      {noData ? (
        <EmptyState />
      ) : (
        <>
          <StatsGrid data={data} />
          <PostsList
            posts={data.posts}
            promoted={promoted}
            isPromoting={promoteMutation.isPending}
            onPromote={(id) => promoteMutation.mutate(id)}
            hasBaseline={data.has_baseline}
          />
        </>
      )}
    </div>
  );
}


function PageHeader() {
  return (
    <div className="mb-6">
      <div className="mb-1 flex items-center gap-2">
        <TrendingUp size={18} className="text-warn" />
        <h1 className="text-2xl font-semibold tracking-tight">Performance</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Последние 60 дней публикаций в Telegram. Топовые посты можно
        добавить в Voice samples — тогда AI начнёт ориентироваться на
        реально залетевший текст при генерации новых.
      </p>
    </div>
  );
}


function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 px-6 py-12 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
        <TrendingUp size={18} />
      </div>
      <h3 className="text-sm font-medium">Пока нет данных</h3>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">
        Опубликуй посты через Telegram-таргеты и подожди cron-обновление
        метрик (раз в 6 часов). Тут появится статистика по каждому посту
        и кандидаты для Voice samples.
      </p>
    </div>
  );
}


function StatsGrid({ data }: { data: PerformanceOverviewOut }) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
      <StatTile
        label={data.has_baseline ? "Медиана views" : "Постов без метрик"}
        value={
          data.has_baseline
            ? formatN(data.median_views)
            : String(data.unknown_count)
        }
        hint={
          data.has_baseline
            ? "по постам с известными views"
            : data.unknown_count > 0
              ? "ждут cron обновления"
              : ""
        }
      />
      <StatTile
        label="Всего постов"
        value={String(data.total_posts)}
        hint="за 60 дней"
      />
      <StatTile
        label="Топ"
        value={String(data.top_count)}
        hint="≥ 1.5× медианы"
        tier="top"
      />
      <StatTile
        label="Хороших"
        value={String(data.good_count)}
        hint="1.0–1.5× медианы"
        tier="good"
      />
      <StatTile
        label="Слабых"
        value={String(data.low_count)}
        hint="< 0.5× медианы"
        tier="low"
      />
    </div>
  );
}


function StatTile({
  label,
  value,
  hint,
  tier,
}: {
  label: string;
  value: string;
  hint?: string;
  tier?: PerformanceTier;
}) {
  const accent = tier ? TIER_STYLE[tier].cls : "border-border bg-card/40";
  return (
    <div className={`rounded-xl border p-3 ${accent}`}>
      <div className="text-[10px] uppercase tracking-wider opacity-70">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
      {hint && (
        <div className="mt-0.5 text-[10px] opacity-60">{hint}</div>
      )}
    </div>
  );
}


function PostsList({
  posts,
  promoted,
  isPromoting,
  onPromote,
  hasBaseline,
}: {
  posts: PostPerformanceOut[];
  promoted: Set<string>;
  isPromoting: boolean;
  onPromote: (publishLogId: string) => void;
  hasBaseline: boolean;
}) {
  if (posts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/40 px-4 py-6 text-center text-sm text-muted-foreground">
        Среди недавних постов нечего показать.
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {!hasBaseline && (
        <div className="rounded-md border border-warn/30 bg-warn/[0.06] px-3 py-2 text-[12px] text-warn">
          Меньше 3 постов с метриками — порог классификации абсолютный
          (5K = топ, 2K = хороший, 800 = медиана). Когда наберётся
          больше — переключится на относительные пороги.
        </div>
      )}
      {posts.map((p) => {
        const tier = TIER_STYLE[p.tier];
        const isPromoted = promoted.has(p.publish_log_id);
        const canPromote = p.tier === "top" || p.tier === "good";
        return (
          <div
            key={p.publish_log_id}
            className="flex items-start gap-3 rounded-xl border border-border bg-card/40 p-3"
          >
            <span
              className={`mt-0.5 inline-flex shrink-0 items-center justify-center rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${tier.cls}`}
            >
              {tier.label}
            </span>
            <div className="min-w-0 flex-1">
              <div className="line-clamp-2 text-[13px] leading-snug text-foreground">
                {p.text_preview || "(без текста)"}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Eye size={11} /> {formatN(p.views)}
                </span>
                {p.forwards != null && p.forwards > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Forward size={11} /> {formatN(p.forwards)}
                  </span>
                )}
                {p.reactions_total > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Sparkles size={11} /> {formatN(p.reactions_total)}
                  </span>
                )}
                <span className="opacity-60">→ {p.target_title}</span>
              </div>
            </div>
            <div className="shrink-0">
              <button
                type="button"
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition ${
                  isPromoted
                    ? "cursor-default bg-success/20 text-success"
                    : canPromote
                      ? "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60"
                      : "cursor-not-allowed bg-foreground/5 text-muted-foreground"
                }`}
                onClick={() => canPromote && onPromote(p.publish_log_id)}
                disabled={isPromoted || !canPromote || isPromoting}
                title={
                  !canPromote
                    ? "Только топ/хорошие посты можно добавлять в Voice samples"
                    : isPromoted
                      ? "Уже добавлено"
                      : "Добавить текст в Voice samples"
                }
              >
                {isPromoted ? (
                  <>
                    <Check size={11} /> В банке голоса
                  </>
                ) : (
                  <>
                    <Sparkles size={11} /> В Voice
                  </>
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
