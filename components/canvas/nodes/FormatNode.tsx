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
  FormatNodeData,
  FormatPlatform,
  HookEntry,
  NodeOut,
  ReelsBeat,
} from "@/lib/types";
import { useCanvasNodeContext } from "@/components/canvas/canvasContext";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { PublishDialog } from "@/components/canvas/PublishDialog";

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
  const { updateNodeData, runNode, isRunning, attachSkillRun, readOnly } =
    useCanvasNodeContext();
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

  const articleSections = format.sections ?? [];
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

        <div className="co-node-content">
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
                runNode(node.id);
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
              {/* Platform-specific body */}
              {platform === "carousel" ? (
                <CarouselBody
                  slides={slides}
                  summary={format.summary}
                  cta={format.cta}
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
                />
              ) : platform === "hooks" ? (
                <HooksBankBody hooks={hooksBank} />
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
                    onClick={() => tweakMutation.mutate({ mode: "regenerate" })}
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
                    onClick={() => tweakMutation.mutate({ mode: "rehook" })}
                    busy={
                      tweakMutation.isPending &&
                      tweakMutation.variables?.mode === "rehook"
                    }
                    disabled={running || tweakMutation.isPending}
                  />
                  <ActionBtn
                    Icon={Zap}
                    label={t.format.actions.shorten}
                    onClick={() => tweakMutation.mutate({ mode: "shorten" })}
                    busy={
                      tweakMutation.isPending &&
                      tweakMutation.variables?.mode === "shorten"
                    }
                    disabled={running || tweakMutation.isPending}
                  />
                  <ActionBtn
                    Icon={Mic}
                    label={t.format.actions.amplifyVoice}
                    onClick={() =>
                      tweakMutation.mutate({ mode: "amplify_voice" })
                    }
                    busy={
                      tweakMutation.isPending &&
                      tweakMutation.variables?.mode === "amplify_voice"
                    }
                    disabled={running || tweakMutation.isPending}
                  />
                  <ActionBtn
                    Icon={Wand2}
                    label={t.format.actions.platform}
                    onClick={() =>
                      tweakMutation.mutate({ mode: "platform_optimize" })
                    }
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
}: {
  slides: CarouselSlide[];
  summary?: string;
  cta?: string;
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
            <span className="line-clamp-1 text-[11px] font-medium text-zinc-100">
              {s.title}
            </span>
            {s.is_cover && (
              <span className="ml-auto text-[9px] uppercase tracking-wide text-amber-300">
                Обложка
              </span>
            )}
          </div>
          <p className="mt-1 whitespace-pre-wrap text-[11px] leading-snug text-zinc-300">
            {s.body}
          </p>
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
}: {
  hooks: string[];
  selectedHook: number;
  onSelectHook: (i: number) => Promise<void>;
  beats: ReelsBeat[];
  caption?: string;
  cta?: string;
  readOnly: boolean;
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
                <p className="mt-1 whitespace-pre-wrap">{b.script}</p>
                {b.visual && (
                  <p className="mt-1 italic text-zinc-400">{b.visual}</p>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {caption && (
        <div>
          <div className="co-field-label">Caption</div>
          <p className="rounded-md border border-white/5 bg-black/30 p-2 text-[11px] leading-snug text-zinc-200 whitespace-pre-wrap">
            {caption}
          </p>
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

function ArticleBody({
  title,
  hook,
  intro,
  sections,
  conclusion,
  cta,
  meta,
  wordCount,
}: {
  title: string;
  hook: string;
  intro: string;
  sections: ArticleSection[];
  conclusion: string;
  cta: string;
  meta: string;
  wordCount: number;
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
      {title && (
        <h3 className="text-[14px] font-semibold leading-snug text-zinc-50">
          {title}
        </h3>
      )}
      {hook && (
        <p className="text-[11px] italic leading-snug text-zinc-300">{hook}</p>
      )}
      {intro && (
        <p className="text-[11px] leading-relaxed text-zinc-300 line-clamp-3">
          {intro}
        </p>
      )}
      <div className="rounded-md border border-white/5 bg-black/30 p-2">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
          {sections.length} {sections.length === 1 ? "секция" : "секций"}
        </div>
        <ul className="flex flex-col gap-1">
          {sections.map((s, i) => (
            <li
              key={i}
              className="text-[11px] leading-snug text-zinc-300 line-clamp-1"
            >
              <span className="text-zinc-500 tabular-nums mr-1.5">{i + 1}.</span>
              {s.heading}
            </li>
          ))}
        </ul>
      </div>
      {conclusion && (
        <p className="text-[11px] leading-relaxed text-zinc-400 line-clamp-2">
          {conclusion}
        </p>
      )}
      {cta && (
        <p className="rounded-md border border-indigo-400/20 bg-indigo-400/5 p-1.5 text-[11px] leading-snug text-indigo-200">
          {cta}
        </p>
      )}
      {meta && (
        <p className="text-[10px] leading-snug text-zinc-500">
          <span className="font-semibold text-zinc-400">SEO: </span>
          {meta}
        </p>
      )}
    </div>
  );
}

function HooksBankBody({ hooks }: { hooks: HookEntry[] }) {
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
            <p className="flex-1 whitespace-pre-wrap">{h.text}</p>
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
