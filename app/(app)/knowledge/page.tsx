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
} from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import {
  createKnowledge,
  deleteKnowledge,
  listKnowledge,
  updateKnowledge,
} from "@/lib/knowledge";
import type { KnowledgeItemOut, KnowledgeType } from "@/lib/types";
import { formatRelativeDate } from "@/lib/utils";
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
];

export default function KnowledgePage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project");

  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<KnowledgeType | "">("");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<KnowledgeItemOut | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] =
    React.useState<KnowledgeItemOut | null>(null);

  const query = useQuery({
    queryKey: [
      "knowledge",
      typeFilter || "all",
      { projectId: projectId ?? null },
    ],
    queryFn: () =>
      listKnowledge({
        ...(typeFilter ? { type: typeFilter } : {}),
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
        i.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [query.data, search]);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Knowledge</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tezises, references, audience notes, voice rules — your AI&apos;s
            memory across canvases.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New item
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, body, tags…"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          <TypePill
            active={!typeFilter}
            onClick={() => setTypeFilter("")}
            label="All"
          />
          {KNOWLEDGE_TYPES.map((t) => (
            <TypePill
              key={t}
              active={typeFilter === t}
              onClick={() => setTypeFilter(t)}
              label={t}
            />
          ))}
        </div>
      </div>

      <div className="mt-6">
        {query.isPending ? (
          <ListSkeleton />
        ) : query.isError ? (
          <ErrorBlock
            detail={
              query.error instanceof ApiError
                ? query.error.detail
                : "Could not load knowledge."
            }
            onRetry={() => query.refetch()}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="h-5 w-5" />}
            title={search ? "No matching items" : "Library is empty"}
            description={
              search
                ? "Try different keywords or clear the type filter."
                : "Add your first tezis, reference, or voice rule."
            }
            action={
              !search ? (
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" /> New item
                </Button>
              ) : null
            }
          />
        ) : (
          <ul className="space-y-2">
            {filtered.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-medium text-foreground">
                        {item.title}
                      </h3>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {item.type}
                      </span>
                      {item.viral_score !== null && (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                          Score {item.viral_score}
                        </span>
                      )}
                      {item.is_dormant && (
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                          Dormant
                        </span>
                      )}
                    </div>
                    <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                      {item.body}
                    </p>
                    {item.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {item.tags.map((t) => (
                          <span
                            key={t}
                            className="rounded-full border border-border bg-card/60 px-2 py-0.5 text-[10px] text-muted-foreground"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-2 text-[11px] text-muted-foreground">
                      Updated {formatRelativeDate(item.updated_at)}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditTarget(item)}
                      className="rounded-md border border-border bg-background/60 p-1.5 text-muted-foreground hover:text-foreground"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(item)}
                      className="rounded-md border border-border bg-background/60 p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
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
      <DeleteDialog
        item={deleteTarget}
        onClose={() => setDeleteTarget(null)}
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
            Couldn&apos;t load knowledge
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

const itemSchema = z.object({
  type: z.enum(["tezis", "reference", "audience", "voice_rule", "content_theme"]),
  title: z.string().min(1, "Title is required").max(500),
  body: z.string().min(1, "Body is required"),
  tags: z.string().optional(),
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
    },
  });

  React.useEffect(() => {
    if (editing) {
      reset({
        type: editing.type,
        title: editing.title,
        body: editing.body,
        tags: editing.tags.join(", "),
      });
    } else {
      reset({ type: "tezis", title: "", body: "", tags: "" });
    }
  }, [editing, reset]);

  const mutation = useMutation({
    mutationFn: (values: ItemValues) => {
      const tags = values.tags
        ? values.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [];
      if (editing) {
        return updateKnowledge(editing.id, {
          type: values.type,
          title: values.title,
          body: values.body,
          tags,
        });
      }
      return createKnowledge({
        type: values.type,
        title: values.title,
        body: values.body,
        tags,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["knowledge"] });
      toast.success(editing ? "Item updated" : "Item created");
      onOpenChange(false);
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.detail : "Could not save"),
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
            {editing ? "Edit knowledge item" : "New knowledge item"}
          </DialogTitle>
          <DialogDescription>
            Tezises and references get injected into AI prompts when attached
            to a node.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="k-type">Type</Label>
            <select
              id="k-type"
              {...register("type")}
              className="flex h-10 w-full rounded-md border border-input bg-background/40 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {KNOWLEDGE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="k-title">Title</Label>
            <Input id="k-title" autoFocus {...register("title")} />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="k-body">Body</Label>
            <Textarea id="k-body" rows={6} {...register("body")} />
            {errors.body && (
              <p className="text-xs text-destructive">{errors.body.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="k-tags">
              Tags{" "}
              <span className="text-muted-foreground">(comma-separated)</span>
            </Label>
            <Input
              id="k-tags"
              placeholder="founders, ai, b2b"
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
                : "Could not save."}
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                </>
              ) : editing ? (
                "Save"
              ) : (
                "Create"
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
      toast.success("Item deleted");
      onClose();
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.detail : "Could not delete"),
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
          <DialogTitle>Delete knowledge item?</DialogTitle>
          <DialogDescription>
            &ldquo;{item?.title}&rdquo; will be removed everywhere it&apos;s
            attached. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => item && mutation.mutate(item.id)}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
