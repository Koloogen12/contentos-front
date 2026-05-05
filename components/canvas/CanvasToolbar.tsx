"use client";

import * as React from "react";
import { FileText, Plus, Sparkles, Wand2 } from "lucide-react";
import type { NodeType } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CanvasToolbarProps {
  onAddNode: (type: NodeType) => void;
  busy?: boolean;
}

export function CanvasToolbar({ onAddNode, busy }: CanvasToolbarProps) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2">
      <div
        className={cn(
          "pointer-events-auto flex items-center gap-1 rounded-full border border-white/10 bg-[#11140E]/95 p-1 shadow-xl backdrop-blur",
          busy && "opacity-80",
        )}
      >
        <ToolbarButton
          label="Source"
          icon={<FileText className="h-3.5 w-3.5" />}
          onClick={() => onAddNode("source")}
          disabled={busy}
        />
        <ToolbarButton
          label="Extract"
          icon={<Sparkles className="h-3.5 w-3.5" />}
          onClick={() => onAddNode("extract")}
          disabled={busy}
        />
        <ToolbarButton
          label="Format"
          icon={<Wand2 className="h-3.5 w-3.5" />}
          onClick={() => onAddNode("format")}
          disabled={busy}
        />
      </div>
    </div>
  );
}

function ToolbarButton({
  label,
  icon,
  onClick,
  disabled,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Plus className="h-3 w-3 text-zinc-400" aria-hidden />
      {icon}
      {label}
    </button>
  );
}
