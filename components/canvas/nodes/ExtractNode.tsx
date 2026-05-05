"use client";

import * as React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Loader2, Play } from "lucide-react";
import type { ExtractNodeData, NodeOut } from "@/lib/types";
import { useCanvasNodeContext } from "@/components/canvas/canvasContext";
import { cn } from "@/lib/utils";
import { NODE_HANDLE_STYLE, NodeShell } from "./NodeShell";

interface ExtractNodeRfData {
  node: NodeOut;
  expanded: boolean;
  onToggleExpanded: () => void;
}

export function ExtractNode({ data, selected }: NodeProps) {
  const typed = data as unknown as ExtractNodeRfData;
  const node = typed.node;
  const expanded = typed.expanded;
  const { updateNodeData, runNode, isRunning } = useCanvasNodeContext();
  const running = isRunning(node.id);
  const extract = (node.data ?? {}) as ExtractNodeData;
  const points = extract.talking_points ?? [];
  const selectedIndex = extract.selected_index ?? null;

  const selectPoint = async (index: number) => {
    if (selectedIndex === index) return;
    await updateNodeData(node.id, { selected_index: index });
  };

  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        style={NODE_HANDLE_STYLE}
      />
      <NodeShell
        title="Extract → Talking Points"
        status={node.status}
        selected={!!selected}
        expanded={expanded}
        onToggleExpanded={typed.onToggleExpanded}
        subhead={
          points.length > 0 ? `${points.length} talking points` : undefined
        }
        headerActions={
          <button
            type="button"
            className="nodrag inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={(e) => {
              e.stopPropagation();
              runNode(node.id);
            }}
            disabled={running}
            title="Run viral_talking_points skill"
          >
            {running ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Play className="h-3 w-3" />
            )}
            Run
          </button>
        }
      >
        {points.length === 0 ? (
          <p className="text-xs leading-relaxed text-zinc-500">
            Connect a source and click Run.
          </p>
        ) : (
          <ul
            className={cn(
              "scrollbar-thin space-y-1.5 overflow-auto pr-1",
              expanded ? "max-h-[360px]" : "max-h-[160px]",
            )}
          >
            {points.map((p, i) => {
              const isSelected = selectedIndex === i;
              return (
                <li key={i}>
                  <button
                    type="button"
                    className={cn(
                      "nodrag block w-full rounded-md border px-2.5 py-2 text-left text-[11px] leading-snug transition-colors",
                      isSelected
                        ? "border-primary/60 bg-primary/10 text-foreground"
                        : "border-white/5 bg-black/30 text-zinc-300 hover:border-white/10 hover:bg-black/50",
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      void selectPoint(i);
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={cn(
                          "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                          p.viral_score >= 17
                            ? "bg-emerald-500/15 text-emerald-300"
                            : p.viral_score >= 13
                              ? "bg-amber-500/15 text-amber-300"
                              : "bg-zinc-500/15 text-zinc-400",
                        )}
                        title="viral score"
                      >
                        {p.viral_score}
                      </span>
                      <span
                        className={cn(
                          expanded ? "line-clamp-none" : "line-clamp-2",
                        )}
                      >
                        {p.text}
                      </span>
                    </div>
                    {expanded && p.category && (
                      <div className="mt-1 text-[10px] uppercase tracking-wide text-zinc-500">
                        {p.category}
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </NodeShell>
      <Handle
        type="source"
        position={Position.Right}
        style={NODE_HANDLE_STYLE}
      />
    </>
  );
}
