"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertTriangle,
  BookOpen,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import {
  bulkDeleteKnowledge,
  bulkUpdateKnowledgeProject,
  createKnowledge,
  deleteKnowledge,
  listKnowledge,
  updateKnowledge,
} from "@/lib/knowledge";
import { listProjects } from "@/lib/projects";
import type {
  ContentPillar,
  KnowledgeItemOut,
  KnowledgeType,
  ProjectOut,
} from "@/lib/types";
import { formatRelativeRu, t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const KNOWLEDGE_TYPES: KnowledgeType[] = [
  "tezis",
  "reference",
  "audience",
  "voice_rule",
  "content_theme",
  "manifesto",
];

const PILLAR_OPTIONS: ContentPillar[] = ["R1", "R2", "R3", "R4"];

function typeLabel(type: KnowledgeType): string {
  return t.knowledge.typeFilter[type];
}

export default function KnowledgePage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project");

  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<KnowledgeType | "">("");
  const [pillarFilter, setPillarFilter] = React.useState<ContentPillar | "">(
    "",
  );
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<KnowledgeItemOut | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] =
    React.useState<KnowledgeItemOut | null>(null);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = React.useState(false);

  const query = useQuery({
    queryKey: [
      "knowledge",
      typeFilter || "all",
      pillarFilter || "all",
      { projectId: projectId ?? null },
    ],
    queryFn: () =>
      listKnowledge({
        ...(typeFilter ? { type: typeFilter } : {}),
        ...(pillarFilter ? { pillar: pillarFilter } : {}),
        ...(projectId ? { project_id: projectId } : {}),
      }),
  });

  const filtered = React.useMemo(() => {
    const items = query.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.body.toLowerCase().includes(q) ||
        i.tags.some((tag) => tag.toLowerCase().includes(q)),
    );
  }, [query.data, search]);

  // Reset selection when filters or project change.
  React.useEffect(() => {
    setSelected(new Set());
  }, [typeFilter, pillarFilter, projectId]);

  const toggleSelected = React.useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t.knowledge.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t.knowledge.sub}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> {t.knowledge.new}
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.knowledge.searchPlaceholder}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          <TypePill
            active={!typeFilter}
            onClick={() => setTypeFilter("")}
            label={t.knowledge.all}
          />
          {KNOWLEDGE_TYPES.map((tp) => (
            <TypePill
              key={tp}
              active={typeFilter === tp}
              onClick={() => setTypeFilter(tp)}
              label={typeLabel(tp)}
            />
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1">
        <span className="mr-1 text-[11px] uppercase tracking-wider text-muted-foreground">
          {t.knowledge.pillarLabel}:
        </span>
        <TypePill
          active={!pillarFilter}
          onClick={() => setPillarFilter("")}
          label={t.knowledge.pillarFilterAll}
        />
        {PILLAR_OPTIONS.map((p) => (
          <TypePill
            key={p}
            active={pillarFilter === p}
            onClick={() => setPillarFilter(p)}
            label={p}
          />
        ))}
      </div>

      {selected.size > 0 && (
        <BulkBar
          ids={Array.from(selected)}
          onClear={() => setSelected(new Set())}
          onConfirmDelete={() => setConfirmBulkDelete(true)}
        />
      )}

      <div className="mt-6">
        {query.isPending ? (
          <ListSkeleton />
        ) : query.isError ? (
          <ErrorBlock
            detail={
              query.error instanceof ApiError
                ? query.error.detail
                : t.knowledge.couldNotLoadDetail
            }
            onRetry={() => query.refetch()}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="h-5 w-5" />}
            title={
              search ? t.knowledge.emptyMatchTitle : t.knowledge.emptyTitle
            }
            description={
              search ? t.knowledge.emptyMatchDesc : t.knowledge.emptyDesc
            }
            action={
              !search ? (
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" /> {t.knowledge.new}
                </Button>
              ) : null
            }
          />
        ) : (
          <ul className="space-y-2">
            {filtered.map((item) => {
              const isSelected = selected.has(item.id);
              return (
                <li
                  key={item.id}
                  className={cn(
                    "group rounded-xl border bg-card p-4 transition-colors hover:border-primary/30",
                    isSelected
                      ? "border-primary/60 bg-primary/[0.04]"
                      : "border-border",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelected(item.id)}
                      aria-label={`Выбрать «${item.title}»`}
                      className={cn(
                        "mt-1 h-4 w-4 cursor-pointer accent-primary transition-opacity",
                        isSelected
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100 focus:opacity-100",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-medium text-foreground">
                          {item.title}
                        </h3>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          {typeLabel(item.type)}
                        </span>
                        {item.pillar && (
                          <span
                            className={cn("co-plan-pillar", item.pillar)}
                          >
                            {item.pillar}
                          </span>
                        )}
                        {item.viral_score !== null && (
                          <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">
                            {t.knowledge.score(item.viral_score)}
                          </span>
                        )}
                        {item.is_dormant && (
                          <span className="rounded-full bg-warn/15 px-2 py-0.5 text-[10px] font-semibold text-warn">
                            {t.knowledge.dormant}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                        {item.body}
                      </p>
                      {item.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {item.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full border border-border bg-card/60 px-2 py-0.5 text-[10px] text-muted-foreground"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="mt-2 text-[11px] text-muted-foreground">
                        {t.knowledge.updated(formatRelativeRu(item.updated_at))}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditTarget(item)}
                        className="rounded-md border border-border bg-background/60 p-1.5 text-muted-foreground hover:text-foreground"
                        title={t.knowledge.edit}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(item)}
                        className="rounded-md border border-border bg-background/60 p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        title={t.knowledge.delete}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <CreateOrEditDialog
        open={createOpen || !!editTarget}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            setEditTarget(null);
          }
        }}
        editing={editTarget}
      />
      <DeleteDialog item={deleteTarget} onClose={() => setDeleteTarget(null)} />
      <BulkDeleteDialog
        open={confirmBulkDelete}
        ids={Array.from(selected)}
        onClose={(deleted) => {
          setConfirmBulkDelete(false);
          if (deleted) setSelected(new Set());
        }}
      />
    </div>
  );
}

function TypePill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide transition-colors",
        active
          ? "border-primary/60 bg-primary/15 text-primary"
          : "border-border bg-card/40 text-muted-foreground hover:bg-card",
      )}
    >
      {label}
    </button>
  );
}

function ListSkeleton() {
  return (
    <ul className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <li
          key={i}
          className="rounded-xl border border-border bg-card p-4"
          aria-hidden
        >
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="mt-2 h-4 w-full" />
          <Skeleton className="mt-1 h-4 w-2/3" />
        </li>
      ))}
    </ul>
  );
}

function ErrorBlock({
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
            {t.knowledge.couldNotLoadTitle}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
        </div>
      </div>
      <div className="mt-5">
        <Button onClick={onRetry} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4" /> {t.knowledge.retry}
        </Button>
      </div>
    </div>
  );
}

const itemSchema = z.object({
  type: z.enum([
    "tezis",
    "reference",
    "audience",
    "voice_rule",
    "content_theme",
    "manifesto",
  ]),
  title: z.string().min(1, t.knowledge.titleRequired).max(500),
  body: z.string().min(1, t.knowledge.bodyRequired),
  tags: z.string().optional(),
  pillar: z.string().optional(),
});

type ItemValues = z.infer<typeof itemSchema>;

function CreateOrEditDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: KnowledgeItemOut | null;
}) {
  const qc = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ItemValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      type: "tezis",
      title: "",
      body: "",
      tags: "",
      pillar: "",
    },
  });

  React.useEffect(() => {
    if (editing) {
      reset({
        type: editing.type,
        title: editing.title,
        body: editing.body,
        tags: editing.tags.join(", "),
        pillar: editing.pillar ?? "",
      });
    } else {
      reset({ type: "tezis", title: "", body: "", tags: "", pillar: "" });
    }
  }, [editing, reset]);

  const mutation = useMutation({
    mutationFn: (values: ItemValues) => {
      const tags = values.tags
        ? values.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [];
      const pillar = (values.pillar
        ? (values.pillar as ContentPillar)
        : null) as ContentPillar | null;
      if (editing) {
        return updateKnowledge(editing.id, {
          type: values.type,
          title: values.title,
          body: values.body,
          tags,
          pillar,
        });
      }
      return createKnowledge({
        type: values.type,
        title: values.title,
        body: values.body,
        tags,
        pillar,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["knowledge"] });
      toast.success(editing ? t.knowledge.saved : t.knowledge.created);
      onOpenChange(false);
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : t.knowledge.couldNotSaveToast,
      ),
  });

  const onSubmit = handleSubmit((values) => mutation.mutate(values));

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) mutation.reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editing ? t.knowledge.editTitle : t.knowledge.createTitle}
          </DialogTitle>
          <DialogDescription>{t.knowledge.formSub}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="k-type">{t.knowledge.typeLabel}</Label>
              <select
                id="k-type"
                {...register("type")}
                className="flex h-10 w-full rounded-md border border-input bg-background/40 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {KNOWLEDGE_TYPES.map((tp) => (
                  <option key={tp} value={tp}>
                    {typeLabel(tp)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="k-pillar">{t.knowledge.pillarLabel}</Label>
              <select
                id="k-pillar"
                {...register("pillar")}
                className="flex h-10 w-full rounded-md border border-input bg-background/40 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <option value="">{t.knowledge.pillarNone}</option>
                {PILLAR_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="k-title">{t.knowledge.titleLabel}</Label>
            <Input id="k-title" autoFocus {...register("title")} />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="k-body">{t.knowledge.bodyLabel}</Label>
            <Textarea id="k-body" rows={6} {...register("body")} />
            {errors.body && (
              <p className="text-xs text-destructive">{errors.body.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="k-tags">
              {t.knowledge.tagsLabel}{" "}
              <span className="text-muted-foreground">
                {t.knowledge.tagsHint}
              </span>
            </Label>
            <Input
              id="k-tags"
              placeholder={t.knowledge.tagsPlaceholder}
              {...register("tags")}
            />
          </div>
          {mutation.error && (
            <div
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              {mutation.error instanceof ApiError
                ? mutation.error.detail
                : t.knowledge.couldNotSave}
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />{" "}
                  {t.common.saving}
                </>
              ) : editing ? (
                t.common.save
              ) : (
                t.common.create
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({
  item,
  onClose,
}: {
  item: KnowledgeItemOut | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (id: string) => deleteKnowledge(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["knowledge"] });
      toast.success(t.knowledge.deleted);
      onClose();
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : t.knowledge.couldNotDelete,
      ),
  });

  return (
    <Dialog
      open={!!item}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.knowledge.deleteTitle}</DialogTitle>
          <DialogDescription>
            {t.knowledge.deleteSub(item?.title ?? "")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            {t.common.cancel}
          </Button>
          <Button
            variant="destructive"
            onClick={() => item && mutation.mutate(item.id)}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? t.common.deleting : t.common.delete}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ----- Bulk operations bar -------------------------------------------------

function BulkBar({
  ids,
  onClear,
  onConfirmDelete,
}: {
  ids: string[];
  onClear: () => void;
  onConfirmDelete: () => void;
}) {
  const qc = useQueryClient();
  const [moveOpen, setMoveOpen] = React.useState(false);
  const projectsQuery = useQuery<ProjectOut[]>({
    queryKey: ["projects"],
    queryFn: listProjects,
    enabled: moveOpen,
  });

  const moveMutation = useMutation({
    mutationFn: (project_id: string | null) =>
      bulkUpdateKnowledgeProject(ids, project_id),
    onSuccess: (res) => {
      toast.success(t.knowledge.bulkMoved(res.affected));
      qc.invalidateQueries({ queryKey: ["knowledge"] });
      onClear();
      setMoveOpen(false);
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : t.knowledge.bulkFailed,
      ),
  });

  return (
    <div className="sticky top-2 z-10 mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-primary/40 bg-primary/[0.06] px-3 py-2 backdrop-blur">
      <span className="text-[12px] font-medium text-foreground">
        {t.knowledge.bulkSelected(ids.length)}
      </span>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <div className="relative">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setMoveOpen((v) => !v)}
            disabled={moveMutation.isPending}
          >
            {moveMutation.isPending && (
              <Loader2 size={12} className="animate-spin" />
            )}
            {t.knowledge.bulkMove} ▾
          </Button>
          {moveOpen && (
            <div
              className="absolute right-0 z-20 mt-1 max-h-72 w-56 overflow-auto rounded-md border border-border bg-popover p-1 shadow-lg"
              onMouseLeave={() => setMoveOpen(false)}
            >
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[12.5px] hover:bg-accent"
                onClick={() => moveMutation.mutate(null)}
              >
                — {t.shell.all} —
              </button>
              {projectsQuery.isPending && (
                <div className="px-2 py-1 text-[12px] text-muted-foreground">
                  {t.common.loading}
                </div>
              )}
              {(projectsQuery.data ?? []).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[12.5px] hover:bg-accent"
                  onClick={() => moveMutation.mutate(p.id)}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: p.color }}
                    aria-hidden
                  />
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={onConfirmDelete}
        >
          <Trash2 size={12} /> {t.knowledge.bulkDelete}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
          <X size={12} /> {t.knowledge.bulkClear}
        </Button>
      </div>
    </div>
  );
}

function BulkDeleteDialog({
  open,
  ids,
  onClose,
}: {
  open: boolean;
  ids: string[];
  onClose: (deleted: boolean) => void;
}) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => bulkDeleteKnowledge(ids),
    onSuccess: (res) => {
      toast.success(t.knowledge.bulkDeleted(res.affected));
      qc.invalidateQueries({ queryKey: ["knowledge"] });
      onClose(true);
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : t.knowledge.bulkFailed,
      ),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose(false);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.knowledge.bulkDeleteConfirmTitle}</DialogTitle>
          <DialogDescription>
            {t.knowledge.bulkDeleteConfirmDesc(ids.length)}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onClose(false)}
            disabled={mutation.isPending}
          >
            {t.common.cancel}
          </Button>
          <Button
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> {t.common.deleting}
              </>
            ) : (
              t.common.delete
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
