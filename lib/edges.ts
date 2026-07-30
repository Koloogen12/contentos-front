import { apiFetch } from "@/lib/api";
import type { EdgeOut } from "@/lib/types";

export interface CreateEdgeInput {
  source_node_id: string;
  target_node_id: string;
  /**
   * Optional per-edge metadata. Used to set `{tezis_index: N}` when spawning
   * a format node from a specific talking-point card.
   */
  data?: Record<string, unknown>;
}

export async function createEdge(
  canvasId: string,
  input: CreateEdgeInput,
): Promise<EdgeOut> {
  return apiFetch<EdgeOut>(`/api/v1/canvases/${canvasId}/edges`, {
    method: "POST",
    body: input,
  });
}

export async function updateEdge(
  edgeId: string,
  data: Record<string, unknown>,
): Promise<EdgeOut> {
  return apiFetch<EdgeOut>(`/api/v1/edges/${edgeId}`, {
    method: "PATCH",
    body: { data },
  });
}

export async function deleteEdge(edgeId: string): Promise<void> {
  await apiFetch<void>(`/api/v1/edges/${edgeId}`, { method: "DELETE" });
}
