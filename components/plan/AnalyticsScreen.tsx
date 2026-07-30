"use client";

/**
 * AnalyticsScreen — V1 of the analytics view.
 * Renders four cards (frequency / mix / platforms / top posts) plus a
 * 14-day publishing-streak strip. Pulls all numbers from a single
 * `getStats()` call. The streak strip needs daily granularity, so it
 * additionally fetches posts in [today-14d, today] and buckets by
 * `published_at` date.
 */

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import {
  formatDateISO,
  getStats,
  listPosts,
} from "@/lib/content-plan";
import type {
  ContentPillar,
  PlannedPostOut,
  PostPlatform,
} from "@/lib/types";
import { t, formatThousands } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  PILLAR_TARGET,
  PILLARS,
  PLATFORM_LABEL,
  metricNumber,
} from "@/components/plan/planUtils";

export function AnalyticsScreen() {
  const statsQuery = useQuery({
    queryKey: ["plan-stats"],
    queryFn: getStats,
  });

  const today = React.useMemo(() => new Date(), []);
  const dateFrom = React.useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 13);
    return formatDateISO(d);
  }, [today]);
  const dateTo = formatDateISO(today);

  const recentPostsQuery = useQuery({
    queryKey: ["plan-streak-window", dateFrom, dateTo],
    queryFn: () =>
      listPosts({ date_from: dateFrom, date_to: dateTo, status: "published" }),
  });

  if (statsQuery.isPending) {
    return (
      <div className="co-plan-card flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-[color:var(--text-muted)]" />
      </div>
    );
  }

  if (statsQuery.isError || !statsQuery.data) {
    return (
      <div className="co-plan-card text-[12px] text-[color:var(--text-muted)]">
        {t.knowledge.couldNotLoadDetail}
      </div>
    );
  }

  const stats = statsQuery.data;

  // Highlight any pillar that's >10pp below target.
  const underrepresented: ContentPillar[] = PILLARS.filter((p) => {
    const actual = stats.content_mix[p] ?? 0;
    return actual < PILLAR_TARGET[p] - 10;
  });

  return (
    <section className="co-plan-cal flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card title={t.analytics.cards.frequency}>
          <div className="flex flex-col gap-1.5">
            <Stat
              label={t.analytics.totalPublished}
              value={String(stats.total_published)}
            />
            <Stat
              label={t.analytics.thisMonth}
              value={String(stats.this_month_published)}
            />
          </div>
        </Card>

        <Card
          title={t.analytics.cards.mix}
          hint={
            underrepresented.length > 0
              ? t.analytics.underrepresented(underrepresented[0])
              : null
          }
        >
          <div className="flex flex-col gap-1.5">
            {PILLARS.map((p) => (
              <Bar
                key={p}
                label={p}
                actual={stats.content_mix[p] ?? 0}
                target={PILLAR_TARGET[p]}
                pillar={p}
              />
            ))}
          </div>
        </Card>

        <Card title={t.analytics.cards.platforms}>
          <div className="flex flex-col gap-1.5">
            {Object.entries(stats.platform_mix)
              .filter(([, v]) => v > 0)
              .sort((a, b) => b[1] - a[1])
              .map(([platform, pct]) => (
                <Bar
                  key={platform}
                  label={
                    PLATFORM_LABEL[platform as PostPlatform] ?? platform
                  }
                  actual={pct}
                />
              ))}
            {Object.values(stats.platform_mix).filter((v) => v > 0).length ===
              0 && (
              <div className="text-[11px] text-[color:var(--text-muted)]">
                —
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card title={t.analytics.cards.streak}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-[13px]">
            <span className="font-semibold">
              {t.analytics.streakCurrent(stats.publishing_streak)}
            </span>
          </div>
          <div className="text-[12px] text-[color:var(--text-muted)]">
            {t.analytics.streakRecord(stats.publishing_streak_record ?? 0)}
          </div>
        </div>
        <StreakStrip
          posts={recentPostsQuery.data ?? []}
          today={today}
          loading={recentPostsQuery.isPending}
        />
      </Card>

      <Card title={t.analytics.cards.topPosts}>
        {stats.top_posts.length === 0 ? (
          <div className="text-[11px] text-[color:var(--text-muted)]">
            {t.plan.insights.noTopPosts}
          </div>
        ) : (
          <ol className="flex flex-col gap-2">
            {stats.top_posts.slice(0, 3).map((p, i) => (
              <li
                key={p.id}
                className="rounded-md border border-border/60 bg-muted p-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] tabular-nums text-[color:var(--text-muted)]">
                    #{i + 1}
                  </span>
                  <span className="text-[10px] uppercase tracking-wide text-[color:var(--text-muted)]">
                    {PLATFORM_LABEL[p.platform]}
                  </span>
                  {p.pillar && (
                    <span className={cn("co-plan-pillar", p.pillar)}>
                      {p.pillar}
                    </span>
                  )}
                </div>
                <div className="mt-1 line-clamp-2 text-[12px]">{p.hook}</div>
                <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-[color:var(--text-muted)]">
                  <span>
                    ↗ {formatThousands(metricNumber(p.metrics, "views"))} просм.
                  </span>
                  <span>
                    ↗ {formatThousands(metricNumber(p.metrics, "saves"))} сохр.
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </section>
  );
}

function Card({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[color:var(--border-subtle)] bg-background/40 p-3">
      <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--text-muted)]">
        <span>{title}</span>
        {hint && (
          <span className="text-warn/80 normal-case tracking-normal">
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[11px] text-[color:var(--text-muted)]">{label}</span>
      <span className="text-[16px] font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function Bar({
  label,
  actual,
  target,
  pillar,
}: {
  label: string;
  actual: number;
  target?: number;
  pillar?: ContentPillar;
}) {
  const pct = Math.max(0, Math.min(100, actual));
  return (
    <div>
      <div className="flex items-baseline justify-between text-[11px]">
        <span className="inline-flex items-center gap-1.5">
          {pillar ? (
            <span className={cn("co-plan-pillar", pillar)}>{label}</span>
          ) : (
            label
          )}
        </span>
        <span className="tabular-nums text-[color:var(--text-muted)]">
          {Math.round(pct)}%
          {target != null && (
            <span className="ml-1 opacity-60">/ {target}%</span>
          )}
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.05]">
        <div
          className="h-full bg-primary/70"
          style={{ width: `${pct}%` }}
          aria-hidden
        />
      </div>
    </div>
  );
}

function StreakStrip({
  posts,
  today,
  loading,
}: {
  posts: PlannedPostOut[];
  today: Date;
  loading: boolean;
}) {
  const days = React.useMemo(() => {
    const out: { iso: string; date: Date }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      out.push({ iso: formatDateISO(d), date: d });
    }
    return out;
  }, [today]);

  const publishedDates = React.useMemo(() => {
    const set = new Set<string>();
    for (const p of posts) {
      if (!p.published_at) continue;
      const iso = p.published_at.slice(0, 10);
      set.add(iso);
    }
    return set;
  }, [posts]);

  return (
    <div className="mt-2">
      <div className="text-[10px] uppercase tracking-wider text-[color:var(--text-muted)]">
        {t.analytics.last14days}
      </div>
      <div className="mt-1.5 flex items-center gap-1">
        {days.map((d) => {
          const filled = publishedDates.has(d.iso);
          return (
            <span
              key={d.iso}
              title={d.iso}
              className={cn(
                "h-3 w-3 rounded-full transition-colors",
                filled
                  ? "bg-primary"
                  : loading
                    ? "bg-foreground/[0.08]"
                    : "bg-foreground/[0.05]",
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
