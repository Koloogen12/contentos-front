"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { ApiError } from "@/lib/api";
import {
  formatDateISO,
  formatDayShortRu,
  listPosts,
  scheduleFromNode,
} from "@/lib/content-plan";
import type {
  ContentPillar,
  PlannedPostOut,
  PostPlatform,
} from "@/lib/types";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PILLARS, PLATFORM_LABEL } from "@/components/plan/planUtils";

interface SchedulePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId: string;
  platform?: PostPlatform | null;
  hook?: string | null;
  onScheduled?: (post: PlannedPostOut) => void;
}

const WEEKDAYS = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"];

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function SchedulePickerDialog({
  open,
  onOpenChange,
  nodeId,
  platform,
  hook,
  onScheduled,
}: SchedulePickerDialogProps) {
  const qc = useQueryClient();
  const today = React.useMemo(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()),
    [],
  );
  const [monthAnchor, setMonthAnchor] = React.useState<Date>(() =>
    startOfMonth(today),
  );
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(today);
  const [time, setTime] = React.useState<string>("");
  const [pillar, setPillar] = React.useState<ContentPillar | "">("");

  React.useEffect(() => {
    if (!open) return;
    setMonthAnchor(startOfMonth(today));
    setSelectedDate(today);
    setTime("");
    setPillar("");
  }, [open, today]);

  const monthFrom = formatDateISO(startOfMonth(monthAnchor));
  const monthTo = formatDateISO(endOfMonth(monthAnchor));

  const monthQuery = useQuery({
    queryKey: ["plan-month-counts", monthFrom, monthTo],
    queryFn: () =>
      listPosts({ date_from: monthFrom, date_to: monthTo }),
    enabled: open,
  });

  const countsByDate = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const p of monthQuery.data ?? []) {
      if (!p.scheduled_date) continue;
      map.set(p.scheduled_date, (map.get(p.scheduled_date) ?? 0) + 1);
    }
    return map;
  }, [monthQuery.data]);

  const scheduleMutation = useMutation({
    mutationFn: () =>
      scheduleFromNode(nodeId, {
        scheduled_date: selectedDate ? formatDateISO(selectedDate) : null,
        scheduled_time: time ? time + ":00" : null,
        pillar: (pillar || null) as ContentPillar | null,
      }),
    onSuccess: (post) => {
      const dateLabel = selectedDate
        ? formatDayShortRu(selectedDate)
        : t.plan.toasts.scheduled;
      toast.success(t.plan.schedule.scheduled(dateLabel));
      qc.invalidateQueries({ queryKey: ["plan-week"] });
      qc.invalidateQueries({ queryKey: ["plan-queue"] });
      qc.invalidateQueries({ queryKey: ["plan-stats"] });
      onScheduled?.(post);
      onOpenChange(false);
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : t.plan.schedule.failed,
      ),
  });

  // Build a calendar grid (6 rows × 7 cols).
  const grid = React.useMemo(() => {
    const start = startOfMonth(monthAnchor);
    const end = endOfMonth(monthAnchor);
    // Monday-based: shift Sunday (0) to 6
    const startWd = (start.getDay() + 6) % 7;
    const days: { date: Date; inMonth: boolean }[] = [];
    for (let i = 0; i < startWd; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() - (startWd - i));
      days.push({ date: d, inMonth: false });
    }
    for (let day = 1; day <= end.getDate(); day++) {
      days.push({
        date: new Date(start.getFullYear(), start.getMonth(), day),
        inMonth: true,
      });
    }
    while (days.length < 42) {
      const last = days[days.length - 1].date;
      const d = new Date(last);
      d.setDate(d.getDate() + 1);
      days.push({ date: d, inMonth: d.getMonth() === start.getMonth() });
    }
    return days;
  }, [monthAnchor]);

  const monthTitle = monthAnchor.toLocaleDateString("ru-RU", {
    month: "long",
    year: "numeric",
  });

  const titleParts: string[] = [t.plan.schedule.title];
  if (platform) titleParts.push(PLATFORM_LABEL[platform]);
  if (hook) {
    const trimmed = hook.replace(/\s+/g, " ").trim();
    titleParts.push(trimmed.length > 40 ? trimmed.slice(0, 40) + "…" : trimmed);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{titleParts.join(" · ")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() =>
                  setMonthAnchor(
                    new Date(
                      monthAnchor.getFullYear(),
                      monthAnchor.getMonth() - 1,
                      1,
                    ),
                  )
                }
                className="rounded-md p-1.5 text-[color:var(--text-muted)] hover:bg-foreground/5 hover:text-foreground"
                aria-label="Previous month"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-[13px] font-semibold capitalize">
                {monthTitle}
              </span>
              <button
                type="button"
                onClick={() =>
                  setMonthAnchor(
                    new Date(
                      monthAnchor.getFullYear(),
                      monthAnchor.getMonth() + 1,
                      1,
                    ),
                  )
                }
                className="rounded-md p-1.5 text-[color:var(--text-muted)] hover:bg-foreground/5 hover:text-foreground"
                aria-label="Next month"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="co-plan-pick-weekrow">
              {WEEKDAYS.map((w) => (
                <div key={w} className="co-plan-pick-wd">
                  {w}
                </div>
              ))}
            </div>
            <div className="co-plan-pick-cal">
              {grid.map(({ date, inMonth }, i) => {
                const iso = formatDateISO(date);
                const isToday = iso === formatDateISO(today);
                const isSelected =
                  !!selectedDate && iso === formatDateISO(selectedDate);
                const count = countsByDate.get(iso) ?? 0;
                return (
                  <button
                    key={i}
                    type="button"
                    className={cn(
                      "co-plan-pick-day",
                      isToday && "today",
                      isSelected && "selected",
                    )}
                    style={!inMonth ? { opacity: 0.35 } : undefined}
                    onClick={() => setSelectedDate(date)}
                  >
                    <span>{date.getDate()}</span>
                    {count > 0 && (
                      <span className="co-plan-pick-day-count">·{count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="co-plan-drawer-section-h">
                {t.plan.schedule.timeLabel}
              </span>
              <input
                type="time"
                className="co-plan-drawer-input"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="co-plan-drawer-section-h">
                {t.plan.schedule.pillarLabel}
              </span>
              <select
                className="co-plan-drawer-input"
                value={pillar}
                onChange={(e) =>
                  setPillar(e.target.value as ContentPillar | "")
                }
              >
                <option value="">{t.plan.schedule.pillarNone}</option>
                {PILLARS.map((p) => (
                  <option key={p} value={p}>
                    {p} · {t.plan.pillars[p]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={scheduleMutation.isPending}
          >
            {t.plan.schedule.cancel}
          </Button>
          <Button
            onClick={() => scheduleMutation.mutate()}
            disabled={scheduleMutation.isPending || !selectedDate}
          >
            {scheduleMutation.isPending && (
              <Loader2 size={14} className="animate-spin" />
            )}
            {t.plan.schedule.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Re-export for typing convenience in callers.
export type { PlannedPostOut } from "@/lib/types";
