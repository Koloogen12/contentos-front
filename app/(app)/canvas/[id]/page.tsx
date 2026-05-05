"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  ChevronLeft,
  Copy,
  LibraryBig,
  Loader2,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Share2,
} from "lucide-react";
import { ApiError } from "@/lib/api";
import {
  duplicateCanvas,
  getCanvas,
  saveCanvasAsTemplate,
  updateCanvas,
} from "@/lib/canvases";
import type { CanvasDetail } from "@/lib/types";
import { formatRelativeDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CanvasEditor } from "@/components/canvas/CanvasEditor";
import { ShareDialog } from "@/components/canvas/ShareDialog";

export default function CanvasDetailPage() {
  const params = useParams<{ id: string }>();
  const canvasId = params?.id;

  const query = useQuery({
    queryKey: ["canvas", canvasId],
    queryFn: () => getCanvas(canvasId!),
    enabled: !!canvasId,
  });

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-card/30 px-6 py-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Back to dashboard
        </Link>
        <div className="flex items-center gap-2">
          <CanvasTitle canvas={query.data ?? null} isPending={query.isPending} />
          {query.data && <CanvasMenu canvas={query.data} />}
        </div>
        <div className="hidden text-xs text-muted-foreground sm:block">
          {query.data
            ? `Updated ${formatRelativeDate(query.data.updated_at)}`
            : null}
        </div>
      </div>

      {query.isPending ? (
        <CanvasSkeleton />
      ) : query.isError ? (
        <CanvasError
          detail={
            query.error instanceof ApiError
              ? query.error.detail
              : "Could not load canvas."
          }
          onRetry={() => query.refetch()}
        />
      ) : query.data ? (
        <CanvasEditor canvas={query.data} />
      ) : null}
    </div>
  );
}

function CanvasMenu({ canvas }: { canvas: CanvasDetail }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [shareOpen, setShareOpen] = React.useState(false);

  const duplicateMutation = useMutation({
    mutationFn: () => duplicateCanvas(canvas.id),
    onSuccess: (clone) => {
      qc.invalidateQueries({ queryKey: ["canvases"] });
      toast.success("Canvas duplicated");
      router.push(`/canvas/${clone.id}`);
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : "Could not duplicate canvas",
      ),
  });

  const saveAsTemplateMutation = useMutation({
    mutationFn: () => saveCanvasAsTemplate(canvas.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["canvas-templates"] });
      qc.invalidateQueries({ queryKey: ["canvases"] });
      toast.success("Saved as template");
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : "Could not save as template",
      ),
  });

  const busy = duplicateMutation.isPending || saveAsTemplateMutation.isPending;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Canvas actions"
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
            disabled={busy}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MoreHorizontal className="h-4 w-4" />
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setShareOpen(true);
            }}
          >
            <Share2 className="h-4 w-4" /> Share
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              duplicateMutation.mutate();
            }}
          >
            <Copy className="h-4 w-4" /> Duplicate canvas
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              saveAsTemplateMutation.mutate();
            }}
          >
            <LibraryBig className="h-4 w-4" /> Save as template
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ShareDialog
        canvasId={canvas.id}
        open={shareOpen}
        onOpenChange={setShareOpen}
      />
    </>
  );
}

function CanvasTitle({
  canvas,
  isPending,
}: {
  canvas: CanvasDetail | null;
  isPending: boolean;
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(canvas?.name ?? "");
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (canvas?.name) setDraft(canvas.name);
  }, [canvas?.name]);

  const mutation = useMutation({
    mutationFn: (name: string) =>
      canvas
        ? updateCanvas(canvas.id, { name })
        : Promise.reject(new Error("No canvas")),
    onSuccess: (updated) => {
      qc.setQueryData<CanvasDetail | undefined>(
        ["canvas", updated.id],
        (prev) => (prev ? { ...prev, ...updated } : prev),
      );
      qc.invalidateQueries({ queryKey: ["canvases"] });
      setEditing(false);
    },
  });

  const startEdit = () => {
    if (!canvas) return;
    setDraft(canvas.name);
    setEditing(true);
    requestAnimationFrame(() => inputRef.current?.select());
  };

  const commit = () => {
    const trimmed = draft.trim();
    if (!canvas) return;
    if (!trimmed || trimmed === canvas.name) {
      setEditing(false);
      setDraft(canvas.name);
      return;
    }
    mutation.mutate(trimmed);
  };

  if (isPending || !canvas) {
    return <Skeleton className="h-7 w-48" />;
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            } else if (e.key === "Escape") {
              setEditing(false);
              setDraft(canvas.name);
            }
          }}
          onBlur={commit}
          className="h-9 w-72 text-base"
          disabled={mutation.isPending}
          autoFocus
        />
        {mutation.isPending && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      className="group inline-flex items-center gap-2 rounded-md px-2 py-1 text-base font-medium text-foreground transition-colors hover:bg-accent"
      title="Click to rename"
    >
      <span className="line-clamp-1 max-w-md">{canvas.name}</span>
      <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

function CanvasSkeleton() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-20 w-48" />
          <Skeleton className="h-20 w-48" />
          <Skeleton className="h-20 w-48" />
        </div>
      </div>
    </div>
  );
}

function CanvasError({
  detail,
  onRetry,
}: {
  detail: string;
  onRetry: () => void;
}) {
  return (
    <div className="mx-auto mt-12 w-full max-w-xl rounded-2xl border border-destructive/30 bg-destructive/5 p-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/15 text-destructive">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-medium text-foreground">
            Couldn&apos;t load canvas
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
        </div>
      </div>
      <div className="mt-5">
        <Button onClick={onRetry} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4" /> Retry
        </Button>
      </div>
    </div>
  );
}
