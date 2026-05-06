"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  LibraryBig,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Trash2,
  Copy as CopyIcon,
} from "lucide-react";
import { ApiError } from "@/lib/api";
import {
  duplicateCanvas,
  listCanvases,
  listCanvasTemplates,
} from "@/lib/canvases";
import { listProjects } from "@/lib/projects";
import type { CanvasOut, ProjectOut } from "@/lib/types";
import { t, formatRelativeRu } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  const router = useRouter();
  const projectId = searchParams.get("project");
  const [search, setSearch] = React.useState("");
  const [templatesOpen, setTemplatesOpen] = React.useState(false);
  const [renameTarget, setRenameTarget] = React.useState<CanvasOut | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = React.useState<CanvasOut | null>(
    null,
  );

  const canvasesQuery = useQuery({
    queryKey: ["canvases", { projectId: projectId ?? null }],
    queryFn: () =>
      listCanvases(projectId ? { project_id: projectId } : {}),
  });

  const templatesQuery = useQuery({
    queryKey: ["canvas-templates"],
    queryFn: () => listCanvasTemplates(),
  });

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: listProjects,
  });

  const activeProject: ProjectOut | null = React.useMemo(() => {
    if (!projectId || !projectsQuery.data) return null;
    return projectsQuery.data.find((p) => p.id === projectId) ?? null;
  }, [projectId, projectsQuery.data]);

  const filtered = React.useMemo(() => {
    const items = canvasesQuery.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description ?? "").toLowerCase().includes(q),
    );
  }, [canvasesQuery.data, search]);

  return (
    <div className="co-dashboard">
      <div className="co-dashboard-bg" />
      <div className="co-dash-container">
        <div className="co-dash-brand">
          <span className="co-dash-brand-dot" />
          {t.brandName}
        </div>
        <h1 className="co-dash-h1">
          {t.dash.h1Line1}{" "}
          <span className="co-dash-h1-muted">{t.dash.h1Line2}</span>
        </h1>
        <p className="co-dash-sub">{t.dash.sub}</p>

        {activeProject && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[12px] text-[color:var(--text-tertiary)]">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: activeProject.color }}
            />
            {activeProject.name}
          </div>
        )}

        <div className="co-dash-search-row">
          <div className="co-dash-search-wrap">
            <Search size={16} className="co-dash-search-icon" />
            <input
              className="co-dash-search"
              placeholder={t.dash.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <CreateCanvasDialog defaultProjectId={projectId} />
          <button
            type="button"
            className="co-iconbtn"
            onClick={() => router.push("/settings")}
            title={t.shell.settings}
          >
            <Settings size={16} />
          </button>
        </div>

        <div className="co-dash-section-title">{t.dash.sectionRecent}</div>

        {canvasesQuery.isPending ? (
          <CanvasGridSkeleton />
        ) : canvasesQuery.isError ? (
          <CanvasErrorState
            detail={
              canvasesQuery.error instanceof ApiError
                ? canvasesQuery.error.detail
                : t.dash.couldNotLoad
            }
            onRetry={() => canvasesQuery.refetch()}
          />
        ) : (
          <div className="co-dash-grid">
            <NewCanvasTile />
            {filtered.map((c) => (
              <CanvasCard
                key={c.id}
                canvas={c}
                onRename={setRenameTarget}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>
        )}

        <div className="co-dash-section-title">{t.dash.sectionTemplates}</div>
        {templatesQuery.isPending ? (
          <CanvasGridSkeleton small />
        ) : templatesQuery.isError ? (
          <CanvasErrorState
            detail={
              templatesQuery.error instanceof ApiError
                ? templatesQuery.error.detail
                : t.dash.couldNotLoad
            }
            onRetry={() => templatesQuery.refetch()}
          />
        ) : (templatesQuery.data ?? []).length === 0 ? (
          <div
            className="co-canvas-card-create"
            style={{ minHeight: 120, opacity: 0.7 }}
          >
            <LibraryBig size={18} />
            <div style={{ fontSize: 12.5 }}>Шаблонов пока нет</div>
            <button
              type="button"
              className="co-btn co-btn-ghost"
              onClick={() => setTemplatesOpen(true)}
            >
              {t.dash.useTemplate}
            </button>
          </div>
        ) : (
          <div className="co-dash-grid">
            {(templatesQuery.data ?? []).map((tpl) => (
              <Link
                key={tpl.id}
                href={`/canvas/${tpl.id}`}
                className="co-canvas-card"
              >
                <div className="co-canvas-card-thumb">
                  <ThumbMiniNodes />
                </div>
                <div className="co-canvas-card-meta">
                  <div className="co-canvas-card-name">{tpl.name}</div>
                  <div className="co-canvas-card-info">
                    {formatRelativeRu(tpl.updated_at)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <TemplatesPickerDialog
        open={templatesOpen}
        onOpenChange={setTemplatesOpen}
        defaultProjectId={projectId}
      />
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

function NewCanvasTile() {
  // Mount the existing CreateCanvasDialog (ships its own DialogTrigger
  // button) but absolutely-position it inside our dashed-border tile so
  // the tile is the click target. We don't try to control its open state
  // from outside — it owns its own state via Radix Dialog.
  return (
    <div className="relative co-canvas-card-create">
      <Plus size={20} />
      <div style={{ fontSize: 13, fontWeight: 500 }}>
        {t.dash.cardCreateTitle}
      </div>
      <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
        {t.dash.cardCreateSub}
      </div>
      {/* Stretch the trigger over the tile so anywhere inside opens the dialog. */}
      <div className="absolute inset-0 [&>button]:absolute [&>button]:inset-0 [&>button]:opacity-0">
        <CreateCanvasDialog />
      </div>
    </div>
  );
}

function CanvasCard({
  canvas,
  onRename,
  onDelete,
}: {
  canvas: CanvasOut;
  onRename: (c: CanvasOut) => void;
  onDelete: (c: CanvasOut) => void;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const duplicateMutation = useMutation({
    mutationFn: () => duplicateCanvas(canvas.id),
    onSuccess: (clone) => {
      qc.invalidateQueries({ queryKey: ["canvases"] });
      toast.success("Канвас продублирован");
      router.push(`/canvas/${clone.id}`);
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : "Не удалось продублировать",
      ),
  });

  return (
    <div className="relative group">
      <Link href={`/canvas/${canvas.id}`} className="co-canvas-card">
        <div className="co-canvas-card-thumb">
          <ThumbMiniNodes />
        </div>
        <div className="co-canvas-card-meta">
          <div className="co-canvas-card-name">{canvas.name}</div>
          <div className="co-canvas-card-info">
            {formatRelativeRu(canvas.updated_at)}
          </div>
        </div>
      </Link>
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Действия"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-black/60 text-zinc-300 backdrop-blur hover:text-foreground"
              onClick={(e) => e.preventDefault()}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                onRename(canvas);
              }}
            >
              <Pencil className="h-4 w-4" /> Переименовать
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={duplicateMutation.isPending}
              onSelect={(e) => {
                e.preventDefault();
                duplicateMutation.mutate();
              }}
            >
              <CopyIcon className="h-4 w-4" /> Дублировать
            </DropdownMenuItem>
            <DropdownMenuItem
              destructive
              onSelect={(e) => {
                e.preventDefault();
                onDelete(canvas);
              }}
            >
              <Trash2 className="h-4 w-4" /> Удалить
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function ThumbMiniNodes() {
  // Three tiny node-shaped chips connected with thin lines — purely
  // decorative. Mirrors the prototype's `thumb-mini-node` aesthetic.
  return (
    <svg
      viewBox="0 0 240 130"
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      style={{ position: "absolute", inset: 0 }}
    >
      <line
        x1="56"
        y1="65"
        x2="115"
        y2="65"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="1.2"
      />
      <line
        x1="155"
        y1="65"
        x2="200"
        y2="65"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="1.2"
      />
      <rect x="14" y="50" width="42" height="30" rx="6" fill="#3b82f6" fillOpacity="0.3" stroke="#60a5fa" strokeOpacity="0.6" strokeWidth="0.7" />
      <rect x="100" y="50" width="42" height="30" rx="6" fill="#eab308" fillOpacity="0.3" stroke="#facc15" strokeOpacity="0.6" strokeWidth="0.7" />
      <rect x="184" y="50" width="42" height="30" rx="6" fill="#a855f7" fillOpacity="0.3" stroke="#c084fc" strokeOpacity="0.6" strokeWidth="0.7" />
    </svg>
  );
}

function CanvasGridSkeleton({ small }: { small?: boolean } = {}) {
  return (
    <div className="co-dash-grid">
      {Array.from({ length: small ? 3 : 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden"
          aria-hidden
        >
          <Skeleton className="h-[130px] w-full rounded-none" />
          <div className="p-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="mt-2 h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
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
            {t.dash.couldNotLoad}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
        </div>
      </div>
      <div className="mt-5">
        <Button onClick={onRetry} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4" /> {t.dash.retry}
        </Button>
      </div>
    </div>
  );
}
