import { apiFetch } from "@/lib/api";
import type {
  BulkRunStarted,
  CanvasDetail,
  CanvasOut,
} from "@/lib/types";

export interface ListCanvasesParams {
  project_id?: string | null;
  is_template?: boolean;
}

export async function listCanvases(
  params: ListCanvasesParams = {},
): Promise<CanvasOut[]> {
  const search = new URLSearchParams();
  if (params.project_id) search.set("project_id", params.project_id);
  if (params.is_template !== undefined)
    search.set("is_template", String(params.is_template));
  const qs = search.toString();
  return apiFetch<CanvasOut[]>(`/api/v1/canvases${qs ? `?${qs}` : ""}`);
}

export async function listCanvasTemplates(): Promise<CanvasOut[]> {
  return apiFetch<CanvasOut[]>("/api/v1/canvases/templates");
}

export async function createCanvasFromTemplate(
  templateId: string,
  input: { name: string; project_id?: string | null },
): Promise<CanvasDetail> {
  return apiFetch<CanvasDetail>(
    `/api/v1/canvases/from-template/${templateId}`,
    {
      method: "POST",
      body: input,
    },
  );
}

export async function duplicateCanvas(id: string): Promise<CanvasDetail> {
  return apiFetch<CanvasDetail>(`/api/v1/canvases/${id}/duplicate`, {
    method: "POST",
  });
}

export async function saveCanvasAsTemplate(id: string): Promise<CanvasOut> {
  return apiFetch<CanvasOut>(`/api/v1/canvases/${id}/save-as-template`, {
    method: "POST",
  });
}

export async function runAllOnCanvas(id: string): Promise<BulkRunStarted> {
  return apiFetch<BulkRunStarted>(`/api/v1/canvases/${id}/run-all`, {
    method: "POST",
  });
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
