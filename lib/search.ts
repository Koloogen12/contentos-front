import { apiFetch } from "@/lib/api";

export type SearchHitKind = "knowledge" | "canvas" | "planned_post";

export interface SearchHit {
  kind: SearchHitKind;
  id: string;
  title: string;
  snippet: string;
  extra?: Record<string, unknown>;
}

export interface SearchResponse {
  query: string;
  hits: SearchHit[];
  total: number;
}

export async function searchAll(
  q: string,
  kind?: SearchHitKind,
  limit = 30,
): Promise<SearchResponse> {
  const search = new URLSearchParams();
  search.set("q", q);
  if (kind) search.set("kind", kind);
  search.set("limit", String(limit));
  return apiFetch<SearchResponse>(`/api/v1/search?${search.toString()}`);
}
