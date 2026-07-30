"use client";

/**
 * Monthly calendar — 5–6-row grid (Mon-Sun) of the current month.
 * Each cell shows up to 5 platform dots + "+N" overflow chip. Clicking a
 * day filters the drawer post list to that day (we just open the first
 * post; bulk-day popover is V2).
 */

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  formatDateISO,
  listPosts,
  parseISODate,
} from "@/lib/content-plan";
import type { PlannedPostOut, PostPlatform } from "@/lib/types";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface MonthlyCalendarProps {
  /** YYYY-MM, drives the grid. */
  month: string;
  setMonth: (next: string) => void;
  onDayClick: (date: string, posts: PlannedPostOut[]) => void;
}

const RU_WEEKDAYS_SHORT = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"];

const MONTH_NAMES_RU = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

/** "telegram" → small TG dot color (mirrors planUtils palette). */
const PLATFORM_DOT_COLOR: Record<PostPlatform, string> = {
  telegram: "#3b82f6",
  linkedin: "#0ea5e9",
  instagram: "#ec4899",
  twitter: "#9ca3af",
  article: "#a78bfa",
  carousel: "#f59e0b",
  reels: "#10b981",
  hooks: "#f43f5e",
};

function parseMonth(month: string): { year: number; monthIdx: number } {
  const parts = month.split("-");
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  if (
    !Number.isFinite(y) ||
    !Number.isFinite(m) ||
    m < 1 ||
    m > 12
  ) {
    const now = new Date();
    return { year: now.getFullYear(), monthIdx: now.getMonth() };
  }
  return { year: y, monthIdx: m - 1 };
}

function formatMonth(year: number, monthIdx: number): string {
  const m = String(monthIdx + 1).padStart(2, "0");
  return `${year}-${m}`;
}

export function MonthlyCalendar({
  month,
  setMonth,
  onDayClick,
}: MonthlyCalendarProps) {
  const { year, monthIdx } = parseMonth(month);

  const firstOfMonth = React.useMemo(
    () => new Date(year, monthIdx, 1),
    [year, monthIdx],
  );
  const lastOfMonth = React.useMemo(
    () => new Date(year, monthIdx + 1, 0),
    [year, monthIdx],
  );

  // Build a 6-row grid, Monday-anchored.
  const cells = React.useMemo(() => {
    // JS getDay(): 0=Sun..6=Sat. We want Mon=0..Sun=6.
    const dowMon = (firstOfMonth.getDay() + 6) % 7;
    const startDate = new Date(year, monthIdx, 1 - dowMon);
    const out: { date: Date; iso: string; inMonth: boolean }[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate() + i,
      );
      out.push({
        date: d,
        iso: formatDateISO(d),
        inMonth: d.getMonth() === monthIdx,
      });
    }
    // If last week is fully outside the month, drop it (5-row layout).
    const lastWeek = out.slice(35, 42);
    if (lastWeek.every((c) => !c.inMonth)) return out.slice(0, 35);
    return out;
  }, [firstOfMonth, year, monthIdx]);

  const dateFrom = formatDateISO(firstOfMonth);
  const dateTo = formatDateISO(lastOfMonth);

  const postsQuery = useQuery({
    queryKey: ["plan-month", dateFrom, dateTo],
    queryFn: () => listPosts({ date_from: dateFrom, date_to: dateTo }),
  });

  const postsByDate = React.useMemo(() => {
    const map = new Map<string, PlannedPostOut[]>();
    for (const p of postsQuery.data ?? []) {
      if (!p.scheduled_date) continue;
      const arr = map.get(p.scheduled_date) ?? [];
      arr.push(p);
      map.set(p.scheduled_date, arr);
    }
    return map;
  }, [postsQuery.data]);

  const todayIso = formatDateISO(new Date());

  const goPrev = () => {
    let m = monthIdx - 1;
    let y = year;
    if (m < 0) {
      m = 11;
      y -= 1;
    }
    setMonth(formatMonth(y, m));
  };
  const goNext = () => {
    let m = monthIdx + 1;
    let y = year;
    if (m > 11) {
      m = 0;
      y += 1;
    }
    setMonth(formatMonth(y, m));
  };
  const goToday = () => {
    const now = new Date();
    setMonth(formatMonth(now.getFullYear(), now.getMonth()));
  };

  return (
    <section className="co-plan-cal">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="co-iconbtn"
            onClick={goPrev}
            aria-label="Previous month"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="text-[14px] font-semibold">
            {MONTH_NAMES_RU[monthIdx]} {year}
          </div>
          <button
            type="button"
            className="co-iconbtn"
            onClick={goNext}
            aria-label="Next month"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <button
          type="button"
          className="co-btn co-btn-ghost"
          onClick={goToday}
        >
          {t.monthly.today}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--border-subtle)]">
        {RU_WEEKDAYS_SHORT.map((w) => (
          <div
            key={w}
            className="bg-background/60 px-2 py-1 text-center text-[10px] font-semibold uppercase tracking-wider text-[color:var(--text-muted)]"
          >
            {w}
          </div>
        ))}
        {cells.map((c) => {
          const posts = postsByDate.get(c.iso) ?? [];
          const isToday = c.iso === todayIso;
          const dotPlatforms = posts
            .map((p) => p.platform)
            .slice(0, 5);
          const overflow = posts.length > 5 ? posts.length - 5 : 0;
          return (
            <button
              type="button"
              key={c.iso}
              onClick={() => onDayClick(c.iso, posts)}
              className={cn(
                "flex min-h-[80px] flex-col gap-1 px-2 py-1.5 text-left text-[11px] transition-colors hover:bg-foreground/[0.03]",
                c.inMonth ? "bg-background/60" : "bg-background/30",
                isToday && "ring-1 ring-primary",
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-between text-[11px]",
                  c.inMonth
                    ? "text-foreground"
                    : "text-[color:var(--text-muted)]",
                )}
              >
                <span>{c.date.getDate()}</span>
                {posts.length > 0 && (
                  <span className="text-[10px] tabular-nums text-[color:var(--text-muted)]">
                    {posts.length}
                  </span>
                )}
              </div>
              {posts.length > 0 && (
                <div className="mt-auto flex flex-wrap items-center gap-1">
                  {dotPlatforms.map((pl, i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: PLATFORM_DOT_COLOR[pl] }}
                      aria-hidden
                    />
                  ))}
                  {overflow > 0 && (
                    <span className="rounded-full bg-foreground/5 px-1 py-0.5 text-[9px] tabular-nums text-[color:var(--text-muted)]">
                      +{overflow}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
