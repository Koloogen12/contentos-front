"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getCanvas } from "@/lib/canvases";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowUpRight,
  CheckCircle2,
  ExternalLink,
  Loader2,
  SkipForward,
  Trash2,
  X,
} from "lucide-react";
import { ApiError } from "@/lib/api";
import {
  deletePost,
  publishPost,
  skipPost,
  updatePost,
  parseISODate,
  formatDayRu,
} from "@/lib/content-plan";
import type {
  ContentPillar,
  PlannedPostOut,
  PlannedPostUpdate,
} from "@/lib/types";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  PILLARS,
  PLATFORM_LABEL,
  metricNumber,
  statusLabel,
} from "@/components/plan/planUtils";

interface PostDetailDrawerProps {
  post: PlannedPostOut | null;
  open: boolean;
  onClose: () => void;
}

const METRIC_KEYS = [
  { key: "views", label: t.plan.drawer.metricsViews },
  { key: "saves", label: t.plan.drawer.metricsSaves },
  { key: "reposts", label: t.plan.drawer.metricsReposts },
  { key: "comments", label: t.plan.drawer.metricsComments },
  { key: "clicks", label: t.plan.drawer.metricsClicks },
] as const;

export function PostDetailDrawer({
  post,
  open,
  onClose,
}: PostDetailDrawerProps) {
  if (!open || !post) return null;
  return <DrawerInner post={post} onClose={onClose} />;
}

