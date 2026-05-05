"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  FolderKanban,
  LayoutGrid,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { ApiError } from "@/lib/api";
import { listCanvases } from "@/lib/canvases";
import type { CanvasOut } from "@/lib/types";
import { formatRelativeDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { CreateCanvasDialog } from "@/components/CreateCanvasDialog";
import { RenameCanvasDialog } from "@/components/RenameCanvasDialog";
import { DeleteCanvasDialog } from "@/components/DeleteCanvasDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function DashboardPage() {
  const query = useQuery({
    queryKey: ["canvases"],
    queryFn: listCanvases,
  });

  const [renameTarget, setRenameTarget] = React.useState<CanvasOut | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = React.useState<CanvasOut | null>(
    null,
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Canvases</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Each canvas is a content pipeline — sources, ideas, and finished
            posts on one board.
          </p>
        </div>
        <CreateCanvasDialog />
      </div>

      <div className="mt-8">
        {query.isPending ? (
          <CanvasGridSkeleton />
        ) : query.isError ? (
          <CanvasErrorState
            detail={
              query.error instanceof ApiError
                ? query.error.detail
                : "Could not load your canvases."
            }
            onRetry={() => query.refetch()}
          />
        ) : query.data && query.data.length > 0 ? (
          <CanvasGrid
            canvases={query.data}
            onRename={setRenameTarget}
            onDelete={setDeleteTarget}
          />
        ) : (
          <EmptyState
            icon={<LayoutGrid className="h-5 w-5" />}
            title="No canvases yet"
            description="Spin up your first canvas to start dropping sources, extracting ideas, and shaping posts."
            action={<CreateCanvasDialog />}
          />
        )}
      </div>

      <RenameCanvasDialog
        canvas={renameTarget}
        open={!!renameTarget}
        onOpenChange={(open) => !open && setRenameTarget(null)}
      />
      <DeleteCanvasDialog
        canvas={deleteTarget}
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      />
    </div>
  );
}

function CanvasGrid({
  canvases,
  onRename,
  onDelete,
}: {
  canvases: CanvasOut[];
  onRename: (c: CanvasOut) => void;
  onDelete: (c: CanvasOut) => void;
}) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {canvases.map((canvas) => (
        <li key={canvas.id} className="group relative">
          <Link
            href={`/canvas/${canvas.id}`}
            className="flex h-full flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <LayoutGrid className="h-4 w-4" />
              </div>
              {canvas.project_id && (
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  <FolderKanban className="h-3 w-3" />
                  Project
                </span>
              )}
            </div>
            <h3 className="mt-4 line-clamp-1 text-base font-medium text-foreground">
              {canvas.name}
            </h3>
            <p className="mt-1.5 line-clamp-2 min-h-[2.5rem] text-sm text-muted-foreground">
              {canvas.description || "No description yet."}
            </p>
            <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
              <span>Updated {formatRelativeDate(canvas.updated_at)}</span>
              <span className="inline-flex items-center gap-1 text-foreground/60 transition-colors group-hover:text-foreground">
                Open <ArrowRight className="h-3 w-3" />
              </span>
            </div>
          </Link>
          <div className="absolute right-3 top-3 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="Canvas actions"
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background/80 text-muted-foreground shadow-sm hover:text-foreground"
                  onClick={(e) => e.preventDefault()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    onRename(canvas);
                  }}
                >
                  <Pencil className="h-4 w-4" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  destructive
                  onSelect={(e) => {
                    e.preventDefault();
                    onDelete(canvas);
                  }}
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </li>
      ))}
    </ul>
  );
}

function CanvasGridSkeleton() {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <li
          key={i}
          className="rounded-xl border border-border bg-card p-5"
          aria-hidden
        >
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="mt-4 h-5 w-3/4" />
          <Skeleton className="mt-2 h-4 w-full" />
          <Skeleton className="mt-1 h-4 w-2/3" />
          <Skeleton className="mt-5 h-3 w-1/3" />
        </li>
      ))}
    </ul>
  );
}

function CanvasErrorState({
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
            Couldn&apos;t load canvases
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
