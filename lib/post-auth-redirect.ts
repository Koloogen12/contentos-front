import { getBrandContext } from "@/lib/brand-context";
import { listCanvases } from "@/lib/canvases";

/**
 * Defensive sanitizer: only trust path-only `next` values (must start with
 * `/` and not `//`, no protocol, no @-form). Returns `null` for anything
 * suspicious, which the caller treats as "ignore the next param."
 */
export function sanitizeNextPath(value: string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value !== "string") return null;
  if (!value.startsWith("/")) return null;
  // Block `//host` (protocol-relative URL), backslash trick, and explicit schemes.
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  if (/^\/[a-z][a-z0-9+\-.]*:/i.test(value)) return null;
  return value;
}

/**
 * Decide where to land after login or register.
 *
 * Priority:
 *   1. If a sanitized `next` path is provided, prefer it (user came from a
 *      public share link or similar).
 *   2. Otherwise, send fresh accounts to /onboarding (empty brand context
 *      + zero user-created canvases), and everyone else to /dashboard.
 *
 * Resilient to network errors — falls back to /dashboard if either probe
 * fails.
 */
export async function decidePostAuthRoute(
  options: { next?: string | null } = {},
): Promise<string> {
  const safeNext = sanitizeNextPath(options.next ?? null);
  if (safeNext) return safeNext;
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
