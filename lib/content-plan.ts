import { apiFetch } from "@/lib/api";
import type {
  PlannedPostCreate,
  PlannedPostOut,
  PlannedPostUpdate,
  ScheduleFromNodeRequest,
  StatsResponse,
  WeekResponse,
  WhatToWriteResponse,
} from "@/lib/types";

export interface ListPostsParams {
  date_from?: string | null;
  date_to?: string | null;
  status?: string | null;
  platform?: string | null;
  pillar?: string | null;
  project_id?: string | null;
}

function toQuery(
  params: Record<string, string | null | undefined> | object,
): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") {
      search.set(k, String(v));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export async function listPosts(
  params: ListPostsParams = {},
): Promise<PlannedPostOut[]> {
  return apiFetch<PlannedPostOut[]>(
    `/api/v1/content-plan/posts${toQuery(params)}`,
  );
}

export async function createPost(
  body: PlannedPostCreate,
): Promise<PlannedPostOut> {
  return apiFetch<PlannedPostOut>("/api/v1/content-plan/posts", {
    method: "POST",
    body,
  });
}

export async function getPost(id: string): Promise<PlannedPostOut> {
  return apiFetch<PlannedPostOut>(`/api/v1/content-plan/posts/${id}`);
}

export async function updatePost(
  id: string,
  body: PlannedPostUpdate,
): Promise<PlannedPostOut> {
  return apiFetch<PlannedPostOut>(`/api/v1/content-plan/posts/${id}`, {
    method: "PATCH",
    body,
  });
}

export async function deletePost(id: string): Promise<void> {
  await apiFetch<void>(`/api/v1/content-plan/posts/${id}`, {
    method: "DELETE",
  });
}

export async function publishPost(id: string): Promise<PlannedPostOut> {
  return apiFetch<PlannedPostOut>(
    `/api/v1/content-plan/posts/${id}/publish`,
    { method: "POST" },
  );
}

export async function skipPost(id: string): Promise<PlannedPostOut> {
  return apiFetch<PlannedPostOut>(
    `/api/v1/content-plan/posts/${id}/skip`,
    { method: "POST" },
  );
}

export async function getQueue(): Promise<PlannedPostOut[]> {
  return apiFetch<PlannedPostOut[]>("/api/v1/content-plan/queue");
}

export async function getWeek(date_from: string): Promise<WeekResponse> {
  return apiFetch<WeekResponse>(
    `/api/v1/content-plan/week${toQuery({ date_from })}`,
  );
}

export async function getStats(): Promise<StatsResponse> {
  return apiFetch<StatsResponse>("/api/v1/content-plan/stats");
}

export async function getWhatToWrite(): Promise<WhatToWriteResponse> {
  return apiFetch<WhatToWriteResponse>("/api/v1/content-plan/what-to-write");
}

export async function scheduleFromNode(
  nodeId: string,
  body: ScheduleFromNodeRequest,
): Promise<PlannedPostOut> {
  return apiFetch<PlannedPostOut>(`/api/v1/nodes/${nodeId}/schedule`, {
    method: "POST",
    body,
  });
}

// ----- Date helpers (Monday-based week) -----

/** Format a Date as YYYY-MM-DD in local time. */
export function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parse YYYY-MM-DD into a local-midnight Date (avoids UTC drift). */
export function parseISODate(value: string): Date {
  const [y, m, d] = value.split("-").map((s) => Number(s));
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Returns Monday of the week containing `date` (in local time). */
export function getMondayOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0 = Sun … 6 = Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + days);
  return d;
}

/** Russian human label for a day, e.g. "Понедельник, 12 мая". */
export function formatDayRu(date: Date): string {
  return date.toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatDayShortRu(date: Date): string {
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
  });
}
