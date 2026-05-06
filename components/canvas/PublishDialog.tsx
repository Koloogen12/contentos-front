"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Send, XCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import {
  listTargets,
  publishNode,
  subscribePublishLog,
} from "@/lib/publish";
import type { PublishLogOut, TelegramTargetOut } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

interface PublishDialogProps {
  nodeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PublishDialog({ nodeId, open, onOpenChange }: PublishDialogProps) {
  const qc = useQueryClient();
  const targetsQuery = useQuery({
    queryKey: ["telegram-targets"],
    queryFn: listTargets,
    enabled: open,
  });

  const targets = targetsQuery.data ?? [];
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [publishLogId, setPublishLogId] = React.useState<string | null>(null);
  const [terminalLog, setTerminalLog] = React.useState<PublishLogOut | null>(
    null,
  );

  // Auto-select default when targets load.
  React.useEffect(() => {
    if (selectedId || targets.length === 0) return;
    const def = targets.find((t) => t.is_default) ?? targets[0];
    setSelectedId(def.id);
  }, [targets, selectedId]);

  // Reset transient state when dialog closes.
  React.useEffect(() => {
    if (!open) {
      setPublishLogId(null);
      setTerminalLog(null);
    }
  }, [open]);

  const publishing = publishLogId !== null && terminalLog === null;

  // Subscribe to the publish-log lifecycle when one is in flight.
  React.useEffect(() => {
    if (!publishLogId) return;
    const unsub = subscribePublishLog(publishLogId, {
      onComplete: (log) => {
        setTerminalLog(log);
        toast.success(t.publish.sent);
      },
      onError: (msg, log) => {
        setTerminalLog(log ?? null);
        toast.error(msg);
      },
    });
    return () => {
      unsub();
    };
  }, [publishLogId]);

  const publishMutation = useMutation({
    mutationFn: (targetId: string) => publishNode(nodeId, targetId),
    onSuccess: ({ publish_log_id }) => {
      setPublishLogId(publish_log_id);
      qc.invalidateQueries({ queryKey: ["telegram-targets"] });
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : t.publish.couldNotStart,
      ),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Block close while publishing.
        if (!next && publishing) return;
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.publish.title}</DialogTitle>
          <DialogDescription>{t.publish.sub}</DialogDescription>
        </DialogHeader>

        {targetsQuery.isPending ? (
          <div className="space-y-2">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : targetsQuery.isError ? (
          <div
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
          >
            {targetsQuery.error instanceof ApiError
              ? targetsQuery.error.detail
              : t.publish.couldNotLoad}
          </div>
        ) : targets.length === 0 ? (
          <div className="rounded-md border border-border bg-card/40 px-4 py-6 text-center text-sm text-muted-foreground">
            <p>{t.publish.noTargetsTitle}</p>
            <p className="mt-1 text-xs">
              {t.publish.noTargetsSub}{" "}
              <Link
                href="/settings"
                className="text-primary hover:underline"
                onClick={() => onOpenChange(false)}
              >
                {t.publish.settingsLink}
              </Link>
              .
            </p>
          </div>
        ) : terminalLog ? (
          <PublishResult log={terminalLog} />
        ) : (
          <ul className="space-y-1.5">
            {targets.map((t) => (
              <TargetRow
                key={t.id}
                target={t}
                selected={selectedId === t.id}
                disabled={publishing}
                onSelect={() => setSelectedId(t.id)}
              />
            ))}
          </ul>
        )}

        <DialogFooter>
          {terminalLog ? (
            <Button onClick={() => onOpenChange(false)}>
              {t.publish.close}
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={publishing}
              >
                {t.common.cancel}
              </Button>
              <Button
                onClick={() => selectedId && publishMutation.mutate(selectedId)}
                disabled={
                  !selectedId ||
                  publishing ||
                  publishMutation.isPending ||
                  targets.length === 0
                }
              >
                {publishing || publishMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {publishing ? t.publish.sending : t.publish.starting}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    {t.publish.publish}
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TargetRow({
  target,
  selected,
  disabled,
  onSelect,
}: {
  target: TelegramTargetOut;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        className={cn(
          "flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors",
          selected
            ? "border-primary/60 bg-primary/10"
            : "border-border bg-card/40 hover:bg-card/70",
          disabled && "cursor-not-allowed opacity-60",
        )}
        onClick={onSelect}
        disabled={disabled}
      >
        <span
          className={cn(
            "h-3 w-3 shrink-0 rounded-full border",
            selected ? "border-primary bg-primary" : "border-muted-foreground/50",
          )}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="line-clamp-1 text-sm font-medium text-foreground">
              {target.title}
            </span>
            {target.is_default && (
              <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                {t.publish.default}
              </span>
            )}
          </div>
          <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
            {target.chat_id}
          </div>
        </div>
      </button>
    </li>
  );
}

function PublishResult({ log }: { log: PublishLogOut }) {
  const sent = log.status === "sent";
  return (
    <div
      className={cn(
        "rounded-md border px-4 py-3 text-sm",
        sent
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
          : "border-destructive/40 bg-destructive/10 text-destructive",
      )}
    >
      <div className="flex items-start gap-2">
        {sent ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        ) : (
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <div className="font-medium">
            {sent ? t.publish.sent : t.publish.failed}
          </div>
          {sent ? (
            <p className="mt-1 text-xs text-emerald-200/80">
              {log.message_id
                ? t.publish.sentMessage(log.message_id)
                : t.publish.sentDelivered}
            </p>
          ) : (
            <p className="mt-1 text-xs text-destructive/90">
              {log.error ?? t.publish.failedFallback}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
