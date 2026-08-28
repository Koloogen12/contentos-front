import { apiFetch } from "@/lib/api";

/** Статусы запуска. Удаления нет — только архив. */
export type LaunchStatus = "draft" | "active" | "paused" | "done" | "archived";
export type LaunchIntensity = "light" | "normal" | "heavy";
export type FindingSeverity = "critical" | "high" | "medium";
/** Кто проставил разметку. В покрытие идёт только `human`. */
export type MarkupOrigin = "rule" | "llm" | "human";

export interface LaunchOut {
  id: string;
  name: string;
  product_name: string | null;
  sales_open: string;
  sales_close: string | null;
  key_event_date: string | null;
  key_event_type: string | null;
  launch_number: number;
  intensity: LaunchIntensity;
  timezone: string;
  status: LaunchStatus;
  readiness: Record<string, boolean>;
  durations: Record<string, number>;
  waitlist_goal: number | null;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
}

export interface LaunchCreate {
  name: string;
  sales_open: string;
  product_name?: string | null;
  sales_close?: string | null;
  key_event_date?: string | null;
  key_event_type?: string | null;
  launch_number?: number;
  intensity?: LaunchIntensity;
  waitlist_goal?: number | null;
  notes?: string | null;
}

export interface StageWindow {
  stage: number;
  key: string;
  title: string;
  purpose: string;
  start: string;
  end: string;
  days: number;
}

export interface LaunchSlot {
  id: string;
  scheduled_date: string | null;
  platform: string;
  status: string;
  launch_stage: number | null;
  meaning: string | null;
  trigger_key: string | null;
  checkpoints: string[];
  markup_origin: MarkupOrigin | null;
  has_proof: boolean;
  is_last_day: boolean;
  is_peak: boolean;
  is_pinned: boolean;
  knowledge_item_id: string | null;
  talking_point_text: string | null;
  hook: string;
  full_text: string;
  /** Почему слот пуст — показываем дословно. */
  notes: string | null;
  version: number;
}

export interface PlanResponse {
  windows: StageWindow[];
  slots: LaunchSlot[];
  /** Что пришлось сжать, чтобы уложиться в срок. */
  compressed: string[];
  /** Что пришлось выбросить целиком. */
  dropped: string[];
}

export interface Finding {
  code: string;
  severity: FindingSeverity;
  title: string;
  message: string;
  fix_days: string[];
  affected: number;
  /** false — находка опирается на невыверенную разметку. */
  verified: boolean;
}

export interface LaunchReport {
  ready: boolean;
  findings: Finding[];
  checkpoints_confirmed: number;
  checkpoints_claimed: number;
  checkpoints_total: number;
  triggers_used: number;
  triggers_total: number;
  slots_total: number;
  slots_with_idea: number;
}

export interface StoryLine {
  id: string;
  launch_id: string;
  title: string;
  payoff: string | null;
  announced_on: string | null;
  closes_on: string | null;
  is_closed: boolean;
}

export interface LaunchReference {
  stages: Array<{
    num: number;
    key: string;
    title: string;
    purpose: string;
    min_days: number;
    default_days: number;
    max_days: number;
    background: boolean;
  }>;
  meanings: Array<{
    key: string;
    num: number;
    title: string;
    question: number;
    trigger_key: string;
    ours: boolean;
  }>;
  triggers: Array<{
    key: string;
    title: string;
    category: string;
    why: string;
    stage: number | null;
    cross_stage: boolean;
  }>;
  checkpoints: Array<{ key: string; question: number; title: string }>;
  questions: Array<{ num: number; title: string; why: string }>;
}

export async function listLaunches(
  includeArchived = false,
): Promise<LaunchOut[]> {
  const qs = includeArchived ? "?include_archived=true" : "";
  return apiFetch<LaunchOut[]>(`/api/v1/launches${qs}`);
}

export async function getLaunch(id: string): Promise<LaunchOut> {
  return apiFetch<LaunchOut>(`/api/v1/launches/${id}`);
}

export async function createLaunch(body: LaunchCreate): Promise<LaunchOut> {
  return apiFetch<LaunchOut>("/api/v1/launches", { method: "POST", body });
}

export async function updateLaunch(
  id: string,
  body: Partial<LaunchCreate> & {
    status?: LaunchStatus;
    readiness?: Record<string, boolean>;
    durations?: Record<string, number>;
  },
): Promise<LaunchOut> {
  return apiFetch<LaunchOut>(`/api/v1/launches/${id}`, { method: "PATCH", body });
}

export async function archiveLaunch(id: string): Promise<LaunchOut> {
  return apiFetch<LaunchOut>(`/api/v1/launches/${id}/archive`, { method: "POST" });
}

export async function getPlan(id: string): Promise<PlanResponse> {
  return apiFetch<PlanResponse>(`/api/v1/launches/${id}/plan`);
}

export async function generatePlan(
  id: string,
  body: { replace?: boolean; assign_ideas?: boolean } = {},
): Promise<PlanResponse> {
  return apiFetch<PlanResponse>(`/api/v1/launches/${id}/plan`, {
    method: "POST",
    body: { replace: true, assign_ideas: true, ...body },
  });
}

export async function assignIdeas(
  id: string,
): Promise<{ filled: number; empty: number }> {
  return apiFetch(`/api/v1/launches/${id}/assign-ideas`, { method: "POST" });
}

export async function markupBank(
  overwrite = false,
): Promise<{ marked: number; total: number }> {
  return apiFetch(`/api/v1/launches/markup-bank?overwrite=${overwrite}`, {
    method: "POST",
  });
}

export async function getReport(id: string): Promise<LaunchReport> {
  return apiFetch<LaunchReport>(`/api/v1/launches/${id}/report`);
}

export async function confirmSlot(
  launchId: string,
  slotId: string,
  body: {
    checkpoints?: string[];
    trigger_key?: string | null;
    has_proof?: boolean;
    is_peak?: boolean;
    is_pinned?: boolean;
    confirm?: boolean;
    version?: number;
  },
): Promise<LaunchSlot> {
  return apiFetch<LaunchSlot>(`/api/v1/launches/${launchId}/slots/${slotId}`, {
    method: "PATCH",
    body,
  });
}

export async function listStoryLines(id: string): Promise<StoryLine[]> {
  return apiFetch<StoryLine[]>(`/api/v1/launches/${id}/story-lines`);
}

export async function createStoryLine(
  id: string,
  body: { title: string; payoff?: string | null; announced_on?: string | null; closes_on?: string | null },
): Promise<StoryLine> {
  return apiFetch<StoryLine>(`/api/v1/launches/${id}/story-lines`, {
    method: "POST",
    body,
  });
}

export async function getReference(): Promise<LaunchReference> {
  return apiFetch<LaunchReference>("/api/v1/launches/reference");
}

/** Человеческая подпись каналу публикации. */
export const CHANNEL_LABELS: Record<string, string> = {
  stories: "Сторис",
  reels: "Рилс",
  telegram: "Telegram",
};

/** Что должно быть готово, кроме контента. */
export const READINESS_LABELS: Record<string, string> = {
  program: "Программа собрана",
  offer: "Оффер и цена зафиксированы",
  payments: "Приём оплаты подключён",
  access: "Выдача доступов проверена",
  support: "Поддержка на поток назначена",
};

export const SEVERITY_LABELS: Record<FindingSeverity, string> = {
  critical: "Критично",
  high: "Важно",
  medium: "Стоит поправить",
};
