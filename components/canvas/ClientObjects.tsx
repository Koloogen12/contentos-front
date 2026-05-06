"use client";

/**
 * ClientObjects — note / comment / text / arrow primitives.
 *
 * Backend has no schema for these and the `nodes.type` CHECK constraint
 * rejects unknown types. So we persist them in localStorage per-canvas
 * and render via React Flow custom node types (and one absolute SVG
 * overlay for arrows).
 *
 * Visuals are intentionally minimal — Miro-style enough to be useful
 * for placing labels and notes, not pixel-perfect parity. Resizable
 * corners are skipped for note (fixed default size); inline-edit on
 * double-click is supported everywhere.
 *
 * Storage key: `contentos.canvas.${canvasId}.client_objects`
 */

import * as React from "react";
import {
  Handle,
  Position,
  type NodeProps,
  type Node as RfNode,
} from "@xyflow/react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ClientObjectKind = "note" | "comment" | "text";

export interface ClientObject {
  id: string;
  kind: ClientObjectKind;
  x: number;
  y: number;
  w?: number;
  h?: number;
  text?: string;
  color?: string;
}

export interface ArrowObject {
  id: string;
  kind: "arrow";
  /** Two anchor points in flow-space (canvas coords). */
  from: { x: number; y: number };
  to: { x: number; y: number };
  color?: string;
}

export type AnyClientObject = ClientObject | ArrowObject;

const STORAGE_KEY = (canvasId: string) =>
  `contentos.canvas.${canvasId}.client_objects`;

export function loadClientObjects(canvasId: string): AnyClientObject[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY(canvasId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isAnyClientObject);
  } catch {
    return [];
  }
}

export function saveClientObjects(
  canvasId: string,
  objects: AnyClientObject[],
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY(canvasId),
      JSON.stringify(objects),
    );
  } catch {
    /* swallow quota errors */
  }
}

function isAnyClientObject(v: unknown): v is AnyClientObject {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (typeof o.id !== "string") return false;
  if (o.kind === "arrow") {
    return (
      typeof o.from === "object" &&
      typeof o.to === "object" &&
      o.from !== null &&
      o.to !== null
    );
  }
  return (
    (o.kind === "note" || o.kind === "comment" || o.kind === "text") &&
    typeof o.x === "number" &&
    typeof o.y === "number"
  );
}

// ----- React Flow node renderers --------------------------------------------

interface ClientNodeRfData extends Record<string, unknown> {
  obj: ClientObject;
  onTextChange: (id: string, text: string) => void;
  onDelete: (id: string) => void;
}

export function NoteNode({ data, selected }: NodeProps) {
  const typed = data as unknown as ClientNodeRfData;
  const obj = typed.obj;
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(obj.text ?? "");
  React.useEffect(() => setDraft(obj.text ?? ""), [obj.text]);

  return (
    <div
      style={{
        width: obj.w ?? 200,
        minHeight: obj.h ?? 160,
        background: obj.color ?? "#FFE082",
        borderRadius: 8,
        padding: 12,
        boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
        outline: selected ? "2px solid rgba(99,102,241,0.7)" : "none",
        outlineOffset: 2,
        color: "#1f1a05",
        fontSize: 13,
        fontFamily: "inherit",
        whiteSpace: "pre-wrap",
        cursor: editing ? "text" : "grab",
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={INVISIBLE_HANDLE}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={INVISIBLE_HANDLE}
      />
      <button
        type="button"
        className="nodrag"
        onClick={(e) => {
          e.stopPropagation();
          typed.onTextChange(obj.id, (obj.text ?? "") + "\n• ");
          setEditing(true);
        }}
        title="+ строка"
        style={{
          position: "absolute",
          top: 4,
          left: 4,
          width: 18,
          height: 18,
          borderRadius: 4,
          background: "rgba(0,0,0,0.05)",
          border: "none",
          color: "#1f1a05",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: 0.5,
          cursor: "pointer",
        }}
      >
        <Plus size={11} />
      </button>
      {editing ? (
        <textarea
          autoFocus
          className="nodrag"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            setEditing(false);
            if (draft !== (obj.text ?? "")) typed.onTextChange(obj.id, draft);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setDraft(obj.text ?? "");
              setEditing(false);
            }
          }}
          style={{
            background: "transparent",
            border: "none",
            outline: "none",
            color: "inherit",
            fontFamily: "inherit",
            fontSize: 13,
            lineHeight: 1.45,
            width: "100%",
            minHeight: 100,
            resize: "none",
            paddingTop: 14,
          }}
        />
      ) : (
        <div style={{ paddingTop: 14, lineHeight: 1.45 }}>
          {obj.text || (
            <span style={{ opacity: 0.4 }}>Двойной клик — править</span>
          )}
        </div>
      )}
    </div>
  );
}

