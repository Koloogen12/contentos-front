"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  BookOpen,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import {
  attachKnowledgeToNode,
  createKnowledge,
  detachKnowledgeFromNode,
  listKnowledge,
  listNodeKnowledge,
} from "@/lib/knowledge";
import type { KnowledgeItemOut, KnowledgeType, NodeOut } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

interface KnowledgeSidebarProps {
  selectedNode: NodeOut | null;
  onClose: () => void;
  /**
   * The owning canvas's project_id. When set, the "library browse" view
   * filters to that project (so a project canvas only sees its own
   * knowledge); otherwise we show the org-level library.
   */
  canvasProjectId?: string | null;
}

const KNOWLEDGE_TYPES: KnowledgeType[] = [
  "tezis",
  "reference",
  "audience",
  "voice_rule",
  "content_theme",
];

export function KnowledgeSidebar({
  selectedNode,
  onClose,
  canvasProjectId,
}: KnowledgeSidebarProps) {
  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col border-l border-border bg-[#0d0f10]">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">{t.knowledge.sidebarTitle}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          title={t.knowledge.sidebarHide}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {selectedNode ? (
        <NodeKnowledgePanel
          node={selectedNode}
          canvasProjectId={canvasProjectId ?? null}
        />
      ) : (
        <OrgBrowsePanel canvasProjectId={canvasProjectId ?? null} />
      )}
    </aside>
  );
}

