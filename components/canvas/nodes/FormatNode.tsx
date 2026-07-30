"use client";

/**
 * FormatNode — 1:1 port of `THE CONTENT-2/nodes.jsx#FormatNode`.
 * Width 380px, 5 platform tabs (using THE CONTENT app's 5 platforms:
 * telegram / linkedin / carousel / reels / hooks per `lib/types.ts`),
 * hook radio list, body textarea, CTA, plus a 6-button tweak action row
 * (Перегенерировать / Скопировать / Другой хук / Сократить / Усилить голос /
 * Под платформу).
 */

import * as React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useMutation } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Copy,
  Eye,
  FileText,
  Film,
  Hash,
  Image as ImageIcon,
  LayoutGrid,
  Loader2,
  Maximize2,
  Mic,
  Newspaper,
  PenLine,
  Pencil,
  Play,
  RefreshCcw,
  RefreshCw,
  Send,
  Sparkles,
  Twitter,
  Wand2,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { renderNodeVisual } from "@/lib/skill-runs";
import { tweakNode, type FormatTweakMode } from "@/lib/tweaks";
import type {
  ArticleSection,
  CarouselSlide,
  ExtractNodeData,
  FormatNodeData,
  FormatPlatform,
  HookEntry,
  NodeOut,
  ReelsBeat,
  RenderedCarouselResult,
} from "@/lib/types";
import { useCanvasNodeContext } from "@/components/canvas/canvasContext";
import { EditableText } from "@/components/canvas/EditableText";
import {
  buildArticleFullText,
  buildCarouselFullText,
  buildHooksBankFullText,
  buildInstagramFullText,
  buildReelsFullText,
  buildTwitterFullText,
  findUpstreamExtract,
} from "@/components/canvas/formatNodeUtils";
import { updateEdge } from "@/lib/edges";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { PublishDialog } from "@/components/canvas/PublishDialog";
import { RenderedSlidesStrip } from "@/components/canvas/RenderedSlidesStrip";
import { TelegramMetricsChip } from "@/components/canvas/TelegramMetricsChip";
import { CanvasFormatDrawer } from "@/components/canvas/CanvasFormatDrawer";
import { TelegramPreview } from "@/components/canvas/TelegramPreview";
import { SchedulePickerDialog } from "@/components/plan/SchedulePickerDialog";
import {
  setScheduledBadge,
  useScheduledBadge,
} from "@/components/plan/scheduledBadgeStore";
import { CalendarPlus } from "lucide-react";
import { formatDayShortRu, parseISODate } from "@/lib/content-plan";
import type { PostPlatform } from "@/lib/types";

interface FormatNodeRfData {
  node: NodeOut;
}

const PLATFORM_LIST: ReadonlyArray<{
  k: FormatPlatform;
  label: string;
  Icon: LucideIcon;
}> = [
  { k: "telegram", label: "Telegram", Icon: Send },
  { k: "linkedin", label: "LinkedIn", Icon: FileText },
  { k: "twitter", label: "X / Twitter", Icon: Twitter },
  { k: "instagram", label: "Instagram", Icon: ImageIcon },
  { k: "carousel", label: "Carousel", Icon: LayoutGrid },
  { k: "reels", label: "Reels", Icon: Film },
  { k: "hooks", label: "Hooks", Icon: Hash },
  { k: "article", label: "Статья", Icon: Newspaper },
  // Единственный формат, который берёт весь материал целиком.
  { k: "review", label: "Рецензия", Icon: BookOpen },
  { k: "vc", label: "vc.ru", Icon: Newspaper },
];

const PLATFORM_LABEL: Record<FormatPlatform, string> = {
  review: "Рецензия",
  vc: "vc.ru",
  telegram: "Telegram",
  linkedin: "LinkedIn",
  twitter: "X / Twitter",
  instagram: "Instagram",
  carousel: "Carousel",
  reels: "Reels",
  hooks: "Hooks",
  article: "Статья",
};

