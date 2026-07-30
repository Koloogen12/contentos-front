"use client";

/**
 * CanvasToolbar — панель инструментов внизу канваса.
 *
 * Разметка по прототипу THE DRAFT (prime2-canvas.jsx): контейнер `.toolbar`,
 * каждая кнопка — `.ib .tt` с подсказкой в `data-tt` и активным состоянием
 * через `data-on`. Разделителей между группами в прототипе нет — кнопки идут
 * подряд, поэтому их здесь тоже нет. Иконки 16px: `.ib` — квадрат 32px,
 * при 18px иконка садится на границы.
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
import { t } from "@/lib/i18n";

export type CanvasTool =
  | "select"
  | "pan"
  | "note"
  | "comment"
  | "text"
  | "arrow";

const ICON = 16;

interface CanvasToolbarProps {
  tool: CanvasTool;
  setTool: (tool: CanvasTool) => void;
  onAddNode: () => void;
}

export function CanvasToolbar({ tool, setTool, onAddNode }: CanvasToolbarProps) {
  return (
    <div className="toolbar">
      <ToolBtn k="select" tool={tool} setTool={setTool} tip={`${t.toolbar.select} · V`}>
        <MousePointer2 size={ICON} />
      </ToolBtn>
      <ToolBtn k="pan" tool={tool} setTool={setTool} tip={`${t.toolbar.pan} · H`}>
        <Hand size={ICON} />
      </ToolBtn>
      <ToolBtn k="note" tool={tool} setTool={setTool} tip={`${t.toolbar.note} · N`}>
        <StickyNote size={ICON} />
      </ToolBtn>
      <ToolBtn k="comment" tool={tool} setTool={setTool} tip={`${t.toolbar.comment} · C`}>
        <MessageCircle size={ICON} />
      </ToolBtn>
      <ToolBtn k="text" tool={tool} setTool={setTool} tip={`${t.toolbar.text} · T`}>
        <Type size={ICON} />
      </ToolBtn>
      <ToolBtn k="arrow" tool={tool} setTool={setTool} tip={`${t.toolbar.arrow} · A`}>
        <ArrowUpRight size={ICON} />
      </ToolBtn>
      <button
        type="button"
        className="ib tt"
        data-tt={t.toolbar.addNode}
        aria-label={t.toolbar.addNode}
        onClick={onAddNode}
      >
        <Plus size={ICON} />
      </button>
    </div>
  );
}

function ToolBtn({
  k,
  tool,
  setTool,
  tip,
  children,
}: {
  k: CanvasTool;
  tool: CanvasTool;
  setTool: (t: CanvasTool) => void;
  tip: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="ib tt"
      data-tt={tip}
      data-on={tool === k ? "1" : "0"}
      aria-label={tip}
      aria-pressed={tool === k}
      onClick={() => setTool(k)}
    >
      {children}
    </button>
  );
}
