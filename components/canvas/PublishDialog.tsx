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
  publishNodeToAccount,
  subscribePublishLog,
} from "@/lib/publish";
import { getBotInfo } from "@/lib/telegram-targets";
import { listSocialAccounts } from "@/lib/integrations";
import type {
  PublishLogOut,
  SocialAccountOut,
  TelegramTargetOut,
} from "@/lib/types";
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
  // Fetched once per session — we surface the bot's @handle in both the
  // empty state and the publish-error state so the user always knows what
  // to add to their channel as admin.
  const botInfoQuery = useQuery({
    queryKey: ["telegram-bot-info"],
    queryFn: getBotInfo,
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });
  const botHandle = botInfoQuery.data?.username
    ? `@${botInfoQuery.data.username}`
    : null;

  // Аккаунты шлюза лежат рядом с телеграм-каналами: для пользователя это
  // один вопрос «куда публикуем», а не два разных механизма.
  const socialQuery = useQuery({
    queryKey: ["social-accounts"],
    queryFn: listSocialAccounts,
    enabled: open,
  });

  const targets = targetsQuery.data ?? [];
  const socialAccounts = (socialQuery.data ?? []).filter((a) => a.is_active);
  const hasAnyTarget = targets.length > 0 || socialAccounts.length > 0;
  // Идентификаторы из разных таблиц могут совпасть только теоретически,
  // но путать телеграм-канал с аккаунтом Instagram нельзя — храним вид.
  const [selected, setSelected] = React.useState<
    { kind: "telegram" | "social"; id: string } | null
  >(null);
  const [publishLogId, setPublishLogId] = React.useState<string | null>(null);
  const [terminalLog, setTerminalLog] = React.useState<PublishLogOut | null>(
    null,
  );

  // Auto-select default when targets load.
  React.useEffect(() => {
    if (selected) return;
    if (targets.length > 0) {
      const def = targets.find((t) => t.is_default) ?? targets[0];
      setSelected({ kind: "telegram", id: def.id });
      return;
    }
    if (socialAccounts.length > 0) {
      setSelected({ kind: "social", id: socialAccounts[0].id });
    }
  }, [targets, socialAccounts, selected]);

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
    mutationFn: (target: { kind: "telegram" | "social"; id: string }) =>
      target.kind === "telegram"
        ? publishNode(nodeId, target.id)
        : publishNodeToAccount(nodeId, target.id),
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

        {/* Always-visible "add the bot as admin" reminder. The most common
            failure mode is the user creating a target with the right chat_id
            but forgetting to add our bot to the channel — surfacing the
            handle every time keeps the action obvious. */}
        {botHandle && targets.length > 0 && (
          <div className="mb-3 flex items-start gap-2 rounded-md border border-info/20 bg-info/[0.05] px-3 py-2 text-[12px] text-info/90">
            <Send className="mt-0.5 h-3.5 w-3.5 shrink-0 text-info" />
            <span>
              Бот{" "}
              <code className="rounded bg-foreground/5 px-1 font-mono text-info">
                {botHandle}
              </code>{" "}
              должен быть админом канала с правом «Публикация сообщений».
              Если ошибка «chat not found» — добавь его и попробуй снова.
            </span>
          </div>
        )}

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
        ) : !hasAnyTarget ? (
          <div className="rounded-md border border-border bg-card/40 px-4 py-6 text-center text-sm text-muted-foreground">
            <p>{t.publish.noTargetsTitle}</p>
            <p className="mt-1 text-xs">
              {t.publish.noTargetsSub}{" "}
              <Link
                href="/connections"
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
            {targets.map((tg) => (
              <TargetRow
                key={tg.id}
                target={tg}
                selected={
                  selected?.kind === "telegram" && selected.id === tg.id
                }
                disabled={publishing}
                onSelect={() => setSelected({ kind: "telegram", id: tg.id })}
              />
            ))}
            {socialAccounts.map((a) => (
              <SocialRow
                key={a.id}
                account={a}
                selected={selected?.kind === "social" && selected.id === a.id}
                disabled={publishing}
                onSelect={() => setSelected({ kind: "social", id: a.id })}
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
                onClick={() => selected && publishMutation.mutate(selected)}
                disabled={
                  !selected ||
                  publishing ||
                  publishMutation.isPending ||
                  !hasAnyTarget
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
          ? "border-success/40 bg-success/10 text-success"
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
            <p className="mt-1 text-xs text-success/80">
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

/**
 * Строка выбора аккаунта, подключённого через шлюз. Отдельно от TargetRow:
 * у телеграм-канала показывается handle и признак «по умолчанию», у
 * аккаунта площадки — аватар и площадка, к которой он относится.
 */
function SocialRow({
  account,
  selected,
  disabled,
  onSelect,
}: {
  account: SocialAccountOut;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        disabled={disabled}
        aria-pressed={selected}
        className={cn(
          "flex w-full items-center gap-3 rounded-[12px] border px-3 py-2.5 text-left transition",
          selected
            ? "border-[color:var(--p-or)] bg-[color:var(--p-or-soft)]"
            : "border-[color:var(--p-line)] hover:border-[color:var(--p-line-2)]",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        {account.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={account.avatar_url}
            alt=""
            className="h-8 w-8 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="av" style={{ width: 32, height: 32, fontSize: 13 }}>
            {account.display_name.slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13.5px] font-medium">
            {account.display_name}
          </div>
          <div className="kmeta" style={{ marginTop: 2 }}>
            {account.platform}
            {account.username ? ` · @${account.username}` : ""}
          </div>
        </div>
      </button>
    </li>
  );
}
