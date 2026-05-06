"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LibraryBig, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import {
  createCanvasFromTemplate,
  getCanvas,
  listCanvasTemplates,
} from "@/lib/canvases";
import { listProjects } from "@/lib/projects";
import type { CanvasOut, ProjectOut } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

interface TemplatesPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Default project to assign the new canvas to (from sidebar selection). */
  defaultProjectId?: string | null;
  /** Custom dialog title. Defaults to "Templates". */
  title?: string;
}

interface TemplatePreview {
  nodeCount: number;
  platforms: string[];
}

/**
 * Lightweight preview computed from the template's nodes — for "real"
 * templates the node payload comes from the same `getCanvas` endpoint so we
 * fetch lazily on demand. For the picker grid we just show whatever the
 * shallow template list gives us (name + description) plus a prompt to
 * inspect.
 */
function describeTemplate(tpl: CanvasOut): string {
  return tpl.description?.trim() || "Готовый пайплайн";
}

export function TemplatesPickerDialog({
  open,
  onOpenChange,
  defaultProjectId,
  title,
}: TemplatesPickerDialogProps) {
  const [selected, setSelected] = React.useState<CanvasOut | null>(null);
  const [name, setName] = React.useState("");
  const [projectId, setProjectId] = React.useState<string | null>(
    defaultProjectId ?? null,
  );

  const router = useRouter();
  const qc = useQueryClient();

  React.useEffect(() => {
    if (open) {
      setSelected(null);
      setName("");
      setProjectId(defaultProjectId ?? null);
    }
  }, [open, defaultProjectId]);

  const templatesQuery = useQuery({
    queryKey: ["canvas-templates"],
    queryFn: listCanvasTemplates,
    enabled: open,
  });

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: listProjects,
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      selected
        ? createCanvasFromTemplate(selected.id, {
            name: name.trim() || selected.name,
            project_id: projectId,
          })
        : Promise.reject(new Error("No template selected")),
    onSuccess: (canvas) => {
      qc.invalidateQueries({ queryKey: ["canvases"] });
      onOpenChange(false);
      router.push(`/canvas/${canvas.id}`);
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError
          ? err.detail
          : t.templates.couldNotCreate,
      ),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setSelected(null);
          createMutation.reset();
        }
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title ?? t.templates.title}</DialogTitle>
          <DialogDescription>
            {selected
              ? "Назови новый канвас и выбери, где он будет жить."
              : t.templates.sub}
          </DialogDescription>
        </DialogHeader>

        {selected ? (
          <FromTemplateForm
            template={selected}
            name={name}
            onNameChange={setName}
            projectId={projectId}
            onProjectChange={setProjectId}
            projects={projectsQuery.data ?? []}
            onBack={() => setSelected(null)}
            onSubmit={() => createMutation.mutate()}
            submitting={createMutation.isPending}
          />
        ) : templatesQuery.isPending ? (
          <TemplatesGridSkeleton />
        ) : templatesQuery.isError ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-3 text-xs text-destructive">
            {templatesQuery.error instanceof ApiError
              ? templatesQuery.error.detail
              : t.templates.couldNotLoad}
          </div>
        ) : !templatesQuery.data || templatesQuery.data.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card/40 p-6 text-center text-sm text-muted-foreground">
            <LibraryBig className="mx-auto mb-3 h-6 w-6" />
            <p>{t.dashboard.noTemplates}</p>
            <p className="mt-1 text-xs">
              Сохрани канвас как шаблон из его меню.
            </p>
          </div>
        ) : (
          <ul className="grid max-h-[60vh] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
            {templatesQuery.data.map((tpl) => (
              <li key={tpl.id}>
                <TemplateCard template={tpl} onPick={() => setSelected(tpl)} />
              </li>
            ))}
          </ul>
        )}

        {!selected && (
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              {t.common.close}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TemplateCard({
  template,
  onPick,
}: {
  template: CanvasOut;
  onPick: () => void;
}) {
  // Lazy preview: load full canvas detail to get node-count and platforms.
  const detailQuery = useQuery({
    queryKey: ["canvas-template-preview", template.id],
    queryFn: () => getCanvas(template.id),
    staleTime: 5 * 60 * 1000,
  });

  const preview: TemplatePreview = React.useMemo(() => {
    const nodes = detailQuery.data?.nodes ?? [];
    const platforms = new Set<string>();
    for (const n of nodes) {
      if (n.type === "format") {
        const p = (n.data as { platform?: string } | undefined)?.platform;
        if (typeof p === "string") platforms.add(p);
      }
    }
    return {
      nodeCount: nodes.length,
      platforms: Array.from(platforms),
    };
  }, [detailQuery.data]);

  return (
    <button
      type="button"
      onClick={onPick}
      className="group flex h-full w-full flex-col rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-card/80"
    >
      <div className="flex items-start gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-1 text-sm font-medium text-foreground">
            {template.name}
          </h3>
          <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
            {describeTemplate(template)}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {detailQuery.isPending ? (
          <Skeleton className="h-4 w-24" />
        ) : (
          <>
            <span className="rounded-full border border-border bg-background/60 px-2 py-0.5 text-[10px] text-muted-foreground">
              {t.dash.nodes(preview.nodeCount)}
            </span>
            {preview.platforms.map((p) => (
              <span
                key={p}
                className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary"
              >
                {p}
              </span>
            ))}
          </>
        )}
      </div>
    </button>
  );
}

function TemplatesGridSkeleton() {
  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <li
          key={i}
          className="h-24 rounded-lg border border-border bg-card/60 p-3"
          aria-hidden
        >
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="mt-2 h-3 w-full" />
          <Skeleton className="mt-1 h-3 w-1/2" />
        </li>
      ))}
    </ul>
  );
}

function FromTemplateForm({
  template,
  name,
  onNameChange,
  projectId,
  onProjectChange,
  projects,
  onBack,
  onSubmit,
  submitting,
}: {
  template: CanvasOut;
  name: string;
  onNameChange: (v: string) => void;
  projectId: string | null;
  onProjectChange: (v: string | null) => void;
  projects: ProjectOut[];
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-4"
    >
      <div className="rounded-lg border border-border bg-card/40 p-3">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {t.canvas.template}
        </div>
        <div className="mt-0.5 text-sm font-medium text-foreground">
          {template.name}
        </div>
        {template.description && (
          <p className="mt-1 text-xs text-muted-foreground">
            {template.description}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="from-template-name">{t.publicView.cloneNameLabel}</Label>
        <Input
          id="from-template-name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={template.name}
          autoFocus
        />
        <p className="text-[11px] text-muted-foreground">
          По умолчанию используется название шаблона.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="from-template-project">
          {t.createCanvas.projectLabel}{" "}
          <span className="text-muted-foreground">
            {t.createCanvas.projectOptional}
          </span>
        </Label>
        <select
          id="from-template-project"
          value={projectId ?? ""}
          onChange={(e) => onProjectChange(e.target.value || null)}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background/40 px-3 py-2 text-sm shadow-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          )}
        >
          <option value="">{t.createCanvas.projectNone}</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <DialogFooter>
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          disabled={submitting}
        >
          Назад
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> {t.common.creating}
            </>
          ) : (
            t.templates.create
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}
