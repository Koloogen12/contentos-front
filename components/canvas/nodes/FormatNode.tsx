"use client";

import * as React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Check, Copy, Loader2, Play, Send } from "lucide-react";
import { toast } from "sonner";
import type {
  CarouselSlide,
  FormatNodeData,
  FormatPlatform,
  HookEntry,
  HookTrigger,
  NodeOut,
  ReelsBeat,
} from "@/lib/types";
import { useCanvasNodeContext } from "@/components/canvas/canvasContext";
import { cn } from "@/lib/utils";
import { NODE_HANDLE_STYLE, NodeShell } from "./NodeShell";
import { PublishDialog } from "@/components/canvas/PublishDialog";

interface FormatNodeRfData {
  node: NodeOut;
  expanded: boolean;
  onToggleExpanded: () => void;
}

const PLATFORM_OPTIONS: { value: FormatPlatform; label: string }[] = [
  { value: "telegram", label: "Telegram" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "carousel", label: "Carousel" },
  { value: "reels", label: "Reels" },
  { value: "hooks", label: "Hooks" },
];

/**
 * Subtle, palette-aligned colors for each hook trigger. Eight distinct
 * tints picked from the existing emerald / amber / indigo / rose / cyan /
 * violet / sky / slate ramps used elsewhere in the app.
 */
const TRIGGER_STYLES: Record<HookTrigger, string> = {
  paradox: "bg-violet-500/15 text-violet-300 border-violet-500/25",
  number: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  contrast: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  provocation: "bg-rose-500/15 text-rose-300 border-rose-500/25",
  story: "bg-cyan-500/15 text-cyan-300 border-cyan-500/25",
  dissonance: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/25",
  question: "bg-sky-500/15 text-sky-300 border-sky-500/25",
  other: "bg-zinc-500/15 text-zinc-300 border-zinc-500/25",
};

const TRIGGER_LABEL: Record<HookTrigger, string> = {
  paradox: "Paradox",
  number: "Number",
  contrast: "Contrast",
  provocation: "Provocation",
  story: "Story",
  dissonance: "Dissonance",
  question: "Question",
  other: "Other",
};

