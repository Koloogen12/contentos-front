"use client";

/**
 * VersionsDialog — slides in from the right, lists snapshots newest-first,
 * lets the user create / restore / delete. Shape and copy from
 * `THE CONTENT-2/phase3-screens.jsx#VersionHistoryPanel`.
 */

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MoreHorizontal, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import {
  createCanvasVersion,
  deleteCanvasVersion,
  listCanvasVersions,
  restoreCanvasVersion,
  type CanvasVersionOut,
} from "@/lib/versions";
import type { CanvasDetail } from "@/lib/types";
import { t, formatRelativeRu } from "@/lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface VersionsDialogProps {
  canvasId: string;
  open: boolean;
  onOpenChange: (next: boolean) => void;
}

const VERSIONS_KEY = (canvasId: string) =>
  ["canvas-versions", canvasId] as const;

export function VersionsDialog({
  canvasId,
  open,
  onOpenChange,
}: VersionsDialogProps) {
  const qc = useQueryClient();
  const [creating, setCreating] = React.useState(false);
  const [label, setLabel] = React.useState("");
  const [confirmRestoreId, setConfirmRestoreId] = React.useState<string | null>(
    null,
  );
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(
    null,
  );

  const versionsQuery = useQuery({
    queryKey: VERSIONS_KEY(canvasId),
    queryFn: () => listCanvasVersions(canvasId),
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: () => createCanvasVersion(canvasId, { label: label.trim() || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: VERSIONS_KEY(canvasId) });
      setCreating(false);
      setLabel("");
      toast.success(t.versions.saved);
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : t.versions.couldNotLoad,
      ),
  });

  const restoreMutation = useMutation({
    mutationFn: (vid: string) => restoreCanvasVersion(canvasId, vid),
    onSuccess: (canvas) => {
      qc.setQueryData<CanvasDetail | undefined>(
        ["canvas", canvasId],
        canvas,
      );
      qc.invalidateQueries({ queryKey: VERSIONS_KEY(canvasId) });
      qc.invalidateQueries({ queryKey: ["canvas", canvasId] });
      toast.success(t.versions.restored);
      setConfirmRestoreId(null);
      onOpenChange(false);
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : t.versions.couldNotLoad,
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: (vid: string) => deleteCanvasVersion(canvasId, vid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: VERSIONS_KEY(canvasId) });
      toast.success(t.versions.deleted);
      setConfirmDeleteId(null);
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : t.versions.couldNotLoad,
      ),
  });

  if (!open) return null;
  const versions = versionsQuery.data ?? [];

  return (
    <>
      <div className="co-vh-overlay" onClick={() => onOpenChange(false)} />
      <aside
        className="co-vh-panel"
        role="dialog"
        aria-modal="true"
        aria-label={t.versions.title}
      >
        <div className="co-vh-header">
          <div className="flex items-center gap-2">
            <RefreshCw size={14} />
            <span className="co-vh-title">{t.versions.title}</span>
          </div>
          <button
            className="co-iconbtn"
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>
        <div className="co-vh-sub">{t.versions.sub}</div>

        <div className="co-vh-list">
          <div>
            {creating ? (
              <div className="rounded-xl border border-border bg-foreground/[0.03] p-3 flex flex-col gap-2">
                <label className="co-field-label">
                  {t.versions.snapshotLabel}
                </label>
                <input
                  className="co-field-input"
                  placeholder={t.versions.snapshotPlaceholder}
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") createMutation.mutate();
                    if (e.key === "Escape") {
                      setCreating(false);
                      setLabel("");
                    }
                  }}
                />
                <div className="flex gap-2 justify-end">
                  <button
                    className="co-btn co-btn-ghost"
                    type="button"
                    onClick={() => {
                      setCreating(false);
                      setLabel("");
                    }}
                    disabled={createMutation.isPending}
                  >
                    {t.versions.cancel}
                  </button>
                  <button
                    className="co-btn co-btn-primary"
                    type="button"
                    onClick={() => createMutation.mutate()}
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Plus size={12} />
                    )}
                    {t.versions.save}
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="co-btn co-btn-primary w-full"
                type="button"
                onClick={() => setCreating(true)}
              >
                <Plus size={12} /> {t.versions.createSnapshot}
              </button>
            )}
          </div>

          {versionsQuery.isPending && (
            <div className="text-[12px] text-[color:var(--text-muted)] py-4 text-center">
              {t.common.loading}
            </div>
          )}

          {versionsQuery.isError && (
            <div className="text-[12px] text-[color:var(--text-muted)] py-4 text-center">
              {versionsQuery.error instanceof ApiError
                ? versionsQuery.error.detail
                : t.versions.couldNotLoad}
            </div>
          )}

          {!versionsQuery.isPending &&
            !versionsQuery.isError &&
            versions.length === 0 && (
              <div className="rounded-md border border-dashed border-border bg-foreground/[0.02] p-4 text-center text-[12px] text-[color:var(--text-tertiary)] leading-relaxed">
                {t.versions.empty}
              </div>
            )}

          {versions.map((v) => (
            <VersionRow
              key={v.id}
              version={v}
              onRestore={() => setConfirmRestoreId(v.id)}
              onDelete={() => setConfirmDeleteId(v.id)}
            />
          ))}
        </div>
      </aside>

      {/* Restore confirm */}
      <Dialog
        open={!!confirmRestoreId}
        onOpenChange={(o) => !o && setConfirmRestoreId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.versions.confirmRestoreTitle}</DialogTitle>
            <DialogDescription>{t.versions.confirmRestore}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirmRestoreId(null)}
              disabled={restoreMutation.isPending}
            >
              {t.common.cancel}
            </Button>
            <Button
              onClick={() =>
                confirmRestoreId && restoreMutation.mutate(confirmRestoreId)
              }
              disabled={restoreMutation.isPending}
            >
              {restoreMutation.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : null}
              {t.versions.restore}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog
        open={!!confirmDeleteId}
        onOpenChange={(o) => !o && setConfirmDeleteId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.versions.confirmDeleteTitle}</DialogTitle>
            <DialogDescription>{t.versions.confirmDelete}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirmDeleteId(null)}
              disabled={deleteMutation.isPending}
            >
              {t.common.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                confirmDeleteId && deleteMutation.mutate(confirmDeleteId)
              }
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Trash2 size={14} />
              )}
              {t.versions.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function VersionRow({
  version,
  onRestore,
  onDelete,
}: {
  version: CanvasVersionOut;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  return (
    <div className="co-vh-item">
      <div className="co-vh-dot" />
      <div className="co-vh-row">
        <div className="co-vh-label">
          {version.label?.trim() || t.versions.untitled}
        </div>
      </div>
      <div className="co-vh-time">{formatRelativeRu(version.created_at)}</div>
      {version.node_count != null && (
        <div className="co-vh-snapshot">
          {version.node_count} нод
          {version.edge_count != null ? ` · ${version.edge_count} связей` : ""}
        </div>
      )}
      <div className="flex items-center gap-2 mt-2 relative">
        <button
          type="button"
          className="co-vh-restore"
          onClick={onRestore}
        >
          {t.versions.restore}
        </button>
        <button
          type="button"
          className="co-iconbtn"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="More"
        >
          <MoreHorizontal size={13} />
        </button>
        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-50"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute left-0 top-9 z-50 w-40 rounded-lg border border-border bg-popover p-1 shadow-xl">
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12px] text-[#fca5a5] hover:bg-foreground/5"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete();
                }}
              >
                <Trash2 size={12} />
                {t.versions.delete}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
