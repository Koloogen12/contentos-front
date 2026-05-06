"use client";

/**
 * NodePicker — 1:1 port of `THE CONTENT-2/chrome.jsx#NodePicker`.
 * Searchable popover for "+" toolbar button. Picks an item, calls
 * `onPick({ type, presetType })`, and the caller creates a node at
 * the canvas viewport center.
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

interface NodePickerProps {
  x: number;
  y: number;
  onPick: (item: NodePickerItem) => void;
  onClose: () => void;
}

export function NodePicker({ x, y, onPick, onClose }: NodePickerProps) {
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

  const w = 256;
  const left =
    typeof window !== "undefined"
      ? Math.min(x, window.innerWidth - w - 12)
      : x;
  const top =
    typeof window !== "undefined"
      ? Math.min(y, window.innerHeight - 360)
      : y;

  return (
    <>
      <div
        style={{ position: "fixed", inset: 0, zIndex: 49 }}
        onClick={onClose}
      />
      <div
        className="co-node-picker"
        style={{ left, top }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="co-picker-search-wrap">
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
