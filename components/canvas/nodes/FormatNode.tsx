"use client";

import * as React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Check, Copy, Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import type { FormatNodeData, FormatPlatform, NodeOut } from "@/lib/types";
import { useCanvasNodeContext } from "@/components/canvas/canvasContext";
import { cn } from "@/lib/utils";
import { NODE_HANDLE_STYLE, NodeShell } from "./NodeShell";

interface FormatNodeRfData {
  node: NodeOut;
  expanded: boolean;
  onToggleExpanded: () => void;
}

const PLATFORM_OPTIONS: { value: FormatPlatform; label: string }[] = [
  { value: "telegram", label: "Telegram" },
  { value: "linkedin", label: "LinkedIn" },
];

export function FormatNode({ data, selected }: NodeProps) {
  const typed = data as unknown as FormatNodeRfData;
  const node = typed.node;
  const expanded = typed.expanded;
  const { updateNodeData, runNode, isRunning } = useCanvasNodeContext();
  const running = isRunning(node.id);
  const format = (node.data ?? {}) as FormatNodeData;
  const platform: FormatPlatform = format.platform ?? "telegram";
  const hooks = format.hooks ?? [];
  const selectedHook = format.selected_hook_index ?? 0;
  const [copied, setCopied] = React.useState(false);

  const onPlatformChange = async (next: FormatPlatform) => {
    if (next === platform) return;
    await updateNodeData(node.id, { platform: next });
  };

  const onSelectHook = async (i: number) => {
    if (i === selectedHook) return;
    await updateNodeData(node.id, { selected_hook_index: i });
  };

  const onCopy = async () => {
    if (!format.full_text) return;
    try {
      await navigator.clipboard.writeText(format.full_text);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        style={NODE_HANDLE_STYLE}
      />
      <NodeShell
        title={`Format → ${platform.charAt(0).toUpperCase() + platform.slice(1)}`}
        status={node.status}
        selected={!!selected}
        expanded={expanded}
        onToggleExpanded={typed.onToggleExpanded}
        subhead={
          hooks.length > 0 ? `${hooks.length} hooks generated` : undefined
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
        <div className="space-y-2.5">
          <div className="nodrag flex items-center gap-1 rounded-md border border-white/5 bg-black/30 p-0.5">
            {PLATFORM_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={cn(
                  "flex-1 rounded px-2 py-1 text-[11px] font-medium transition-colors",
                  platform === opt.value
                    ? "bg-white/10 text-foreground"
                    : "text-zinc-400 hover:text-zinc-200",
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  void onPlatformChange(opt.value);
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {hooks.length === 0 ? (
            <p className="text-xs leading-relaxed text-zinc-500">
              Connect a talking point and click Run.
            </p>
          ) : (
            <>
              <div className="space-y-1">
                <div className="text-[10px] uppercase tracking-wide text-zinc-500">
                  Hooks
                </div>
                <ul className="space-y-1">
                  {hooks.map((hook, i) => {
                    const isSelected = selectedHook === i;
                    return (
                      <li key={i}>
                        <button
                          type="button"
                          className={cn(
                            "nodrag flex w-full items-start gap-2 rounded-md border px-2 py-1.5 text-left text-[11px] leading-snug transition-colors",
                            isSelected
                              ? "border-primary/60 bg-primary/10 text-foreground"
                              : "border-white/5 bg-black/30 text-zinc-300 hover:bg-black/50",
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            void onSelectHook(i);
                          }}
                        >
                          <span
                            className={cn(
                              "mt-0.5 h-3 w-3 shrink-0 rounded-full border",
                              isSelected
                                ? "border-primary bg-primary"
                                : "border-zinc-500",
                            )}
                            aria-hidden
                          />
                          <span
                            className={cn(
                              expanded ? "line-clamp-none" : "line-clamp-2",
                            )}
                          >
                            {hook}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {expanded && format.body && (
                <div className="space-y-1">
                  <div className="text-[10px] uppercase tracking-wide text-zinc-500">
                    Body
                  </div>
                  <div className="scrollbar-thin max-h-[180px] overflow-auto whitespace-pre-wrap rounded-md border border-white/5 bg-black/30 p-2 text-[11px] leading-relaxed text-zinc-200">
                    {format.body}
                  </div>
                </div>
              )}

              {format.cta && (
                <div className="text-[11px] text-zinc-400">
                  <span className="text-zinc-500">CTA:</span>{" "}
                  <span className="font-medium text-zinc-200">
                    {format.cta}
                  </span>
                </div>
              )}

              <button
                type="button"
                className="nodrag inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-[11px] font-medium text-zinc-200 hover:bg-black/60 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={(e) => {
                  e.stopPropagation();
                  void onCopy();
                }}
                disabled={!format.full_text}
              >
                {copied ? (
                  <Check className="h-3 w-3 text-emerald-400" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                {copied ? "Copied" : "Copy full text"}
              </button>
            </>
          )}
        </div>
      </NodeShell>
    </>
  );
}
