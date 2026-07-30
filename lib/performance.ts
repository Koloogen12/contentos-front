import { apiFetch } from "@/lib/api";
import type { VoiceSampleOut } from "@/lib/types";

export type PerformanceTier = "top" | "good" | "median" | "low" | "unknown";

export interface PostPerformanceOut {
  publish_log_id: string;
  node_id: string;
  target_id: string;
  target_title: string;
  tier: PerformanceTier;
  views: number | null;
  forwards: number | null;
  reactions_total: number;
  text_preview: string;
  metrics_fetched_at: string | null;
  completed_at: string | null;
}

export interface PerformanceOverviewOut {
  median_views: number | null;
  total_posts: number;
  top_count: number;
  good_count: number;
  median_count: number;
  low_count: number;
  unknown_count: number;
  has_baseline: boolean;
  posts: PostPerformanceOut[];
}

export async function getPerformanceOverview(): Promise<PerformanceOverviewOut> {
  return apiFetch<PerformanceOverviewOut>("/api/v1/performance/overview");
}

/** Add a sent post's text to voice_samples. Backend dedups by 200-char
 *  prefix and refuses with 409 if the sample is already there. */
export async function promoteToVoiceSample(
  publishLogId: string,
): Promise<VoiceSampleOut> {
  return apiFetch<VoiceSampleOut>(
    `/api/v1/performance/promote-to-voice/${publishLogId}`,
    { method: "POST" },
  );
}
