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