function NodeKnowledgePanel({
  node,
  canvasProjectId,
}: {
  node: NodeOut;
  canvasProjectId: string | null;
}) {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<KnowledgeType | "">("");

  const attachedQuery = useQuery({
    queryKey: ["node-knowledge", node.id],
    queryFn: () => listNodeKnowledge(node.id),
  });

  const allQuery = useQuery({
    queryKey: [
      "knowledge",
      typeFilter || "all",
      { projectId: canvasProjectId ?? null },
    ],
    queryFn: () =>
      listKnowledge({
        ...(typeFilter ? { type: typeFilter } : {}),
        ...(canvasProjectId ? { project_id: canvasProjectId } : {}),
      }),
  });

  const attachMutation = useMutation({
    mutationFn: (itemId: string) => attachKnowledgeToNode(node.id, itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["node-knowledge", node.id] });
      toast.success(t.knowledge.sidebarAttached1);
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : t.knowledge.couldNotAttach,
      ),
  });

  const detachMutation = useMutation({
    mutationFn: (itemId: string) => detachKnowledgeFromNode(node.id, itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["node-knowledge", node.id] });
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : t.knowledge.couldNotDetach,
      ),
  });

  const attachedIds = React.useMemo(
    () => new Set((attachedQuery.data ?? []).map((i) => i.id)),
    [attachedQuery.data],
  );

  const filteredAvailable = React.useMemo(() => {
    const items = allQuery.data ?? [];
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (attachedIds.has(i.id)) return false;
      if (!q) return true;
      return (
        i.title.toLowerCase().includes(q) ||
        i.body.toLowerCase().includes(q) ||
        i.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [allQuery.data, search, attachedIds]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-border px-4 py-3">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {t.knowledge.sidebarSelectedNode}
        </div>
        <div className="mt-0.5 text-xs font-medium capitalize text-foreground">
          {node.type}
        </div>
      </div>

      <div className="border-b border-border px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs font-medium text-foreground">
            {t.knowledge.sidebarAttached(attachedQuery.data?.length ?? 0)}
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/10"
          >
            <Plus className="h-3 w-3" /> {t.knowledge.sidebarNew}
          </button>
        </div>
        {attachedQuery.isPending ? (
          <KnowledgeListSkeleton count={2} />
        ) : attachedQuery.data && attachedQuery.data.length > 0 ? (
          <ul className="space-y-1.5">
            {attachedQuery.data.map((item) => (
              <KnowledgeRow
                key={item.id}
                item={item}
                attached
                onDetach={() => detachMutation.mutate(item.id)}
                disabled={detachMutation.isPending}
              />
            ))}
          </ul>
        ) : (
          <p className="rounded-md border border-dashed border-border bg-card/40 px-3 py-3 text-[11px] text-muted-foreground">
            {t.knowledge.sidebarNothingAttached}
          </p>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-border px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-medium text-foreground">
              {t.knowledge.sidebarBrowse}
            </div>
          </div>
          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.knowledge.sidebarSearchPlaceholder}
              className="h-8 pl-7 text-xs"
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
                label={t.knowledge.typeFilter[tp]}
              />
            ))}
          </div>
        </div>
        <div className="scrollbar-thin flex-1 overflow-y-auto px-4 py-3">
          {allQuery.isPending ? (
            <KnowledgeListSkeleton count={4} />
          ) : filteredAvailable.length === 0 ? (
            <p className="rounded-md border border-dashed border-border bg-card/40 px-3 py-3 text-[11px] text-muted-foreground">
              {t.knowledge.sidebarNoMatches}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {filteredAvailable.map((item) => (
                <KnowledgeRow
                  key={item.id}
                  item={item}
                  onAttach={() => attachMutation.mutate(item.id)}
                  disabled={attachMutation.isPending}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      <CreateKnowledgeDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function OrgBrowsePanel({
  canvasProjectId,
}: {
  canvasProjectId: string | null;
}) {
  const [createOpen, setCreateOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<KnowledgeType | "">("");
  const allQuery = useQuery({
    queryKey: [
      "knowledge",
      typeFilter || "all",
      { projectId: canvasProjectId ?? null },
    ],
    queryFn: () =>
      listKnowledge({
        ...(typeFilter ? { type: typeFilter } : {}),
        ...(canvasProjectId ? { project_id: canvasProjectId } : {}),
      }),
  });

  const filtered = React.useMemo(() => {
    const items = allQuery.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.body.toLowerCase().includes(q) ||
        i.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [allQuery.data, search]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-border px-4 py-3 text-[11px] text-muted-foreground">
        {t.knowledge.sidebarPickToAttach}
      </div>
      <div className="border-b border-border px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs font-medium text-foreground">
            {t.knowledge.sidebarBrowse}
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/10"
          >
            <Plus className="h-3 w-3" /> {t.knowledge.sidebarNew}
          </button>
        </div>
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.knowledge.sidebarSearchPlaceholder}
            className="h-8 pl-7 text-xs"
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
              label={t.knowledge.typeFilter[tp]}
            />
          ))}
        </div>
      </div>
      <div className="scrollbar-thin flex-1 overflow-y-auto px-4 py-3">
        {allQuery.isPending ? (
          <KnowledgeListSkeleton count={4} />
        ) : filtered.length === 0 ? (
          <p className="rounded-md border border-dashed border-border bg-card/40 px-3 py-3 text-[11px] text-muted-foreground">
            {t.knowledge.sidebarNoItems}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {filtered.map((item) => (
              <KnowledgeRow key={item.id} item={item} readonly />
            ))}
          </ul>
        )}
      </div>
      <CreateKnowledgeDialog open={createOpen} onOpenChange={setCreateOpen} />
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
        "rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide transition-colors",
        active
          ? "border-primary/60 bg-primary/15 text-primary"
          : "border-border bg-card/40 text-muted-foreground hover:bg-card",
      )}
    >
      {label}
    </button>
  );
}

interface KnowledgeRowProps {
  item: KnowledgeItemOut;
  attached?: boolean;
  readonly?: boolean;
  onAttach?: () => void;
  onDetach?: () => void;
  disabled?: boolean;
}

function KnowledgeRow({
  item,
  attached,
  readonly,
  onAttach,
  onDetach,
  disabled,
}: KnowledgeRowProps) {
  return (
    <li className="rounded-md border border-border bg-card/50 px-2.5 py-2">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="line-clamp-1 text-xs font-medium text-foreground">
              {item.title}
            </span>
            <span className="rounded-full bg-muted/60 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
              {item.type}
            </span>
            {item.viral_score !== null && (
              <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-300">
                {item.viral_score}
              </span>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
            {item.body}
          </p>
        </div>
        {!readonly && attached && (
          <button
            type="button"
            disabled={disabled}
            onClick={onDetach}
            className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
            title={t.knowledge.sidebarDetach}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
        {!readonly && !attached && onAttach && (
          <button
            type="button"
            disabled={disabled}
            onClick={onAttach}
            className="rounded-md p-1 text-primary hover:bg-primary/10 disabled:opacity-50"
            title={t.knowledge.sidebarAttach}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </li>
  );
}

function KnowledgeListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <ul className="space-y-1.5">
      {Array.from({ length: count }).map((_, i) => (
        <li
          key={i}
          className="rounded-md border border-border bg-card/40 p-2.5"
          aria-hidden
        >
          <Skeleton className="h-3 w-3/5" />
          <Skeleton className="mt-1.5 h-3 w-full" />
          <Skeleton className="mt-1 h-3 w-4/5" />
        </li>
      ))}
    </ul>
  );
}

const createSchema = z.object({
  type: z.enum(["tezis", "reference", "audience", "voice_rule", "content_theme"]),
  title: z.string().min(1, t.knowledge.titleRequired).max(500),
  body: z.string().min(1, t.knowledge.bodyRequired),
  tags: z.string().optional(),
});

type CreateValues = z.infer<typeof createSchema>;

function CreateKnowledgeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { type: "tezis", title: "", body: "", tags: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: CreateValues) =>
      createKnowledge({
        type: values.type,
        title: values.title,
        body: values.body,
        tags: values.tags
          ? values.tags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean)
          : [],
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["knowledge"] });
      toast.success(t.knowledge.created);
      reset();
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
        if (!next) {
          reset();
          mutation.reset();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.knowledge.createTitle}</DialogTitle>
          <DialogDescription>{t.knowledge.sidebarCreateSub}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ki-type">{t.knowledge.typeLabel}</Label>
            <select
              id="ki-type"
              {...register("type")}
              className="flex h-10 w-full rounded-md border border-input bg-background/40 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {KNOWLEDGE_TYPES.map((tp) => (
                <option key={tp} value={tp}>
                  {t.knowledge.typeFilter[tp]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ki-title">{t.knowledge.titleLabel}</Label>
            <Input id="ki-title" autoFocus {...register("title")} />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ki-body">{t.knowledge.bodyLabel}</Label>
            <Textarea
              id="ki-body"
              rows={5}
              {...register("body")}
              placeholder={t.knowledge.bodyPlaceholder}
            />
            {errors.body && (
              <p className="text-xs text-destructive">{errors.body.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ki-tags">
              {t.knowledge.tagsLabel}{" "}
              <span className="text-muted-foreground">
                {t.knowledge.tagsHint}
              </span>
            </Label>
            <Input
              id="ki-tags"
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
                  {t.common.creating}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> {t.common.create}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