export function FormatNode({ data, selected }: NodeProps) {
  const typed = data as unknown as FormatNodeRfData;
  const node = typed.node;
  const {
    updateNodeData,
    runNode,
    isRunning,
    attachSkillRun,
    readOnly,
    getCanvas,
  } = useCanvasNodeContext();
  const status = node.status;
  const running = isRunning(node.id);
  const format = (node.data ?? {}) as FormatNodeData;
  const platform: FormatPlatform = format.platform ?? "telegram";
  const hooks = format.hooks ?? [];
  const slides = format.slides ?? [];
  const beats = format.beats ?? [];
  const hooksBank = format.hooks_bank ?? [];
  const selectedHook = format.selected_hook_index ?? 0;
  const [publishOpen, setPublishOpen] = React.useState(false);
  const [scheduleOpen, setScheduleOpen] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const scheduledDate = useScheduledBadge(node.id);

  const articleSections = format.sections ?? [];
  // У рецензии те же sections, но с points вместо body — см. review_creator.
  const reviewSections = platform === "review" ? (format.sections ?? []) : [];
  const tweets = format.tweets ?? [];
  const formatType: "single" | "thread" = format.format_type ?? "thread";

  // ---- Upstream extract idea-picker (Requirement A) ----
  // Read upstream extract via the canvas context. `getCanvas` returns the
  // live snapshot of nodes+edges; we re-derive on each render so changes
  // (e.g. new edge created, extract re-ran with fresh ideas) flow in.
  const upstream = React.useMemo(
    () => findUpstreamExtract(getCanvas(), node.id),
    // We intentionally depend on `node` (status/data) so the picker
    // re-renders when the parent extract finishes a run via the canvas
    // refetch lifecycle.
    [getCanvas, node],
  );
  const upstreamPoints = upstream?.data.talking_points ?? [];
  const effectiveIdeaIdx: number =
    typeof format.source_talking_point_index === "number"
      ? format.source_talking_point_index
      : (upstream?.data.selected_index ?? 0);

  const setSourceIdea = async (i: number) => {
    if (readOnly) return;
    if (i === format.source_talking_point_index) return;
    await updateNodeData(node.id, { source_talking_point_index: i });
    // Multi-fanout: when this format node was spawned via the per-tezis
    // button on ExtractNode, its incoming edge carries `tezis_index` and
    // the worker uses THAT (not the parent's `selected_index`). Keep the
    // edge in sync with the in-node picker so changing the picker actually
    // changes which tezis the next run consumes. Silently no-op for legacy
    // edges where edge.data is empty {} — backend falls back to the
    // parent's `selected_index` (kludge already handles patching that).
    if (upstream?.edge) {
      const edge = upstream.edge;
      const cur = (edge.data ?? {}) as Record<string, unknown>;
      if (typeof cur.tezis_index === "number" && cur.tezis_index !== i) {
        try {
          await updateEdge(edge.id, { ...cur, tezis_index: i });
        } catch {
          // Non-fatal — kludge keeps the run aligned via parent's
          // selected_index. We log via toast only if everything fails.
        }
      }
    }
  };
  const hasOutput = React.useMemo(() => {
    if (platform === "carousel") return slides.length > 0;
    if (platform === "reels") return beats.length > 0 || hooks.length > 0;
    if (platform === "hooks") return hooksBank.length > 0;
    if (platform === "article") return articleSections.length > 0;
    if (platform === "review") return reviewSections.length > 0;
    // Без этой ветки нода считала, что вывода нет, и вместо статьи
    // показывала превью тезиса: у vc нет hooks, а общий фолбэк ниже
    // проверяет именно их.
    if (platform === "vc") return (format.sections ?? []).length > 0;
    if (platform === "twitter") return tweets.length > 0;
    if (platform === "instagram")
      return Boolean(format.caption || format.body || format.hook);
    return hooks.length > 0;
  }, [
    platform,
    slides.length,
    beats.length,
    hooks.length,
    hooksBank.length,
    articleSections.length,
    tweets.length,
    format.caption,
    format.body,
    format.hook,
  ]);

  const tweakMutation = useMutation({
    mutationFn: ({ mode }: { mode: FormatTweakMode }) =>
      tweakNode(node.id, mode),
    onSuccess: ({ skill_run_id }) => {
      attachSkillRun(node.id, skill_run_id);
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : t.canvas.couldNotStartRun,
      ),
  });

  /**
   * Before running this format's skill (or a tweak), make sure the upstream
   * extract's `selected_index` matches THIS format's chosen idea — the
   * worker reads `parent.data.selected_index` to assemble the talking-point
   * snippet, so we must patch it first. After the PATCH we wait 250ms to
   * give the cache invalidation room to land, then trigger the run.
   *
   * Limitation: if two format nodes attached to the same extract are run
   * concurrently, they'll race on `selected_index`. The Run-all coordinator
   * in `CanvasEditor.tsx` queues them sequentially. Manual single-clicks
   * are safe in practice (the user can only press one button at a time).
   */
  const ensureParentSelectedThen = React.useCallback(
    async (after: () => void) => {
      const parent = upstream?.node;
      if (!parent) {
        after();
        return;
      }
      const desired = effectiveIdeaIdx;
      const current = (parent.data as ExtractNodeData).selected_index ?? null;
      if (current !== desired) {
        try {
          await updateNodeData(parent.id, { selected_index: desired });
        } catch {
          // updateNodeData already toasts on error — keep going so the
          // user at least gets a run attempt against the existing index.
        }
        await new Promise((r) => setTimeout(r, 250));
      }
      after();
    },
    [upstream, effectiveIdeaIdx, updateNodeData],
  );

  const handleRun = React.useCallback(() => {
    void ensureParentSelectedThen(() => runNode(node.id));
  }, [ensureParentSelectedThen, node.id, runNode]);

  const handleTweak = React.useCallback(
    (mode: FormatTweakMode) => {
      void ensureParentSelectedThen(() => tweakMutation.mutate({ mode }));
    },
    [ensureParentSelectedThen, tweakMutation],
  );

  // ---- Visual render (carousel only) ----
  // Independent mutation from tweak/run because: (a) it has its own
  // server route, (b) progress UI is different ("Рендерю обложку..."
  // takes ~90s, so we treat it as a distinct in-progress state),
  // (c) it doesn't affect the parent extract's `selected_index` so we
  // skip `ensureParentSelectedThen`.
  const renderVisualMutation = useMutation({
    mutationFn: () => renderNodeVisual(node.id),
    onSuccess: ({ skill_run_id }) => {
      attachSkillRun(node.id, skill_run_id);
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError
          ? err.detail
          : "Не удалось запустить рендер визуала",
      ),
  });
  const handleRenderVisual = React.useCallback(() => {
    renderVisualMutation.mutate();
  }, [renderVisualMutation]);

  const setPlatform = async (p: FormatPlatform) => {
    if (readOnly) return;
    if (p === platform) return;
    await updateNodeData(node.id, { platform: p });
  };

  const setHook = async (i: number) => {
    if (readOnly) return;
    if (i === selectedHook) return;
    const newFull =
      (hooks[i] ?? "") +
      "\n\n" +
      (format.body ?? "") +
      "\n\n" +
      (format.cta ?? "");
    await updateNodeData(node.id, {
      selected_hook_index: i,
      full_text: newFull,
    });
  };

  const onCopy = async () => {
    if (!format.full_text) return;
    try {
      await navigator.clipboard.writeText(format.full_text);
      toast.success(t.format.copySuccess);
    } catch {
      toast.error(t.format.copyError);
    }
  };

  return (
    <div className="relative" style={{ width: 380 }}>
      <Handle
        type="target"
        position={Position.Left}
        style={PORT_STYLE_LEFT}
      >
        <ArrowRight size={12} />
      </Handle>
      <div className="co-node-label">
        <PenLine size={12} />
        <span>{t.format.label}</span>
      </div>
      <div
        className={cn(
          "co-node-shell",
          selected && "selected",
          status === "running" && "running",
          status === "done" && "done",
          status === "error" && "error",
        )}
      >
        <span className={`co-node-status-dot ${status ?? "idle"}`} />

        {/* Tezis pill (top-right next to status dot). Helpful when several
             format nodes are attached to the same extract — at-a-glance
             which talking point each one will work with. */}
        {upstreamPoints.length > 0 && (
          <span
            className="co-tezis-pill"
            title={upstreamPoints[effectiveIdeaIdx]?.text ?? ""}
          >
            Тезис {effectiveIdeaIdx + 1}
          </span>
        )}

        {/* Maximize / open in drawer — full-size read+edit surface for the
            assembled post. Sized 380px nodes can't display long Telegram /
            LinkedIn / Article output without clipping; the drawer gives a
            720px-wide editor with all the tweaks/copy/publish actions. */}
        <button
          type="button"
          className="co-node-maximize-btn nodrag"
          onClick={(e) => {
            e.stopPropagation();
            setDrawerOpen(true);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          title="Развернуть"
          aria-label="Развернуть"
        >
          <Maximize2 size={11} />
        </button>

        {/* Scheduled badge — set client-side after a successful POST to
             /nodes/{id}/schedule. Persisted in localStorage. */}
        {scheduledDate && (
          <span
            className="co-plan-node-badge"
            style={{ position: "absolute", top: 30, right: 12, zIndex: 2 }}
            title={`Запланировано на ${scheduledDate}`}
          >
            <CalendarPlus size={10} />
            {t.plan.schedule.inPlanBadge(
              formatDayShortRu(parseISODate(scheduledDate)),
            )}
          </span>
        )}

        <div className="co-node-content">
          {/* Idea picker (Requirement A): only shown when an upstream
              extract has talking_points. Per-format-node selection is
              stored in `data.source_talking_point_index`; falls back to
              the parent's `selected_index` when unset. */}
          {/* Рецензия читает весь материал, поэтому выбор тезиса ей не нужен
              и вводил бы в заблуждение: связь создаётся без tezis_index, и
              бэкенд берёт все тезисы независимо от того, что выбрано. */}
          {platform === "review" && (
            <div className="co-idea-picker">
              <span className="co-field-label">
                {upstreamPoints.length > 0
                  ? `По всему материалу · ${upstreamPoints.length} ${plural(upstreamPoints.length, "тезис", "тезиса", "тезисов")} в основе`
                  : "По всему материалу целиком"}
              </span>
            </div>
          )}

          {platform !== "review" && upstreamPoints.length > 0 && (
            <div className="co-idea-picker">
              <label className="co-field-label" htmlFor={`idea-${node.id}`}>
                Из тезиса:
              </label>
              <select
                id={`idea-${node.id}`}
                className="co-field-input nodrag"
                value={effectiveIdeaIdx}
                onChange={(e) => {
                  e.stopPropagation();
                  void setSourceIdea(Number(e.target.value));
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                disabled={readOnly}
              >
                {upstreamPoints.map((tp, i) => {
                  const preview = tp.text.slice(0, 60);
                  return (
                    <option value={i} key={i}>
                      {i + 1}. {preview}
                      {tp.text.length > 60 ? "…" : ""}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Platform tabs */}
          <div className="co-platform-tabs">
            {PLATFORM_LIST.map(({ k, label, Icon }) => (
              <button
                key={k}
                type="button"
                title={label}
                className={cn(
                  "co-platform-tab nodrag",
                  platform === k && "active",
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  void setPlatform(k);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                disabled={readOnly}
              >
                <Icon size={15} />
              </button>
            ))}
          </div>

          {format.talking_point_text && (
            <div className="co-tp-preview">{format.talking_point_text}</div>
          )}

          {!hasOutput && status === "idle" && (
            <button
              type="button"
              className="co-btn co-btn-primary nodrag"
              onClick={(e) => {
                e.stopPropagation();
                handleRun();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              disabled={readOnly || running}
            >
              <Play size={14} />
              {t.format.runButtonByPlatform[platform] ?? t.format.runButton}
            </button>
          )}

          {(status === "running" || running) && !hasOutput && (
            <>
              <div className="co-spin-row">
                <div className="co-spinner" />
                <span>
                  {t.format.runningStatusByPlatform[platform] ??
                    t.format.runningStatus(PLATFORM_LABEL[platform])}
                </span>
              </div>
              <div className="co-skeleton">
                <div className="co-skeleton-line w90" />
                <div className="co-skeleton-line w70" />
                <div className="co-skeleton-line w90" style={{ marginTop: 6 }} />
                <div className="co-skeleton-line w90" />
                <div className="co-skeleton-line w70" />
                <div className="co-skeleton-line w50" />
              </div>
            </>
          )}

          {status === "error" && !hasOutput && (
            <div
              className="co-placeholder-empty"
              style={{ borderColor: "rgba(239,68,68,0.3)", color: "var(--p-red, #DC2626)" }}
            >
              <AlertCircle size={13} />
              <span>{t.format.error}</span>
            </div>
          )}

          {hasOutput && (
            <>
              {/* Platform-specific body. NB: re-running the AI skill after
                  manual edits will overwrite `full_text` with a fresh
                  assembly — that's expected; the worker is the source of
                  truth for outputs. */}
              {platform === "carousel" ? (
                <CarouselBody
                  nodeId={node.id}
                  slides={slides}
                  summary={format.summary}
                  cta={format.cta}
                  commentKeyword={format.comment_keyword ?? null}
                  coverVariants={format.cover_variants ?? []}
                  renderedSlides={format.rendered_slides}
                  isRendering={running || renderVisualMutation.isPending}
                  onRenderVisual={
                    readOnly || slides.length === 0
                      ? undefined
                      : handleRenderVisual
                  }
                  readOnly={!!readOnly}
                  onApplyCover={(variant) => {
                    if (slides.length === 0) return;
                    const next = [...slides];
                    next[0] = { ...variant, is_cover: true };
                    void updateNodeData(node.id, {
                      slides: next,
                      full_text: buildCarouselFullText(next, format.cta, {
                        summary: format.summary,
                        commentKeyword: format.comment_keyword ?? null,
                      }),
                    });
                  }}
                  onUpdateSlide={(i, patch) => {
                    const next = slides.map((s, idx) =>
                      idx === i ? { ...s, ...patch } : s,
                    );
                    void updateNodeData(node.id, {
                      slides: next,
                      full_text: buildCarouselFullText(next, format.cta, {
                        summary: format.summary,
                        commentKeyword: format.comment_keyword ?? null,
                      }),
                    });
                  }}
                />
              ) : platform === "reels" ? (
                <ReelsBody
                  hooks={hooks}
                  selectedHook={selectedHook}
                  onSelectHook={setHook}
                  beats={beats}
                  caption={format.caption}
                  cta={format.cta}
                  readOnly={!!readOnly}
                  onUpdateBeat={(i, patch) => {
                    const next = beats.map((b, idx) =>
                      idx === i ? { ...b, ...patch } : b,
                    );
                    void updateNodeData(node.id, {
                      beats: next,
                      full_text: buildReelsFullText(
                        hooks[selectedHook] ?? "",
                        next,
                        format.cta,
                        format.caption,
                      ),
                    });
                  }}
                  onUpdateCaption={(v) => {
                    void updateNodeData(node.id, {
                      caption: v,
                      full_text: buildReelsFullText(
                        hooks[selectedHook] ?? "",
                        beats,
                        format.cta,
                        v,
                      ),
                    });
                  }}
                />
              ) : platform === "hooks" ? (
                <HooksBankBody
                  hooks={hooksBank}
                  readOnly={!!readOnly}
                  onUpdateHook={(i, text) => {
                    const next = hooksBank.map((h, idx) =>
                      idx === i ? { ...h, text } : h,
                    );
                    void updateNodeData(node.id, {
                      hooks_bank: next,
                      full_text: buildHooksBankFullText(next),
                    });
                  }}
                />
              ) : platform === "twitter" ? (
                <TwitterBody
                  tweets={tweets}
                  formatType={formatType}
                  readOnly={!!readOnly}
                  onUpdateTweet={(i, text) => {
                    const next = tweets.map((tw, idx) =>
                      idx === i ? text : tw,
                    );
                    void updateNodeData(node.id, {
                      tweets: next,
                      full_text: buildTwitterFullText(next),
                    });
                  }}
                  onSetFormatType={(ft) => {
                    void updateNodeData(node.id, { format_type: ft });
                  }}
                />
              ) : platform === "instagram" ? (
                <InstagramBody
                  caption={format.caption ?? ""}
                  hook={format.hook ?? ""}
                  body={format.body ?? ""}
                  cta={format.cta ?? ""}
                  visualDirection={format.visual_direction ?? ""}
                  readOnly={!!readOnly}
                  onUpdateField={(field, v) => {
                    const next: Partial<FormatNodeData> = { [field]: v };
                    const merged = {
                      caption:
                        field === "caption" ? v : format.caption ?? "",
                      visual_direction:
                        field === "visual_direction"
                          ? v
                          : format.visual_direction ?? "",
                    };
                    next.full_text = buildInstagramFullText(
                      merged.caption,
                      merged.visual_direction,
                    );
                    void updateNodeData(node.id, next);
                  }}
                />
              ) : platform === "vc" ? (
                <VcBody format={format} />
              ) : platform === "review" ? (
                <ReviewBody format={format} />
              ) : platform === "article" ? (
                <ArticleBody
                  title={format.title ?? ""}
                  hook={format.hook ?? ""}
                  intro={format.intro ?? ""}
                  sections={articleSections}
                  conclusion={format.conclusion ?? ""}
                  cta={format.cta ?? ""}
                  meta={format.meta_description ?? ""}
                  wordCount={format.word_count ?? 0}
                  readOnly={!!readOnly}
                  onUpdateField={(field, v) => {
                    const merged: Partial<FormatNodeData> = { [field]: v };
                    const nextParts = {
                      title: format.title ?? "",
                      hook: format.hook ?? "",
                      intro: format.intro ?? "",
                      sections: articleSections,
                      conclusion: format.conclusion ?? "",
                      cta: format.cta ?? "",
                      ...{ [field]: v },
                    };
                    merged.full_text = buildArticleFullText(nextParts);
                    void updateNodeData(node.id, merged);
                  }}
                  onUpdateSection={(i, patch) => {
                    const nextSections = articleSections.map((s, idx) =>
                      idx === i ? { ...s, ...patch } : s,
                    );
                    void updateNodeData(node.id, {
                      sections: nextSections,
                      full_text: buildArticleFullText({
                        title: format.title ?? "",
                        hook: format.hook ?? "",
                        intro: format.intro ?? "",
                        sections: nextSections,
                        conclusion: format.conclusion ?? "",
                        cta: format.cta ?? "",
                      }),
                    });
                  }}
                />
              ) : (
                <PostBody
                  hooks={hooks}
                  selectedHook={selectedHook}
                  onSelectHook={setHook}
                  body={format.body ?? ""}
                  cta={format.cta ?? ""}
                  platform={platform}
                  onUpdateBody={(v) => {
                    void updateNodeData(node.id, {
                      body: v,
                      full_text:
                        (hooks[selectedHook] ?? "") +
                        "\n\n" +
                        v +
                        "\n\n" +
                        (format.cta ?? ""),
                    });
                  }}
                  onUpdateCta={(v) => {
                    void updateNodeData(node.id, {
                      cta: v,
                      full_text:
                        (hooks[selectedHook] ?? "") +
                        "\n\n" +
                        (format.body ?? "") +
                        "\n\n" +
                        v,
                    });
                  }}
                  readOnly={!!readOnly}
                />
              )}

              {!readOnly && (
                <div className="flex flex-wrap gap-2">
                  <ActionBtn
                    Icon={RefreshCw}
                    label={t.format.actions.regenerate}
                    onClick={() => handleTweak("regenerate")}
                    busy={
                      tweakMutation.isPending &&
                      tweakMutation.variables?.mode === "regenerate"
                    }
                    disabled={running || tweakMutation.isPending}
                  />
                  <ActionBtn
                    Icon={Copy}
                    label={t.format.actions.copy}
                    onClick={() => void onCopy()}
                    disabled={!format.full_text}
                    primary
                  />
                  <ActionBtn
                    Icon={RefreshCcw}
                    label={t.format.actions.rehook}
                    onClick={() => handleTweak("rehook")}
                    busy={
                      tweakMutation.isPending &&
                      tweakMutation.variables?.mode === "rehook"
                    }
                    disabled={running || tweakMutation.isPending}
                  />
                  <ActionBtn
                    Icon={Zap}
                    label={t.format.actions.shorten}
                    onClick={() => handleTweak("shorten")}
                    busy={
                      tweakMutation.isPending &&
                      tweakMutation.variables?.mode === "shorten"
                    }
                    disabled={running || tweakMutation.isPending}
                  />
                  <ActionBtn
                    Icon={Mic}
                    label={t.format.actions.amplifyVoice}
                    onClick={() => handleTweak("amplify_voice")}
                    busy={
                      tweakMutation.isPending &&
                      tweakMutation.variables?.mode === "amplify_voice"
                    }
                    disabled={running || tweakMutation.isPending}
                  />
                  <ActionBtn
                    Icon={Wand2}
                    label={t.format.actions.platform}
                    onClick={() => handleTweak("platform_optimize")}
                    busy={
                      tweakMutation.isPending &&
                      tweakMutation.variables?.mode === "platform_optimize"
                    }
                    disabled={running || tweakMutation.isPending}
                  />
                </div>
              )}

              {!readOnly && platform === "telegram" && format.full_text && (
                <button
                  type="button"
                  className="co-btn co-btn-primary nodrag w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPublishOpen(true);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <Send size={13} /> {t.publish.title}
                </button>
              )}

              {/* Telegram metrics chip — shown only when this node has at
                  least one sent publish_log. Self-fetches via TanStack Query
                  on mount, no props beyond nodeId needed. Hidden in
                  readOnly mode (shared/preview canvas) — viewing other
                  people's view counts adds noise. */}
              {!readOnly && platform === "telegram" && (
                <TelegramMetricsChip nodeId={node.id} />
              )}

              {!readOnly && format.full_text && (
                <button
                  type="button"
                  className="co-btn co-btn-ghost nodrag w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    setScheduleOpen(true);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <CalendarPlus size={13} /> {t.plan.schedule.title}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {!readOnly && format.full_text && platform === "telegram" && (
        <PublishDialog
          nodeId={node.id}
          open={publishOpen}
          onOpenChange={setPublishOpen}
        />
      )}

      {!readOnly && format.full_text && (
        <SchedulePickerDialog
          open={scheduleOpen}
          onOpenChange={setScheduleOpen}
          nodeId={node.id}
          platform={platform as PostPlatform}
          hook={
            (Array.isArray(hooks) && hooks.length > 0
              ? hooks[selectedHook] ?? hooks[0]
              : format.hook) ?? null
          }
          onScheduled={(post) => {
            if (post.scheduled_date) {
              setScheduledBadge(node.id, post.scheduled_date);
            }
          }}
        />
      )}

      <CanvasFormatDrawer
        node={node}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}

function ActionBtn({
  Icon,
  label,
  onClick,
  busy,
  disabled,
  primary,
}: {
  Icon: LucideIcon;
  label: string;
  onClick: () => void;
  busy?: boolean;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        "co-btn nodrag",
        primary ? "co-btn-primary" : "co-btn-ghost",
      )}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onMouseDown={(e) => e.stopPropagation()}
      disabled={disabled}
    >
      {busy ? <Loader2 size={11} className="animate-spin" /> : <Icon size={11} />}
      {label}
    </button>
  );
}

function PostBody({
  hooks,
  selectedHook,
  onSelectHook,
  body,
  cta,
  onUpdateBody,
  onUpdateCta,
  platform,
  readOnly,
}: {
  hooks: string[];
  selectedHook: number;
  onSelectHook: (i: number) => Promise<void>;
  body: string;
  cta: string;
  onUpdateBody: (v: string) => void;
  onUpdateCta: (v: string) => void;
  platform: FormatPlatform;
  readOnly: boolean;
}) {
  const [bodyDraft, setBodyDraft] = React.useState(body);
  const [ctaDraft, setCtaDraft] = React.useState(cta);
  React.useEffect(() => setBodyDraft(body), [body]);
  React.useEffect(() => setCtaDraft(cta), [cta]);

  // Preview is meaningful only for platforms that publish with HTML
  // formatting. Telegram sends parse_mode=HTML; the others ship plain text
  // (LinkedIn / Twitter / Instagram have no inline-rich-text API), so for
  // them we just keep the existing edit-only view.
  const supportsPreview = platform === "telegram";
  // Default to preview when there's already AI-generated body. Empty state
  // (no body yet) shows the editor so the user can type into the textarea
  // without an extra click.
  const [mode, setMode] = React.useState<"preview" | "edit">(() =>
    supportsPreview && body.trim() ? "preview" : "edit",
  );
  // If the platform changes mid-life (user toggled tab) reset to the
  // sensible default. Body changes don't reset mode — the user is
  // typically iterating between Edit → Preview while writing.
  React.useEffect(() => {
    setMode(supportsPreview && body.trim() ? "preview" : "edit");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform]);

  const previewFullText = [hooks[selectedHook] ?? "", body, cta]
    .map((s) => s.trim())
    .filter(Boolean)
    .join("\n\n");

  return (
    <>
      {hooks.length > 0 && (
        <div>
          <div className="co-field-label">{t.format.hookHeader}</div>
          <div className="co-hooks-list">
            {hooks.map((h, i) => (
              <button
                type="button"
                key={i}
                className={cn(
                  "co-hook-radio nodrag",
                  selectedHook === i && "active",
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  void onSelectHook(i);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                disabled={readOnly}
              >
                <span className="co-hook-radio-dot" />
                {/* In preview, render Telegram markup inside the hook
                    radio label so the user sees the same visual cue as
                    in the body. The Spoiler / link click-handlers inside
                    are no-ops here (we stop-propagation), so clicking
                    the row still selects the hook. */}
                <span className="co-hook-radio-text">
                  {supportsPreview && mode === "preview" ? (
                    <TelegramPreview text={h} className="text-[12.5px]" />
                  ) : (
                    h
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between">
          <div className="co-field-label">{t.format.bodyLabel}</div>
          {supportsPreview && (
            <div
              className="nodrag inline-flex items-center gap-0.5 rounded-md border border-border bg-foreground/[0.03] p-0.5 text-[10.5px]"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className={cn(
                  "inline-flex items-center gap-1 rounded px-1.5 py-0.5 transition",
                  mode === "preview"
                    ? "bg-foreground/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setMode("preview");
                }}
                title="Превью как в Telegram"
              >
                <Eye size={10} />
                Превью
              </button>
              <button
                type="button"
                className={cn(
                  "inline-flex items-center gap-1 rounded px-1.5 py-0.5 transition",
                  mode === "edit"
                    ? "bg-foreground/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setMode("edit");
                }}
                title="Редактировать сырой HTML"
              >
                <Pencil size={10} />
                Редактировать
              </button>
            </div>
          )}
        </div>
        {supportsPreview && mode === "preview" ? (
          <div
            className="nodrag rounded-md border border-border/80 bg-foreground/[0.02] p-3"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {previewFullText.trim() ? (
              <TelegramPreview text={previewFullText} />
            ) : (
              <div className="text-[12px] text-muted-foreground">
                Пост пуст — переключись на «Редактировать», чтобы добавить
                текст.
              </div>
            )}
          </div>
        ) : (
          <textarea
            className="co-content-textarea nodrag"
            value={bodyDraft}
            onChange={(e) => setBodyDraft(e.target.value)}
            onBlur={() => {
              if (bodyDraft !== body) onUpdateBody(bodyDraft);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            rows={8}
            disabled={readOnly}
          />
        )}
      </div>

      {/* CTA is hidden when previewing (it's already inside the preview),
          shown as a normal field in edit mode so the user can tweak. */}
      {!(supportsPreview && mode === "preview") && (
        <div>
          <div className="co-field-label">{t.format.ctaLabel}</div>
          <input
            type="text"
            className="co-field-input nodrag"
            value={ctaDraft}
            onChange={(e) => setCtaDraft(e.target.value)}
            onBlur={() => {
              if (ctaDraft !== cta) onUpdateCta(ctaDraft);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            disabled={readOnly}
          />
        </div>
      )}
    </>
  );
}

function CarouselBody({
  nodeId,
  slides,
  summary,
  cta,
  commentKeyword,
  coverVariants,
  renderedSlides,
  isRendering,
  onRenderVisual,
  readOnly,
  onUpdateSlide,
  onApplyCover,
}: {
  nodeId: string;
  slides: CarouselSlide[];
  summary?: string;
  cta?: string;
  commentKeyword?: string | null;
  coverVariants?: CarouselSlide[];
  renderedSlides?: RenderedCarouselResult;
  isRendering?: boolean;
  onRenderVisual?: () => void;
  readOnly: boolean;
  onUpdateSlide: (i: number, patch: Partial<CarouselSlide>) => void;
  onApplyCover?: (variant: CarouselSlide) => void;
}) {
  const currentCoverTitle = slides[0]?.title ?? "";
  const altCovers = (coverVariants ?? []).filter(
    (v) => v.title && v.title !== currentCoverTitle,
  );
  const hasRendered = Boolean(renderedSlides?.slides?.length);
  return (
    <div className="flex flex-col gap-1.5">
      {/* Visual render strip — shown when JPEGs exist. We always keep the
          editable text slides below so the user can tweak then re-render. */}
      {hasRendered && renderedSlides && (
        <RenderedSlidesStrip nodeId={nodeId} rendered={renderedSlides} />
      )}

      {/* Render action — always rendered (above text slides) so the button
          stays in the same place whether or not there are rendered slides. */}
      {onRenderVisual && (
        <button
          type="button"
          className="nodrag inline-flex items-center justify-center gap-1.5 rounded-md border border-warn/40 bg-warn/[0.08] px-2 py-1.5 text-[11px] font-medium text-warn hover:border-warn/70 hover:bg-warn/[0.14] disabled:cursor-not-allowed disabled:opacity-60"
          onClick={onRenderVisual}
          onMouseDown={(e) => e.stopPropagation()}
          disabled={isRendering}
          title={
            hasRendered
              ? "Сгенерировать новый визуал с текущими слайдами"
              : "Собрать карусель в картинки (AI-обложка + HTML-слайды)"
          }
        >
          {isRendering ? (
            <>
              <Loader2 size={11} className="animate-spin" />
              Рендерю…
            </>
          ) : (
            <>
              <ImageIcon size={11} />
              {hasRendered
                ? "Перегенерировать визуал"
                : "Сгенерировать визуал"}
            </>
          )}
        </button>
      )}

      {altCovers.length > 0 && onApplyCover && !readOnly && (
        <div className="rounded-md border border-content/30 bg-content/[0.06] p-2">
          <div className="mb-1 text-[10px] uppercase tracking-wider text-content">
            Альтернативные обложки
          </div>
          <div className="flex flex-col gap-1">
            {altCovers.map((v, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onApplyCover(v)}
                className="rounded border border-border/80 bg-foreground/5 px-2 py-1.5 text-left text-[11px] leading-snug text-foreground hover:border-content/60 hover:bg-content/10 nodrag"
                onMouseDown={(e) => e.stopPropagation()}
                title="Применить как обложку"
              >
                <div className="font-medium text-foreground">{v.title}</div>
                {v.body && (
                  <div className="text-[10.5px] text-muted-foreground">{v.body}</div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
      {slides.map((s, i) => (
        <div
          key={i}
          className="rounded-md border border-border/60 bg-muted p-2"
        >
          <div className="flex items-center gap-1.5">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-sm bg-foreground/15 text-[9px] font-semibold">
              {i + 1}
            </span>
            <EditableText
              value={s.title}
              disabled={readOnly}
              onSave={(v) => onUpdateSlide(i, { title: v })}
              className="text-[11px] font-medium text-foreground flex-1"
              ariaLabel={`Заголовок слайда ${i + 1}`}
            />
            {s.is_cover && (
              <span className="ml-auto text-[9px] uppercase tracking-wide text-warn">
                Обложка
              </span>
            )}
          </div>
          <EditableText
            value={s.body}
            disabled={readOnly}
            onSave={(v) => onUpdateSlide(i, { body: v })}
            multiline
            rows={3}
            className="mt-1 whitespace-pre-wrap text-[11px] leading-snug text-foreground/80 block w-full"
            ariaLabel={`Текст слайда ${i + 1}`}
          />
        </div>
      ))}
      {summary && (
        <div className="rounded-md border border-border/60 bg-muted p-2 text-[11px] leading-snug text-[color:var(--text-tertiary)]">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">
            Caption под постом
          </div>
          {summary}
        </div>
      )}
      {cta && (
        <div className="text-[11px] text-[color:var(--text-secondary)]">
          <span className="text-[color:var(--text-muted)]">CTA:</span> {cta}
        </div>
      )}
      {commentKeyword && (
        <div
          className="rounded-md border px-2 py-1.5 text-[11px] leading-snug"
          style={{
            borderColor: "rgba(34, 197, 94, 0.4)",
            background: "rgba(34, 197, 94, 0.08)",
            color: "var(--p-green)",
          }}
        >
          <span className="text-[9px] uppercase tracking-wider opacity-70">
            Кодовое слово в комменты →
          </span>{" "}
          <span className="font-mono font-semibold">«{commentKeyword}»</span>
        </div>
      )}
    </div>
  );
}

function ReelsBody({
  hooks,
  selectedHook,
  onSelectHook,
  beats,
  caption,
  cta,
  readOnly,
  onUpdateBeat,
  onUpdateCaption,
}: {
  hooks: string[];
  selectedHook: number;
  onSelectHook: (i: number) => Promise<void>;
  beats: ReelsBeat[];
  caption?: string;
  cta?: string;
  readOnly: boolean;
  onUpdateBeat: (i: number, patch: Partial<ReelsBeat>) => void;
  onUpdateCaption: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {hooks.length > 0 && (
        <div>
          <div className="co-field-label">{t.format.hookHeader}</div>
          <div className="co-hooks-list">
            {hooks.map((h, i) => (
              <button
                type="button"
                key={i}
                className={cn(
                  "co-hook-radio nodrag",
                  selectedHook === i && "active",
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  void onSelectHook(i);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                disabled={readOnly}
              >
                <span className="co-hook-radio-dot" />
                <span className="co-hook-radio-text">{h}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {beats.length > 0 && (
        <div>
          <div className="co-field-label">Биты</div>
          <ol className="flex flex-col gap-1.5">
            {beats.map((b, i) => (
              <li
                key={i}
                className="rounded-md border border-border/60 bg-muted p-2 text-[11px] leading-snug text-foreground"
              >
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  #{i + 1} · ~{b.duration_sec}s
                </div>
                <EditableText
                  value={b.script}
                  disabled={readOnly}
                  onSave={(v) => onUpdateBeat(i, { script: v })}
                  multiline
                  rows={3}
                  className="mt-1 whitespace-pre-wrap block w-full"
                  ariaLabel={`Сценарий бита ${i + 1}`}
                />
                <EditableText
                  value={b.visual}
                  disabled={readOnly}
                  onSave={(v) => onUpdateBeat(i, { visual: v })}
                  multiline
                  rows={2}
                  placeholder="visual…"
                  className="mt-1 italic text-muted-foreground block w-full"
                  ariaLabel={`Визуал бита ${i + 1}`}
                />
              </li>
            ))}
          </ol>
        </div>
      )}

      {(caption || !readOnly) && (
        <div>
          <div className="co-field-label">Caption</div>
          <EditableText
            value={caption ?? ""}
            disabled={readOnly}
            onSave={onUpdateCaption}
            multiline
            rows={3}
            placeholder="Подпись…"
            className="rounded-md border border-border/60 bg-muted p-2 text-[11px] leading-snug text-foreground whitespace-pre-wrap block w-full"
            ariaLabel="Подпись (caption)"
          />
        </div>
      )}

      {cta && (
        <div className="text-[11px] text-[color:var(--text-secondary)]">
          <span className="text-[color:var(--text-muted)]">CTA:</span> {cta}
        </div>
      )}
    </div>
  );
}

type ArticleField =
  | "title"
  | "hook"
  | "intro"
  | "conclusion"
  | "cta"
  | "meta_description";

function ArticleBody({
  title,
  hook,
  intro,
  sections,
  conclusion,
  cta,
  meta,
  wordCount,
  readOnly,
  onUpdateField,
  onUpdateSection,
}: {
  title: string;
  hook: string;
  intro: string;
  sections: ArticleSection[];
  conclusion: string;
  cta: string;
  meta: string;
  wordCount: number;
  readOnly: boolean;
  onUpdateField: (field: ArticleField, v: string) => void;
  onUpdateSection: (i: number, patch: Partial<ArticleSection>) => void;
}) {
  return (
    <div className="flex flex-col gap-2 text-foreground">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Статья
        </span>
        <span className="text-[10px] tabular-nums text-muted-foreground">
          {wordCount} слов
        </span>
      </div>
      <EditableText
        value={title}
        disabled={readOnly}
        onSave={(v) => onUpdateField("title", v)}
        placeholder="Заголовок статьи…"
        className="text-[14px] font-semibold leading-snug text-foreground block w-full"
        ariaLabel="Заголовок статьи"
      />
      <EditableText
        value={hook}
        disabled={readOnly}
        onSave={(v) => onUpdateField("hook", v)}
        multiline
        rows={2}
        placeholder="Хук…"
        className="text-[11px] italic leading-snug text-foreground/80 block w-full"
        ariaLabel="Хук"
      />
      <EditableText
        value={intro}
        disabled={readOnly}
        onSave={(v) => onUpdateField("intro", v)}
        multiline
        rows={3}
        placeholder="Вступление…"
        className="text-[11px] leading-relaxed text-foreground/80 block w-full"
        ariaLabel="Вступление"
      />
      <div className="rounded-md border border-border/60 bg-muted p-2">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
          {sections.length} {sections.length === 1 ? "секция" : "секций"}
        </div>
        <ul className="flex flex-col gap-2">
          {sections.map((s, i) => (
            <li key={i} className="flex flex-col gap-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-muted-foreground tabular-nums">{i + 1}.</span>
                <EditableText
                  value={s.heading}
                  disabled={readOnly}
                  onSave={(v) => onUpdateSection(i, { heading: v })}
                  className="text-[11px] font-medium leading-snug text-foreground flex-1"
                  ariaLabel={`Заголовок секции ${i + 1}`}
                />
              </div>
              <EditableText
                value={s.body}
                disabled={readOnly}
                onSave={(v) => onUpdateSection(i, { body: v })}
                multiline
                rows={3}
                placeholder="Текст секции…"
                className="text-[11px] leading-snug text-foreground/80 block w-full"
                ariaLabel={`Текст секции ${i + 1}`}
              />
            </li>
          ))}
        </ul>
      </div>
      <EditableText
        value={conclusion}
        disabled={readOnly}
        onSave={(v) => onUpdateField("conclusion", v)}
        multiline
        rows={2}
        placeholder="Итог…"
        className="text-[11px] leading-relaxed text-muted-foreground block w-full"
        ariaLabel="Итог"
      />
      <EditableText
        value={cta}
        disabled={readOnly}
        onSave={(v) => onUpdateField("cta", v)}
        multiline
        rows={2}
        placeholder="CTA…"
        className="rounded-md border border-content/20 bg-content/5 p-1.5 text-[11px] leading-snug text-content block w-full"
        ariaLabel="CTA"
      />
      <div className="text-[10px] leading-snug text-muted-foreground">
        <span className="font-semibold text-muted-foreground">SEO: </span>
        <EditableText
          value={meta}
          disabled={readOnly}
          onSave={(v) => onUpdateField("meta_description", v)}
          multiline
          rows={2}
          placeholder="meta description…"
          className="text-muted-foreground"
          ariaLabel="SEO meta description"
        />
      </div>
    </div>
  );
}

function HooksBankBody({
  hooks,
  readOnly,
  onUpdateHook,
}: {
  hooks: HookEntry[];
  readOnly: boolean;
  onUpdateHook: (i: number, text: string) => void;
}) {
  return (
    <ul className="flex flex-col gap-1.5">
      {hooks.map((h, i) => (
        <li
          key={i}
          className="rounded-md border border-border/60 bg-muted p-2 text-[11px] leading-snug text-foreground"
        >
          <div className="flex items-start gap-2">
            <span className="text-[10px] font-semibold tabular-nums text-muted-foreground mt-0.5">
              {i + 1}.
            </span>
            <EditableText
              value={h.text}
              disabled={readOnly}
              onSave={(v) => onUpdateHook(i, v)}
              multiline
              rows={2}
              className="flex-1 whitespace-pre-wrap"
              ariaLabel={`Хук ${i + 1}`}
            />
            {/* Trigger pill stays read-only per spec — typed enum, not free text. */}
            <span className="rounded-full border border-border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-foreground/80">
              {h.trigger}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function TwitterBody({
  tweets,
  formatType,
  readOnly,
  onUpdateTweet,
  onSetFormatType,
}: {
  tweets: string[];
  formatType: "single" | "thread";
  readOnly: boolean;
  onUpdateTweet: (i: number, text: string) => void;
  onSetFormatType: (ft: "single" | "thread") => void;
}) {
  const total = tweets.length || 1;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {formatType === "thread" ? t.format.twitterThread : t.format.twitterSingle}
        </span>
        {!readOnly && (
          <div className="ml-auto flex gap-1">
            <button
              type="button"
              className={cn(
                "co-tab-pill nodrag",
                formatType === "single" && "active",
              )}
              onClick={(e) => {
                e.stopPropagation();
                onSetFormatType("single");
              }}
            >
              соло
            </button>
            <button
              type="button"
              className={cn(
                "co-tab-pill nodrag",
                formatType === "thread" && "active",
              )}
              onClick={(e) => {
                e.stopPropagation();
                onSetFormatType("thread");
              }}
            >
              тред
            </button>
          </div>
        )}
      </div>
      {tweets.length === 0 ? (
        <div className="text-[11px] text-muted-foreground">—</div>
      ) : formatType === "single" ? (
        <div className="rounded-md border border-border/60 bg-muted p-2">
          <EditableText
            value={tweets[0] ?? ""}
            disabled={readOnly}
            onSave={(v) => onUpdateTweet(0, v)}
            multiline
            rows={6}
            className="text-[12px] leading-snug text-foreground whitespace-pre-wrap block w-full"
            ariaLabel="Твит"
          />
        </div>
      ) : (
        <ol className="flex flex-col gap-1.5">
          {tweets.map((tw, i) => (
            <li
              key={i}
              className="rounded-md border border-border/60 bg-muted p-2"
            >
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {i + 1}/{total}
              </div>
              <EditableText
                value={tw}
                disabled={readOnly}
                onSave={(v) => onUpdateTweet(i, v)}
                multiline
                rows={3}
                className="mt-1 text-[11px] leading-snug text-foreground whitespace-pre-wrap block w-full"
                ariaLabel={`Твит ${i + 1}`}
              />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function InstagramBody({
  caption,
  hook,
  body,
  cta,
  visualDirection,
  readOnly,
  onUpdateField,
}: {
  caption: string;
  hook: string;
  body: string;
  cta: string;
  visualDirection: string;
  readOnly: boolean;
  onUpdateField: (
    field: "caption" | "hook" | "body" | "cta" | "visual_direction",
    v: string,
  ) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-md border border-border/60 bg-muted p-2 flex flex-col gap-1.5">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Caption
        </div>
        {hook ? (
          <EditableText
            value={hook}
            disabled={readOnly}
            onSave={(v) => onUpdateField("hook", v)}
            multiline
            rows={2}
            placeholder="Хук…"
            className="text-[11px] font-medium text-foreground whitespace-pre-wrap block w-full"
            ariaLabel="Хук"
          />
        ) : null}
        <EditableText
          value={body || caption}
          disabled={readOnly}
          onSave={(v) => onUpdateField(body ? "body" : "caption", v)}
          multiline
          rows={5}
          placeholder="Подпись…"
          className="text-[11px] leading-snug text-foreground whitespace-pre-wrap block w-full"
          ariaLabel="Подпись"
        />
        {cta ? (
          <EditableText
            value={cta}
            disabled={readOnly}
            onSave={(v) => onUpdateField("cta", v)}
            multiline
            rows={2}
            placeholder="CTA…"
            className="text-[11px] italic text-content whitespace-pre-wrap block w-full"
            ariaLabel="CTA"
          />
        ) : null}
      </div>
      <div className="rounded-md border border-warn/20 bg-warn/[0.04] p-2">
        <div className="text-[10px] uppercase tracking-wider text-warn/80 mb-1">
          {t.format.visualDirection}
        </div>
        <EditableText
          value={visualDirection}
          disabled={readOnly}
          onSave={(v) => onUpdateField("visual_direction", v)}
          multiline
          rows={3}
          placeholder="Что в кадре, ракурс, свет…"
          className="text-[11px] leading-snug text-foreground whitespace-pre-wrap block w-full"
          ariaLabel="Visual direction"
        />
      </div>
    </div>
  );
}

const PORT_STYLE_LEFT: React.CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: 999,
  background: "var(--port-bg)",
  border: "1px solid rgba(0, 0, 0, 0.06)",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.4)",
  left: -13,
  color: "rgb(var(--ink-rgb) / 0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 3,
};

// Suppress unused import warnings (Sparkles imported above but used only in
// optional flows): React doesn't warn but keep static reference.
void Sparkles;


/**
 * Вывод рецензии: оценка, «Главное», сгруппированные тезисы, послесловие.
 * Только чтение — правка рецензии целиком делается в модалке просмотра,
 * как у статьи; здесь важно видеть структуру, а не редактировать её в ноде.
 */
/** Русские падежи для счётчика тезисов. */
function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

function ReviewBody({ format }: { format: FormatNodeData }) {
  const sections = format.sections ?? [];
  const keyPoints = (format as { key_points?: string[] }).key_points ?? [];
  const verdict = (format as { verdict?: string }).verdict ?? "";
  const audience = (format as { audience?: string }).audience ?? "";
  const afterword = (format as { afterword?: string }).afterword ?? "";
  const tezisCount = (format as { source_tezis_count?: number }).source_tezis_count;

  return (
    <div className="flex flex-col gap-2.5 text-[11.5px] leading-snug">
      {format.title && (
        <div className="text-[13px] font-semibold text-foreground">
          {format.title}
        </div>
      )}
      {(format as { subtitle?: string }).subtitle && (
        <div className="text-muted-foreground">
          {(format as { subtitle?: string }).subtitle}
        </div>
      )}

      {/* Не .chip: у него white-space:nowrap из прототипа — он рассчитан на
          короткие метки, а здесь целые предложения, и они вылезали за край
          ноды. Оставляем ту же подложку, но с переносом строк. */}
      {(verdict || audience) && (
        <div className="flex flex-col gap-1.5">
          {verdict && (
            <div className="rounded-lg border border-accent2/30 bg-accent2/10 px-2.5 py-1.5 text-accent2">
              {verdict}
            </div>
          )}
          {audience && (
            <div className="rounded-lg border border-border bg-muted px-2.5 py-1.5 text-muted-foreground">
              {audience}
            </div>
          )}
        </div>
      )}

      {keyPoints.length > 0 && (
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            Главное
          </div>
          <ul className="flex flex-col gap-1">
            {keyPoints.map((kp, i) => (
              <li key={i} className="text-foreground">
                — {kp}
              </li>
            ))}
          </ul>
        </div>
      )}

      {sections.map((sec, i) => {
        const points = (sec as { points?: string[] }).points ?? [];
        return (
          <div key={i}>
            {sec.heading && (
              <div className="mb-1 font-medium text-foreground">{sec.heading}</div>
            )}
            <ul className="flex flex-col gap-1">
              {points.map((pt, j) => (
                <li key={j} className="text-muted-foreground">
                  — {pt}
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      {afterword && (
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            Что я забрал себе
          </div>
          <div className="text-foreground">{afterword}</div>
        </div>
      )}

      <div className="text-[10px] text-muted-foreground">
        {format.word_count ? `${format.word_count} слов` : ""}
        {tezisCount ? ` · по ${tezisCount} тезисам` : ""}
      </div>
    </div>
  );
}


/**
 * Вывод материала для vc.ru. Кроме текста показывает самопроверку —
 * ради неё формат и отличается от обычной статьи: у площадки свои
 * основания для коммерческого статуса, и увидеть риски надо ДО публикации,
 * а не после того, как материал скрыли из лент.
 */
function VcBody({ format }: { format: FormatNodeData }) {
  const f = format as FormatNodeData & {
    subtitle?: string;
    ending?: string;
    missing_facts?: string[];
    self_check?: {
      numbers_used?: string[];
      failure_described?: string;
      survives_product_cut?: boolean;
      risks?: string[];
      active_links?: string[];
    };
  };
  const check = f.self_check ?? {};
  const links = check.active_links ?? [];
  const numbers = check.numbers_used ?? [];
  const risks = check.risks ?? [];
  const missing = f.missing_facts ?? [];

  return (
    <div className="flex flex-col gap-2.5 text-[11.5px] leading-snug">
      {f.title && (
        <div className="text-[13px] font-semibold text-foreground">{f.title}</div>
      )}
      {f.subtitle && <div className="text-muted-foreground">{f.subtitle}</div>}

      {/* Светофор перед публикацией. Активная ссылка — самая частая и самая
          механическая причина коммерческого статуса, поэтому она первой. */}
      <div className="flex flex-col gap-1 rounded-md border border-border/60 bg-muted p-2">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Проверка перед публикацией
        </div>
        <div className={links.length ? "text-destructive" : "text-success"}>
          {links.length
            ? `Активные ссылки: ${links.length} — снять, иначе коммерческий статус`
            : "Активных ссылок нет"}
        </div>
        <div className={numbers.length >= 3 ? "text-success" : "text-warn"}>
          {`Конкретных чисел: ${numbers.length}${numbers.length >= 3 ? "" : " — площадка ждёт минимум три"}`}
        </div>
        <div className={check.failure_described ? "text-success" : "text-warn"}>
          {check.failure_described
            ? `Описан провал: ${check.failure_described}`
            : "Провала нет — материал прочтётся как реклама"}
        </div>
        <div className={check.survives_product_cut ? "text-success" : "text-destructive"}>
          {check.survives_product_cut
            ? "Полезен без упоминаний продукта"
            : "Без продукта разваливается — это продвижение"}
        </div>
        {risks.map((r, i) => (
          <div key={i} className="text-warn">
            — {r}
          </div>
        ))}
      </div>

      {(f.sections ?? []).map((sec, i) => (
        <div key={i}>
          {sec.heading && (
            <div className="mb-1 font-medium text-foreground">{sec.heading}</div>
          )}
          <div className="whitespace-pre-wrap text-muted-foreground">{sec.body}</div>
        </div>
      ))}

      {f.ending && <div className="text-foreground">{f.ending}</div>}

      {missing.length > 0 && (
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            Чего не хватает — добыть автору
          </div>
          <ul className="flex flex-col gap-1">
            {missing.map((m, i) => (
              <li key={i} className="text-warn">
                — {m}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="text-[10px] text-muted-foreground">
        {f.word_count ? `${f.word_count} слов` : ""}
      </div>
    </div>
  );
}
