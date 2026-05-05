import { apiFetch } from "@/lib/api";
import type {
  SkillRunOut,
  SkillRunStartResponse,
  SkillRunStatus,
} from "@/lib/types";

/**
 * Trigger the skill associated with a node (extract → viral_talking_points,
 * format → {platform}_creator). Returns the skill_run id; caller polls or
 * subscribes via SSE for completion.
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

const DEFAULT_POLL_INTERVAL_MS = 1500;

/**
 * Subscribe to a skill-run's status until it terminates (`completed` | `failed`).
 *
 * NOTE on SSE vs polling:
 * The contract documents `GET /api/v1/skill-runs/{id}/stream` (SSE), but the
 * EventSource API in browsers cannot send custom headers — meaning the
 * `Authorization: Bearer <jwt>` we use everywhere else can't be attached.
 * Switching to a `?token=...` query param would require a backend change, and
 * the backend is locked for this iteration. Polling `GET /api/v1/skill-runs/{id}`
 * works with the existing contract and is more than fast enough for a typical
 * 5–30s skill run. We wrap it in this subscribe-style API so a swap to SSE
 * later is a one-line change.
 *
 * Returns an unsubscribe function. Always call it on unmount.
 */
export function subscribeSkillRun(
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
        handlers.onError?.(run.error ?? "Skill run failed");
        return;
      }
      // pending / running — keep polling
      timer = setTimeout(tick, interval);
    } catch (err) {
      if (stopped) return;
      handlers.onError?.(
        err instanceof Error ? err.message : "Could not fetch skill-run status",
      );
    }
  };

  // Kick off immediately so UI feedback appears fast.
  void tick();

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}
