"use client";

/**
 * ExtractNode — 1:1 port of `THE CONTENT-2/nodes.jsx#ExtractNode`.
 * Width 320px. Renders found talking points with viral-score badge,
 * category label, selection ("Используется →") and bottom action chips
 * for Переизвлечь / Усилить / Перефразировать.
 */

import * as React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useMutation } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  FileText,
  Film,
  Hash,
  Image as ImageIcon,
  LayoutGrid,
  Loader2,
  Newspaper,
  PenLine,
  Play,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Twitter,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { tweakNode, type ExtractTweakMode } from "@/lib/tweaks";
import type {
  ArcConfig,
  ArcLeadMagnetKind,
  ArcScene,
  ArcStage,
  ExtractMode,
  ExtractNodeData,
  FormatPlatform,
  NodeOut,
  TalkingPoint,
} from "@/lib/types";
import { useCanvasNodeContext } from "@/components/canvas/canvasContext";
import { EditableText } from "@/components/canvas/EditableText";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

const SPAWN_PLATFORMS: ReadonlyArray<{
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
  { k: "hooks", label: "Хуки", Icon: Hash },
  { k: "article", label: "Статья", Icon: Newspaper },
];

interface ExtractNodeRfData {
  node: NodeOut;
}

export function ExtractNode({ data, selected }: NodeProps) {
  const typed = data as unknown as ExtractNodeRfData;
  const node = typed.node;
  const {
    updateNodeData,
    runNode,
    isRunning,
    attachSkillRun,
    readOnly,
    spawnFormatFromTezis,
    spawnReviewFromExtract,
  } = useCanvasNodeContext();
  const status = node.status;
  const running = isRunning(node.id);
  const extract = (node.data ?? {}) as ExtractNodeData;
  const mode: ExtractMode = extract.extract_mode ?? "talking_points";
  const points = extract.talking_points ?? [];
  const selectedIdx = extract.selected_index ?? null;
  const summary = (extract.summary ?? "").trim();
  const keyPoints = extract.key_points ?? [];
  const takeaways = extract.actionable_takeaways ?? [];
  const arc = extract.arc;
  const scenes: ArcScene[] = extract.scenes ?? [];
  const arcConfig: ArcConfig | undefined = extract.arc_config;
  const hasInput = true; // true when an upstream edge exists; CanvasEditor controls upstream gating

  const setMode = async (next: ExtractMode) => {
    if (readOnly) return;
    if (next === mode) return;
    await updateNodeData(node.id, { extract_mode: next });
  };

  const tweakMutation = useMutation({
    mutationFn: ({ mode }: { mode: ExtractTweakMode }) =>
      tweakNode(node.id, mode),
    onSuccess: ({ skill_run_id }) => {
      attachSkillRun(node.id, skill_run_id);
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : t.canvas.couldNotStartRun,
      ),
  });

  const selectPoint = async (i: number) => {
    if (readOnly) return;
    if (selectedIdx === i) return;
    await updateNodeData(node.id, { selected_index: i });
  };

  // Editable talking points (Requirement B). PATCHes the whole
  // talking_points array with the chosen item's `text` replaced. Other
  // metadata (score, category, reasoning) is preserved verbatim.
  const updateTalkingPointText = async (i: number, nextText: string) => {
    if (readOnly) return;
    const trimmed = nextText.trim();
    if (!trimmed) {
      toast.error("Тезис не может быть пустым");
      throw new Error("empty");
    }
    const next: TalkingPoint[] = points.map((p, idx) =>
      idx === i ? { ...p, text: trimmed } : p,
    );
    try {
      await updateNodeData(node.id, { talking_points: next });
      toast.success("Тезис обновлён");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.detail : "Не удалось сохранить тезис",
      );
      throw err;
    }
  };

  return (
    <div className="relative" style={{ width: 360 }}>
      <Handle
        type="target"
        position={Position.Left}
        style={PORT_STYLE_LEFT}
      >
        <ArrowRight size={12} />
      </Handle>
      <div className="co-node-label">
        <Sparkles size={12} />
        <span>{t.extract.label}</span>
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
        <Handle
          type="source"
          position={Position.Right}
          style={{
            ...PORT_STYLE_RIGHT,
            opacity:
              status === "done" &&
              (selectedIdx != null || mode === "summary")
                ? 1
                : 0.4,
          }}
        >
          <ArrowRight size={12} />
        </Handle>

        <div className="co-node-content">
          {!hasInput && (
            <div className="co-placeholder-empty">
              <ArrowRight
                size={13}
                style={{ transform: "rotate(180deg)" }}
              />
              <span>{t.extract.placeholderConnect}</span>
            </div>
          )}

          {/* Mode toggle — always visible so the user can switch before
              or after a run. Switching mid-run is allowed; the next run
              uses the new mode. Existing output for the OTHER mode stays
              in node.data until overwritten (cheap rollback). */}
          {hasInput && !readOnly && (
            <div className="co-extract-mode-toggle nodrag">
              <button
                type="button"
                className={cn(
                  "co-extract-mode-btn",
                  mode === "talking_points" && "active",
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  void setMode("talking_points");
                }}
                onMouseDown={(e) => e.stopPropagation()}
                title="Извлечь молекулярные тезисы"
              >
                Тезисы
              </button>
              <button
                type="button"
                className={cn(
                  "co-extract-mode-btn",
                  mode === "summary" && "active",
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  void setMode("summary");
                }}
                onMouseDown={(e) => e.stopPropagation()}
                title="Сжать в саммари + key points"
              >
                Саммари
              </button>
              <button
                type="button"
                className={cn(
                  "co-extract-mode-btn",
                  mode === "story_arc" && "active",
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  void setMode("story_arc");
                }}
                onMouseDown={(e) => e.stopPropagation()}
                title="Развернуть тему в серию постов (TOFU→MOFU→BOFU)"
              >
                Арка
              </button>
            </div>
          )}

          {/* story_arc mode owns its own run button (inside the config form);
              other modes show the generic Play button when idle + empty. */}
          {hasInput &&
            mode !== "story_arc" &&
            status === "idle" &&
            points.length === 0 &&
            !summary && (
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
                {mode === "summary"
                  ? "Собрать саммари"
                  : t.extract.runButton}
              </button>
            )}

          {/* story_arc: config form before first run + scene list after */}
          {hasInput && mode === "story_arc" && scenes.length === 0 && (
            <ArcConfigForm
              initial={arcConfig}
              running={status === "running" || running}
              disabled={!!readOnly}
              onRun={async (cfg) => {
                await updateNodeData(node.id, { arc_config: cfg });
                runNode(node.id);
              }}
            />
          )}

          {hasInput && (status === "running" || running) && (
            <>
              <div className="co-spin-row">
                <div className="co-spinner" />
                <span>{t.extract.runningStatus}</span>
              </div>
              <div className="co-skeleton">
                <div className="co-skeleton-card" />
                <div
                  className="co-skeleton-card"
                  style={{ height: 60, opacity: 0.7 }}
                />
                <div
                  className="co-skeleton-card"
                  style={{ height: 50, opacity: 0.45 }}
                />
              </div>
            </>
          )}

          {status === "error" && (
            <div
              className="co-placeholder-empty"
              style={{
                borderColor: "rgba(239,68,68,0.3)",
                color: "var(--p-red, #DC2626)",
              }}
            >
              <AlertCircle size={13} />
              <span>{t.extract.error}</span>
            </div>
          )}

          {status === "done" && mode === "summary" && summary && (
            <SummaryCard
              summary={summary}
              keyPoints={keyPoints}
              takeaways={takeaways}
              contextLine={extract.context_line}
              onSpawn={(platform) =>
                // Summary-mode spawn: use index 0 as a stable sentinel —
                // backend ignores it and reads `parent.data.summary` directly.
                spawnFormatFromTezis(node.id, 0, platform)
              }
              readOnly={!!readOnly}
            />
          )}

          {mode === "story_arc" && scenes.length > 0 && (
            <StoryArcView
              arc={arc}
              scenes={scenes}
              onSpawnScene={(sceneIdx, platform) =>
                spawnFormatFromTezis(node.id, sceneIdx, platform)
              }
              onResetArc={async () => {
                if (readOnly) return;
                if (!confirm("Удалить текущую арку и начать заново?")) return;
                await updateNodeData(node.id, {
                  scenes: [],
                  arc: undefined,
                });
              }}
              readOnly={!!readOnly}
            />
          )}

          {status === "done" && mode === "talking_points" && points.length > 0 && (
            <>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                {t.extract.foundCount(points.length)}
              </div>
              <div className="flex flex-col gap-1.5">
                {points.map((tp, i) => (
                  <TalkingPointCard
                    key={i}
                    index={i + 1}
                    score={tp.viral_score}
                    category={tp.category}
                    text={tp.text}
                    selected={selectedIdx === i}
                    onClick={() => void selectPoint(i)}
                    onEditText={(next) => updateTalkingPointText(i, next)}
                    onSpawn={(platform) =>
                      spawnFormatFromTezis(node.id, i, platform)
                    }
                    readOnly={!!readOnly}
                  />
                ))}
              </div>

              {!readOnly && (
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  {/* Действие на уровне ноды, а не карточки: рецензия читает
                      весь материал, поэтому связь создаётся без tezis_index.
                      Через «Создать пост» на карточке так не сделать — там
                      индекс проставляется всегда. */}
                  <button
                    type="button"
                    className="co-btn co-btn-ghost nodrag"
                    title="Один разбор на весь материал: оценка, главное, тезисы по темам"
                    onClick={(e) => {
                      e.stopPropagation();
                      void spawnReviewFromExtract(node.id);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    disabled={running || tweakMutation.isPending}
                  >
                    <BookOpen size={11} />
                    Рецензия на материал
                  </button>
                  <button
                    type="button"
                    className="co-btn co-btn-ghost nodrag"
                    onClick={(e) => {
                      e.stopPropagation();
                      tweakMutation.mutate({ mode: "reextract" });
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    disabled={running || tweakMutation.isPending}
                  >
                    {tweakMutation.isPending &&
                    tweakMutation.variables?.mode === "reextract" ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : (
                      <RefreshCw size={11} />
                    )}
                    {t.extract.actions.reextract}
                  </button>
                  <button
                    type="button"
                    className="co-btn co-btn-ghost nodrag"
                    onClick={(e) => {
                      e.stopPropagation();
                      tweakMutation.mutate({ mode: "amplify" });
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    disabled={running || tweakMutation.isPending}
                  >
                    {tweakMutation.isPending &&
                    tweakMutation.variables?.mode === "amplify" ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : (
                      <Zap size={11} />
                    )}
                    {t.extract.actions.amplify}
                  </button>
                  <button
                    type="button"
                    className="co-btn co-btn-ghost nodrag"
                    onClick={(e) => {
                      e.stopPropagation();
                      tweakMutation.mutate({ mode: "rephrase" });
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    disabled={running || tweakMutation.isPending}
                  >
                    {tweakMutation.isPending &&
                    tweakMutation.variables?.mode === "rephrase" ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : (
                      <PenLine size={11} />
                    )}
                    {t.extract.actions.rephrase}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TalkingPointCard({
  index,
  score,
  category,
  text,
  selected,
  onClick,
  onEditText,
  onSpawn,
  readOnly,
}: {
  index: number;
  score: number;
  category: string;
  text: string;
  selected: boolean;
  onClick: () => void;
  onEditText: (next: string) => Promise<void>;
  onSpawn: (platform: FormatPlatform) => Promise<void>;
  readOnly: boolean;
}) {
  const cls =
    score >= 17 ? "co-score-high" : score >= 13 ? "co-score-mid" : "co-score-low";
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [spawning, setSpawning] = React.useState<FormatPlatform | null>(null);

  // Close picker on outside click / Escape
  const cardRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (!pickerOpen) return;
    const onDocPointer = (e: PointerEvent) => {
      if (!cardRef.current) return;
      if (cardRef.current.contains(e.target as Node)) return;
      setPickerOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPickerOpen(false);
    };
    document.addEventListener("pointerdown", onDocPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDocPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [pickerOpen]);

  const handlePick = async (p: FormatPlatform) => {
    setSpawning(p);
    try {
      await onSpawn(p);
      setPickerOpen(false);
    } finally {
      setSpawning(null);
    }
  };

  // Card wraps a clickable surface for selecting + an editable text region.
  // Using a <div role="button"> instead of <button> so the inner textarea/
  // pencil icon don't trip the "no nested button" rule.
  return (
    <div
      ref={cardRef}
      role="button"
      tabIndex={0}
      className={cn(
        "co-tp-card nodrag relative",
        selected && "selected",
      )}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest(".co-editable-readwrap")) return;
        if ((e.target as HTMLElement).closest("textarea, input")) return;
        if ((e.target as HTMLElement).closest("[data-spawn-button]")) return;
        if ((e.target as HTMLElement).closest("[data-spawn-popover]")) return;
        e.stopPropagation();
        if (!readOnly) onClick();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          if ((e.target as HTMLElement).closest("textarea, input")) return;
          e.preventDefault();
          if (!readOnly) onClick();
        }
      }}
      onMouseDown={(e) => e.stopPropagation()}
      aria-pressed={selected}
      aria-disabled={readOnly}
    >
      <div className="co-tp-head">
        <span className="text-[10px] font-semibold tabular-nums text-[color:var(--text-muted)]">
          {index}.
        </span>
        <span className={cn("co-score-badge", cls)}>{score}</span>
        <span className="co-tp-category">{category}</span>
      </div>
      <EditableText
        value={text}
        onSave={onEditText}
        multiline
        rows={3}
        disabled={readOnly}
        className="co-tp-text block w-full"
        ariaLabel="Текст тезиса"
      />
      <div className="co-tp-use-row" style={{ alignItems: "center" }}>
        <span>{selected ? t.extract.used : ""}</span>
        {!readOnly && (
          <button
            type="button"
            data-spawn-button
            className={cn("co-tp-spawn-btn nodrag", pickerOpen && "active")}
            onClick={(e) => {
              e.stopPropagation();
              setPickerOpen((v) => !v);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            title="Создать пост из этого тезиса"
            aria-expanded={pickerOpen}
          >
            <Plus size={11} />
            <span>Создать пост</span>
          </button>
        )}
        <ArrowRight size={11} style={{ marginLeft: "auto" }} />
      </div>

      {pickerOpen && !readOnly && (
        <div
          data-spawn-popover
          className="co-tp-spawn-popover nodrag"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="co-tp-spawn-popover-title">
            Куда отправить тезис?
          </div>
          <div className="co-tp-spawn-grid">
            {SPAWN_PLATFORMS.map(({ k, label, Icon }) => {
              const busy = spawning === k;
              return (
                <button
                  key={k}
                  type="button"
                  className="co-tp-spawn-platform"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handlePick(k);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  disabled={spawning !== null}
                  title={label}
                >
                  {busy ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Icon size={13} />
                  )}
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  summary,
  keyPoints,
  takeaways,
  contextLine,
  onSpawn,
  readOnly,
}: {
  summary: string;
  keyPoints: string[];
  takeaways: string[];
  contextLine?: string;
  onSpawn: (platform: FormatPlatform) => Promise<void>;
  readOnly: boolean;
}) {
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [spawning, setSpawning] = React.useState<FormatPlatform | null>(null);
  const cardRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!pickerOpen) return;
    const onDocPointer = (e: PointerEvent) => {
      if (!cardRef.current) return;
      if (cardRef.current.contains(e.target as Node)) return;
      setPickerOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPickerOpen(false);
    };
    document.addEventListener("pointerdown", onDocPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDocPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [pickerOpen]);

  const handlePick = async (p: FormatPlatform) => {
    setSpawning(p);
    try {
      await onSpawn(p);
      setPickerOpen(false);
    } finally {
      setSpawning(null);
    }
  };

  return (
    <div ref={cardRef} className="co-tp-card nodrag relative">
      {contextLine && (
        <div className="text-[10.5px] uppercase tracking-wider text-[color:var(--text-muted)] font-semibold">
          {contextLine}
        </div>
      )}
      <div className="co-tp-text whitespace-pre-wrap">{summary}</div>

      {keyPoints.length > 0 && (
        <div className="mt-1">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold">
            Ключевые мысли
          </div>
          <ul className="flex flex-col gap-1 text-[11.5px] leading-snug text-foreground/80">
            {keyPoints.map((kp, i) => (
              <li key={i} className="flex gap-1.5">
                <span className="text-muted-foreground tabular-nums">{i + 1}.</span>
                <span>{kp}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {takeaways.length > 0 && (
        <div className="mt-1">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold">
            Что делать
          </div>
          <ul className="flex flex-col gap-1 text-[11.5px] leading-snug text-foreground/80">
            {takeaways.map((tk, i) => (
              <li key={i} className="flex gap-1.5">
                <span className="text-success">→</span>
                <span>{tk}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!readOnly && (
        <div className="co-tp-use-row" style={{ alignItems: "center" }}>
          <button
            type="button"
            data-spawn-button
            className={cn("co-tp-spawn-btn nodrag", pickerOpen && "active")}
            onClick={(e) => {
              e.stopPropagation();
              setPickerOpen((v) => !v);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            title="Создать пост из саммари"
            aria-expanded={pickerOpen}
          >
            <Sparkles size={11} />
            <span>Создать пост</span>
          </button>
        </div>
      )}

      {pickerOpen && !readOnly && (
        <div
          data-spawn-popover
          className="co-tp-spawn-popover nodrag"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="co-tp-spawn-popover-title">
            Куда отправить саммари?
          </div>
          <div className="co-tp-spawn-grid">
            {SPAWN_PLATFORMS.map(({ k, label, Icon }) => {
              const busy = spawning === k;
              return (
                <button
                  key={k}
                  type="button"
                  className="co-tp-spawn-platform"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handlePick(k);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  disabled={spawning !== null}
                  title={label}
                >
                  {busy ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Icon size={13} />
                  )}
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ====================================================================
// Story Arc UI
// ====================================================================
//
// Two stages, controlled by whether the node has rendered scenes yet:
//   1. ArcConfigForm — pre-run form for big_topic / goal / lead-magnet /
//      platforms mode. On submit, writes config into node.data.arc_config
//      and triggers run.
//   2. StoryArcView — post-run render of the arc summary + scene cards.
//      Each scene has a stage badge, platform pill, hook preview, and
//      a "+ Развернуть" button that spawns a format node downstream.

function ArcConfigForm({
  initial,
  running,
  disabled,
  onRun,
}: {
  initial: ArcConfig | undefined;
  running: boolean;
  disabled: boolean;
  onRun: (cfg: ArcConfig) => Promise<void>;
}) {
  const [topic, setTopic] = React.useState(initial?.big_topic ?? "");
  const [goal, setGoal] = React.useState(initial?.goal ?? "");
  const [leadMagnet, setLeadMagnet] = React.useState(
    initial?.lead_magnet ?? "",
  );
  const [magnetKind, setMagnetKind] = React.useState<ArcLeadMagnetKind>(
    initial?.lead_magnet_kind ?? "external_url",
  );
  const [magnetUrl, setMagnetUrl] = React.useState(
    initial?.lead_magnet_url ?? "",
  );
  const [totalPosts, setTotalPosts] = React.useState<string>(
    initial?.total_posts_target ? String(initial.total_posts_target) : "",
  );
  const [platformsMode, setPlatformsMode] = React.useState<"ai" | "fixed">(
    initial?.platforms_mode ?? "ai",
  );

  const valid = topic.trim().length > 0 && leadMagnet.trim().length > 0;

  const submit = async () => {
    if (!valid || running || disabled) return;
    const cfg: ArcConfig = {
      big_topic: topic.trim(),
      goal: goal.trim() || undefined,
      lead_magnet: leadMagnet.trim(),
      lead_magnet_kind: magnetKind,
      lead_magnet_url:
        magnetKind === "external_url" ? magnetUrl.trim() || null : null,
      platforms_mode: platformsMode,
      total_posts_target: totalPosts.trim()
        ? Math.max(3, Math.min(20, Number(totalPosts) || 10))
        : null,
    };
    await onRun(cfg);
  };

  return (
    <div className="co-arc-config nodrag" onMouseDown={(e) => e.stopPropagation()}>
      <div className="co-arc-config-field">
        <label className="co-arc-config-label">Большая тема</label>
        <textarea
          className="co-arc-config-textarea"
          placeholder="например: Кастдев"
          rows={2}
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          disabled={disabled || running}
        />
      </div>

      <div className="co-arc-config-field">
        <label className="co-arc-config-label">Цель кампании (опц.)</label>
        <textarea
          className="co-arc-config-textarea"
          placeholder="что должно произойти после серии"
          rows={2}
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          disabled={disabled || running}
        />
      </div>

      <div className="co-arc-config-field">
        <label className="co-arc-config-label">Лид-магнит</label>
        <div className="co-arc-config-magnet-toggle">
          <button
            type="button"
            className={cn(
              "co-arc-config-segment",
              magnetKind === "external_url" && "active",
            )}
            onClick={() => setMagnetKind("external_url")}
            disabled={disabled || running}
          >
            URL
          </button>
          <button
            type="button"
            className={cn(
              "co-arc-config-segment",
              magnetKind === "internal_article" && "active",
            )}
            onClick={() => setMagnetKind("internal_article")}
            disabled={disabled || running}
          >
            Внутренний article-узел
          </button>
        </div>
        <textarea
          className="co-arc-config-textarea"
          placeholder={
            magnetKind === "external_url"
              ? "Короткое описание (например: «Курс «Кастдев за 3 дня»»)"
              : "Что будет внутри лонгрида (нода article появится на холсте отдельно)"
          }
          rows={2}
          value={leadMagnet}
          onChange={(e) => setLeadMagnet(e.target.value)}
          disabled={disabled || running}
        />
        {magnetKind === "external_url" && (
          <input
            type="url"
            className="co-arc-config-input mt-1"
            placeholder="https://… (опц., вставится в финальный CTA)"
            value={magnetUrl}
            onChange={(e) => setMagnetUrl(e.target.value)}
            disabled={disabled || running}
          />
        )}
      </div>

      <div className="co-arc-config-row">
        <div className="co-arc-config-field flex-1">
          <label className="co-arc-config-label">Кол-во постов</label>
          <input
            type="number"
            min={3}
            max={20}
            className="co-arc-config-input"
            placeholder="AI решает"
            value={totalPosts}
            onChange={(e) => setTotalPosts(e.target.value)}
            disabled={disabled || running}
          />
        </div>
        <div className="co-arc-config-field flex-1">
          <label className="co-arc-config-label">Платформы</label>
          <select
            className="co-arc-config-input"
            value={platformsMode}
            onChange={(e) =>
              setPlatformsMode(e.target.value as "ai" | "fixed")
            }
            disabled={disabled || running}
          >
            <option value="ai">AI решает</option>
            <option value="fixed">Фиксированный mix (TODO)</option>
          </select>
        </div>
      </div>

      <button
        type="button"
        className="co-btn co-btn-primary nodrag mt-2"
        onClick={submit}
        onMouseDown={(e) => e.stopPropagation()}
        disabled={!valid || running || disabled}
      >
        {running ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <Play size={14} />
        )}
        {running ? "AI собирает арку…" : "Собрать арку"}
      </button>
    </div>
  );
}

const STAGE_LABEL: Record<ArcStage, string> = {
  TOFU: "ПРОГРЕВ",
  MOFU: "УГЛУБЛЕНИЕ",
  BOFU: "ПРОДАЖА",
};

function StoryArcView({
  arc,
  scenes,
  onSpawnScene,
  onResetArc,
  readOnly,
}: {
  arc: ExtractNodeData["arc"];
  scenes: ArcScene[];
  onSpawnScene: (sceneIdx: number, platform: FormatPlatform) => Promise<void>;
  onResetArc: () => Promise<void>;
  readOnly: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {arc && (
        <div className="co-arc-summary">
          <div className="co-arc-summary-title">{arc.title}</div>
          {arc.narrative_summary && (
            <div className="co-arc-summary-narrative">
              {arc.narrative_summary}
            </div>
          )}
          <div className="co-arc-summary-meta">
            <span>{arc.total_posts ?? scenes.length} постов</span>
            {arc.stages_breakdown && (
              <>
                {arc.stages_breakdown.TOFU != null && (
                  <span>· {arc.stages_breakdown.TOFU} TOFU</span>
                )}
                {arc.stages_breakdown.MOFU != null && (
                  <span>· {arc.stages_breakdown.MOFU} MOFU</span>
                )}
                {arc.stages_breakdown.BOFU != null && (
                  <span>· {arc.stages_breakdown.BOFU} BOFU</span>
                )}
              </>
            )}
            {!readOnly && (
              <button
                type="button"
                className="co-arc-reset-btn nodrag ml-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  void onResetArc();
                }}
                onMouseDown={(e) => e.stopPropagation()}
                title="Удалить арку и начать заново"
              >
                <RefreshCw size={11} />
                Сбросить
              </button>
            )}
          </div>
        </div>
      )}

      {scenes.map((scene, idx) => (
        <SceneCard
          key={`${scene.order}-${idx}`}
          scene={scene}
          onSpawn={(platform) => onSpawnScene(idx, platform)}
          readOnly={readOnly}
        />
      ))}
    </div>
  );
}

function SceneCard({
  scene,
  onSpawn,
  readOnly,
}: {
  scene: ArcScene;
  onSpawn: (platform: FormatPlatform) => Promise<void>;
  readOnly: boolean;
}) {
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [spawning, setSpawning] = React.useState<FormatPlatform | null>(null);
  const cardRef = React.useRef<HTMLDivElement | null>(null);
  const alreadySpawned = !!scene.spawned_node_id;

  React.useEffect(() => {
    if (!pickerOpen) return;
    const onDocPointer = (e: PointerEvent) => {
      if (!cardRef.current) return;
      if (cardRef.current.contains(e.target as Node)) return;
      setPickerOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPickerOpen(false);
    };
    document.addEventListener("pointerdown", onDocPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDocPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [pickerOpen]);

  const handlePick = async (p: FormatPlatform) => {
    setSpawning(p);
    try {
      await onSpawn(p);
      setPickerOpen(false);
    } finally {
      setSpawning(null);
    }
  };

  const stageBadgeColor =
    scene.stage === "TOFU"
      ? "co-stage-tofu"
      : scene.stage === "MOFU"
        ? "co-stage-mofu"
        : "co-stage-bofu";

  return (
    <div
      ref={cardRef}
      className={cn(
        "co-arc-scene-card nodrag relative",
        alreadySpawned && "spawned",
      )}
    >
      <div className="co-arc-scene-head">
        <span className="text-[10px] font-semibold tabular-nums text-[color:var(--text-muted)]">
          {scene.order}.
        </span>
        <span className={cn("co-arc-stage-badge", stageBadgeColor)}>
          {STAGE_LABEL[scene.stage]}
        </span>
        <span className="co-arc-platform-pill">{scene.platform}</span>
        {scene.is_final && (
          <span className="text-[9px] uppercase tracking-wider text-warn font-bold">
            ФИНАЛ
          </span>
        )}
      </div>
      <div className="co-arc-scene-hook">{scene.hook}</div>
      <div className="co-arc-scene-tp">{scene.talking_point}</div>

      {!readOnly && (
        <div className="co-tp-use-row" style={{ alignItems: "center" }}>
          <button
            type="button"
            data-spawn-button
            className={cn("co-tp-spawn-btn nodrag", pickerOpen && "active")}
            onClick={(e) => {
              e.stopPropagation();
              setPickerOpen((v) => !v);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            title="Развернуть в format-ноду"
            aria-expanded={pickerOpen}
          >
            <Plus size={11} />
            <span>Развернуть</span>
          </button>
        </div>
      )}

      {pickerOpen && !readOnly && (
        <div
          data-spawn-popover
          className="co-tp-spawn-popover nodrag"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="co-tp-spawn-popover-title">Платформа</div>
          <div className="co-tp-spawn-grid">
            {SPAWN_PLATFORMS.map(({ k, label, Icon }) => {
              const busy = spawning === k;
              const preferred = scene.platform === k;
              return (
                <button
                  key={k}
                  type="button"
                  className={cn(
                    "co-tp-spawn-platform",
                    preferred && "preferred",
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    void handlePick(k);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  disabled={spawning !== null}
                  title={
                    preferred
                      ? `${label} (AI предложил эту платформу)`
                      : label
                  }
                >
                  {busy ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Icon size={13} />
                  )}
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const PORT_STYLE_RIGHT: React.CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: 999,
  background: "var(--port-bg)",
  border: "1px solid rgba(0, 0, 0, 0.06)",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.4)",
  right: -13,
  color: "rgb(var(--ink-rgb) / 0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 3,
};

const PORT_STYLE_LEFT: React.CSSProperties = {
  ...PORT_STYLE_RIGHT,
  right: undefined,
  left: -13,
};
