"use client";

/**
 * TweaksPanel — port of `THE CONTENT-2/tweaks-panel.jsx`. Floating
 * right-side panel with grouped tweak actions for the selected node.
 *
 * NOTE / DEVIATION: the prototype's tweaks panel ships sliders for things
 * like "длина", "острота", "тональность" that don't map 1:1 to backend
 * modes. Per spec, we render those as discrete pills laid out in two
 * groups (Idea adjustments / Voice & length).
 *
 * Mounted by `CanvasEditor` when a single extract/format node is selected
 * and the user hasn't collapsed the panel (state persists in
 * `localStorage[contentos.tweaks-panel.collapsed]`).
 */

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Mic,
  PenLine,
  RefreshCcw,
  RefreshCw,
  Wand2,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import {
  tweakNode,
  type ExtractTweakMode,
  type FormatTweakMode,
} from "@/lib/tweaks";
import { useCanvasNodeContext } from "./canvasContext";
import type { NodeOut } from "@/lib/types";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface TweaksPanelProps {
  node: NodeOut;
  onClose: () => void;
}

export function TweaksPanel({ node, onClose }: TweaksPanelProps) {
  const { attachSkillRun } = useCanvasNodeContext();
  const tweakMutation = useMutation({
    mutationFn: (mode: ExtractTweakMode | FormatTweakMode) =>
      tweakNode(node.id, mode),
    onSuccess: ({ skill_run_id }) => {
      attachSkillRun(node.id, skill_run_id);
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : t.canvas.couldNotStartRun,
      ),
  });

  const isExtract = node.type === "extract";

  return (
    <aside
      className={cn(
        // Floating bottom-right above the MiniMap (~190px).
        "fixed bottom-[210px] right-4 z-30 w-[268px]",
        "rounded-2xl border border-border bg-card/95",
        "shadow-[0_24px_60px_rgba(0,0,0,0.6)] backdrop-blur-md",
        "animate-in slide-in-from-right-4 fade-in duration-150",
      )}
      role="complementary"
      aria-label="Tweaks"
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60">
        <div className="text-[12px] font-semibold tracking-wide text-foreground">
          Tweaks
        </div>
        <button
          type="button"
          className="co-iconbtn"
          onClick={onClose}
          aria-label={t.common.close}
        >
          <X size={13} />
        </button>
      </div>

      <div className="px-4 py-3 flex flex-col gap-3">
        {isExtract ? (
          <Group title="Idea adjustments">
            <PillBtn
              Icon={RefreshCw}
              label={t.extract.actions.reextract}
              onClick={() => tweakMutation.mutate("reextract")}
              busy={tweakMutation.isPending}
            />
            <PillBtn
              Icon={Zap}
              label={t.extract.actions.amplify}
              onClick={() => tweakMutation.mutate("amplify")}
              busy={tweakMutation.isPending}
            />
            <PillBtn
              Icon={PenLine}
              label={t.extract.actions.rephrase}
              onClick={() => tweakMutation.mutate("rephrase")}
              busy={tweakMutation.isPending}
            />
          </Group>
        ) : (
          <>
            <Group title="Voice & length">
              <PillBtn
                Icon={RefreshCw}
                label={t.format.actions.regenerate}
                onClick={() => tweakMutation.mutate("regenerate")}
                busy={tweakMutation.isPending}
              />
              <PillBtn
                Icon={Zap}
                label={t.format.actions.shorten}
                onClick={() => tweakMutation.mutate("shorten")}
                busy={tweakMutation.isPending}
              />
              <PillBtn
                Icon={Mic}
                label={t.format.actions.amplifyVoice}
                onClick={() => tweakMutation.mutate("amplify_voice")}
                busy={tweakMutation.isPending}
              />
            </Group>
            <Group title="Hook & platform">
              <PillBtn
                Icon={RefreshCcw}
                label={t.format.actions.rehook}
                onClick={() => tweakMutation.mutate("rehook")}
                busy={tweakMutation.isPending}
              />
              <PillBtn
                Icon={Wand2}
                label={t.format.actions.platform}
                onClick={() => tweakMutation.mutate("platform_optimize")}
                busy={tweakMutation.isPending}
              />
            </Group>
          </>
        )}

        <div className="text-[10px] leading-relaxed text-[color:var(--text-muted)] pt-2 border-t border-border/60">
          Каждое действие создаёт новый snapshot. Откатиться — через «Версии».
        </div>
      </div>
    </aside>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-[color:var(--text-muted)] mb-1.5">
        {title}
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function PillBtn({
  Icon,
  label,
  onClick,
  busy,
}: {
  Icon: LucideIcon;
  label: string;
  onClick: () => void;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      className="co-btn co-btn-ghost"
      onClick={onClick}
      disabled={busy}
    >
      <Icon size={11} />
      {label}
    </button>
  );
}
