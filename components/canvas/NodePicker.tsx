"use client";

/**
 * NodePicker — searchable popover for adding nodes.
 * Two presentation modes:
 *   - `centered`: pinned centered horizontally above the bottom toolbar.
 *     Used when triggered from the "+" button (B2 fix).
 *   - `at-point`: anchored at click position (with viewport clamping).
 *     Used when triggered from a double-click on the canvas pane.
 *
 * Body has max-height: 70vh + overflow-y: auto, search header is
 * `position: sticky; top: 0` so it never scrolls out of view.
 */

import * as React from "react";
import {
  FileAudio,
  Link as LinkIcon,
  PenLine,
  Search,
  Sparkles,
  Type,
  Youtube,
  type LucideIcon,
} from "lucide-react";
import type { NodeType, SourceInputType } from "@/lib/types";
import { t } from "@/lib/i18n";

export interface NodePickerItem {
  k: string;
  label: string;
  desc: string;
  iconCls: string;
  Icon: LucideIcon;
  type: NodeType;
  presetType?: SourceInputType;
}

export type NodePickerMode =
  | { kind: "centered" }
  | { kind: "at-point"; x: number; y: number };

interface NodePickerProps {
  mode: NodePickerMode;
  onPick: (item: NodePickerItem) => void;
  onClose: () => void;
}

const PICKER_W = 280;

export function NodePicker({ mode, onPick, onClose }: NodePickerProps) {
  const [q, setQ] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const items: NodePickerItem[] = [
    {
      k: "source-text",
      label: t.picker.items.sourceText.label,
      desc: t.picker.items.sourceText.desc,
      iconCls: "source-text",
      Icon: Type,
      type: "source",
      presetType: "text",
    },
    {
      k: "source-url",
      label: t.picker.items.sourceUrl.label,
      desc: t.picker.items.sourceUrl.desc,
      iconCls: "source-url",
      Icon: LinkIcon,
      type: "source",
      presetType: "url",
    },
    {
      k: "source-youtube",
      label: t.picker.items.sourceYoutube.label,
      desc: t.picker.items.sourceYoutube.desc,
      iconCls: "youtube",
      Icon: Youtube,
      type: "source",
      presetType: "youtube",
    },
    {
      k: "source-file",
      label: t.picker.items.sourceFile.label,
      desc: t.picker.items.sourceFile.desc,
      iconCls: "upload",
      Icon: FileAudio,
      type: "source",
      presetType: "file_upload",
    },
    {
      k: "extract",
      label: t.picker.items.extract.label,
      desc: t.picker.items.extract.desc,
      iconCls: "extract",
      Icon: Sparkles,
      type: "extract",
    },
    {
      k: "format",
      label: t.picker.items.format.label,
      desc: t.picker.items.format.desc,
      iconCls: "format",
      Icon: PenLine,
      type: "format",
    },
  ];

  const filtered = items.filter(
    (it) =>
      !q ||
      (it.label + " " + it.desc).toLowerCase().includes(q.toLowerCase()),
  );

  const positionStyle: React.CSSProperties = React.useMemo(() => {
    if (typeof window === "undefined") {
      return { position: "fixed", left: 0, top: 0 };
    }
    if (mode.kind === "centered") {
      // Centered horizontally, sitting just above the bottom toolbar.
      // Toolbar bottom-center occupies ~bottom: 18px (var) + ~52px height.
      const left = Math.max(12, (window.innerWidth - PICKER_W) / 2);
      return {
        position: "fixed",
        left,
        bottom: 96,
        width: PICKER_W,
      };
    }
    // at-point: clamp to viewport.
    const w = PICKER_W;
    const h = Math.min(
      window.innerHeight * 0.7,
      window.innerHeight - 24,
    );
    const left = Math.min(
      Math.max(12, mode.x),
      window.innerWidth - w - 12,
    );
    const top = Math.min(
      Math.max(12, mode.y),
      window.innerHeight - h - 12,
    );
    return { position: "fixed", left, top, width: w };
  }, [mode]);

  return (
    <>
      <div
        style={{ position: "fixed", inset: 0, zIndex: 49 }}
        onClick={onClose}
      />
      <div
        className="co-node-picker"
        style={{
          ...positionStyle,
          maxHeight: "70vh",
          overflowY: "auto",
          width: PICKER_W,
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          className="co-picker-search-wrap"
          style={{
            position: "sticky",
            top: 0,
            zIndex: 1,
            background: "#1a1c1e",
            paddingBottom: 6,
            marginBottom: 0,
          }}
        >
          <Search size={13} className="co-picker-search-icon" />
          <input
            ref={inputRef}
            className="co-picker-search"
            placeholder={t.picker.searchPlaceholder}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "Enter" && filtered[0]) onPick(filtered[0]);
            }}
          />
        </div>

        {filtered.length === 0 && (
          <div className="co-picker-category">{t.picker.nothing}</div>
        )}

        {filtered.length > 0 && (
          <>
            <div className="co-picker-category">{t.picker.category}</div>
            {filtered.map((it) => (
              <button
                type="button"
                key={it.k}
                className="co-picker-item"
                onClick={() => onPick(it)}
              >
                <div className={`co-picker-icon ${it.iconCls}`}>
                  <it.Icon size={14} />
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span>{it.label}</span>
                  <span className="co-picker-item-meta">{it.desc}</span>
                </div>
              </button>
            ))}
          </>
        )}
      </div>
    </>
  );
}
