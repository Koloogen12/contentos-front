"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  Copy,
  FolderKanban,
  LayoutGrid,
  LibraryBig,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { ApiError } from "@/lib/api";
import { duplicateCanvas, listCanvases } from "@/lib/canvases";
import { listProjects } from "@/lib/projects";
import type { CanvasOut, ProjectOut } from "@/lib/types";
import { formatRelativeDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { CreateCanvasDialog } from "@/components/CreateCanvasDialog";
import { RenameCanvasDialog } from "@/components/RenameCanvasDialog";
import { DeleteCanvasDialog } from "@/components/DeleteCanvasDialog";
import { TemplatesPickerDialog } from "@/components/canvas/TemplatesPickerDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project");

  const canvasesQuery = useQuery({
    queryKey: ["canvases", { projectId: projectId ?? null }],
    queryFn: () =>
      listCanvases(projectId ? { project_id: projectId } : {}),
  });

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: listProjects,
  });

  const activeProject: ProjectOut | null = React.useMemo(() => {
    if (!projectId || !projectsQuery.data) return null;
    return projectsQuery.data.find((p) => p.id === projectId) ?? null;
  }, [projectId, projectsQuery.data]);

  const [renameTarget, setRenameTarget] = React.useState<CanvasOut | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = React.useState<CanvasOut | null>(
    null,
  );
  const [templatesOpen, setTemplatesOpen] = React.useState(false);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {activeProject ? (
              <span className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: activeProject.color }}
                  aria-hidden
                />
                {activeProject.name}
              </span>
            ) : (
              "Canvases"
            )}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeProject
              ? `Showing canvases in this project.`
              : "Each canvas is a content pipeline — sources, ideas, and finished posts on one board."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setTemplatesOpen(true)}>
            <LibraryBig className="h-4 w-4" /> Templates
          </Button>
          <CreateCanvasDialog defaultProjectId={projectId} />
        </div>
      </div>

      <div className="mt-8">
        {canvasesQuery.isPending ? (
          <CanvasGridSkeleton />
        ) : canvasesQuery.isError ? (
          <CanvasErrorState
            detail={
              canvasesQuery.error instanceof ApiError
                ? canvasesQuery.error.detail
                : "Could not load your canvases."
            }
            onRetry={() => canvasesQuery.refetch()}
          />
        ) : canvasesQuery.data && canvasesQuery.data.length > 0 ? (
          <CanvasGrid
            canvases={canvasesQuery.data}
            onRename={setRenameTarget}
            onDelete={setDeleteTarget}
          />
        ) : (
          <EmptyState
            icon={<LayoutGrid className="h-5 w-5" />}
            title={
              activeProject
                ? `No canvases in ${activeProject.name} yet`
                : "No canvases yet"
            }
            description="Spin up your first canvas, or start from a template."
            action={
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setTemplatesOpen(true)}
                >
                  <LibraryBig className="h-4 w-4" /> Use a template
                </Button>
                <CreateCanvasDialog defaultProjectId={projectId} />
              </div>
            }
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
      <TemplatesPickerDialog
        open={templatesOpen}
        onOpenChange={setTemplatesOpen}
        defaultProjectId={projectId}
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
  const router = useRouter();
  const qc = useQueryClient();

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => duplicateCanvas(id),
    onSuccess: (canvas) => {
      qc.invalidateQueries({ queryKey: ["canvases"] });
      toast.success("Canvas duplicated");
      router.push(`/canvas/${canvas.id}`);
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : "Could not duplicate canvas",
      ),
  });

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
                  disabled={duplicateMutation.isPending}
                  onSelect={(e) => {
                    e.preventDefault();
                    duplicateMutation.mutate(canvas.id);
                  }}
                >
                  <Copy className="h-4 w-4" /> Duplicate
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
