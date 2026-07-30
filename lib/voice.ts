import { apiFetch } from "@/lib/api";
import type {
  TelegramImportRequest,
  UrlImportRequest,
  VoiceImportResult,
  VoiceSampleBulkResult,
  VoiceSampleCreate,
  VoiceSampleOut,
  VoiceTraitsExtracted,
  YoutubeImportRequest,
} from "@/lib/types";
import type { Redpolitika, RedpolitikaDraft } from "@/lib/types";

/**
 * Voice training service module.
 * Wraps `/api/v1/voice-samples` — list/create/delete + extract-traits +
 * three auto-import endpoints (Telegram public channel, YouTube channel,
 * blog URLs).
 */

export async function listVoiceSamples(): Promise<VoiceSampleOut[]> {
  return apiFetch<VoiceSampleOut[]>("/api/v1/voice-samples");
}

export async function createVoiceSample(
  input: VoiceSampleCreate,
): Promise<VoiceSampleOut> {
  return apiFetch<VoiceSampleOut>("/api/v1/voice-samples", {
    method: "POST",
    body: input,
  });
}

export async function bulkCreateVoiceSamples(
  samples: VoiceSampleCreate[],
): Promise<VoiceSampleBulkResult> {
  return apiFetch<VoiceSampleBulkResult>("/api/v1/voice-samples/bulk", {
    method: "POST",
    body: { samples },
  });
}

export async function deleteVoiceSample(id: string): Promise<void> {
  await apiFetch<void>(`/api/v1/voice-samples/${id}`, {
    method: "DELETE",
  });
}

export async function extractTraits(): Promise<VoiceTraitsExtracted> {
  return apiFetch<VoiceTraitsExtracted>(
    "/api/v1/voice-samples/extract-traits",
    {
      method: "POST",
    },
  );
}

// ---------------------------------------------------------------------------
// Auto-import (free-tier sources)
// ---------------------------------------------------------------------------

export async function importVoiceFromTelegram(
  input: TelegramImportRequest,
): Promise<VoiceImportResult> {
  return apiFetch<VoiceImportResult>("/api/v1/voice-samples/import/telegram", {
    method: "POST",
    body: input,
  });
}

export async function importVoiceFromYoutube(
  input: YoutubeImportRequest,
): Promise<VoiceImportResult> {
  return apiFetch<VoiceImportResult>("/api/v1/voice-samples/import/youtube", {
    method: "POST",
    body: input,
  });
}

export async function importVoiceFromUrls(
  input: UrlImportRequest,
): Promise<VoiceImportResult> {
  return apiFetch<VoiceImportResult>("/api/v1/voice-samples/import/url", {
    method: "POST",
    body: input,
  });
}

// ---------------------------------------------------------------------------
// Редполитика
// ---------------------------------------------------------------------------
//
// Черновик собирается из образцов и всегда приходит с полем `gaps` — тем,
// чего в текстах не видно. Заполняет его только человек: придуманный
// читатель хуже отсутствующего, потому что редполитике начинают доверять.

export async function getRedpolitika(): Promise<Redpolitika> {
  return apiFetch<Redpolitika>("/api/v1/voice-samples/redpolitika");
}

export async function draftRedpolitika(): Promise<RedpolitikaDraft> {
  return apiFetch<RedpolitikaDraft>(
    "/api/v1/voice-samples/redpolitika/draft",
    { method: "POST" },
  );
}

export async function saveRedpolitika(
  input: Redpolitika,
): Promise<Redpolitika> {
  return apiFetch<Redpolitika>("/api/v1/voice-samples/redpolitika", {
    method: "PUT",
    body: input,
  });
}
