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
  Copy,
  FileText,
  Film,
  Hash,
  LayoutGrid,
  Loader2,
  Mic,
  Newspaper,
  PenLine,
  Play,
  RefreshCcw,
  RefreshCw,
  Send,
  Sparkles,
  Wand2,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
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
} from "@/lib/types";
import { useCanvasNodeContext } from "@/components/canvas/canvasContext";
import { EditableText } from "@/components/canvas/EditableText";
import {
  buildArticleFullText,
  buildCarouselFullText,
  buildHooksBankFullText,
  buildReelsFullText,
  findUpstreamExtract,
} from "@/components/canvas/formatNodeUtils";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { PublishDialog } from "@/components/canvas/PublishDialog";
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
  { k: "carousel", label: "Carousel", Icon: LayoutGrid },
  { k: "reels", label: "Reels", Icon: Film },
  { k: "hooks", label: "Hooks", Icon: Hash },
  { k: "article", label: "Статья", Icon: Newspaper },
];

const PLATFORM_LABEL: Record<FormatPlatform, string> = {
  telegram: "Telegram",
  linkedin: "LinkedIn",
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
  const scheduledDate = useScheduledBadge(node.id);

  const articleSections = format.sections ?? [];

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
  };
  const hasOutput = React.useMemo(() => {
    if (platform === "carousel") return slides.length > 0;
    if (platform === "reels") return beats.length > 0 || hooks.length > 0;
    if (platform === "hooks") return hooksBank.length > 0;
    if (platform === "article") return articleSections.length > 0;
    return hooks.length > 0;
  }, [
    platform,
    slides.length,
    beats.length,
    hooks.length,
    hooksBank.length,
    articleSections.length,
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
          {upstreamPoints.length > 0 && (
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
              style={{ borderColor: "rgba(239,68,68,0.3)", color: "#fca5a5" }}
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
                  slides={slides}
                  summary={format.summary}
                  cta={format.cta}
                  readOnly={!!readOnly}
                  onUpdateSlide={(i, patch) => {
                    const next = slides.map((s, idx) =>
                      idx === i ? { ...s, ...patch } : s,
                    );
                    void updateNodeData(node.id, {
                      slides: next,
                      full_text: buildCarouselFullText(next, format.cta),
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
  readOnly,
}: {
  hooks: string[];
  selectedHook: number;
  onSelectHook: (i: number) => Promise<void>;
  body: string;
  cta: string;
  onUpdateBody: (v: string) => void;
  onUpdateCta: (v: string) => void;
  readOnly: boolean;
}) {
  const [bodyDraft, setBodyDraft] = React.useState(body);
  const [ctaDraft, setCtaDraft] = React.useState(cta);
  React.useEffect(() => setBodyDraft(body), [body]);
  React.useEffect(() => setCtaDraft(cta), [cta]);

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
                <span className="co-hook-radio-text">{h}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="co-field-label">{t.format.bodyLabel}</div>
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
      </div>

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
    </>
  );
}

function CarouselBody({
  slides,
  summary,
  cta,
  readOnly,
  onUpdateSlide,
}: {
  slides: CarouselSlide[];
  summary?: string;
  cta?: string;
  readOnly: boolean;
  onUpdateSlide: (i: number, patch: Partial<CarouselSlide>) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {slides.map((s, i) => (
        <div
          key={i}
          className="rounded-md border border-white/5 bg-black/30 p-2"
        >
          <div className="flex items-center gap-1.5">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-sm bg-white/15 text-[9px] font-semibold">
              {i + 1}
            </span>
            <EditableText
              value={s.title}
              disabled={readOnly}
              onSave={(v) => onUpdateSlide(i, { title: v })}
              className="text-[11px] font-medium text-zinc-100 flex-1"
              ariaLabel={`Заголовок слайда ${i + 1}`}
            />
            {s.is_cover && (
              <span className="ml-auto text-[9px] uppercase tracking-wide text-amber-300">
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
            className="mt-1 whitespace-pre-wrap text-[11px] leading-snug text-zinc-300 block w-full"
            ariaLabel={`Текст слайда ${i + 1}`}
          />
        </div>
      ))}
      {summary && (
        <div className="text-[12px] text-[color:var(--text-tertiary)]">
          {summary}
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
                className="rounded-md border border-white/5 bg-black/30 p-2 text-[11px] leading-snug text-zinc-200"
              >
                <div className="text-[10px] uppercase tracking-wide text-zinc-500">
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
                  className="mt-1 italic text-zinc-400 block w-full"
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
            className="rounded-md border border-white/5 bg-black/30 p-2 text-[11px] leading-snug text-zinc-200 whitespace-pre-wrap block w-full"
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
    <div className="flex flex-col gap-2 text-zinc-200">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">
          Статья
        </span>
        <span className="text-[10px] tabular-nums text-zinc-500">
          {wordCount} слов
        </span>
      </div>
      <EditableText
        value={title}
        disabled={readOnly}
        onSave={(v) => onUpdateField("title", v)}
        placeholder="Заголовок статьи…"
        className="text-[14px] font-semibold leading-snug text-zinc-50 block w-full"
        ariaLabel="Заголовок статьи"
      />
      <EditableText
        value={hook}
        disabled={readOnly}
        onSave={(v) => onUpdateField("hook", v)}
        multiline
        rows={2}
        placeholder="Хук…"
        className="text-[11px] italic leading-snug text-zinc-300 block w-full"
        ariaLabel="Хук"
      />
      <EditableText
        value={intro}
        disabled={readOnly}
        onSave={(v) => onUpdateField("intro", v)}
        multiline
        rows={3}
        placeholder="Вступление…"
        className="text-[11px] leading-relaxed text-zinc-300 block w-full"
        ariaLabel="Вступление"
      />
      <div className="rounded-md border border-white/5 bg-black/30 p-2">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
          {sections.length} {sections.length === 1 ? "секция" : "секций"}
        </div>
        <ul className="flex flex-col gap-2">
          {sections.map((s, i) => (
            <li key={i} className="flex flex-col gap-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-zinc-500 tabular-nums">{i + 1}.</span>
                <EditableText
                  value={s.heading}
                  disabled={readOnly}
                  onSave={(v) => onUpdateSection(i, { heading: v })}
                  className="text-[11px] font-medium leading-snug text-zinc-200 flex-1"
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
                className="text-[11px] leading-snug text-zinc-300 block w-full"
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
        className="text-[11px] leading-relaxed text-zinc-400 block w-full"
        ariaLabel="Итог"
      />
      <EditableText
        value={cta}
        disabled={readOnly}
        onSave={(v) => onUpdateField("cta", v)}
        multiline
        rows={2}
        placeholder="CTA…"
        className="rounded-md border border-indigo-400/20 bg-indigo-400/5 p-1.5 text-[11px] leading-snug text-indigo-200 block w-full"
        ariaLabel="CTA"
      />
      <div className="text-[10px] leading-snug text-zinc-500">
        <span className="font-semibold text-zinc-400">SEO: </span>
        <EditableText
          value={meta}
          disabled={readOnly}
          onSave={(v) => onUpdateField("meta_description", v)}
          multiline
          rows={2}
          placeholder="meta description…"
          className="text-zinc-500"
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
          className="rounded-md border border-white/5 bg-black/30 p-2 text-[11px] leading-snug text-zinc-200"
        >
          <div className="flex items-start gap-2">
            <span className="text-[10px] font-semibold tabular-nums text-zinc-500 mt-0.5">
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
            <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-zinc-300">
              {h.trigger}
            </span>
          </div>
        </li>
      ))}
    </ul>
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
  color: "rgba(255,255,255,0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 3,
};

// Suppress unused import warnings (Sparkles imported above but used only in
// optional flows): React doesn't warn but keep static reference.
void Sparkles;