export function FormatNode({ data, selected }: NodeProps) {
  const typed = data as unknown as FormatNodeRfData;
  const node = typed.node;
  const expanded = typed.expanded;
  const { updateNodeData, runNode, isRunning, readOnly } =
    useCanvasNodeContext();
  const running = isRunning(node.id);
  const format = (node.data ?? {}) as FormatNodeData;
  const platform: FormatPlatform = format.platform ?? "telegram";
  const hooks = format.hooks ?? [];
  const selectedHook = format.selected_hook_index ?? 0;
  const slides = format.slides ?? [];
  const beats = format.beats ?? [];
  const hooksBank = format.hooks_bank ?? [];
  const [copied, setCopied] = React.useState(false);
  const [publishOpen, setPublishOpen] = React.useState(false);
  const canPublish =
    !!format.full_text && platform === "telegram" && !readOnly;

  // What signals "this format has output" varies by platform.
  const hasOutput = React.useMemo(() => {
    if (platform === "carousel") return slides.length > 0;
    if (platform === "reels") return beats.length > 0 || hooks.length > 0;
    if (platform === "hooks") return hooksBank.length > 0;
    return hooks.length > 0;
  }, [platform, slides.length, beats.length, hooks.length, hooksBank.length]);

  const onPlatformChange = async (next: FormatPlatform) => {
    if (readOnly) return;
    if (next === platform) return;
    await updateNodeData(node.id, { platform: next });
  };

  const onSelectHook = async (i: number) => {
    if (readOnly) return;
    if (i === selectedHook) return;
    await updateNodeData(node.id, { selected_hook_index: i });
  };

  const onCopy = async () => {
    if (!format.full_text) return;
    try {
      await navigator.clipboard.writeText(format.full_text);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  const subhead = React.useMemo(() => {
    if (platform === "carousel" && slides.length > 0)
      return `${slides.length} slides generated`;
    if (platform === "reels" && beats.length > 0)
      return `${beats.length} beats · ~${format.duration_sec ?? "?"}s`;
    if (platform === "hooks" && hooksBank.length > 0) {
      const first = hooksBank[0]?.text ?? "";
      const truncated =
        first.length > 80 ? `${first.slice(0, 80).trimEnd()}…` : first;
      return `${hooksBank.length} hooks · ${truncated}`;
    }
    if (hooks.length > 0) return `${hooks.length} hooks generated`;
    return undefined;
  }, [
    platform,
    slides.length,
    beats.length,
    hooks.length,
    hooksBank,
    format.duration_sec,
  ]);

  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        style={NODE_HANDLE_STYLE}
      />
      <NodeShell
        title={`Format → ${platform.charAt(0).toUpperCase() + platform.slice(1)}`}
        status={node.status}
        selected={!!selected}
        expanded={expanded}
        onToggleExpanded={typed.onToggleExpanded}
        subhead={subhead}
        headerActions={
          readOnly ? null : (
            <button
              type="button"
              className="nodrag inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={(e) => {
                e.stopPropagation();
                runNode(node.id);
              }}
              disabled={running}
            >
              {running ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Play className="h-3 w-3" />
              )}
              Run
            </button>
          )
        }
      >
        <div className="space-y-2.5">
          {!readOnly && (
            <PlatformPicker platform={platform} onChange={onPlatformChange} />
          )}

          {!hasOutput ? (
            <p className="text-xs leading-relaxed text-zinc-500">
              {readOnly
                ? "(No output)"
                : "Connect a talking point and click Run."}
            </p>
          ) : platform === "carousel" ? (
            <CarouselBody
              slides={slides}
              summary={format.summary}
              cta={format.cta}
              expanded={expanded}
            />
          ) : platform === "reels" ? (
            <ReelsBody
              hooks={hooks}
              selectedHook={selectedHook}
              onSelectHook={onSelectHook}
              beats={beats}
              cta={format.cta}
              caption={format.caption}
              expanded={expanded}
              readOnly={!!readOnly}
            />
          ) : platform === "hooks" ? (
            <HooksBody hooks={hooksBank} expanded={expanded} />
          ) : (
            <PostBody
              hooks={hooks}
              selectedHook={selectedHook}
              onSelectHook={onSelectHook}
              body={format.body}
              cta={format.cta}
              expanded={expanded}
              readOnly={!!readOnly}
            />
          )}

          {hasOutput && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className="nodrag inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-[11px] font-medium text-zinc-200 hover:bg-black/60 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={(e) => {
                  e.stopPropagation();
                  void onCopy();
                }}
                disabled={!format.full_text}
              >
                {copied ? (
                  <Check className="h-3 w-3 text-emerald-400" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                {copied ? "Copied" : "Copy all"}
              </button>
              {canPublish && (
                <button
                  type="button"
                  className="nodrag inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-2 py-1.5 text-[11px] font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPublishOpen(true);
                  }}
                >
                  <Send className="h-3 w-3" />
                  Publish to Telegram
                </button>
              )}
            </div>
          )}
        </div>
      </NodeShell>
      {canPublish && (
        <PublishDialog
          nodeId={node.id}
          open={publishOpen}
          onOpenChange={setPublishOpen}
        />
      )}
    </>
  );
}

