import { apiFetch } from "@/lib/api";
import type { PublishLogOut, PublishStarted, PublishStatus } from "@/lib/types";

// Re-export so callers don't need to know whether targets live in their own
// service file or are wrapped in by the publish module.
export {
  listTargets,
  createTarget,
  updateTarget,
  deleteTarget,
} from "@/lib/telegram-targets";

export async function publishNode(
  nodeId: string,
  targetId: string,
): Promise<PublishStarted> {
  return apiFetch<PublishStarted>(`/api/v1/nodes/${nodeId}/publish`, {
    method: "POST",
    body: { target_id: targetId },
  });
}

export async function getPublishLog(id: string): Promise<PublishLogOut> {
  return apiFetch<PublishLogOut>(`/api/v1/publish-logs/${id}`);
}

/** All publish attempts for one node, newest-first. Used by the FormatNode
 *  to render the metrics chip + history dropdown. */
export async function listNodePublishLogs(
  nodeId: string,
): Promise<PublishLogOut[]> {
  return apiFetch<PublishLogOut[]>(
    `/api/v1/nodes/${nodeId}/publish-logs`,
  );
}

/** Synchronously refresh `metrics` for a published post by re-scraping the
 *  public t.me web view. Returns the updated PublishLog. The 6-hour cron
 *  keeps this fresh in the background; this endpoint is for "I just hit
 *  refresh" manual pulls. */
export async function refreshPublishLogMetrics(
  publishLogId: string,
): Promise<PublishLogOut> {
  return apiFetch<PublishLogOut>(
    `/api/v1/publish-logs/${publishLogId}/refresh-metrics`,
    { method: "POST" },
  );
}

export interface PublishLogHandlers {
  onStatus?: (status: PublishStatus) => void;
  onComplete?: (log: PublishLogOut) => void;
  onError?: (message: string, log?: PublishLogOut) => void;
}

const DEFAULT_POLL_INTERVAL_MS = 1200;

/**
 * Subscribe to a publish-log's status until it terminates (`sent` | `failed`).
 *
 * Mirrors `subscribeSkillRun` so a future SSE migration is a one-line swap.
 * Returns an unsubscribe function — always call it on unmount.
 */
export function subscribePublishLog(
  publishLogId: string,
  handlers: PublishLogHandlers,
  options?: { intervalMs?: number },
): () => void {
  const interval = options?.intervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastStatus: PublishStatus | null = null;

  const tick = async () => {
    if (stopped) return;
    try {
      const log = await getPublishLog(publishLogId);
      if (stopped) return;
      if (log.status !== lastStatus) {
        lastStatus = log.status;
        handlers.onStatus?.(log.status);
      }
      if (log.status === "sent") {
        handlers.onComplete?.(log);
        return;
      }
      if (log.status === "failed") {
        handlers.onError?.(log.error ?? "Публикация не удалась", log);
        return;
      }
      // pending / sending — keep polling
      timer = setTimeout(tick, interval);
    } catch (err) {
      if (stopped) return;
      handlers.onError?.(
        err instanceof Error ? err.message : "Не удалось получить статус публикации",
      );
    }
  };

  void tick();

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}

/**
 * Публикация в аккаунт, подключённый через внешний шлюз (Instagram,
 * Threads, X). Отдельно от publishNode, который остался за Telegram: у
 * того своя таблица целей и свой сбор метрик.
 */
export async function publishNodeToAccount(
  nodeId: string,
  socialAccountId: string,
): Promise<PublishStarted> {
  return apiFetch<PublishStarted>(
    `/api/v1/nodes/${nodeId}/publish-to-account`,
    { method: "POST", body: { social_account_id: socialAccountId } },
  );
}
