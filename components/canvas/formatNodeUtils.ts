/**
 * formatNodeUtils — pure helpers used by FormatNode and the canvas
 * coordinator (CanvasEditor) for:
 *   - Finding the upstream extract node attached to a given format node.
 *   - Recomputing `full_text` after inline edits (mirrors the worker's
 *     assembly logic: see `reels_script_writer.py#_format_full_text` and
 *     `article_creator.py#_assemble_markdown` in the backend).
 *
 * Note: editing locally and re-running the skill will overwrite the
 * AI-generated `full_text` with a fresh assembly. That's the documented
 * behaviour — the worker is the source of truth for outputs.
 */

import type {
  ArticleSection,
  CanvasDetail,
  CarouselSlide,
  ExtractNodeData,
  HookEntry,
  NodeOut,
  ReelsBeat,
} from "@/lib/types";

/**
 * Find the single upstream extract node feeding a format node, if any.
 * Returns `undefined` when:
 *   - The format node has no incoming edges.
 *   - The incoming edge is from a non-extract (e.g. source) node.
 *   - The extract has no talking_points yet.
 */
export function findUpstreamExtract(
  canvas: CanvasDetail | undefined,
  formatNodeId: string,
): { node: NodeOut; data: ExtractNodeData } | undefined {
  if (!canvas) return undefined;
  const incoming = canvas.edges.filter((e) => e.target_node_id === formatNodeId);
  if (incoming.length === 0) return undefined;
  for (const e of incoming) {
    const src = canvas.nodes.find((n) => n.id === e.source_node_id);
    if (!src || src.type !== "extract") continue;
    const data = (src.data ?? {}) as ExtractNodeData;
    const tps = data.talking_points ?? [];
    if (tps.length === 0) continue;
    return { node: src, data };
  }
  return undefined;
}

// ---------- full_text rebuilders ----------

export function buildCarouselFullText(
  slides: CarouselSlide[],
  cta: string | undefined,
): string {
  const body = slides
    .map((s, i) => `[Slide ${i + 1}] ${s.title}\n${s.body}`)
    .join("\n\n");
  return cta ? `${body}\n\n${cta}` : body;
}

/**
 * Mirrors `reels_script_writer.py#_format_full_text` — input differs
 * slightly because we keep `hook` separate (the selected one) and the
 * format node always tracks `selected_hook_index` + `hooks[]`.
 */
export function buildReelsFullText(
  hook: string,
  beats: ReelsBeat[],
  cta: string | undefined,
  caption: string | undefined,
): string {
  const lines: string[] = [];
  if (hook) lines.push(`HOOK: ${hook}`);
  beats.forEach((b, i) => {
    let line = `[${i + 1}] ${b.script ?? ""}`;
    if (b.visual) line += `\n    visual: ${b.visual}`;
    if (b.duration_sec) line += `\n    ~${b.duration_sec}s`;
    lines.push(line);
  });
  if (cta) lines.push(`CTA: ${cta}`);
  if (caption) lines.push(`\n--- caption ---\n${caption}`);
  return lines.join("\n\n");
}

/**
 * Mirrors `article_creator.py#_assemble_markdown`. `intro`/`hook`/etc are
 * only emitted when non-empty so an unedited section won't sprout empty
 * markdown blocks.
 */
export function buildArticleFullText(parts: {
  title: string;
  hook: string;
  intro: string;
  sections: ArticleSection[];
  conclusion: string;
  cta: string;
}): string {
  const lines: string[] = [];
  if (parts.title) lines.push(`# ${parts.title}\n`);
  if (parts.hook) lines.push(`_${parts.hook}_\n`);
  if (parts.intro) lines.push(`${parts.intro}\n`);
  for (const s of parts.sections) {
    const heading = (s.heading ?? "").trim();
    const body = (s.body ?? "").trim();
    if (heading) lines.push(`\n## ${heading}\n`);
    if (body) lines.push(`${body}\n`);
  }
  if (parts.conclusion) lines.push(`\n## Итог\n\n${parts.conclusion}\n`);
  if (parts.cta) lines.push(`\n${parts.cta}\n`);
  return lines.join("\n").trim();
}

export function buildHooksBankFullText(hooks: HookEntry[]): string {
  return hooks.map((h, i) => `${i + 1}. ${h.text} (${h.trigger})`).join("\n\n");
}