function DrawerInner({
  post,
  onClose,
}: {
  post: PlannedPostOut;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [hook, setHook] = React.useState(post.hook);
  const [body, setBody] = React.useState(post.body);
  const [cta, setCta] = React.useState(post.cta);
  const [pillar, setPillar] = React.useState<ContentPillar | "">(
    post.pillar ?? "",
  );
  const [tagsInput, setTagsInput] = React.useState(post.tags.join(", "));
  const [notes, setNotes] = React.useState(post.notes ?? "");
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const [metrics, setMetrics] = React.useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const { key } of METRIC_KEYS) {
      const n = metricNumber(post.metrics, key);
      m[key] = n ? String(n) : "";
    }
    return m;
  });

  React.useEffect(() => {
    setHook(post.hook);
    setBody(post.body);
    setCta(post.cta);
    setPillar(post.pillar ?? "");
    setTagsInput(post.tags.join(", "));
    setNotes(post.notes ?? "");
    const m: Record<string, string> = {};
    for (const { key } of METRIC_KEYS) {
      const n = metricNumber(post.metrics, key);
      m[key] = n ? String(n) : "";
    }
    setMetrics(m);
  }, [post]);

  const invalidate = React.useCallback(() => {
    qc.invalidateQueries({ queryKey: ["plan-week"] });
    qc.invalidateQueries({ queryKey: ["plan-queue"] });
    qc.invalidateQueries({ queryKey: ["plan-stats"] });
  }, [qc]);

  const patchMutation = useMutation({
    mutationFn: (patch: PlannedPostUpdate) => updatePost(post.id, patch),
    onSuccess: () => {
      invalidate();
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : t.plan.toasts.saveFailed,
      ),
  });

  const publishMutation = useMutation({
    mutationFn: () => publishPost(post.id),
    onSuccess: () => {
      toast.success(t.plan.toasts.published);
      invalidate();
      onClose();
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : t.plan.toasts.saveFailed,
      ),
  });

  const skipMutation = useMutation({
    mutationFn: () => skipPost(post.id),
    onSuccess: () => {
      toast.success(t.plan.toasts.skipped);
      invalidate();
      onClose();
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : t.plan.toasts.saveFailed,
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePost(post.id),
    onSuccess: () => {
      toast.success(t.plan.toasts.deleted);
      invalidate();
      setConfirmDelete(false);
      onClose();
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : t.plan.toasts.saveFailed,
      ),
  });

  const buildFullText = React.useCallback(
    (h: string, b: string, c: string) =>
      [h, b, c].map((s) => s.trim()).filter(Boolean).join("\n\n"),
    [],
  );

  const onBlurField = React.useCallback(
    (field: "hook" | "body" | "cta") => {
      const nextHook = field === "hook" ? hook : post.hook;
      const nextBody = field === "body" ? body : post.body;
      const nextCta = field === "cta" ? cta : post.cta;
      const value =
        field === "hook" ? hook : field === "body" ? body : cta;
      const original =
        field === "hook"
          ? post.hook
          : field === "body"
            ? post.body
            : post.cta;
      if (value === original) return;
      const patch: PlannedPostUpdate = { [field]: value } as PlannedPostUpdate;
      patch.full_text = buildFullText(nextHook, nextBody, nextCta);
      patchMutation.mutate(patch);
    },
    [hook, body, cta, post, patchMutation, buildFullText],
  );

  const onPillarChange = (v: string) => {
    setPillar(v as ContentPillar | "");
    patchMutation.mutate({ pillar: (v || null) as ContentPillar | null });
  };

  const onTagsBlur = () => {
    const tags = tagsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (JSON.stringify(tags) === JSON.stringify(post.tags)) return;
    patchMutation.mutate({ tags });
  };

  const onNotesBlur = () => {
    if (notes === (post.notes ?? "")) return;
    patchMutation.mutate({ notes: notes || null });
  };

  const onSaveMetrics = () => {
    const next: Record<string, number> = {};
    for (const { key } of METRIC_KEYS) {
      const raw = (metrics[key] ?? "").trim();
      if (!raw) continue;
      const n = Number(raw);
      if (Number.isFinite(n)) next[key] = n;
    }
    patchMutation.mutate({ metrics: next });
    toast.success(t.plan.drawer.metricsSaved);
  };

  const dateLabel = React.useMemo(() => {
    if (!post.scheduled_date) return null;
    const d = parseISODate(post.scheduled_date);
    let label = formatDayRu(d);
    label = label.charAt(0).toUpperCase() + label.slice(1);
    if (post.scheduled_time) {
      label += ` · ${post.scheduled_time.slice(0, 5)}`;
    }
    return label;
  }, [post.scheduled_date, post.scheduled_time]);

  return (
    <>
      <div
        className="co-plan-drawer-overlay"
        onClick={onClose}
        aria-hidden
      />
      <aside className="co-plan-drawer" role="dialog" aria-modal>
        <header className="co-plan-drawer-head">
          <div className="flex items-center gap-2">
            <span className="co-plan-platform-tag">
              {PLATFORM_LABEL[post.platform]}
            </span>
            <span className="flex items-center gap-1.5 text-[12px]">
              <span
                className={cn("co-plan-status-dot", post.status)}
                aria-hidden
              />
              <span className="text-[color:var(--text-secondary)]">
                {statusLabel(post.status)}
              </span>
            </span>
            {post.pillar && (
              <span className={cn("co-plan-pillar", post.pillar)}>
                {post.pillar}
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="ml-auto rounded-md p-1 text-[color:var(--text-muted)] hover:bg-white/5 hover:text-foreground"
              aria-label={t.common.close}
            >
              <X size={16} />
            </button>
          </div>
          {dateLabel && (
            <div className="text-[13px] text-[color:var(--text-tertiary)]">
              {dateLabel}
            </div>
          )}
        </header>

        <div className="co-plan-drawer-body">
          {post.canvas_id && (
            <CanvasLinkSection
              canvasId={post.canvas_id}
              talkingPoint={post.talking_point_text}
              onClose={onClose}
            />
          )}

          <section>
            <div className="co-plan-drawer-section-h">{t.plan.drawer.hook}</div>
            <textarea
              className="co-plan-drawer-textarea"
              rows={2}
              value={hook}
              onChange={(e) => setHook(e.target.value)}
              onBlur={() => onBlurField("hook")}
            />
          </section>

          <section>
            <div className="co-plan-drawer-section-h">{t.plan.drawer.body}</div>
            <textarea
              className="co-plan-drawer-textarea"
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onBlur={() => onBlurField("body")}
            />
          </section>

          <section>
            <div className="co-plan-drawer-section-h">{t.plan.drawer.cta}</div>
            <textarea
              className="co-plan-drawer-textarea"
              rows={2}
              value={cta}
              onChange={(e) => setCta(e.target.value)}
              onBlur={() => onBlurField("cta")}
            />
          </section>

          <section>
            <div className="co-plan-drawer-section-h">
              {t.plan.drawer.pillar}
            </div>
            <select
              className="co-plan-drawer-input"
              value={pillar}
              onChange={(e) => onPillarChange(e.target.value)}
            >
              <option value="">—</option>
              {PILLARS.map((p) => (
                <option key={p} value={p}>
                  {p} · {t.plan.pillars[p]}
                </option>
              ))}
            </select>
          </section>

          <section>
            <div className="co-plan-drawer-section-h">{t.plan.drawer.tags}</div>
            <input
              className="co-plan-drawer-input"
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              onBlur={onTagsBlur}
              placeholder={t.plan.drawer.tagsPlaceholder}
            />
            {post.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {post.tags.map((tg) => (
                  <span key={tg} className="co-plan-tag-chip">
                    {tg}
                  </span>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="co-plan-drawer-section-h">
              {t.plan.drawer.notes}
            </div>
            <textarea
              className="co-plan-drawer-textarea"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={onNotesBlur}
              placeholder={t.plan.drawer.notesPlaceholder}
            />
          </section>

          {post.status === "published" && (
            <section>
              <div className="co-plan-drawer-section-h">
                {t.plan.drawer.metrics}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {METRIC_KEYS.map(({ key, label }) => (
                  <label key={key} className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wider text-[color:var(--text-muted)]">
                      {label}
                    </span>
                    <input
                      type="number"
                      inputMode="numeric"
                      className="co-plan-drawer-input"
                      value={metrics[key] ?? ""}
                      onChange={(e) =>
                        setMetrics((m) => ({ ...m, [key]: e.target.value }))
                      }
                    />
                  </label>
                ))}
              </div>
              <button
                type="button"
                className="co-btn co-btn-ghost mt-3"
                onClick={onSaveMetrics}
                disabled={patchMutation.isPending}
              >
                {patchMutation.isPending && (
                  <Loader2 size={12} className="animate-spin" />
                )}
                {t.plan.drawer.saveMetrics}
              </button>
            </section>
          )}
        </div>

        <div className="co-plan-actions-row">
          {post.status !== "published" && (
            <Button
              onClick={() => publishMutation.mutate()}
              disabled={publishMutation.isPending}
            >
              {publishMutation.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <CheckCircle2 size={14} />
              )}
              {t.plan.drawer.markPublished}
            </Button>
          )}
          <div className="grid grid-cols-2 gap-2">
            {post.status !== "skipped" && post.status !== "published" && (
              <Button
                variant="ghost"
                onClick={() => skipMutation.mutate()}
                disabled={skipMutation.isPending}
              >
                <SkipForward size={14} />
                {t.plan.drawer.skip}
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => setConfirmDelete(true)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 size={14} />
              {t.plan.drawer.delete}
            </Button>
          </div>
        </div>
      </aside>

      <Dialog
        open={confirmDelete}
        onOpenChange={(next) => !next && setConfirmDelete(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.plan.drawer.deleteConfirmTitle}</DialogTitle>
            <DialogDescription>
              {t.plan.drawer.deleteConfirmDesc}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirmDelete(false)}
              disabled={deleteMutation.isPending}
            >
              {t.common.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <ArrowUpRight size={14} />
              )}
              {t.common.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CanvasLinkSection({
  canvasId,
  talkingPoint,
  onClose,
}: {
  canvasId: string;
  talkingPoint: string | null;
  onClose: () => void;
}) {
  const canvasQuery = useQuery({
    queryKey: ["canvas-name", canvasId],
    queryFn: () => getCanvas(canvasId),
    enabled: !!canvasId,
  });

  const truncated = React.useMemo(() => {
    if (!talkingPoint) return null;
    if (talkingPoint.length <= 120) return talkingPoint;
    return talkingPoint.slice(0, 120).trimEnd() + "…";
  }, [talkingPoint]);

  return (
    <section>
      <div className="co-plan-drawer-section-h">{t.plan.drawer.fromCanvas}</div>
      {canvasQuery.isPending ? (
        <Skeleton className="h-4 w-40" />
      ) : (
        <Link
          href={`/canvas/${canvasId}`}
          className="inline-flex items-center gap-1.5 text-[13px] text-[color:var(--text-tertiary)] underline-offset-4 hover:underline"
          onClick={onClose}
          title={canvasQuery.data?.name ?? canvasId}
        >
          {canvasQuery.data?.name ?? t.plan.drawer.openCanvas}
          <ExternalLink size={12} />
        </Link>
      )}
      {truncated && (
        <p className="mt-1.5 text-[12px] leading-snug text-[color:var(--text-secondary)]">
          «{truncated}»
        </p>
      )}
    </section>
  );
}
