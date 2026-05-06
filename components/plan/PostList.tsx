"use client";

/**
 * PostList — table view with platform/status/pillar/date-range/full-text
 * filters and sortable date / platform / status columns.
 *
 * Filters live in component state (no URL persistence yet — V2). Each row
 * opens the existing `PostDetailDrawer` on click. The actions menu invokes
 * mark-published / skip / delete with the standard mutations.
 */

import * as React from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2,
  MoreHorizontal,
  Search,
  SkipForward,
  Trash2,
  CheckCircle2,
  ArrowUpDown,
} from "lucide-react";
import { ApiError } from "@/lib/api";
import {
  deletePost,
  listPosts,
  publishPost,
  skipPost,
} from "@/lib/content-plan";
import type {
  ContentPillar,
  PlannedPostOut,
  PostPlatform,
  PostStatus,
} from "@/lib/types";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  ORDERED_PLATFORMS,
  PILLARS,
  PLATFORM_LABEL,
  postHookPreview,
  statusLabel,
} from "@/components/plan/planUtils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STATUSES: PostStatus[] = [
  "draft",
  "ready",
  "scheduled",
  "published",
  "skipped",
];

type SortKey = "date" | "platform" | "status";
type SortDir = "asc" | "desc";

interface PostListProps {
  onPostClick: (post: PlannedPostOut) => void;
}

