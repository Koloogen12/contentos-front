import type {
  ContentPillar,
  PlannedPostOut,
  PostPlatform,
  PostStatus,
} from "@/lib/types";
import { t } from "@/lib/i18n";

/** Short uppercase platform tag (TG, LI, IG, X, ART, CAR, REE, HK). */
export const PLATFORM_TAG: Record<PostPlatform, string> = {
  telegram: "TG",
  linkedin: "LI",
  instagram: "IG",
  twitter: "X",
  article: "ART",
  carousel: "CAR",
  reels: "REE",
  hooks: "HK",
};

export const PLATFORM_LABEL: Record<PostPlatform, string> = {
  telegram: "Telegram",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  twitter: "X",
  article: "Статья",
  carousel: "Carousel",
  reels: "Reels",
  hooks: "Hooks",
};

export const ORDERED_PLATFORMS: PostPlatform[] = [
  "telegram",
  "linkedin",
  "instagram",
  "twitter",
  "article",
  "carousel",
  "reels",
  "hooks",
];

export const PILLARS: ContentPillar[] = ["R1", "R2", "R3", "R4"];

/** Pillar target mix used by the insights panel. */
export const PILLAR_TARGET: Record<ContentPillar, number> = {
  R1: 40,
  R2: 20,
  R3: 25,
  R4: 15,
};

export function statusLabel(status: PostStatus): string {
  return t.plan.statuses[status];
}

export function pillarLabel(pillar: ContentPillar): string {
  return t.plan.pillars[pillar];
}

/**
 * Truncate a string at `max` chars with an ellipsis, on word boundaries when
 * possible. Used for hook previews on calendar cards (60 chars).
 */
export function truncate(text: string, max = 60): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "…";
}

/** Pull the first 60 chars of a hook (or fall back to body / full_text). */
export function postHookPreview(post: PlannedPostOut): string {
  const raw = post.hook || post.body || post.full_text || "";
  return truncate(raw.replace(/\s+/g, " ").trim(), 60);
}

/** Number metric extractor — defensive, since metrics is a free-form record. */
export function metricNumber(
  metrics: Record<string, unknown>,
  key: string,
): number {
  const v = metrics[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}