export function CommentNode({ data, selected }: NodeProps) {
  const typed = data as unknown as ClientNodeRfData;
  const obj = typed.obj;
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(obj.text ?? "");
  React.useEffect(() => setDraft(obj.text ?? ""), [obj.text]);

  return (
    <div
      style={{
        width: 240,
        background: "rgba(20,22,24,0.95)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 12,
        boxShadow: "0 12px 32px rgba(0,0,0,0.6)",
        outline: selected ? "2px solid rgba(99,102,241,0.7)" : "none",
        outlineOffset: 2,
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={INVISIBLE_HANDLE}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={INVISIBLE_HANDLE}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 10px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          fontSize: 11,
          fontWeight: 600,
          color: "var(--text-secondary)",
        }}
      >
        <span>Комментарий</span>
        <button
          type="button"
          className="nodrag"
          onClick={(e) => {
            e.stopPropagation();
            typed.onDelete(obj.id);
          }}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text-muted)",
            cursor: "pointer",
            padding: 2,
          }}
        >
          <X size={12} />
        </button>
      </div>
      <div style={{ padding: "10px 12px" }}>
        {editing ? (
          <textarea
            autoFocus
            className="nodrag"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              setEditing(false);
              if (draft !== (obj.text ?? ""))
                typed.onTextChange(obj.id, draft);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              minHeight: 60,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 6,
              padding: 6,
              color: "var(--text-primary)",
              fontSize: 12,
              fontFamily: "inherit",
              outline: "none",
              resize: "vertical",
            }}
          />
        ) : (
          <div
            style={{
              fontSize: 12,
              color: "var(--text-primary)",
              lineHeight: 1.45,
              whiteSpace: "pre-wrap",
              minHeight: 30,
            }}
          >
            {obj.text || (
              <span style={{ color: "var(--text-muted)" }}>
                Двойной клик — править
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function TextNode({ data, selected }: NodeProps) {
  const typed = data as unknown as ClientNodeRfData;
  const obj = typed.obj;
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(obj.text ?? "");
  React.useEffect(() => setDraft(obj.text ?? ""), [obj.text]);

  const beginEdit = () => setEditing(true);

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        beginEdit();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        beginEdit();
      }}
      style={{
        minWidth: 80,
        padding: 4,
        outline: selected ? "1px dashed rgba(99,102,241,0.7)" : "none",
        outlineOffset: 2,
        cursor: editing ? "text" : "grab",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={INVISIBLE_HANDLE}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={INVISIBLE_HANDLE}
      />
      {editing ? (
        <input
          autoFocus
          className="nodrag"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            setEditing(false);
            if (draft !== (obj.text ?? "")) typed.onTextChange(obj.id, draft);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Escape") {
              (e.currentTarget as HTMLInputElement).blur();
            }
          }}
          style={{
            background: "transparent",
            border: "none",
            outline: "none",
            color: "var(--text-primary)",
            fontFamily: "inherit",
            fontSize: 14,
            width: Math.max(80, (draft.length + 2) * 8),
          }}
        />
      ) : (
        <span
          style={{
            color: "var(--text-primary)",
            fontSize: 14,
            opacity: obj.text ? 1 : 0.4,
          }}
        >
          {obj.text || "Текст"}
        </span>
      )}
    </div>
  );
}

const INVISIBLE_HANDLE: React.CSSProperties = {
  width: 1,
  height: 1,
  background: "transparent",
  border: "none",
  opacity: 0,
};

// ----- Builder helpers ------------------------------------------------------

export function makeRfNodeForClientObject(
  obj: ClientObject,
  handlers: {
    onTextChange: (id: string, text: string) => void;
    onDelete: (id: string) => void;
  },
): RfNode<ClientNodeRfData> {
  // Explicit width/height: RF v12 keeps nodes visibility:hidden until it
  // measures their bounds. When children are flexible (e.g. textarea),
  // measurement can be deferred and the node never becomes visible. We
  // pass measured size up front so RF unhides immediately.
  const measured =
    obj.kind === "note"
      ? { width: obj.w ?? 200, height: obj.h ?? 160 }
      : obj.kind === "comment"
        ? { width: obj.w ?? 240, height: 100 }
        : { width: obj.w ?? 120, height: 32 };
  return {
    id: obj.id,
    type:
      obj.kind === "note"
        ? "co-note"
        : obj.kind === "comment"
          ? "co-comment"
          : "co-text",
    position: { x: obj.x, y: obj.y },
    data: { obj, ...handlers },
    deletable: true,
    selectable: true,
    draggable: true,
    ...measured,
  };
}

// ----- Arrow overlay --------------------------------------------------------

interface ArrowOverlayProps {
  arrows: ArrowObject[];
  /** Convert flow-space (canvas coord) point to viewport screen coords. */
  flowToScreen: (x: number, y: number) => { x: number; y: number };
  selectedId: string | null;
}

/**
 * Renders client-side arrows as a fixed-position SVG overlay that
 * tracks the canvas viewport. Uses `useStore(transform)` reactively
 * via the parent — we don't grab the store here; the parent re-renders
 * on viewport change, which calls `flowToScreen` again.
 *
 * Limitation: arrows are non-interactive (no click-to-select); we
 * delete via Backspace using a separate logical id stored in selection
 * state. This is the documented fallback for the v1 of this pass.
 */
export function ArrowOverlay({
  arrows,
  flowToScreen,
  selectedId,
}: ArrowOverlayProps) {
  if (arrows.length === 0) return null;
  return (
    <svg
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 4,
      }}
    >
      <defs>
        <marker
          id="co-arrow-head"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="5"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path d="M0,0 L0,10 L10,5 z" fill="rgba(244,244,245,0.85)" />
        </marker>
      </defs>
      {arrows.map((a) => {
        const from = flowToScreen(a.from.x, a.from.y);
        const to = flowToScreen(a.to.x, a.to.y);
        const isSel = a.id === selectedId;
        return (
          <line
            key={a.id}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={isSel ? "rgba(99,102,241,0.9)" : "rgba(244,244,245,0.85)"}
            strokeWidth={isSel ? 3 : 2}
            markerEnd="url(#co-arrow-head)"
          />
        );
      })}
    </svg>
  );
}

export function makeId(): string {
  return `cli_${Math.random().toString(36).slice(2, 10)}`;
}
