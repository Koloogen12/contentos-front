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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
  const [adaptDialog, setAdaptDialog] = React.useState<{
    post: PlannedPostOut;
    targetDate: string;
    targetPlatform: PostPlatform;
  } | null>(null);

  const weekQuery = useQuery<WeekResponse>({
    queryKey: ["plan-week", weekStart],
    queryFn: () => getWeek(weekStart),
  });

  const week = weekQuery.data;

  const moveMutation = useMutation({
    mutationFn: ({
      id,
      date,
      platform,
    }: {
      id: string;
      date: string;
      platform?: PostPlatform;
    }) =>
      updatePost(id, {
        scheduled_date: date,
        ...(platform ? { platform } : {}),
      }),
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

  // Flat lookup by id for drop handlers (we only get the id via DataTransfer).
  const postsById = React.useMemo(() => {
    const map = new Map<string, PlannedPostOut>();
    for (const d of days) for (const p of d.posts) map.set(p.id, p);
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

  /**
   * Handle a drop. Two flows:
   *  1. Same-platform drop → just PATCH date.
   *  2. Cross-platform drop → open the adapt-or-keep modal.
   */
  const handleDrop = React.useCallback(
    (id: string, targetDate: string, targetPlatform: PostPlatform) => {
      const post = postsById.get(id);
      if (!post) {
        // Source not in current week (e.g. dragged from queue) — just move the
        // date. Platform on the cell is informational; backend keeps the
        // post's existing platform.
        moveMutation.mutate({ id, date: targetDate });
        return;
      }
      if (post.platform === targetPlatform && post.scheduled_date === targetDate) {
        return; // no-op
      }
      if (post.platform !== targetPlatform) {
        setAdaptDialog({ post, targetDate, targetPlatform });
        return;
      }
      moveMutation.mutate({ id, date: targetDate });
    },
    [postsById, moveMutation],
  );

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

      <AdaptPlatformDialog
        state={adaptDialog}
        onClose={() => setAdaptDialog(null)}
        onAdapt={({ post, targetDate, targetPlatform }) => {
          moveMutation.mutate({
            id: post.id,
            date: targetDate,
            platform: targetPlatform,
          });
          setAdaptDialog(null);
        }}
        onKeep={({ post, targetDate }) => {
          moveMutation.mutate({ id: post.id, date: targetDate });
          // Make sure the source-platform row is visible after the move
          // (otherwise the post appears to vanish).
          setShowAll(true);
          setAdaptDialog(null);
        }}
      />

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
                    "co-plan-cal-cell relative",
                    isToday && "today",
                    isEmpty && "empty",
                    dragOver && "drag-over",
                  )}
                  style={
                    posts.length > 1
                      ? { display: "flex", flexDirection: "column", gap: 4 }
                      : undefined
                  }
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
                    if (id) handleDrop(id, d.date, platform);
                  }}
                >
                  {isEmpty ? (
                    <div className="co-plan-cal-cell-empty-cta">
                      <Plus size={12} />{" "}
                      <span className="ml-1">+ добавить</span>
                    </div>
                  ) : (
                    <>
                      {posts.length > 1 && (
                        <span
                          className="absolute right-1 top-1 z-10 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-amber-300"
                          title={`Конфликт дат · ${posts.length}`}
                        >
                          ·×{posts.length}
                        </span>
                      )}
                      {posts.map((post) => (
                        <PostCard
                          key={post.id}
                          post={post}
                          handle={handle ?? null}
                          onClick={() => onPostClick(post)}
                          draggable
                        />
                      ))}
                    </>
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

interface AdaptDialogState {
  post: PlannedPostOut;
  targetDate: string;
  targetPlatform: PostPlatform;
}

function AdaptPlatformDialog({
  state,
  onClose,
  onAdapt,
  onKeep,
}: {
  state: AdaptDialogState | null;
  onClose: () => void;
  onAdapt: (s: AdaptDialogState) => void;
  onKeep: (s: AdaptDialogState) => void;
}) {
  return (
    <Dialog
      open={!!state}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {state
              ? t.dragAdapt.title(
                  PLATFORM_LABEL[state.post.platform],
                  PLATFORM_LABEL[state.targetPlatform],
                )
              : ""}
          </DialogTitle>
          <DialogDescription>{t.dragAdapt.sub}</DialogDescription>
        </DialogHeader>
        <p className="text-[12px] text-[color:var(--text-muted)]">
          {t.dragAdapt.note}
        </p>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t.dragAdapt.cancel}
          </Button>
          <Button variant="ghost" onClick={() => state && onKeep(state)}>
            {t.dragAdapt.keep}
          </Button>
          <Button onClick={() => state && onAdapt(state)}>
            {t.dragAdapt.adapt}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
