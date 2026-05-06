"use client";

/**
 * CanvasToolbar — 1:1 port of `THE CONTENT-2/chrome.jsx#CanvasToolbar`.
 * Pill toolbar at bottom-center with select / pan / sticky / comment /
 * text / arrow / + (add node).
 */

import * as React from "react";
import {
  ArrowUpRight,
  Hand,
  MessageCircle,
  MousePointer2,
  Plus,
  StickyNote,
  Type,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

export type CanvasTool =
  | "select"
  | "pan"
  | "note"
  | "comment"
  | "text"
  | "arrow";

interface CanvasToolbarProps {
  tool: CanvasTool;
  setTool: (tool: CanvasTool) => void;
  onAddNode: () => void;
}

export function CanvasToolbar({ tool, setTool, onAddNode }: CanvasToolbarProps) {
  return (
    <div className="co-canvas-toolbar">
      <ToolBtn k="select" tool={tool} setTool={setTool} title={`${t.toolbar.select} (V)`}>
        <MousePointer2 size={18} />
      </ToolBtn>
      <ToolBtn k="pan" tool={tool} setTool={setTool} title={`${t.toolbar.pan} (Space)`}>
        <Hand size={18} />
      </ToolBtn>
      <div className="co-toolbar-sep" />
      <ToolBtn k="note" tool={tool} setTool={setTool} title={t.toolbar.note}>
        <StickyNote size={18} />
      </ToolBtn>
      <ToolBtn
        k="comment"
        tool={tool}
        setTool={setTool}
        title={t.toolbar.comment}
      >
        <MessageCircle size={18} />
      </ToolBtn>
      <div className="co-toolbar-sep" />
      <ToolBtn k="text" tool={tool} setTool={setTool} title={t.toolbar.text}>
        <Type size={18} />
      </ToolBtn>
      <ToolBtn k="arrow" tool={tool} setTool={setTool} title={t.toolbar.arrow}>
        <ArrowUpRight size={18} />
      </ToolBtn>
      <button
        type="button"
        className="co-toolbar-btn"
        onClick={onAddNode}
        title={t.toolbar.addNode}
      >
        <Plus size={18} />
      </button>
    </div>
  );
}

function ToolBtn({
  k,
  tool,
  setTool,
  title,
  children,
}: {
  k: CanvasTool;
  tool: CanvasTool;
  setTool: (t: CanvasTool) => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={cn("co-toolbar-btn", tool === k && "active")}
      title={title}
      onClick={() => setTool(k)}
    >
      {children}
    </button>
  );
}