function PlatformPicker({
  platform,
  onChange,
}: {
  platform: FormatPlatform;
  onChange: (next: FormatPlatform) => Promise<void>;
}) {
  // 5 options — lay out as a single row of equal-width pills (2.5 columns
  // each on small viewports — but the canvas node is fixed-width so a
  // 5-col row reads well at 320px).
  return (
    <div className="nodrag grid grid-cols-5 gap-1 rounded-md border border-white/5 bg-black/30 p-0.5">
      {PLATFORM_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={cn(
            "rounded px-1 py-1 text-[10px] font-medium transition-colors",
            platform === opt.value
              ? "bg-white/10 text-foreground"
              : "text-zinc-400 hover:text-zinc-200",
          )}
          onClick={(e) => {
            e.stopPropagation();
            void onChange(opt.value);
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ----- Telegram / LinkedIn body --------------------------------------

function PostBody({
  hooks,
  selectedHook,
  onSelectHook,
  body,
  cta,
  expanded,
  readOnly,
}: {
  hooks: string[];
  selectedHook: number;
  onSelectHook: (i: number) => Promise<void>;
  body: string | undefined;
  cta: string | undefined;
  expanded: boolean;
  readOnly: boolean;
}) {
  return (
    <>
      <div className="space-y-1">
        <div className="text-[10px] uppercase tracking-wide text-zinc-500">
          Hooks
        </div>
        <ul className="space-y-1">
          {hooks.map((hook, i) => {
            const isSelected = selectedHook === i;
            return (
              <li key={i}>
                <button
                  type="button"
                  className={cn(
                    "nodrag flex w-full items-start gap-2 rounded-md border px-2 py-1.5 text-left text-[11px] leading-snug transition-colors",
                    isSelected
                      ? "border-primary/60 bg-primary/10 text-foreground"
                      : "border-white/5 bg-black/30 text-zinc-300 hover:bg-black/50",
                    readOnly && "cursor-default",
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!readOnly) void onSelectHook(i);
                  }}
                  disabled={readOnly}
                >
                  <span
                    className={cn(
                      "mt-0.5 h-3 w-3 shrink-0 rounded-full border",
                      isSelected
                        ? "border-primary bg-primary"
                        : "border-zinc-500",
                    )}
                    aria-hidden
                  />
                  <span
                    className={cn(
                      expanded ? "line-clamp-none" : "line-clamp-2",
                    )}
                  >
                    {hook}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {expanded && body && (
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-wide text-zinc-500">
            Body
          </div>
          <div className="scrollbar-thin max-h-[180px] overflow-auto whitespace-pre-wrap rounded-md border border-white/5 bg-black/30 p-2 text-[11px] leading-relaxed text-zinc-200">
            {body}
          </div>
        </div>
      )}

      {cta && (
        <div className="text-[11px] text-zinc-400">
          <span className="text-zinc-500">CTA:</span>{" "}
          <span className="font-medium text-zinc-200">{cta}</span>
        </div>
      )}
    </>
  );
}

// ----- Carousel body -------------------------------------------------

function CarouselBody({
  slides,
  summary,
  cta,
  expanded,
}: {
  slides: CarouselSlide[];
  summary: string | undefined;
  cta: string | undefined;
  expanded: boolean;
}) {
  const visibleSlides = expanded ? slides : slides.slice(0, 3);
  return (
    <>
      <div className="space-y-1">
        <div className="text-[10px] uppercase tracking-wide text-zinc-500">
          Slides
        </div>
        <ul className="space-y-1.5">
          {visibleSlides.map((slide, i) => (
            <li
              key={i}
              className="rounded-md border border-white/5 bg-black/30 p-2"
            >
              <div className="flex items-center gap-1.5">
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-sm bg-primary/20 text-[9px] font-semibold text-primary">
                  {i + 1}
                </span>
                <span className="line-clamp-1 text-[11px] font-medium text-zinc-100">
                  {slide.title}
                </span>
                {slide.is_cover && (
                  <span className="ml-auto rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-300">
                    Cover
                  </span>
                )}
              </div>
              <p
                className={cn(
                  "mt-1 whitespace-pre-wrap text-[11px] leading-snug text-zinc-300",
                  expanded ? "" : "line-clamp-2",
                )}
              >
                {slide.body}
              </p>
            </li>
          ))}
        </ul>
        {!expanded && slides.length > visibleSlides.length && (
          <p className="text-[10px] text-zinc-500">
            +{slides.length - visibleSlides.length} more · expand to see all
          </p>
        )}
      </div>

      {expanded && summary && (
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-wide text-zinc-500">
            Summary
          </div>
          <p className="rounded-md border border-white/5 bg-black/30 p-2 text-[11px] leading-snug text-zinc-200">
            {summary}
          </p>
        </div>
      )}

      {cta && (
        <div className="text-[11px] text-zinc-400">
          <span className="text-zinc-500">CTA:</span>{" "}
          <span className="font-medium text-zinc-200">{cta}</span>
        </div>
      )}
    </>
  );
}

// ----- Reels body ----------------------------------------------------

function ReelsBody({
  hooks,
  selectedHook,
  onSelectHook,
  beats,
  cta,
  caption,
  expanded,
  readOnly,
}: {
  hooks: string[];
  selectedHook: number;
  onSelectHook: (i: number) => Promise<void>;
  beats: ReelsBeat[];
  cta: string | undefined;
  caption: string | undefined;
  expanded: boolean;
  readOnly: boolean;
}) {
  const visibleBeats = expanded ? beats : beats.slice(0, 2);
  return (
    <>
      {hooks.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-wide text-zinc-500">
            Hooks
          </div>
          <ul className="space-y-1">
            {hooks.map((hook, i) => {
              const isSelected = selectedHook === i;
              return (
                <li key={i}>
                  <button
                    type="button"
                    className={cn(
                      "nodrag flex w-full items-start gap-2 rounded-md border px-2 py-1.5 text-left text-[11px] leading-snug transition-colors",
                      isSelected
                        ? "border-primary/60 bg-primary/10 text-foreground"
                        : "border-white/5 bg-black/30 text-zinc-300 hover:bg-black/50",
                      readOnly && "cursor-default",
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!readOnly) void onSelectHook(i);
                    }}
                    disabled={readOnly}
                  >
                    <span
                      className={cn(
                        "mt-0.5 h-3 w-3 shrink-0 rounded-full border",
                        isSelected
                          ? "border-primary bg-primary"
                          : "border-zinc-500",
                      )}
                      aria-hidden
                    />
                    <span
                      className={cn(
                        expanded ? "line-clamp-none" : "line-clamp-2",
                      )}
                    >
                      {hook}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {beats.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-wide text-zinc-500">
            Beats
          </div>
          <ol className="space-y-1.5">
            {visibleBeats.map((beat, i) => (
              <li
                key={i}
                className="rounded-md border border-white/5 bg-black/30 p-2"
              >
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-zinc-500">
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-sm bg-primary/20 text-[9px] font-semibold text-primary">
                    {i + 1}
                  </span>
                  <span>~{beat.duration_sec}s</span>
                </div>
                <p
                  className={cn(
                    "mt-1 whitespace-pre-wrap text-[11px] leading-snug text-zinc-200",
                    expanded ? "" : "line-clamp-2",
                  )}
                >
                  {beat.script}
                </p>
                {beat.visual && (
                  <p
                    className={cn(
                      "mt-1 whitespace-pre-wrap text-[11px] italic leading-snug text-zinc-400",
                      expanded ? "" : "line-clamp-1",
                    )}
                  >
                    {beat.visual}
                  </p>
                )}
              </li>
            ))}
          </ol>
          {!expanded && beats.length > visibleBeats.length && (
            <p className="text-[10px] text-zinc-500">
              +{beats.length - visibleBeats.length} more · expand to see all
            </p>
          )}
        </div>
      )}

      {expanded && caption && (
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-wide text-zinc-500">
            Caption
          </div>
          <p className="whitespace-pre-wrap rounded-md border border-white/5 bg-black/30 p-2 text-[11px] leading-snug text-zinc-200">
            {caption}
          </p>
        </div>
      )}

      {cta && (
        <div className="text-[11px] text-zinc-400">
          <span className="text-zinc-500">CTA:</span>{" "}
          <span className="font-medium text-zinc-200">{cta}</span>
        </div>
      )}
    </>
  );
}

// ----- Hooks body ----------------------------------------------------

function HooksBody({
  hooks,
  expanded,
}: {
  hooks: HookEntry[];
  expanded: boolean;
}) {
  const visible = expanded ? hooks : hooks.slice(0, 4);
  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase tracking-wide text-zinc-500">
        Hooks bank
      </div>
      <ul className="space-y-1.5">
        {visible.map((hook, i) => (
          <HookRow key={i} index={i} hook={hook} expanded={expanded} />
        ))}
      </ul>
      {!expanded && hooks.length > visible.length && (
        <p className="text-[10px] text-zinc-500">
          +{hooks.length - visible.length} more · expand to see all
        </p>
      )}
    </div>
  );
}

function HookRow({
  index,
  hook,
  expanded,
}: {
  index: number;
  hook: HookEntry;
  expanded: boolean;
}) {
  const [copied, setCopied] = React.useState(false);

  const onCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(hook.text);
      setCopied(true);
      toast.success("Hook copied");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  const triggerStyle =
    TRIGGER_STYLES[hook.trigger] ?? TRIGGER_STYLES.other;
  const triggerLabel = TRIGGER_LABEL[hook.trigger] ?? hook.trigger;

  return (
    <li className="rounded-md border border-white/5 bg-black/30 p-2">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 inline-flex shrink-0 items-baseline text-[10px] font-semibold tabular-nums text-zinc-500">
          {index + 1}.
        </span>
        <p
          className={cn(
            "min-w-0 flex-1 whitespace-pre-wrap text-[11px] leading-snug text-zinc-200",
            expanded ? "" : "line-clamp-3",
          )}
        >
          {hook.text}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <span
            className={cn(
              "rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
              triggerStyle,
            )}
          >
            {triggerLabel}
          </span>
          <button
            type="button"
            className="nodrag rounded-md p-1 text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
            onClick={onCopy}
            title="Copy this hook"
            aria-label="Copy this hook"
          >
            {copied ? (
              <Check className="h-3 w-3 text-emerald-400" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </button>
        </div>
      </div>
    </li>
  );
}
