"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { ApiError } from "@/lib/api";
import {
  addDays,
  formatDateISO,
  getMondayOfWeek,
  getWeek,
  parseISODate,
  updatePost,
} from "@/lib/content-plan";
import type {
  PlannedPostOut,
  PostPlatform,
  WeekResponse,
} from "@/lib/types";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { PostCard } from "@/components/plan/PostCard";
import {
  ORDERED_PLATFORMS,
  PLATFORM_LABEL,
} from "@/components/plan/planUtils";

interface WeeklyCalendarProps {
  weekStart: string;
  setWeekStart: (iso: string) => void;
  handle?: string | null;
  onPostClick: (post: PlannedPostOut) => void;
  onEmptyCellClick: (date: string, platform: PostPlatform) => void;
}

const RU_WEEKDAY_SHORT = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"];

export function WeeklyCalendar({
  weekStart,
  setWeekStart,
  handle,
  onPostClick,
  onEmptyCellClick,
}: WeeklyCalendarProps) {
  const qc = useQueryClient();
  const [showAll, setShowAll] = React.useState(false);
  const [dragOverKey, setDragOverKey] = React.useState<string | null>(null);

  const weekQuery = useQuery<WeekResponse>({
    queryKey: ["plan-week", weekStart],
    queryFn: () => getWeek(weekStart),
  });

  const week = weekQuery.data;

  const moveMutation = useMutation({
    mutationFn: ({ id, date }: { id: string; date: string }) =>
      updatePost(id, { scheduled_date: date }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plan-week"] });
      qc.invalidateQueries({ queryKey: ["plan-queue"] });
      qc.invalidateQueries({ queryKey: ["plan-stats"] });
      toast.success(t.plan.toasts.scheduled);
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : t.plan.toasts.scheduleFailed,
      ),
  });

  const today = formatDateISO(new Date());

  // Days array (always 7).
  const days = React.useMemo(() => {
    const monday = parseISODate(weekStart);
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(monday, i);
      const iso = formatDateISO(d);
      const fromBackend = week?.days.find((wd) => wd.date === iso);
      return {
        date: iso,
        dayOfMonth: d.getDate(),
        weekday: RU_WEEKDAY_SHORT[i],
        posts: fromBackend?.posts ?? [],
      };
    });
  }, [week, weekStart]);

  // Index posts by `${date}|${platform}` for fast lookup; cells stack
  // multiple posts vertically.
  const postsByCell = React.useMemo(() => {
    const map = new Map<string, PlannedPostOut[]>();
    for (const day of days) {
      for (const post of day.posts) {
        const key = `${day.date}|${post.platform}`;
        const arr = map.get(key) ?? [];
        arr.push(post);
        map.set(key, arr);
      }
    }
    return map;
  }, [days]);

  // Which platform rows to show.
  const visiblePlatforms = React.useMemo(() => {
    if (showAll) return ORDERED_PLATFORMS;
    const used = new Set<PostPlatform>();
    for (const d of days) {
      for (const p of d.posts) used.add(p.platform);
    }
    const filtered = ORDERED_PLATFORMS.filter((p) => used.has(p));
    // Keep at least one row visible so the grid isn't empty.
    return filtered.length > 0 ? filtered : ["telegram" as PostPlatform];
  }, [days, showAll]);

  const goPrev = () => {
    const prev = addDays(parseISODate(weekStart), -7);
    setWeekStart(formatDateISO(prev));
  };
  const goNext = () => {
    const next = addDays(parseISODate(weekStart), 7);
    setWeekStart(formatDateISO(next));
  };
  const goToday = () => {
    setWeekStart(formatDateISO(getMondayOfWeek(new Date())));
  };

  const isCurrentWeek =
    weekStart === formatDateISO(getMondayOfWeek(new Date()));

  return (
    <section className="co-plan-cal">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="co-iconbtn"
            onClick={goPrev}
            aria-label="Previous week"
          >
            <ChevronLeft size={16} />
          </button>
          {!isCurrentWeek && (
            <button
              type="button"
              className="co-btn co-btn-ghost"
              onClick={goToday}
            >
              {t.plan.today}
            </button>
          )}
          <button
            type="button"
            className="co-iconbtn"
            onClick={goNext}
            aria-label="Next week"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <button
          type="button"
          className="co-btn co-btn-ghost"
          onClick={() => setShowAll((v) => !v)}
        >
          {showAll ? t.plan.showOnlyUsed : t.plan.showAll}
        </button>
      </div>

      <div className="co-plan-cal-head">
        <div />
        {days.map((d) => (
          <div
            key={d.date}
            className={cn(
              "co-plan-cal-head-cell",
              d.date === today && "today",
            )}
          >
            {d.weekday} {d.dayOfMonth}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {visiblePlatforms.map((platform) => (
          <div key={platform} className="co-plan-cal-row">
            <div className="co-plan-cal-row-label">
              {PLATFORM_LABEL[platform]}
            </div>
            {days.map((d) => {
              const key = `${d.date}|${platform}`;
              const posts = postsByCell.get(key) ?? [];
              const isEmpty = posts.length === 0;
              const isToday = d.date === today;
              const dragOver = dragOverKey === key;
              return (
                <div
                  key={key}
                  className={cn(
                    "co-plan-cal-cell",
                    isToday && "today",
                    isEmpty && "empty",
                    dragOver && "drag-over",
                  )}
                  onClick={() => {
                    if (isEmpty) onEmptyCellClick(d.date, platform);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setDragOverKey(key);
                  }}
                  onDragLeave={() => setDragOverKey(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverKey(null);
                    const id = e.dataTransfer.getData("text/plain");
                    if (id) {
                      moveMutation.mutate({ id, date: d.date });
                    }
                  }}
                >
                  {isEmpty ? (
                    <div className="co-plan-cal-cell-empty-cta">
                      <Plus size={12} />{" "}
                      <span className="ml-1">+ добавить</span>
                    </div>
                  ) : (
                    posts.map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        handle={handle ?? null}
                        onClick={() => onPostClick(post)}
                      />
                    ))
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
