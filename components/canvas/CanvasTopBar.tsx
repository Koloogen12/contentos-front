"use client";

/**
 * CanvasTopBar — 1:1 port of `THE CONTENT-2/chrome.jsx#CanvasTopBar`.
 * 52px chrome with back link "THE CONTENT", inline-editable centered
 * title, right-aligned actions: Версии / Шаблон / Поделиться / settings.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  History,
  LayoutTemplate,
  Loader2,
  Pencil,
  Settings,
  Share2,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import {
  saveCanvasAsTemplate,
  updateCanvas,
} from "@/lib/canvases";
import type { CanvasDetail } from "@/lib/types";
import { t } from "@/lib/i18n";

interface CanvasTopBarProps {
  canvas: CanvasDetail;
  onOpenVersions: () => void;
  onOpenShare: () => void;
}

export function CanvasTopBar({
  canvas,
  onOpenVersions,
  onOpenShare,
}: CanvasTopBarProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const [editing, setEditing] = React.useState(false);
  const [val, setVal] = React.useState(canvas.name);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    setVal(canvas.name);
  }, [canvas.name]);

  React.useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const renameMutation = useMutation({
    mutationFn: (name: string) => updateCanvas(canvas.id, { name }),
    onSuccess: (updated) => {
      qc.setQueryData<CanvasDetail | undefined>(
        ["canvas", updated.id],
        (prev) => (prev ? { ...prev, ...updated } : prev),
      );
      qc.invalidateQueries({ queryKey: ["canvases"] });
      setEditing(false);
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : t.canvas.couldNotSaveTitle,
      ),
  });

  const saveTplMutation = useMutation({
    mutationFn: () => saveCanvasAsTemplate(canvas.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["canvas-templates"] });
      qc.invalidateQueries({ queryKey: ["canvases"] });
      toast.success(t.canvas.template);
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : t.canvas.couldNotStartRun,
      ),
  });

  const commit = () => {
    const trimmed = val.trim();
    if (!trimmed || trimmed === canvas.name) {
      setVal(canvas.name);
      setEditing(false);
      return;
    }
    renameMutation.mutate(trimmed);
  };

  return (
    <div className="co-canvas-topbar">
      <button
        className="co-topbar-back"
        type="button"
        onClick={() => router.push("/dashboard")}
      >
        <ChevronLeft size={16} />
        <span className="co-topbar-logo">{t.brandName}</span>
      </button>

      <div className="co-topbar-title">
        {editing ? (
          <input
            ref={inputRef}
            className="co-topbar-title-input"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setVal(canvas.name);
                setEditing(false);
              }
            }}
            disabled={renameMutation.isPending}
          />
        ) : (
          <button
            type="button"
            className="co-topbar-title-text"
            onClick={() => setEditing(true)}
          >
            <span>{canvas.name}</span>
            <Pencil size={12} className="co-pencil-icon" />
          </button>
        )}
      </div>

      <div className="co-topbar-actions">
        <button
          type="button"
          className="co-btn co-btn-ghost"
          onClick={onOpenVersions}
          title={`${t.canvas.versions} (Cmd+H)`}
        >
          <History size={13} />
          {t.canvas.versions}
        </button>
        <button
          type="button"
          className="co-btn co-btn-ghost"
          onClick={() => saveTplMutation.mutate()}
          disabled={saveTplMutation.isPending}
        >
          {saveTplMutation.isPending ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <LayoutTemplate size={13} />
          )}
          {t.canvas.template}
        </button>
        <button
          type="button"
          className="co-btn co-btn-ghost"
          onClick={onOpenShare}
        >
          <Share2 size={13} />
          {t.canvas.share}
        </button>
        <button
          type="button"
          className="co-iconbtn"
          onClick={() => router.push("/settings")}
          title={t.canvas.settings}
        >
          <Settings size={14} />
        </button>
      </div>
    </div>
  );
}
