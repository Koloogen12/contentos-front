import { API_BASE_URL, ApiError, apiFetch } from "@/lib/api";
import { getAuthSnapshot } from "@/stores/auth";
import type { SkillRunStarted, YoutubeMeta } from "@/lib/types";

/**
 * Fetch YouTube metadata (title / duration / channel) without kicking off a
 * full transcription. Used by the SourceNode "Fetch meta" affordance so the
 * user can preview before they commit to the long-running job.
 */
export async function getYoutubeMeta(
  nodeId: string,
  url: string,
): Promise<YoutubeMeta> {
  const search = new URLSearchParams({ url });
  return apiFetch<YoutubeMeta>(
    `/api/v1/nodes/${nodeId}/youtube-meta?${search.toString()}`,
  );
}

/**
 * Kick off the YouTube → transcript skill run. Returns the skill_run id; the
 * caller polls via `subscribeSkillRun`. The 202 response shape mirrors
 * `SkillRunStartResponse`.
 */
export async function transcribeYoutube(
  nodeId: string,
  url: string,
): Promise<SkillRunStarted> {
  return apiFetch<SkillRunStarted>(
    `/api/v1/nodes/${nodeId}/transcribe-youtube`,
    {
      method: "POST",
      body: { url },
    },
  );
}

/**
 * Upload an audio/video file for transcription using a raw XHR so we can
 * surface real-time upload progress (fetch can't expose `progress` events for
 * the request body in browsers).
 *
 * Trade-off: we don't piggy-back on `apiFetch`'s 401 → refresh → retry path.
 * Re-streaming a multipart body after a refresh is messy (the File handle is
 * fine but progress callbacks would double-fire). On a 401 we just throw —
 * the user re-signs-in and tries again. This is rare in practice (access
 * tokens are long-lived enough for an interactive upload) and keeps the helper
 * small.
 */
export function uploadAudio(
  nodeId: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<SkillRunStarted> {
  return new Promise((resolve, reject) => {
    const { accessToken } = getAuthSnapshot();
    if (!accessToken) {
      reject(new ApiError(401, "Sign in expired. Please sign in again."));
      return;
    }

    const xhr = new XMLHttpRequest();
    const url = `${API_BASE_URL}/api/v1/nodes/${nodeId}/upload-audio`;
    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);

    if (onProgress) {
      xhr.upload.addEventListener("progress", (event) => {
        if (!event.lengthComputable) return;
        const pct = Math.round((event.loaded / event.total) * 100);
        onProgress(Math.min(99, pct));
      });
    }

    xhr.addEventListener("load", () => {
      if (xhr.status === 401) {
        reject(
          new ApiError(401, "Sign in expired. Please sign in again."),
        );
        return;
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        let detail = xhr.statusText || `Upload failed (${xhr.status})`;
        try {
          const parsed = JSON.parse(xhr.responseText) as {
            detail?: unknown;
          };
          if (typeof parsed.detail === "string") {
            detail = parsed.detail;
          } else if (Array.isArray(parsed.detail)) {
            detail = parsed.detail
              .map((d) =>
                d && typeof d === "object" && "msg" in d
                  ? String((d as { msg?: string }).msg ?? "")
                  : "",
              )
              .filter(Boolean)
              .join("; ");
          }
        } catch {
          /* fall through to statusText */
        }
        reject(new ApiError(xhr.status, detail));
        return;
      }
      try {
        const parsed = JSON.parse(xhr.responseText) as SkillRunStarted;
        onProgress?.(100);
        resolve(parsed);
      } catch (err) {
        reject(
          new ApiError(
            0,
            err instanceof Error ? err.message : "Bad upload response",
          ),
        );
      }
    });

    xhr.addEventListener("error", () => {
      reject(new ApiError(0, "Network error during upload"));
    });
    xhr.addEventListener("abort", () => {
      reject(new ApiError(0, "Upload aborted"));
    });

    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}
