"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { ApiError } from "@/lib/api";
import { createPost, formatDayShortRu, parseISODate } from "@/lib/content-plan";
import { createCanvas } from "@/lib/canvases";
import type {
  ContentPillar,
  PlannedPostCreate,
  PostPlatform,
  PostStatus,
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
  ORDERED_PLATFORMS,
  PILLARS,
  PLATFORM_LABEL,
} from "@/components/plan/planUtils";

interface QuickAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Prefill the date (e.g. when invoked from an empty calendar cell). */
  defaultDate?: string | null;
  /** Prefill the platform (e.g. when invoked from a platform row). */
  defaultPlatform?: PostPlatform | null;
}

export function QuickAddDialog({
  open,
  onOpenChange,
  defaultDate,
  defaultPlatform,
}: QuickAddDialogProps) {
  const qc = useQueryClient();
  const router = useRouter();
  const [platform, setPlatform] = React.useState<PostPlatform>(
    defaultPlatform ?? "telegram",
  );
  const [hook, setHook] = React.useState("");
  const [pillar, setPillar] = React.useState<ContentPillar | "">("");
  const [status, setStatus] = React.useState<PostStatus>("ready");

  React.useEffect(() => {
    if (!open) return;
    setPlatform(defaultPlatform ?? "telegram");
    setHook("");
    setPillar("");
    setStatus("ready");
  }, [open, defaultPlatform]);

  const createMutation = useMutation({
    mutationFn: (input: PlannedPostCreate) => createPost(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plan-week"] });
      qc.invalidateQueries({ queryKey: ["plan-queue"] });
      qc.invalidateQueries({ queryKey: ["plan-stats"] });
      toast.success(t.plan.quickAdd.created);
      onOpenChange(false);
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : t.plan.quickAdd.failed,
      ),
  });

  const openInAiMutation = useMutation({
    mutationFn: async () => {
      const canvas = await createCanvas({
        name: hook.trim().slice(0, 80) || t.common.untitled,
        description: null,
      });
      return canvas;
    },
    onSuccess: (canvas) => {
      qc.invalidateQueries({ queryKey: ["canvases"] });
      onOpenChange(false);
      router.push(`/canvas/${canvas.id}`);
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError
          ? err.detail
          : t.onboarding.couldNotCreateCanvas,
      ),
  });

  const submit = () => {
    const trimmedHook = hook.trim();
    const input: PlannedPostCreate = {
      platform,
      hook: trimmedHook,
      body: "",
      cta: "",
      full_text: trimmedHook,
      pillar: (pillar || null) as ContentPillar | null,
      status: defaultDate ? "scheduled" : status,
      scheduled_date: defaultDate ?? null,
    };
    createMutation.mutate(input);
  };

  const dateLabel = defaultDate
    ? formatDayShortRu(parseISODate(defaultDate))
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.plan.quickAdd.title}</DialogTitle>
          {dateLabel && <DialogDescription>{dateLabel}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <div className="co-plan-drawer-section-h">
              {t.plan.quickAdd.platformLabel}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ORDERED_PLATFORMS.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={cn(
                    "co-tab-pill",
                    platform === p && "active",
                  )}
                  onClick={() => setPlatform(p)}
                >
                  {PLATFORM_LABEL[p]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="co-plan-drawer-section-h">
              {t.plan.quickAdd.hookLabel}
            </div>
            <textarea
              className="co-plan-drawer-textarea"
              rows={4}
              value={hook}
              onChange={(e) => setHook(e.target.value)}
              placeholder={t.plan.quickAdd.hookPlaceholder}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="co-plan-drawer-section-h">
                {t.plan.quickAdd.pillarLabel}
              </div>
              <select
                className="co-plan-drawer-input"
                value={pillar}
                onChange={(e) =>
                  setPillar(e.target.value as ContentPillar | "")
                }
              >
                <option value="">—</option>
                {PILLARS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="co-plan-drawer-section-h">
                {t.plan.quickAdd.statusLabel}
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  className={cn(
                    "co-tab-pill",
                    status === "ready" && "active",
                  )}
                  onClick={() => setStatus("ready")}
                >
                  {t.plan.quickAdd.statusReady}
                </button>
                <button
                  type="button"
                  className={cn(
                    "co-tab-pill",
                    status === "draft" && "active",
                  )}
                  onClick={() => setStatus("draft")}
                >
                  {t.plan.quickAdd.statusDraft}
                </button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => openInAiMutation.mutate()}
            disabled={
              openInAiMutation.isPending || createMutation.isPending
            }
          >
            {openInAiMutation.isPending && (
              <Loader2 size={14} className="animate-spin" />
            )}
            {t.plan.quickAdd.openInAi}
          </Button>
          <Button
            onClick={submit}
            disabled={createMutation.isPending || !hook.trim()}
          >
            {createMutation.isPending && (
              <Loader2 size={14} className="animate-spin" />
            )}
            {t.plan.quickAdd.add}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
