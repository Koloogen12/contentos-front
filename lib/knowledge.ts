import { apiFetch } from "@/lib/api";
import type {
  ContentPillar,
  KnowledgeItemOut,
  KnowledgeType,
} from "@/lib/types";

export interface ListKnowledgeParams {
  type?: KnowledgeType;
  project_id?: string | null;
  is_dormant?: boolean;
  pillar?: ContentPillar | null;
}

export async function listKnowledge(
  params: ListKnowledgeParams = {},
): Promise<KnowledgeItemOut[]> {
  const search = new URLSearchParams();
  if (params.type) search.set("type", params.type);
  if (params.project_id) search.set("project_id", params.project_id);
  if (params.is_dormant !== undefined)
    search.set("is_dormant", String(params.is_dormant));
  if (params.pillar) search.set("pillar", params.pillar);
  const qs = search.toString();
  return apiFetch<KnowledgeItemOut[]>(
    `/api/v1/knowledge${qs ? `?${qs}` : ""}`,
  );
}

export interface CreateKnowledgeInput {
  type: KnowledgeType;
  title: string;
  body: string;
  tags?: string[];
  project_id?: string | null;
  viral_score?: number | null;
  source_file?: string | null;
  pillar?: ContentPillar | null;
}

export async function createKnowledge(
  input: CreateKnowledgeInput,
): Promise<KnowledgeItemOut> {
  return apiFetch<KnowledgeItemOut>("/api/v1/knowledge", {
    method: "POST",
    body: input,
  });
}

export interface UpdateKnowledgeInput {
  title?: string;
  body?: string;
  tags?: string[];
  type?: KnowledgeType;
  project_id?: string | null;
  viral_score?: number | null;
  is_dormant?: boolean;
  pillar?: ContentPillar | null;
}

export async function updateKnowledge(
  id: string,
  input: UpdateKnowledgeInput,
): Promise<KnowledgeItemOut> {
  return apiFetch<KnowledgeItemOut>(`/api/v1/knowledge/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export async function deleteKnowledge(id: string): Promise<void> {
  await apiFetch<void>(`/api/v1/knowledge/${id}`, { method: "DELETE" });
}

export async function listNodeKnowledge(
  nodeId: string,
): Promise<KnowledgeItemOut[]> {
  return apiFetch<KnowledgeItemOut[]>(`/api/v1/nodes/${nodeId}/knowledge`);
}

export async function attachKnowledgeToNode(
  nodeId: string,
  itemId: string,
): Promise<void> {
  await apiFetch<void>(`/api/v1/nodes/${nodeId}/knowledge/${itemId}`, {
    method: "POST",
  });
}

export async function detachKnowledgeFromNode(
  nodeId: string,
  itemId: string,
): Promise<void> {
  await apiFetch<void>(`/api/v1/nodes/${nodeId}/knowledge/${itemId}`, {
    method: "DELETE",
  });
}

export interface BulkAffectedResponse {
  affected: number;
}

export async function bulkDeleteKnowledge(
  ids: string[],
): Promise<BulkAffectedResponse> {
  return apiFetch<BulkAffectedResponse>("/api/v1/knowledge/bulk-delete", {
    method: "POST",
    body: { ids },
  });
}

export async function bulkUpdateKnowledgeProject(
  ids: string[],
  project_id: string | null,
): Promise<BulkAffectedResponse> {
  return apiFetch<BulkAffectedResponse>(
    "/api/v1/knowledge/bulk-update-project",
    {
      method: "POST",
      body: { ids, project_id },
    },
  );
}


// ---------------------------------------------------------------------------
// Brain-dump → tezis proposals (NOT auto-saved)
// ---------------------------------------------------------------------------

export interface BrainDumpProposal {
  title: string;
  body: string;
  viral_score: number;
  pillar: ContentPillar | null;
  tags: string[];
}

export interface BrainDumpResponse {
  proposals: BrainDumpProposal[];
}

/** Parse a free-form thought into 3-7 tezis proposals.
 *  No DB writes here — the user picks which to save via `createKnowledge`. */
export async function brainDump(text: string): Promise<BrainDumpResponse> {
  return apiFetch<BrainDumpResponse>("/api/v1/knowledge/brain-dump", {
    method: "POST",
    body: { text },
  });
}
