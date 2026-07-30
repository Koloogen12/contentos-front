"use client";

/**
 * ContentViewerModal — full-screen reader for long node text (transcripts,
 * fetched articles, generated posts). Escapes the canvas so the user can
 * actually READ and COPY content that's otherwise clipped inside a fixed-size
 * node card.
 *
 * Rendered via createPortal to document.body so the backdrop-blur containing
 * block of the canvas topbar can't clip a `position: fixed` overlay (same
 * lesson as the trial/convert modal).
 */

import * as React from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Download, X } from "lucide-react";
import { toast } from "sonner";

interface ContentViewerModalProps {
  open: boolean;
  title: string;
  text: string;
  /** Optional filename for the download button; omit to hide download. */
  downloadName?: string;
  onClose: () => void;
}

export function ContentViewerModal({
  open,
  title,
  text,
  downloadName,
  onClose,
}: ContentViewerModalProps) {
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof window === "undefined") return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Скопировано");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Не удалось скопировать");
    }
  };

  const download = () => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = downloadName || "content.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const charCount = text.length;

  return createPortal(
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/80 p-4 backdrop-blur"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-muted shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-border/80 px-5 py-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-foreground">
              {title}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {charCount.toLocaleString("ru")} символов
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-foreground/[0.04] px-2.5 py-1.5 text-[12px] font-medium text-foreground hover:bg-foreground/[0.08]"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              Копировать
            </button>
            {downloadName && (
              <button
                type="button"
                onClick={download}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-foreground/[0.04] px-2.5 py-1.5 text-[12px] font-medium text-foreground hover:bg-foreground/[0.08]"
                title="Скачать как .txt"
              >
                <Download size={13} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
              aria-label="Закрыть"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        {/* Selectable, scrollable text */}
        <div className="overflow-y-auto px-5 py-4">
          <pre className="whitespace-pre-wrap break-words font-sans text-[13.5px] leading-[1.6] text-foreground/90 selection:bg-content/40">
            {text}
          </pre>
        </div>
      </div>
    </div>,
    document.body,
  );
}
