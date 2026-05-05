import { apiFetch } from "@/lib/api";
import type {
  VoiceSampleBulkResult,
  VoiceSampleCreate,
  VoiceSampleOut,
  VoiceTraitsExtracted,
} from "@/lib/types";

/**
 * Voice training service module.
 * Mirrors `POST/GET/DELETE /api/v1/voice-samples` and the
 * `extract-traits` endpoint that bumps BrandContext.
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
