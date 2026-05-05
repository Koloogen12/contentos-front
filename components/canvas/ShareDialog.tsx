"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Copy,
  Link2,
  Loader2,
  Plus,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import {
  createShareLink,
  listShareTokens,
  revokeShareToken,
} from "@/lib/share";
import type { CanvasShareTokenOut } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatRelativeDate } from "@/lib/utils";

interface ShareDialogProps {
  canvasId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TOKENS_KEY = (canvasId: string) =>
  ["share-tokens", canvasId] as const;

export function ShareDialog({ canvasId, open, onOpenChange }: ShareDialogProps) {
  const qc = useQueryClient();
  const [origin, setOrigin] = React.useState<string>("");
  const [showRevoked, setShowRevoked] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const tokensQuery = useQuery({
    queryKey: TOKENS_KEY(canvasId),
    queryFn: () => listShareTokens(canvasId),
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: () => createShareLink(canvasId),
    onSuccess: (created) => {
      // Optimistic prepend.
      qc.setQueryData<CanvasShareTokenOut[] | undefined>(
        TOKENS_KEY(canvasId),
        (prev) => {
          const optimistic: CanvasShareTokenOut = {
            id: created.id,
            canvas_id: canvasId,
            token: created.token,
            created_by_user_id: "",
            created_at: new Date().toISOString(),
            revoked_at: null,
          };
          if (!prev) return [optimistic];
          // Skip if it's already there (defensive).
          if (prev.some((t) => t.id === created.id)) return prev;
          return [optimistic, ...prev];
        },
      );
      // Refetch to get authoritative `created_by_user_id` and `created_at`.
      qc.invalidateQueries({ queryKey: TOKENS_KEY(canvasId) });
      toast.success("Public link created");
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : "Could not create share link",
      ),
  });

  const tokens = tokensQuery.data ?? [];
  const activeTokens = tokens.filter((t) => !t.revoked_at);
  const revokedTokens = tokens.filter((t) => !!t.revoked_at);
  const visibleTokens = showRevoked ? tokens : activeTokens;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Share this canvas</DialogTitle>
          <DialogDescription>
            Anyone with the link can view this canvas read-only and clone it
            into their own workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Link2 className="h-3.5 w-3.5" />
              Public links
            </div>

            {tokensQuery.isPending ? (
              <div className="space-y-2">
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
              </div>
            ) : tokensQuery.isError ? (
              <div
                role="alert"
                className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
              >
                {tokensQuery.error instanceof ApiError
                  ? tokensQuery.error.detail
                  : "Could not load share links."}
              </div>
            ) : visibleTokens.length === 0 ? (
              <div className="rounded-md border border-dashed border-border bg-card/40 px-4 py-6 text-center text-sm text-muted-foreground">
                No public links yet. Anyone with the link can view this canvas
                read-only and clone it into their own workspace.
              </div>
            ) : (
              <ul className="space-y-1.5">
                {visibleTokens.map((t) => (
                  <ShareTokenRow
                    key={t.id}
                    token={t}
                    origin={origin}
                    canvasId={canvasId}
                  />
                ))}
              </ul>
            )}
          </div>

          <Button
            type="button"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="w-full"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Creating link…
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" /> Create new public link
              </>
            )}
          </Button>

          {revokedTokens.length > 0 && (
            <button
              type="button"
              onClick={() => setShowRevoked((v) => !v)}
              className="flex w-full items-center justify-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground hover:text-foreground"
            >
              <ShieldAlert className="h-3 w-3" />
              {showRevoked
                ? `Hide ${revokedTokens.length} revoked`
                : `Show ${revokedTokens.length} revoked`}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ShareTokenRow({
  token,
  origin,
  canvasId,
}: {
  token: CanvasShareTokenOut;
  origin: string;
  canvasId: string;
}) {
  const qc = useQueryClient();
  const [copied, setCopied] = React.useState(false);
  const [confirmRevoke, setConfirmRevoke] = React.useState(false);

  const url = origin ? `${origin}/p/${token.token}` : `/p/${token.token}`;
  const isRevoked = !!token.revoked_at;

  const revokeMutation = useMutation({
    mutationFn: () => revokeShareToken(token.id),
    onSuccess: () => {
      qc.setQueryData<CanvasShareTokenOut[] | undefined>(
        TOKENS_KEY(canvasId),
        (prev) =>
          prev
            ? prev.map((t) =>
                t.id === token.id
                  ? { ...t, revoked_at: new Date().toISOString() }
                  : t,
              )
            : prev,
      );
      qc.invalidateQueries({ queryKey: TOKENS_KEY(canvasId) });
      toast.success("Link revoked");
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : "Could not revoke link",
      ),
  });

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied to clipboard");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  return (
    <li
      className={cn(
        "rounded-md border bg-card/40 px-3 py-2.5",
        isRevoked
          ? "border-border/60 opacity-60"
          : "border-border",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="line-clamp-1 font-mono text-xs text-foreground">
            {url}
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            {isRevoked
              ? `Revoked ${formatRelativeDate(token.revoked_at as string)}`
              : `Created ${formatRelativeDate(token.created_at)}`}
          </div>
        </div>
        {!isRevoked && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={onCopy}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-foreground hover:bg-accent"
            >
              {copied ? (
                <Check className="h-3 w-3 text-emerald-400" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
            {confirmRevoke ? (
              <>
                <button
                  type="button"
                  onClick={() => revokeMutation.mutate()}
                  disabled={revokeMutation.isPending}
                  className="inline-flex items-center gap-1 rounded-md bg-destructive px-2 py-1 text-[11px] font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-60"
                >
                  {revokeMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmRevoke(false)}
                  disabled={revokeMutation.isPending}
                  className="rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-accent disabled:opacity-60"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmRevoke(true)}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3 w-3" />
                Revoke
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
