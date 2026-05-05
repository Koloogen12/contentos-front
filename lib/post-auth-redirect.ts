import { getBrandContext } from "@/lib/brand-context";
import { listCanvases } from "@/lib/canvases";

/**
 * Decide where to land after login or register: the wizard for fresh
 * accounts (empty brand context + zero user-created canvases), the
 * dashboard otherwise. Resilient to network errors — falls back to
 * /dashboard if either probe fails.
 */
export async function decidePostAuthRoute(): Promise<
  "/onboarding" | "/dashboard"
> {
  try {
    const [brand, canvases] = await Promise.all([
      getBrandContext(),
      listCanvases({ is_template: false }),
    ]);
    const noAuthor = !brand.data.author_name?.trim();
    const noCanvases = canvases.length === 0;
    return noAuthor && noCanvases ? "/onboarding" : "/dashboard";
  } catch {
    return "/dashboard";
  }
}
