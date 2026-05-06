"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Flame } from "lucide-react";
import {
  addDays,
  formatDateISO,
  formatDayShortRu,
  getStats,
  getWeek,
  parseISODate,
} from "@/lib/content-plan";
import type {
  ContentPillar,
  WeekResponse,
  StatsResponse,
} from "@/lib/types";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  ORDERED_PLATFORMS,
  PILLARS,
  PILLAR_TARGET,
  PLATFORM_LABEL,
  metricNumber,
} from "@/components/plan/planUtils";

const WEEK_TARGET = 5;
const NEXT_WEEK_THRESHOLD = 3;

interface InsightsPanelProps {
  weekData: WeekResponse | undefined;
  weekStart: string;
  onFillGap: (date: string) => void;
}

export function InsightsPanel({
  weekData,
  weekStart,
  onFillGap,
}: InsightsPanelProps) {
  const nextWeekStart = React.useMemo(() => {
    const next = addDays(parseISODate(weekStart), 7);
    return formatDateISO(next);
  }, [weekStart]);

  const nextWeekQuery = useQuery<WeekResponse>({
    queryKey: ["plan-week", nextWeekStart],
    queryFn: () => getWeek(nextWeekStart),
  });

  const statsQuery = useQuery<StatsResponse>({
    queryKey: ["plan-stats"],
    queryFn: getStats,
  });

  const stats = statsQuery.data;

  const scheduledThisWeek = weekData?.stats.total_scheduled ?? 0;
  const platformsThisWeek = Object.keys(
    weekData?.stats.platforms ?? {},
  ).length;
  const fillPct = Math.min(100, (scheduledThisWeek / WEEK_TARGET) * 100);

  const nextWeekScheduled = nextWeekQuery.data?.stats.total_scheduled ?? 0;
  const showNextWeekWarning = nextWeekScheduled < NEXT_WEEK_THRESHOLD;

  // Detect 2+ consecutive empty days in current week.
  const gap = React.useMemo(() => {
    if (!weekData) return null;
    let runStart: string | null = null;
    let runLen = 0;
    let bestStart: string | null = null;
    let bestLen = 0;
    let bestEnd: string | null = null;
    for (const day of weekData.days) {
      if (day.is_empty) {
        if (runLen === 0) runStart = day.date;
        runLen += 1;
        if (runLen > bestLen && runStart) {
          bestLen = runLen;
          bestStart = runStart;
          bestEnd = day.date;
        }
      } else {
        runStart = null;
        runLen = 0;
      }
    }
    if (bestLen >= 2 && bestStart && bestEnd) {
      return { start: bestStart, end: bestEnd };
    }
    return null;
  }, [weekData]);

  const contentMix = stats?.content_mix ?? {};
  const platformMix = stats?.platform_mix ?? {};

  // Flag pillars more than 10pp under target.
  const lowPillar = React.useMemo<ContentPillar | null>(() => {
    let worst: { p: ContentPillar; diff: number } | null = null;
    for (const p of PILLARS) {
      const actual = contentMix[p] ?? 0;
      const target = PILLAR_TARGET[p];
      const diff = target - actual;
      if (diff > 10 && (!worst || diff > worst.diff)) {
        worst = { p, diff };
      }
    }
    return worst?.p ?? null;
  }, [contentMix]);

  const topPosts = (stats?.top_posts ?? []).slice(0, 3);

  return (
    <aside className="co-plan-insights">
      {/* This week */}
      <section className="co-plan-card">
        <div className="co-plan-h">{t.plan.insights.thisWeek}</div>
        <div className="text-[20px] font-semibold leading-tight">
          {t.plan.insights.postsCount(scheduledThisWeek)}
        </div>
        <div className="mb-2 text-[12px] text-[color:var(--text-muted)]">
          {t.plan.insights.platformsCount(platformsThisWeek)}
        </div>
        <div className="co-plan-bar">
          <div
            className="co-plan-bar-fill"
            style={{ width: `${fillPct}%` }}
          />
        </div>
      </section>

      {/* Next week */}
      <section className="co-plan-card">
        <div className="co-plan-h">{t.plan.insights.nextWeek}</div>
        {showNextWeekWarning ? (
          <div className="co-plan-warning">
            {t.plan.insights.nextWeekWarning(nextWeekScheduled)}
          </div>
        ) : (
          <div className="text-[14px] text-[color:var(--text-tertiary)]">
            {t.plan.insights.postsCount(nextWeekScheduled)}
          </div>
        )}
      </section>

      {/* Gap alert */}
      {gap && (
        <section className="co-plan-card">
          <div className="co-plan-warning mb-2">
            ⚠ {capitalize(formatDayShortRu(parseISODate(gap.start)))}
            {" – "}
            {capitalize(formatDayShortRu(parseISODate(gap.end)))} ·{" "}
            {t.plan.insights.gapEmpty}
          </div>
          <button
            type="button"
            className="co-btn co-btn-ghost w-full"
            onClick={() => onFillGap(gap.start)}
          >
            {t.plan.insights.gapAlert}
          </button>
        </section>
      )}

      {/* Content mix */}
      <section className="co-plan-card">
        <div className="co-plan-h">
          {t.plan.insights.mix}
          <span className="ml-1 text-[10px] font-normal normal-case tracking-normal text-[color:var(--text-muted)]">
            {t.plan.insights.mix30days}
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          {PILLARS.map((p) => {
            const pct = Math.round(contentMix[p] ?? 0);
            return (
              <div key={p} className="co-plan-mix-row">
                <span className="co-plan-mix-pillar">{p}</span>
                <span className="co-plan-mix-bar">
                  <span
                    className={cn("co-plan-mix-bar-fill", p)}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </span>
                <span className="co-plan-mix-pct">{pct}%</span>
              </div>
            );
          })}
        </div>
        {lowPillar && (
          <div className="mt-2 text-[11px] text-[color:#fde68a]">
            {t.plan.insights.mixHint(lowPillar)}
          </div>
        )}
      </section>

      {/* Platforms */}
      <section className="co-plan-card">
        <div className="co-plan-h">{t.plan.insights.platforms}</div>
        <div className="flex flex-col gap-1.5">
          {ORDERED_PLATFORMS.filter(
            (p) => (platformMix[p] ?? 0) > 0,
          ).map((p) => {
            const pct = Math.round(platformMix[p] ?? 0);
            return (
              <div key={p} className="co-plan-mix-row">
                <span className="co-plan-mix-pillar">
                  {PLATFORM_LABEL[p].slice(0, 3).toUpperCase()}
                </span>
                <span className="co-plan-mix-bar">
                  <span
                    className="co-plan-mix-bar-fill platform"
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </span>
                <span className="co-plan-mix-pct">{pct}%</span>
              </div>
            );
          })}
          {Object.keys(platformMix).length === 0 && (
            <div className="text-[12px] text-[color:var(--text-muted)]">
              —
            </div>
          )}
        </div>
      </section>

      {/* Streak */}
      <section className="co-plan-card">
        <div className="co-plan-h">{t.plan.insights.streak}</div>
        <div className="co-plan-streak">
          <Flame size={18} className="text-[color:#fbbf24]" />
          {t.plan.insights.streakDays(stats?.publishing_streak ?? 0)}
        </div>
        <div className="mt-1 text-[11px] text-[color:var(--text-muted)]">
          {t.plan.insights.streakRecord}: {t.plan.insights.noStreak}
        </div>
      </section>

      {/* Top posts */}
      <section className="co-plan-card">
        <div className="co-plan-h">
          {t.plan.insights.topPosts}
          <span className="ml-1 text-[10px] font-normal normal-case tracking-normal text-[color:var(--text-muted)]">
            {t.plan.insights.topPostsSub}
          </span>
        </div>
        {topPosts.length === 0 ? (
          <div className="text-[12px] text-[color:var(--text-muted)]">
            {t.plan.insights.noTopPosts}
          </div>
        ) : (
          <ol className="flex flex-col gap-2">
            {topPosts.map((post) => {
              const views = metricNumber(post.metrics, "views");
              const saves = metricNumber(post.metrics, "saves");
              const metricLabel =
                views > 0
                  ? t.plan.insights.views(views)
                  : saves > 0
                    ? t.plan.insights.saves(saves)
                    : null;
              return (
                <li key={post.id} className="text-[12px] leading-snug">
                  <div className="flex items-center gap-1.5">
                    {post.pillar && (
                      <span
                        className={cn("co-plan-pillar", post.pillar)}
                      >
                        {post.pillar}
                      </span>
                    )}
                    <span className="line-clamp-1 text-[color:var(--text-tertiary)]">
                      «{post.hook || post.full_text.slice(0, 60)}»
                    </span>
                  </div>
                  {metricLabel && (
                    <div className="mt-0.5 text-[11px] text-[color:#86efac]">
                      {metricLabel}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </aside>
  );
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
