import { apiFetch } from "@/lib/api";
import type { CanvasDetail, UUID } from "@/lib/types";

export interface CanvasVersionOut {
  id: UUID;
  canvas_id: UUID;
  label: string | null;
  created_at: string;
  created_by_user_id: UUID | null;
  /** Lightweight metadata so the listing page can show node count etc. */
  node_count?: number;
  edge_count?: number;
}

export interface CanvasVersionDetail extends CanvasVersionOut {
  /** Full snapshot — same shape as CanvasDetail. */
  snapshot: CanvasDetail;
}

export async function listCanvasVersions(
  canvasId: string,
): Promise<CanvasVersionOut[]> {
  return apiFetch<CanvasVersionOut[]>(
    `/api/v1/canvases/${canvasId}/versions`,
  );
}

export async function createCanvasVersion(
  canvasId: string,
  input: { label?: string },
): Promise<CanvasVersionOut> {
  return apiFetch<CanvasVersionOut>(`/api/v1/canvases/${canvasId}/versions`, {
    method: "POST",
    body: input,
  });
}

export async function getCanvasVersion(
  canvasId: string,
  versionId: string,
): Promise<CanvasVersionDetail> {
  return apiFetch<CanvasVersionDetail>(
    `/api/v1/canvases/${canvasId}/versions/${versionId}`,
  );
}

export async function restoreCanvasVersion(
  canvasId: string,
  versionId: string,
): Promise<CanvasDetail> {
  return apiFetch<CanvasDetail>(
    `/api/v1/canvases/${canvasId}/versions/${versionId}/restore`,
    { method: "POST" },
  );
}

export async function deleteCanvasVersion(
  canvasId: string,
  versionId: string,
): Promise<void> {
  await apiFetch<void>(
    `/api/v1/canvases/${canvasId}/versions/${versionId}`,
    { method: "DELETE" },
  );
}
