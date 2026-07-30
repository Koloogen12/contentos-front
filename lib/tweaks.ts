import { apiFetch } from "@/lib/api";
import type { SkillRunStartResponse } from "@/lib/types";

/** Modes valid for `extract`-typed nodes. */
export type ExtractTweakMode = "amplify" | "rephrase" | "reextract";

/** Modes valid for `format`-typed nodes. */
export type FormatTweakMode =
  | "regenerate"
  | "rehook"
  | "shorten"
  | "amplify_voice"
  | "platform_optimize"
  // Редактура по проходам: смысл → тональность → предложение → слово →
  // ритм → приметы машинного текста. См. skills/tweak.py#_FORMAT_EDIT.
  | "edit";

export type TweakMode = ExtractTweakMode | FormatTweakMode;

/**
 * Kicks off a "tweak" skill — an editorial mutation of an existing
 * extract or format node's data. Returns the same skill-run shape
 * as `/run`, so the caller wires it into the same subscription path.
 */
export async function tweakNode(
  nodeId: string,
  mode: TweakMode,
): Promise<SkillRunStartResponse & { skill: "tweak" }> {
  return apiFetch<SkillRunStartResponse & { skill: "tweak" }>(
    `/api/v1/nodes/${nodeId}/tweak`,
    {
      method: "POST",
      body: { mode },
    },
  );
}
