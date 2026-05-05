import { apiFetch } from "@/lib/api";
import type { CanvasDetail, CanvasOut } from "@/lib/types";

export async function listCanvases(): Promise<CanvasOut[]> {
  return apiFetch<CanvasOut[]>("/api/v1/canvases");
}

export async function getCanvas(id: string): Promise<CanvasDetail> {
  return apiFetch<CanvasDetail>(`/api/v1/canvases/${id}`);
}

export async function createCanvas(input: {
  name: string;
  description?: string | null;
  project_id?: string | null;
}): Promise<CanvasOut> {
  return apiFetch<CanvasOut>("/api/v1/canvases", {
    method: "POST",
    body: input,
  });
}

export async function updateCanvas(
  id: string,
  input: { name?: string; description?: string | null; project_id?: string | null },
): Promise<CanvasOut> {
  return apiFetch<CanvasOut>(`/api/v1/canvases/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export async function deleteCanvas(id: string): Promise<void> {
  await apiFetch<void>(`/api/v1/canvases/${id}`, { method: "DELETE" });
}
