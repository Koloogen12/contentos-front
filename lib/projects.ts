import { apiFetch } from "@/lib/api";
import type { ProjectCreate, ProjectOut, ProjectUpdate } from "@/lib/types";

export async function listProjects(): Promise<ProjectOut[]> {
  return apiFetch<ProjectOut[]>("/api/v1/projects");
}

export async function createProject(input: ProjectCreate): Promise<ProjectOut> {
  return apiFetch<ProjectOut>("/api/v1/projects", {
    method: "POST",
    body: input,
  });
}

export async function updateProject(
  id: string,
  input: ProjectUpdate,
): Promise<ProjectOut> {
  return apiFetch<ProjectOut>(`/api/v1/projects/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export async function deleteProject(id: string): Promise<void> {
  await apiFetch<void>(`/api/v1/projects/${id}`, { method: "DELETE" });
}

/**
 * Project palette — eight Tailwind-like indigo-anchored swatches that play
 * well against the dark theme. The first one matches the default backend
 * color (#6366f1 = indigo-500).
 */
export const PROJECT_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#ef4444", // red
  "#f59e0b", // amber
  "#10b981", // emerald
  "#06b6d4", // cyan
  "#64748b", // slate
] as const;

export type ProjectColor = (typeof PROJECT_COLORS)[number];
