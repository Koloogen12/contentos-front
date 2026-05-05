"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ChevronLeft,
  Loader2,
  Pencil,
  RefreshCw,
} from "lucide-react";
import { ApiError } from "@/lib/api";
import { getCanvas, updateCanvas } from "@/lib/canvases";
import type { CanvasDetail } from "@/lib/types";
import { formatRelativeDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";

export default function CanvasDetailPage() {
  const params = useParams<{ id: string }>();
  const canvasId = params?.id;

  const query = useQuery({
    queryKey: ["canvas", canvasId],
    queryFn: () => getCanvas(canvasId!),
    enabled: !!canvasId,
  });

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      <div className="border-b border-border bg-card/30 px-6 py-3">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" /> Back to dashboard
          </Link>
          <CanvasTitle
            canvas={query.data ?? null}
            isPending={query.isPending}
          />
          <div className="hidden text-xs text-muted-foreground sm:block">
            {query.data
              ? `Updated ${formatRelativeDate(query.data.updated_at)}`
              : null}
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
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
          <CanvasPreview canvas={query.data} />
        ) : null}
      </div>
    </div>
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

function CanvasPreview({ canvas }: { canvas: CanvasDetail }) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs text-amber-200/90">
        <strong className="font-semibold">Iter 1 placeholder.</strong> The
        node-based editor lands in Iter 2 — for now, this page just shows the
        raw nodes/edges payload returned by the API.
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Nodes" value={canvas.nodes.length} />
        <Stat label="Edges" value={canvas.edges.length} />
        <Stat
          label="Created"
          value={formatRelativeDate(canvas.created_at)}
          isText
        />
      </div>

      {canvas.description && (
        <p className="rounded-xl border border-border bg-card p-4 text-sm text-foreground/80">
          {canvas.description}
        </p>
      )}

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Nodes
        </h2>
        {canvas.nodes.length === 0 ? (
          <EmptyState
            title="No nodes yet"
            description="The canvas editor in Iter 2 will let you drag in source, extract, and format nodes."
          />
        ) : (
          <pre className="scrollbar-thin overflow-auto rounded-xl border border-border bg-card p-4 text-xs leading-relaxed text-foreground/85">
            {JSON.stringify(canvas.nodes, null, 2)}
          </pre>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Edges
        </h2>
        {canvas.edges.length === 0 ? (
          <EmptyState
            title="No edges yet"
            description="Connections between nodes will be visualized as edges in the canvas editor."
          />
        ) : (
          <pre className="scrollbar-thin overflow-auto rounded-xl border border-border bg-card p-4 text-xs leading-relaxed text-foreground/85">
            {JSON.stringify(canvas.edges, null, 2)}
          </pre>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  isText,
}: {
  label: string;
  value: number | string;
  isText?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={
          isText
            ? "mt-1 text-sm font-medium text-foreground"
            : "mt-1 text-2xl font-semibold tabular-nums text-foreground"
        }
      >
        {value}
      </div>
    </div>
  );
}

function CanvasSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
      <Skeleton className="h-48 w-full" />
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
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8">
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
