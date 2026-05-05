import { apiFetch } from "@/lib/api";
import type { NodeOut, NodeStatus, NodeType } from "@/lib/types";

export interface CreateNodeInput {
  type: NodeType;
  position_x: number;
  position_y: number;
  data?: Record<string, unknown>;
}

export async function createNode(
  canvasId: string,
  input: CreateNodeInput,
): Promise<NodeOut> {
  return apiFetch<NodeOut>(`/api/v1/canvases/${canvasId}/nodes`, {
    method: "POST",
    body: { ...input, data: input.data ?? {} },
  });
}

export interface UpdateNodeInput {
  position_x?: number;
  position_y?: number;
  data?: Record<string, unknown>;
  status?: NodeStatus;
}

export async function updateNode(
  nodeId: string,
  input: UpdateNodeInput,
): Promise<NodeOut> {
  return apiFetch<NodeOut>(`/api/v1/nodes/${nodeId}`, {
    method: "PATCH",
    body: input,
  });
}

export async function deleteNode(nodeId: string): Promise<void> {
  await apiFetch<void>(`/api/v1/nodes/${nodeId}`, { method: "DELETE" });
}
