"use client";

/**
 * Telegram metrics chip: views + reactions + manual refresh button.
 *
 * Shown on FormatNode under the Publish button when the node has at
 * least one successful Telegram publish. The latest sent log wins —
 * earlier sends are hidden in this UI surface (the publish history
 * lives in the drawer).
 *
 * Auto-refresh: we DO NOT poll. The backend cron sweeps every 6h, and
 * the user can hit the refresh icon for an instant re-fetch. Polling
 * here would burn the Cloudflare-Worker proxy budget for nothing
 * because TG views are stable within a 6h window.
 */

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Forward, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { ApiError } from "@/lib/api";
import { listNodePublishLogs, refreshPublishLogMetrics } from "@/lib/publish";
import type { PublishLogOut, PublishMetrics } from "@/lib/types";

const formatCount = (n: number | null | undefined): string => {
  if (n == null) return "—";
  if (n < 1000) return String(n);
  if (n < 10_000) return (n / 1000).toFixed(1).replace(".0", "") + "K";
  if (n < 1_000_000) return Math.round(n / 1000) + "K";
  return (n / 1_000_000).toFixed(1).replace(".0", "") + "M";
};

const reactionsSummary = (
  reactions: Record<string, number> | undefined,
): { total: number; top: string[] } => {
  if (!reactions) return { total: 0, top: [] };
  const entries = Object.entries(reactions);
  const total = entries.reduce((acc, [, v]) => acc + (v || 0), 0);
  // Show top 3 emojis by count — keeps the chip narrow even on big posts.
  const top = entries
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([emoji, count]) => `${emoji}${count > 1 ? ` ${formatCount(count)}` : ""}`);
  return { total, top };
};

const relativeTime = (iso: string): string => {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffSec = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (diffSec < 60) return "только что";
  const min = Math.round(diffSec / 60);
  if (min < 60) return `${min} мин назад`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} ч назад`;
  const days = Math.round(hr / 24);
  return `${days} д назад`;
};

export function TelegramMetricsChip({ nodeId }: { nodeId: string }) {
  const qc = useQueryClient();

  const logsQuery = useQuery<PublishLogOut[]>({
    queryKey: ["publish-logs", "node", nodeId],
    queryFn: () => listNodePublishLogs(nodeId),
    // No refetchInterval — see file header. We re-query on mount + manual
    // refresh and call it a day.
    staleTime: 1000 * 60 * 5,
  });

  // Latest successful publish wins. Re-publishing the same node creates a
  // new log; the older one stays in the table for history but doesn't
  // surface here.
  const latestSent = React.useMemo(() => {
    const list = logsQuery.data ?? [];
    return list.find((l) => l.status === "sent") ?? null;
  }, [logsQuery.data]);

  const refreshMutation = useMutation({
    mutationFn: (id: string) => refreshPublishLogMetrics(id),
    onSuccess: () => {
      // Drop the cache so the chip picks up the new metrics. We don't write
      // through to the cache directly because the response is per-log and
      // the chip reads from the list query — easier to invalidate.
      void qc.invalidateQueries({
        queryKey: ["publish-logs", "node", nodeId],
      });
    },
    onError: (err) => {
      toast.error(
        err instanceof ApiError ? err.detail : "Не удалось обновить метрики",
      );
    },
  });

  if (logsQuery.isLoading) {
    return null;
  }
  if (!latestSent) {
    return null;
  }

  const metrics: PublishMetrics | null = latestSent.metrics;
  const { total: reactionsTotal, top: reactionsTop } = reactionsSummary(
    metrics?.reactions,
  );
  const isRefreshing = refreshMutation.isPending;

  return (
    <div
      className="nodrag rounded-md border border-info/30 bg-info/[0.06] px-2 py-1.5 text-[11px] text-info"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2">
        <span className="text-[9px] uppercase tracking-wider text-info">
          TG
        </span>
        <div className="flex items-center gap-2.5 text-[11px] font-medium">
          {/* Views: the headline metric. Renders "—" when metrics haven't
              been fetched yet (cron hasn't run / private channel). */}
          <span className="inline-flex items-center gap-1" title="Просмотры">
            <Eye size={11} />
            {formatCount(metrics?.views)}
          </span>
          {metrics?.forwards != null && metrics.forwards > 0 && (
            <span
              className="inline-flex items-center gap-1"
              title="Пересылки"
            >
              <Forward size={11} />
              {formatCount(metrics.forwards)}
            </span>
          )}
          {reactionsTotal > 0 && (
            <span
              className="inline-flex items-center gap-1"
              title={`Реакции: ${reactionsTotal}`}
            >
              <Sparkles size={11} />
              {reactionsTop.join(" ")}
            </span>
          )}
        </div>
        <button
          type="button"
          className="ml-auto inline-flex items-center justify-center rounded p-0.5 text-info hover:bg-info/[0.14] disabled:opacity-50"
          onClick={(e) => {
            e.stopPropagation();
            refreshMutation.mutate(latestSent.id);
          }}
          disabled={isRefreshing}
          title="Обновить метрики (запросит t.me сейчас)"
          aria-label="Обновить метрики"
        >
          {isRefreshing ? (
            <Loader2 size={11} className="animate-spin" />
          ) : (
            <RefreshCw size={11} />
          )}
        </button>
      </div>
      {/* Last-updated footer — small enough that it doesn't add visual
          noise but lets the user know if the data is fresh from cron or
          stale because their channel is private. */}
      {metrics?.fetched_at ? (
        <div className="mt-0.5 text-[9.5px] tracking-wide text-info/70">
          обновлено {relativeTime(metrics.fetched_at)}
        </div>
      ) : (
        <div className="mt-0.5 text-[9.5px] tracking-wide text-warn/80">
          метрики ещё не подтянуты — нажми обновить
        </div>
      )}
    </div>
  );
}
