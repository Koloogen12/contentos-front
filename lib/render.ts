import { apiFetch } from "@/lib/api";
import type { SkillRunStartResponse } from "@/lib/types";

/** Kick off a per-slide AI rewrite + Playwright re-render.
 *
 * Returns the SkillRun envelope — same shape as `/run` and
 * `/render-visual`, so `subscribeSkillRun` works on the returned id.
 * When the run completes, the canvas refetch pulls the updated
 * `node.data.rendered_slides.slides[i].url` and the lightbox re-renders
 * with the new image.
 *
 * Rejected synchronously (4xx) when:
 *   - node isn't a carousel format-node
 *   - slide_index out of range
 *   - slide is the cover (is_cover=true)
 *   - no rendered_slides yet (must run "Сгенерировать визуал" first)
 */
export async function tweakSlide(
  nodeId: string,
  slideIndex: number,
  userPrompt: string,
): Promise<SkillRunStartResponse> {
  return apiFetch<SkillRunStartResponse>(
    `/api/v1/nodes/${nodeId}/render-slide-tweak`,
    {
      method: "POST",
      body: { slide_index: slideIndex, user_prompt: userPrompt },
    },
  );
}