export function PostList({ onPostClick }: PostListProps) {
  const qc = useQueryClient();
  const [platforms, setPlatforms] = React.useState<Set<PostPlatform>>(
    new Set(),
  );
  const [statuses, setStatuses] = React.useState<Set<PostStatus>>(new Set());
  const [pillars, setPillars] = React.useState<Set<ContentPillar>>(new Set());
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [sortKey, setSortKey] = React.useState<SortKey>("date");
  const [sortDir, setSortDir] = React.useState<SortDir>("desc");

  const query = useQuery({
    queryKey: [
      "plan-list",
      Array.from(platforms).sort().join(","),
      Array.from(statuses).sort().join(","),
      Array.from(pillars).sort().join(","),
      dateFrom,
      dateTo,
    ],
    queryFn: () =>
      listPosts({
        date_from: dateFrom || null,
        date_to: dateTo || null,
        platform: platforms.size === 1 ? Array.from(platforms)[0] : null,
        status: statuses.size === 1 ? Array.from(statuses)[0] : null,
        pillar: pillars.size === 1 ? Array.from(pillars)[0] : null,
      }),
  });

  // Server only takes single-value filters; for multi-select we filter
  // client-side too.
  const filtered = React.useMemo(() => {
    let items = query.data ?? [];
    if (platforms.size > 0)
      items = items.filter((p) => platforms.has(p.platform));
    if (statuses.size > 0)
      items = items.filter((p) => statuses.has(p.status));
    if (pillars.size > 0)
      items = items.filter((p) => p.pillar && pillars.has(p.pillar));
    const q = search.trim().toLowerCase();
    if (q) {
      items = items.filter(
        (p) =>
          (p.hook ?? "").toLowerCase().includes(q) ||
          (p.body ?? "").toLowerCase().includes(q) ||
          (p.full_text ?? "").toLowerCase().includes(q),
      );
    }
    const sorted = [...items].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "date") {
        const av = a.scheduled_date ?? "";
        const bv = b.scheduled_date ?? "";
        return av.localeCompare(bv) * dir;
      }
      if (sortKey === "platform") return a.platform.localeCompare(b.platform) * dir;
      return a.status.localeCompare(b.status) * dir;
    });
    return sorted;
  }, [
    query.data,
    platforms,
    statuses,
    pillars,
    search,
    sortKey,
    sortDir,
  ]);

  const toggleSet = <T,>(set: Set<T>, value: T): Set<T> => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["plan-list"] });
    qc.invalidateQueries({ queryKey: ["plan-week"] });
    qc.invalidateQueries({ queryKey: ["plan-queue"] });
    qc.invalidateQueries({ queryKey: ["plan-stats"] });
  };

  const publishMutation = useMutation({
    mutationFn: (id: string) => publishPost(id),
    onSuccess: () => {
      toast.success(t.plan.toasts.published);
      invalidate();
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : t.plan.toasts.saveFailed,
      ),
  });
  const skipMutation = useMutation({
    mutationFn: (id: string) => skipPost(id),
    onSuccess: () => {
      toast.success(t.plan.toasts.skipped);
      invalidate();
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : t.plan.toasts.saveFailed,
      ),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePost(id),
    onSuccess: () => {
      toast.success(t.plan.toasts.deleted);
      invalidate();
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : t.plan.toasts.saveFailed,
      ),
  });

  return (
    <section className="co-plan-cal">
      <div className="flex flex-col gap-3 rounded-lg border border-[color:var(--border-subtle)] bg-background/40 p-3">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <div className="relative col-span-2 md:col-span-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              className="co-field-input nodrag pl-8"
              placeholder={t.list.filters.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-1.5 text-[11px] text-[color:var(--text-muted)]">
            <span>{t.list.filters.from}</span>
            <input
              type="date"
              className="co-field-input"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </label>
          <label className="flex items-center gap-1.5 text-[11px] text-[color:var(--text-muted)]">
            <span>{t.list.filters.to}</span>
            <input
              type="date"
              className="co-field-input"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="co-btn co-btn-ghost"
            onClick={() => {
              setPlatforms(new Set());
              setStatuses(new Set());
              setPillars(new Set());
              setDateFrom("");
              setDateTo("");
              setSearch("");
            }}
          >
            {t.list.filters.reset}
          </button>
        </div>
        <ChipGroup
          label={t.list.filters.platform}
          values={ORDERED_PLATFORMS}
          selected={platforms}
          getLabel={(p) => PLATFORM_LABEL[p]}
          onToggle={(v) => setPlatforms((s) => toggleSet(s, v))}
        />
        <ChipGroup
          label={t.list.filters.status}
          values={STATUSES}
          selected={statuses}
          getLabel={(s) => statusLabel(s)}
          onToggle={(v) => setStatuses((s) => toggleSet(s, v))}
        />
        <ChipGroup
          label={t.list.filters.pillar}
          values={PILLARS}
          selected={pillars}
          getLabel={(p) => p}
          onToggle={(v) => setPillars((s) => toggleSet(s, v))}
        />
      </div>

      <div className="mt-3 overflow-x-auto rounded-lg border border-[color:var(--border-subtle)]">
        <table className="w-full table-fixed text-[12px]">
          <colgroup>
            <col style={{ width: "44px" }} />
            <col style={{ width: "120px" }} />
            <col />
            <col style={{ width: "120px" }} />
            <col style={{ width: "70px" }} />
            <col style={{ width: "120px" }} />
            <col style={{ width: "60px" }} />
          </colgroup>
          <thead className="bg-background/40 text-left text-[10px] uppercase tracking-wider text-[color:var(--text-muted)]">
            <tr>
              <th className="px-2 py-1.5">{t.list.cols.num}</th>
              <th
                className="cursor-pointer px-2 py-1.5"
                onClick={() => toggleSort("date")}
              >
                <span className="inline-flex items-center gap-1">
                  {t.list.cols.date} <ArrowUpDown size={10} />
                </span>
              </th>
              <th className="px-2 py-1.5">{t.list.cols.hook}</th>
              <th
                className="cursor-pointer px-2 py-1.5"
                onClick={() => toggleSort("platform")}
              >
                <span className="inline-flex items-center gap-1">
                  {t.list.cols.platform} <ArrowUpDown size={10} />
                </span>
              </th>
              <th className="px-2 py-1.5">{t.list.cols.pillar}</th>
              <th
                className="cursor-pointer px-2 py-1.5"
                onClick={() => toggleSort("status")}
              >
                <span className="inline-flex items-center gap-1">
                  {t.list.cols.status} <ArrowUpDown size={10} />
                </span>
              </th>
              <th className="px-2 py-1.5">{t.list.cols.actions}</th>
            </tr>
          </thead>
          <tbody>
            {query.isPending ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-2 py-6 text-center text-[color:var(--text-muted)]"
                >
                  <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-2 py-6 text-center text-[color:var(--text-muted)]"
                >
                  {t.list.empty}
                </td>
              </tr>
            ) : (
              filtered.map((post, i) => (
                <tr
                  key={post.id}
                  className="cursor-pointer border-t border-[color:var(--border-subtle)] hover:bg-white/[0.03]"
                  onClick={() => onPostClick(post)}
                >
                  <td className="px-2 py-1.5 tabular-nums text-[color:var(--text-muted)]">
                    {i + 1}
                  </td>
                  <td className="px-2 py-1.5 tabular-nums">
                    {post.scheduled_date ?? "—"}
                  </td>
                  <td className="truncate px-2 py-1.5">
                    {postHookPreview(post)}
                  </td>
                  <td className="px-2 py-1.5">
                    {PLATFORM_LABEL[post.platform]}
                  </td>
                  <td className="px-2 py-1.5">
                    {post.pillar ? (
                      <span className={cn("co-plan-pillar", post.pillar)}>
                        {post.pillar}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className={cn("co-plan-status-dot", post.status)}
                        aria-hidden
                      />
                      {statusLabel(post.status)}
                    </span>
                  </td>
                  <td
                    className="px-2 py-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="rounded p-1 hover:bg-white/10"
                        aria-label="Actions"
                      >
                        <MoreHorizontal size={14} />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        {post.status !== "published" && (
                          <DropdownMenuItem
                            onSelect={() => publishMutation.mutate(post.id)}
                          >
                            <CheckCircle2 size={12} />{" "}
                            {t.plan.drawer.markPublished}
                          </DropdownMenuItem>
                        )}
                        {post.status !== "skipped" && (
                          <DropdownMenuItem
                            onSelect={() => skipMutation.mutate(post.id)}
                          >
                            <SkipForward size={12} /> {t.plan.drawer.skip}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          destructive
                          onSelect={() => deleteMutation.mutate(post.id)}
                        >
                          <Trash2 size={12} /> {t.plan.drawer.delete}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ChipGroup<T extends string>({
  label,
  values,
  selected,
  getLabel,
  onToggle,
}: {
  label: string;
  values: ReadonlyArray<T>;
  selected: Set<T>;
  getLabel: (v: T) => string;
  onToggle: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] uppercase tracking-wider text-[color:var(--text-muted)]">
        {label}:
      </span>
      {values.map((v) => {
        const active = selected.has(v);
        return (
          <button
            key={v}
            type="button"
            className={cn(
              "rounded-full border px-2 py-0.5 text-[11px] transition-colors",
              active
                ? "border-primary/60 bg-primary/15 text-primary"
                : "border-border bg-card/40 text-muted-foreground hover:bg-card",
            )}
            onClick={() => onToggle(v)}
          >
            {getLabel(v)}
          </button>
        );
      })}
    </div>
  );
}
