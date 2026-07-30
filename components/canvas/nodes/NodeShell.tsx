"use client";

import * as React from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import type { NodeStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

const STATUS_BORDER: Record<NodeStatus, string> = {
  idle: "border-[color:var(--node-border)]",
  running: "border-content/80 shadow-[0_0_0_3px_rgba(99,102,241,0.18)]",
  done: "border-success/70",
  error: "border-destructive/80",
};

const STATUS_DOT: Record<NodeStatus, string> = {
  idle: "bg-muted",
  running: "bg-content animate-pulse",
  done: "bg-success",
  error: "bg-destructive",
};

const STATUS_LABEL: Record<NodeStatus, string> = {
  idle: t.nodeStatus.idle,
  running: t.nodeStatus.running,
  done: t.nodeStatus.done,
  error: t.nodeStatus.error,
};

interface NodeShellProps {
  title: string;
  status: NodeStatus;
  selected: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
  /** Optional subhead under the title (e.g. transcription source). */
  subhead?: React.ReactNode;
  /** Right side of header (e.g. "Run" button). */
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}

export function NodeShell({
  title,
  status,
  selected,
  expanded,
  onToggleExpanded,
  subhead,
  headerActions,
  children,
}: NodeShellProps) {
  return (
    <div
      className={cn(
        "w-[320px] rounded-xl border-2 bg-[color:var(--node-bg)] text-foreground shadow-lg transition-all",
        STATUS_BORDER[status],
        selected && "ring-2 ring-primary/40 ring-offset-1 ring-offset-[#000]",
      )}
    >
      <div className="flex items-start justify-between gap-2 border-b border-border/60 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[status])}
              aria-hidden
            />
            <span className="line-clamp-1 text-xs font-semibold uppercase tracking-wider text-foreground/80">
              {title}
            </span>
            <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">
              {STATUS_LABEL[status]}
            </span>
          </div>
          {subhead && (
            <div className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
              {subhead}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {headerActions}
          <button
            type="button"
            className="nodrag rounded-md p-1 text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpanded();
            }}
            title={expanded ? "Свернуть" : "Развернуть"}
          >
            {expanded ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
      <div className="px-3 py-3">{children}</div>
    </div>
  );
}

export const NODE_HANDLE_STYLE: React.CSSProperties = {
  width: 10,
  height: 10,
  background: "hsl(var(--primary))",
  border: "2px solid #11140E",
};
