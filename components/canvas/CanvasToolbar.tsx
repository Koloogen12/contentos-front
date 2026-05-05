"use client";

import * as React from "react";
import { FileText, LibraryBig, Plus, Sparkles, Wand2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { NodeType } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CanvasToolbarProps {
  onAddNode: (type: NodeType) => void;
  busy?: boolean;
}

export function CanvasToolbar({ onAddNode, busy }: CanvasToolbarProps) {
  const [templatesOpen, setTemplatesOpen] = React.useState(false);

  return (
    <>
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
          <span className="mx-1 h-5 w-px bg-white/10" aria-hidden />
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => setTemplatesOpen(true)}
            disabled={busy}
          >
            <LibraryBig className="h-3.5 w-3.5" />
            Templates
          </button>
        </div>
      </div>

      <Dialog open={templatesOpen} onOpenChange={setTemplatesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Templates</DialogTitle>
            <DialogDescription>
              Save common pipelines (e.g. YouTube → Telegram post) and reuse
              them with one click.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
            Coming soon.
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTemplatesOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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
