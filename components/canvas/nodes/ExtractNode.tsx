"use client";

/**
 * ExtractNode — 1:1 port of `THE CONTENT-2/nodes.jsx#ExtractNode`.
 * Width 320px. Renders found talking points with viral-score badge,
 * category label, selection ("Используется →") and bottom action chips
 * for Переизвлечь / Усилить / Перефразировать.
 */

import * as React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useMutation } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  Loader2,
  PenLine,
  Play,
  RefreshCw,
  Sparkles,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { tweakNode, type ExtractTweakMode } from "@/lib/tweaks";
import type { ExtractNodeData, NodeOut } from "@/lib/types";
import { useCanvasNodeContext } from "@/components/canvas/canvasContext";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

interface ExtractNodeRfData {
  node: NodeOut;
}

export function ExtractNode({ data, selected }: NodeProps) {
  const typed = data as unknown as ExtractNodeRfData;
  const node = typed.node;
  const { updateNodeData, runNode, isRunning, attachSkillRun, readOnly } =
    useCanvasNodeContext();
  const status = node.status;
  const running = isRunning(node.id);
  const extract = (node.data ?? {}) as ExtractNodeData;
  const points = extract.talking_points ?? [];
  const selectedIdx = extract.selected_index ?? null;
  const hasInput = true; // true when an upstream edge exists; CanvasEditor controls upstream gating

  const tweakMutation = useMutation({
    mutationFn: ({ mode }: { mode: ExtractTweakMode }) =>
      tweakNode(node.id, mode),
    onSuccess: ({ skill_run_id }) => {
      attachSkillRun(node.id, skill_run_id);
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : t.canvas.couldNotStartRun,
      ),
  });

  const selectPoint = async (i: number) => {
    if (readOnly) return;
    if (selectedIdx === i) return;
    await updateNodeData(node.id, { selected_index: i });
  };

  return (
    <div className="relative" style={{ width: 320 }}>
      <Handle
        type="target"
        position={Position.Left}
        style={PORT_STYLE_LEFT}
      >
        <ArrowRight size={12} />
      </Handle>
      <div className="co-node-label">
        <Sparkles size={12} />
        <span>{t.extract.label}</span>
      </div>
      <div
        className={cn(
          "co-node-shell",
          selected && "selected",
          status === "running" && "running",
          status === "done" && "done",
          status === "error" && "error",
        )}
      >
        <span className={`co-node-status-dot ${status ?? "idle"}`} />
        <Handle
          type="source"
          position={Position.Right}
          style={{
            ...PORT_STYLE_RIGHT,
            opacity: status === "done" && selectedIdx != null ? 1 : 0.4,
          }}
        >
          <ArrowRight size={12} />
        </Handle>

        <div className="co-node-content">
          {!hasInput && (
            <div className="co-placeholder-empty">
              <ArrowRight
                size={13}
                style={{ transform: "rotate(180deg)" }}
              />
              <span>{t.extract.placeholderConnect}</span>
            </div>
          )}

          {hasInput && status === "idle" && points.length === 0 && (
            <button
              type="button"
              className="co-btn co-btn-primary nodrag"
              onClick={(e) => {
                e.stopPropagation();
                runNode(node.id);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              disabled={readOnly || running}
            >
              <Play size={14} />
              {t.extract.runButton}
            </button>
          )}

          {hasInput && (status === "running" || running) && (
            <>
              <div className="co-spin-row">
                <div className="co-spinner" />
                <span>{t.extract.runningStatus}</span>
              </div>
              <div className="co-skeleton">
                <div className="co-skeleton-card" />
                <div
                  className="co-skeleton-card"
                  style={{ height: 60, opacity: 0.7 }}
                />
                <div
                  className="co-skeleton-card"
                  style={{ height: 50, opacity: 0.45 }}
                />
              </div>
            </>
          )}

          {status === "error" && (
            <div
              className="co-placeholder-empty"
              style={{
                borderColor: "rgba(239,68,68,0.3)",
                color: "#fca5a5",
              }}
            >
              <AlertCircle size={13} />
              <span>{t.extract.error}</span>
            </div>
          )}

          {status === "done" && points.length > 0 && (
            <>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                {t.extract.foundCount(points.length)}
              </div>
              <div className="flex flex-col gap-1.5">
                {points.map((tp, i) => (
                  <TalkingPointCard
                    key={i}
                    index={i + 1}
                    score={tp.viral_score}
                    category={tp.category}
                    text={tp.text}
                    selected={selectedIdx === i}
                    onClick={() => void selectPoint(i)}
                    readOnly={!!readOnly}
                  />
                ))}
              </div>

              {!readOnly && (
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  <button
                    type="button"
                    className="co-btn co-btn-ghost nodrag"
                    onClick={(e) => {
                      e.stopPropagation();
                      tweakMutation.mutate({ mode: "reextract" });
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    disabled={running || tweakMutation.isPending}
                  >
                    {tweakMutation.isPending &&
                    tweakMutation.variables?.mode === "reextract" ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : (
                      <RefreshCw size={11} />
                    )}
                    {t.extract.actions.reextract}
                  </button>
                  <button
                    type="button"
                    className="co-btn co-btn-ghost nodrag"
                    onClick={(e) => {
                      e.stopPropagation();
                      tweakMutation.mutate({ mode: "amplify" });
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    disabled={running || tweakMutation.isPending}
                  >
                    {tweakMutation.isPending &&
                    tweakMutation.variables?.mode === "amplify" ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : (
                      <Zap size={11} />
                    )}
                    {t.extract.actions.amplify}
                  </button>
                  <button
                    type="button"
                    className="co-btn co-btn-ghost nodrag"
                    onClick={(e) => {
                      e.stopPropagation();
                      tweakMutation.mutate({ mode: "rephrase" });
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    disabled={running || tweakMutation.isPending}
                  >
                    {tweakMutation.isPending &&
                    tweakMutation.variables?.mode === "rephrase" ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : (
                      <PenLine size={11} />
                    )}
                    {t.extract.actions.rephrase}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TalkingPointCard({
  index,
  score,
  category,
  text,
  selected,
  onClick,
  readOnly,
}: {
  index: number;
  score: number;
  category: string;
  text: string;
  selected: boolean;
  onClick: () => void;
  readOnly: boolean;
}) {
  const cls =
    score >= 17 ? "co-score-high" : score >= 13 ? "co-score-mid" : "co-score-low";
  return (
    <button
      type="button"
      className={cn("co-tp-card nodrag", selected && "selected")}
      onClick={(e) => {
        e.stopPropagation();
        if (!readOnly) onClick();
      }}
      onMouseDown={(e) => e.stopPropagation()}
      disabled={readOnly}
    >
      <div className="co-tp-head">
        <span className="text-[10px] font-semibold tabular-nums text-[color:var(--text-muted)]">
          {index}.
        </span>
        <span className={cn("co-score-badge", cls)}>{score}</span>
        <span className="co-tp-category">{category}</span>
      </div>
      <div className="co-tp-text">{text}</div>
      <div className="co-tp-use-row">
        <span>{selected ? t.extract.used : ""}</span>
        <ArrowRight size={11} />
      </div>
    </button>
  );
}

const PORT_STYLE_RIGHT: React.CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: 999,
  background: "var(--port-bg)",
  border: "1px solid rgba(0, 0, 0, 0.06)",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.4)",
  right: -13,
  color: "rgba(255,255,255,0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 3,
};

const PORT_STYLE_LEFT: React.CSSProperties = {
  ...PORT_STYLE_RIGHT,
  right: undefined,
  left: -13,
};
