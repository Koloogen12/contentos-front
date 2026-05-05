import { apiFetch } from "@/lib/api";
import type { EdgeOut } from "@/lib/types";

export interface CreateEdgeInput {
  source_node_id: string;
  target_node_id: string;
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

export async function deleteEdge(edgeId: string): Promise<void> {
  await apiFetch<void>(`/api/v1/edges/${edgeId}`, { method: "DELETE" });
}
