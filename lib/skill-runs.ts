import { API_BASE_URL, apiFetch } from "@/lib/api";
import { getAccessToken } from "@/stores/auth";
import type {
  SkillRunOut,
  SkillRunStartResponse,
  SkillRunStatus,
} from "@/lib/types";

/**
 * Trigger the skill associated with a node (extract → viral_talking_points,
 * format → {platform}_creator). Returns the skill_run id; caller subscribes
 * via `subscribeSkillRun` for completion.
 */
export async function runNode(
  nodeId: string,
): Promise<SkillRunStartResponse> {
  return apiFetch<SkillRunStartResponse>(`/api/v1/nodes/${nodeId}/run`, {
    method: "POST",
  });
}

export async function getSkillRun(skillRunId: string): Promise<SkillRunOut> {
  return apiFetch<SkillRunOut>(`/api/v1/skill-runs/${skillRunId}`);
}

export interface SkillRunHandlers {
  onStatus?: (status: SkillRunStatus) => void;
  onComplete?: (run: SkillRunOut) => void;
  onError?: (message: string) => void;
}

/**
 * Subscribe to a skill-run's status until it terminates.
 *
 * Iter C swap: this used to poll `GET /skill-runs/{id}` every 1.5s. The
 * backend now exposes `GET /skill-runs/{id}/stream?token=<jwt>` (SSE), so we
 * open an EventSource and listen for `status`, `progress`, `complete`, and
 * `error` events. The transport is a faster status channel — completion
 * still triggers a canvas refetch in the consumer (CanvasEditor), nothing
 * else changes from the caller's perspective.
 *
 * Fallback path: if the auth store has no access token yet (offline / pre-
 * rehydrate window) we drop back to polling so the run still completes.
 *
 * Error model: native EventSource fires `onerror` for transient retries too.
 * We only treat `readyState === CLOSED` as a fatal transport error, and
 * resolve it with a single GET to learn the final state — no auto-reconnect.
 *
 * Returns an unsubscribe function. Always call it on unmount.
 */
export function subscribeSkillRun(
  skillRunId: string,
  handlers: SkillRunHandlers,
  options?: { intervalMs?: number },
): () => void {
  const token = getAccessToken();
  if (!token) {
    return subscribeViaPolling(skillRunId, handlers, options);
  }
  return subscribeViaSse(skillRunId, token, handlers);
}

// ----- SSE path ---------------------------------------------------------

type StatusPayload = { status: SkillRunStatus };
type CompletePayload = {
  node_id?: string;
  node_data?: Record<string, unknown>;
  node_status?: string;
  duration_ms?: number;
  meta?: Record<string, unknown>;
};
type ErrorPayload = { message?: string };

function parseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function subscribeViaSse(
  skillRunId: string,
  token: string,
  handlers: SkillRunHandlers,
): () => void {
  const url = `${API_BASE_URL}/api/v1/skill-runs/${skillRunId}/stream?token=${encodeURIComponent(
    token,
  )}`;
  const es = new EventSource(url);

  let closed = false;
  let terminated = false;

  const close = () => {
    if (closed) return;
    closed = true;
    es.close();
  };

  const finish = (fn: () => void) => {
    if (terminated) return;
    terminated = true;
    fn();
    close();
  };

  es.addEventListener("status", (ev: MessageEvent) => {
    const payload = parseJson<StatusPayload>(ev.data);
    if (!payload) return;
    handlers.onStatus?.(payload.status);
    // The contract says the stream replays terminal status if the run is
    // already finished. Treat `completed`/`failed` here as a terminal signal
    // and resolve via a final GET so the consumer always sees the canonical
    // shape — keeps behavior identical to the polling implementation.
    if (payload.status === "completed") {
      void getSkillRun(skillRunId)
        .then((run) => {
          finish(() => handlers.onComplete?.(run));
        })
        .catch((err: unknown) => {
          finish(() =>
            handlers.onError?.(
              err instanceof Error
                ? err.message
                : "Скилл завершён, но обновить состояние не удалось",
            ),
          );
        });
    } else if (payload.status === "failed") {
      void getSkillRun(skillRunId)
        .then((run) => {
          finish(() =>
            handlers.onError?.(run.error ?? "Скилл-ран завершился с ошибкой"),
          );
        })
        .catch((err: unknown) => {
          finish(() =>
            handlers.onError?.(
              err instanceof Error ? err.message : "Скилл-ран завершился с ошибкой",
            ),
          );
        });
    }
  });

  es.addEventListener("progress", () => {
    // Opaque progress — bump the running indicator. Consumer doesn't need
    // the step name today, but firing onStatus("running") is harmless and
    // keeps the indicator alive while long runs unfold.
    handlers.onStatus?.("running");
  });

  es.addEventListener("complete", (ev: MessageEvent) => {
    // We could short-circuit with the inline node_data, but the canvas
    // consumer always refetches on completion (safer source of truth), so
    // we mirror the polling contract: hand back a SkillRunOut. A quick
    // GET keeps the shape identical and is O(ms) on a hot run.
    void parseJson<CompletePayload>(ev.data); // intentional: drained for parity
    void getSkillRun(skillRunId)
      .then((run) => {
        finish(() => handlers.onComplete?.(run));
      })
      .catch((err: unknown) => {
        finish(() =>
          handlers.onError?.(
            err instanceof Error
              ? err.message
              : "Скилл завершён, но обновить состояние не удалось",
          ),
        );
      });
  });

  // Single `error` listener that handles both:
  //   1. Server-emitted application errors (`event: error\ndata: {...}`).
  //   2. Native transport errors (browser fires Event with empty data).
  // Native errors fire for transient retries too — only treat CLOSED as
  // fatal and use a final GET to resolve the run state.
  es.addEventListener("error", (ev: Event) => {
    if (terminated) return;
    const data = (ev as MessageEvent).data;
    if (typeof data === "string" && data.length > 0) {
      const payload = parseJson<ErrorPayload>(data);
      finish(() =>
        handlers.onError?.(payload?.message ?? "Скилл-ран завершился с ошибкой"),
      );
      return;
    }
    if (es.readyState === EventSource.CLOSED) {
      void getSkillRun(skillRunId)
        .then((run) => {
          if (run.status === "completed") {
            finish(() => handlers.onComplete?.(run));
          } else if (run.status === "failed") {
            finish(() =>
              handlers.onError?.(run.error ?? "Скилл-ран завершился с ошибкой"),
            );
          } else {
            // Stream dropped mid-flight and the run isn't terminal yet.
            // Surface as an error rather than hanging silently.
            finish(() =>
              handlers.onError?.(
                "Соединение с потоком скилл-рана прервано",
              ),
            );
          }
        })
        .catch((err: unknown) => {
          finish(() =>
            handlers.onError?.(
              err instanceof Error
                ? err.message
                : "Не удалось получить статус скилл-рана",
            ),
          );
        });
    }
    // CONNECTING means the browser is auto-retrying — let it.
  });

  return () => {
    terminated = true;
    close();
  };
}

// ----- Polling fallback (pre-rehydrate / no token) ----------------------

const DEFAULT_POLL_INTERVAL_MS = 1500;

function subscribeViaPolling(
  skillRunId: string,
  handlers: SkillRunHandlers,
  options?: { intervalMs?: number },
): () => void {
  const interval = options?.intervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastStatus: SkillRunStatus | null = null;

  const tick = async () => {
    if (stopped) return;
    try {
      const run = await getSkillRun(skillRunId);
      if (stopped) return;
      if (run.status !== lastStatus) {
        lastStatus = run.status;
        handlers.onStatus?.(run.status);
      }
      if (run.status === "completed") {
        handlers.onComplete?.(run);
        return;
      }
      if (run.status === "failed") {
        handlers.onError?.(run.error ?? "Скилл-ран завершился с ошибкой");
        return;
      }
      timer = setTimeout(tick, interval);
    } catch (err) {
      if (stopped) return;
      handlers.onError?.(
        err instanceof Error ? err.message : "Не удалось получить статус скилл-рана",
      );
    }
  };

  void tick();

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}
