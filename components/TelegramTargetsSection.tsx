"use client";

import * as React from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertTriangle,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import {
  createTarget,
  deleteTarget,
  listTargets,
  updateTarget,
} from "@/lib/telegram-targets";
import type {
  TelegramTargetCreate,
  TelegramTargetOut,
  TelegramTargetUpdate,
} from "@/lib/types";
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

const QUERY_KEY = ["telegram-targets"] as const;

const schema = z.object({
  title: z.string().min(1, "Required").max(255),
  chat_id: z.string().min(1, "Required").max(255),
  bot_token: z.string().optional(),
  is_default: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

export function TelegramTargetsSection() {
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: listTargets,
  });

  const [editing, setEditing] = React.useState<TelegramTargetOut | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [pendingDelete, setPendingDelete] =
    React.useState<TelegramTargetOut | null>(null);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">
            Telegram targets
          </h2>
          <p className="text-sm text-muted-foreground">
            Channels and chats Format nodes can publish to.
          </p>
        </div>
        <Button onClick={() => setCreating(true)} size="sm">
          <Plus className="h-4 w-4" /> Add target
        </Button>
      </div>

      {query.isPending ? (
        <TargetsSkeleton />
      ) : query.isError ? (
        <ErrorBlock
          detail={
            query.error instanceof ApiError
              ? query.error.detail
              : "Could not load Telegram targets."
          }
          onRetry={() => query.refetch()}
        />
      ) : query.data && query.data.length > 0 ? (
        <TargetsTable
          targets={query.data}
          onEdit={setEditing}
          onDelete={setPendingDelete}
        />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 px-6 py-10 text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
            <Send className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-medium text-foreground">
            No targets yet
          </h3>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Add a Telegram channel or chat so you can publish posts straight
            from the canvas.
          </p>
          <Button
            onClick={() => setCreating(true)}
            size="sm"
            variant="outline"
            className="mt-4"
          >
            <Plus className="h-4 w-4" /> Add target
          </Button>
        </div>
      )}

      <TargetFormDialog
        open={creating}
        mode="create"
        onOpenChange={setCreating}
      />
      <TargetFormDialog
        open={!!editing}
        mode="edit"
        target={editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      />
      <DeleteTargetDialog
        target={pendingDelete}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      />
    </section>
  );
}

function TargetsTable({
  targets,
  onEdit,
  onDelete,
}: {
  targets: TelegramTargetOut[];
  onEdit: (t: TelegramTargetOut) => void;
  onDelete: (t: TelegramTargetOut) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card/40">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-card/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-2 font-medium">Title</th>
            <th className="px-4 py-2 font-medium">Chat ID</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {targets.map((t) => (
            <tr
              key={t.id}
              className="border-t border-border/60 first:border-t-0"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">
                    {t.title}
                  </span>
                  {t.is_default && (
                    <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      Default
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                {t.chat_id}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(t)}
                    aria-label={`Edit ${t.title}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(t)}
                    aria-label={`Delete ${t.title}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TargetFormDialog({
  open,
  mode,
  target,
  onOpenChange,
}: {
  open: boolean;
  mode: "create" | "edit";
  target?: TelegramTargetOut | null;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      chat_id: "",
      bot_token: "",
      is_default: false,
    },
  });

  // Reset form whenever the dialog opens or the editing target changes.
  React.useEffect(() => {
    if (!open) return;
    reset({
      title: target?.title ?? "",
      chat_id: target?.chat_id ?? "",
      bot_token: "",
      is_default: target?.is_default ?? false,
    });
  }, [open, target, reset]);

  const createMutation = useMutation({
    mutationFn: (input: TelegramTargetCreate) => createTarget(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Target added");
      onOpenChange(false);
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : "Could not add target",
      ),
  });

  const updateMutation = useMutation({
    mutationFn: (input: { id: string; patch: TelegramTargetUpdate }) =>
      updateTarget(input.id, input.patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Target updated");
      onOpenChange(false);
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : "Could not update target",
      ),
  });

  const submitting = createMutation.isPending || updateMutation.isPending;

  const onSubmit = handleSubmit((values) => {
    const trimmedToken = values.bot_token?.trim() ?? "";
    if (mode === "create") {
      const payload: TelegramTargetCreate = {
        title: values.title.trim(),
        chat_id: values.chat_id.trim(),
        bot_token: trimmedToken === "" ? null : trimmedToken,
        is_default: !!values.is_default,
      };
      createMutation.mutate(payload);
    } else if (target) {
      const patch: TelegramTargetUpdate = {
        title: values.title.trim(),
        chat_id: values.chat_id.trim(),
        is_default: !!values.is_default,
      };
      // Only send bot_token if the user typed something — otherwise we'd
      // overwrite the existing token with empty.
      if (trimmedToken !== "") {
        patch.bot_token = trimmedToken;
      }
      updateMutation.mutate({ id: target.id, patch });
    }
  });

  const isDefault = !!watch("is_default");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          createMutation.reset();
          updateMutation.reset();
        }
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add Telegram target" : "Edit Telegram target"}
          </DialogTitle>
          <DialogDescription>
            The bot needs admin rights in the destination channel/chat to post.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tg-title">Title</Label>
            <Input
              id="tg-title"
              autoFocus
              placeholder="Personal channel"
              {...register("title")}
              aria-invalid={!!errors.title}
            />
            {errors.title && (
              <p className="text-xs text-destructive">
                {errors.title.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tg-chat-id">Chat ID</Label>
            <Input
              id="tg-chat-id"
              placeholder="@yourchannel or -1001234567890"
              {...register("chat_id")}
              aria-invalid={!!errors.chat_id}
            />
            <p className="text-xs text-muted-foreground">
              Use @username for public channels, or the numeric ID (starts
              with <code>-100…</code>) for private ones.
            </p>
            {errors.chat_id && (
              <p className="text-xs text-destructive">
                {errors.chat_id.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tg-bot-token">
              Bot token{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="tg-bot-token"
              type="password"
              placeholder={
                mode === "edit"
                  ? "Leave blank to keep the current token"
                  : "Leave blank to use the platform default"
              }
              autoComplete="off"
              {...register("bot_token")}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border bg-background accent-primary"
              checked={isDefault}
              onChange={(e) => setValue("is_default", e.target.checked)}
            />
            Set as default
          </label>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                </>
              ) : mode === "create" ? (
                "Add target"
              ) : (
                "Save changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteTargetDialog({
  target,
  onOpenChange,
}: {
  target: TelegramTargetOut | null;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (id: string) => deleteTarget(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Target deleted");
      onOpenChange(false);
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : "Could not delete target",
      ),
  });

  return (
    <Dialog
      open={!!target}
      onOpenChange={(next) => {
        if (!next) mutation.reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete target?</DialogTitle>
          <DialogDescription>
            &ldquo;{target?.title}&rdquo; will be removed. Past publish logs
            stay intact.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => target && mutation.mutate(target.id)}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Deleting…
              </>
            ) : (
              "Delete"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TargetsSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-12" />
      <Skeleton className="h-12" />
    </div>
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
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/15 text-destructive">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-foreground">
            Couldn&apos;t load targets
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
        </div>
      </div>
      <div className="mt-4">
        <Button onClick={onRetry} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4" /> Retry
        </Button>
      </div>
    </div>
  );
}
