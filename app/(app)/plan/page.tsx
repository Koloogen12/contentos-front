"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import {
  formatDateISO,
  getMondayOfWeek,
  getWeek,
} from "@/lib/content-plan";
import { getBrandContext } from "@/lib/brand-context";
import type {
  PlannedPostOut,
  PostPlatform,
  WeekResponse,
} from "@/lib/types";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { WeeklyCalendar } from "@/components/plan/WeeklyCalendar";
import { MonthlyCalendar } from "@/components/plan/MonthlyCalendar";
import { PostList } from "@/components/plan/PostList";
import { AnalyticsScreen } from "@/components/plan/AnalyticsScreen";
import { QueueSidebar } from "@/components/plan/QueueSidebar";
import { InsightsPanel } from "@/components/plan/InsightsPanel";
import { PostDetailDrawer } from "@/components/plan/PostDetailDrawer";
import { QuickAddDialog } from "@/components/plan/QuickAddDialog";
import { TrialRedirect } from "@/components/TrialRedirect";

type PlanView = "week" | "month" | "list" | "analytics";

const VIEWS: ReadonlyArray<{ key: PlanView; label: string }> = [
  { key: "week", label: t.plan.views.week },
  { key: "month", label: t.plan.views.month },
  { key: "list", label: t.plan.views.list },
  { key: "analytics", label: t.plan.views.analytics },
];

export default function PlanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialWeek = React.useMemo(() => {
    const param = searchParams.get("week");
    if (param) return param;
    return formatDateISO(getMondayOfWeek(new Date()));
  }, [searchParams]);

  const [weekStart, setWeekStartState] = React.useState(initialWeek);
  const [view, setView] = React.useState<PlanView>("week");
  const initialMonth = React.useMemo(() => {
    const param = searchParams.get("month");
    if (param) return param;
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, [searchParams]);
  const [month, setMonthState] = React.useState(initialMonth);
  const [drawerPost, setDrawerPost] = React.useState<PlannedPostOut | null>(
    null,
  );
  const [quickAddOpen, setQuickAddOpen] = React.useState(false);
  const [quickAddPrefill, setQuickAddPrefill] = React.useState<{
    date?: string | null;
    platform?: PostPlatform | null;
  }>({});

  const setWeekStart = React.useCallback(
    (iso: string) => {
      setWeekStartState(iso);
      const sp = new URLSearchParams(searchParams.toString());
      sp.set("week", iso);
      router.replace(`/plan?${sp.toString()}`);
    },
    [router, searchParams],
  );

  const setMonth = React.useCallback(
    (next: string) => {
      setMonthState(next);
      const sp = new URLSearchParams(searchParams.toString());
      sp.set("month", next);
      router.replace(`/plan?${sp.toString()}`);
    },
    [router, searchParams],
  );

  const brandQuery = useQuery({
    queryKey: ["brand-context"],
    queryFn: getBrandContext,
  });
  const handle: string | null = React.useMemo(() => {
    const raw = brandQuery.data?.data.author_handle ?? null;
    if (!raw) return null;
    const trimmed = String(raw).trim();
    if (!trimmed) return null;
    return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
  }, [brandQuery.data]);

  const weekQuery = useQuery<WeekResponse>({
    queryKey: ["plan-week", weekStart],
    queryFn: () => getWeek(weekStart),
  });

  const openQuickAdd = (
    date?: string | null,
    platform?: PostPlatform | null,
  ) => {
    setQuickAddPrefill({ date: date ?? null, platform: platform ?? null });
    setQuickAddOpen(true);
  };

  return (
    <div className="flex flex-col">
      <TrialRedirect />
      {/* Top bar */}
      <header className="flex flex-wrap items-center gap-3 border-b border-[color:var(--border-subtle)] bg-background/60 px-6 py-3">
        <div className="text-[15px] font-semibold">{t.plan.title}</div>
        <div className="co-plan-views" role="tablist">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              type="button"
              role="tab"
              aria-selected={view === v.key}
              className={cn(
                "co-plan-view-btn",
                view === v.key && "active",
              )}
              onClick={() => setView(v.key)}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <Button onClick={() => openQuickAdd()}>
            <Plus className="h-4 w-4" /> {t.plan.addBtn}
          </Button>
        </div>
      </header>

      <div className="co-plan-shell">
        <QueueSidebar
          handle={handle}
          onPostClick={(post) => setDrawerPost(post)}
          onAddManual={() => openQuickAdd()}
        />

        <div className="min-w-0">
          {view === "week" ? (
            <WeeklyCalendar
              weekStart={weekStart}
              setWeekStart={setWeekStart}
              handle={handle}
              onPostClick={(post) => setDrawerPost(post)}
              onEmptyCellClick={(date, platform) =>
                openQuickAdd(date, platform)
              }
            />
          ) : view === "month" ? (
            <MonthlyCalendar
              month={month}
              setMonth={setMonth}
              onDayClick={(_date, posts) => {
                if (posts.length > 0) {
                  setDrawerPost(posts[0]);
                }
              }}
            />
          ) : view === "list" ? (
            <PostList onPostClick={(post) => setDrawerPost(post)} />
          ) : (
            <AnalyticsScreen />
          )}
        </div>

        <InsightsPanel
          weekData={weekQuery.data}
          weekStart={weekStart}
          onFillGap={(date) => openQuickAdd(date)}
        />
      </div>

      <PostDetailDrawer
        post={drawerPost}
        open={!!drawerPost}
        onClose={() => setDrawerPost(null)}
      />
      <QuickAddDialog
        open={quickAddOpen}
        onOpenChange={(next) => {
          setQuickAddOpen(next);
          if (!next) setQuickAddPrefill({});
        }}
        defaultDate={quickAddPrefill.date ?? null}
        defaultPlatform={quickAddPrefill.platform ?? null}
      />
    </div>
  );
}

