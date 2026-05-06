import { API_BASE_URL, ApiError, apiFetch } from "@/lib/api";
import type {
  CanvasDetail,
  CanvasShareTokenCreated,
  CanvasShareTokenOut,
  PublicCanvasOut,
} from "@/lib/types";

// ----- Owner-side endpoints (auth'd) ---------------------------------

export async function createShareLink(
  canvasId: string,
): Promise<CanvasShareTokenCreated> {
  return apiFetch<CanvasShareTokenCreated>(
    `/api/v1/canvases/${canvasId}/share`,
    { method: "POST" },
  );
}

export async function listShareTokens(
  canvasId: string,
): Promise<CanvasShareTokenOut[]> {
  return apiFetch<CanvasShareTokenOut[]>(
    `/api/v1/canvases/${canvasId}/share-tokens`,
  );
}

export async function revokeShareToken(tokenId: string): Promise<void> {
  await apiFetch<void>(`/api/v1/canvases/share-tokens/${tokenId}`, {
    method: "DELETE",
  });
}

// ----- Public viewer (no auth header) --------------------------------

/**
 * Tiny no-auth GET that mirrors `apiFetch`'s error parsing but never injects
 * the bearer token. Used for the public viewer endpoint, which 401s if you
 * pass an expired token.
 */
export async function publicGet<T>(path: string): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;

  let res: Response;
  try {
    res = await fetch(url, { method: "GET" });
  } catch (err) {
    throw new ApiError(
      0,
      err instanceof Error ? err.message : "Сетевая ошибка. Проверь подключение.",
    );
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      if (data && typeof data === "object") {
        if (typeof data.detail === "string") detail = data.detail;
        else if (Array.isArray(data.detail))
          detail = data.detail
            .map((d: { msg?: string }) => d?.msg ?? "")
            .filter(Boolean)
            .join("; ");
      }
    } catch {
      // ignore
    }
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) return undefined as T;
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) return (await res.json()) as T;
  return (await res.text()) as unknown as T;
}

export async function getPublicCanvas(token: string): Promise<PublicCanvasOut> {
  return publicGet<PublicCanvasOut>(`/api/v1/public/canvases/${token}`);
}

// ----- Clone-from-share (auth'd) -------------------------------------

export async function cloneFromShare(
  token: string,
  input: { name: string; project_id?: string | null },
): Promise<CanvasDetail> {
  return apiFetch<CanvasDetail>(`/api/v1/canvases/from-share/${token}`, {
    method: "POST",
    body: input,
  });
}
