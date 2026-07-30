"use client";

/**
 * CanvasFormatDrawer — full-screen-side drawer for reading and editing a
 * format node's output without squeezing into the canvas-node viewport.
 *
 * Why this exists: format nodes on the canvas are 380px wide with a fixed
 * ~600px height — long Telegram/LinkedIn/Article posts get clipped or hide
 * inside a tiny scroll, making them unreadable and painful to edit. The
 * founder asked for "развернуть → видеть весь пост, удобно править".
 *
 * Approach: read node.data.full_text + body/hook/cta/etc directly from the
 * canvas context, render in a wider 720px drawer with tall textareas, expose
 * the same Tweaks actions (regenerate/shorten/amplify_voice/rehook/
 * platform_optimize), copy to clipboard, and the schedule + publish CTAs
 * already used by FormatNode.
 *
 * Out of scope (V2): per-platform structured editing for carousel slides,
 * reels beats, hooks bank, article sections — for those, the drawer falls
 * back to a unified `full_text` editor (still better than a 6-row textarea
 * in a 380px node). Per-section editing inside the drawer is a follow-up.
 */

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import {
  CalendarPlus,
  Copy,
  Eye,
  Loader2,
  Mic,
  Pencil,
  RefreshCcw,
  RefreshCw,
  Send,
  SpellCheck,
  Wand2,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { tweakNode, type FormatTweakMode } from "@/lib/tweaks";
import type { FormatNodeData, FormatPlatform, NodeOut, PostPlatform } from "@/lib/types";
import { useCanvasNodeContext } from "@/components/canvas/canvasContext";
import { PublishDialog } from "@/components/canvas/PublishDialog";
import { SchedulePickerDialog } from "@/components/plan/SchedulePickerDialog";
import { TelegramPreview } from "@/components/canvas/TelegramPreview";
import {
  setScheduledBadge,
  useScheduledBadge,
} from "@/components/plan/scheduledBadgeStore";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

const PLATFORM_LABEL: Record<FormatPlatform, string> = {
  review: "Рецензия",
  telegram: "Telegram",
  linkedin: "LinkedIn",
  twitter: "X / Twitter",
  instagram: "Instagram",
  carousel: "Carousel",
  reels: "Reels",
  hooks: "Хуки",
  article: "Статья",
};

interface CanvasFormatDrawerProps {
  node: NodeOut | null;
  open: boolean;
  onClose: () => void;
}

export function CanvasFormatDrawer({
  node,
  open,
  onClose,
}: CanvasFormatDrawerProps) {
  if (!open || !node) return null;
  return <DrawerInner node={node} onClose={onClose} />;
}

function DrawerInner({
  node,
  onClose,
}: {
  node: NodeOut;
  onClose: () => void;
}) {
  const { updateNodeData, runNode, isRunning, attachSkillRun, readOnly } =
    useCanvasNodeContext();

  const data = (node.data ?? {}) as FormatNodeData;
  const platform: FormatPlatform = data.platform ?? "telegram";
  const running = isRunning(node.id);
  const scheduledDate = useScheduledBadge(node.id);

  const [fullText, setFullText] = React.useState(data.full_text ?? "");
  const [hookDraft, setHookDraft] = React.useState<string>(
    Array.isArray(data.hooks) && data.hooks.length > 0
      ? data.hooks[data.selected_hook_index ?? 0] ?? ""
      : data.hook ?? "",
  );
  const [bodyDraft, setBodyDraft] = React.useState(data.body ?? "");
  const [ctaDraft, setCtaDraft] = React.useState(data.cta ?? "");
  const [publishOpen, setPublishOpen] = React.useState(false);
  const [scheduleOpen, setScheduleOpen] = React.useState(false);

  // Pull-from-server when the node prop changes (e.g. AI regen lands).
  React.useEffect(() => {
    setFullText(data.full_text ?? "");
    setBodyDraft(data.body ?? "");
    setCtaDraft(data.cta ?? "");
    setHookDraft(
      Array.isArray(data.hooks) && data.hooks.length > 0
        ? data.hooks[data.selected_hook_index ?? 0] ?? ""
        : data.hook ?? "",
    );
  }, [
    data.full_text,
    data.body,
    data.cta,
    data.hook,
    data.hooks,
    data.selected_hook_index,
  ]);

  // Esc to close
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

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

  const handleTweak = (mode: FormatTweakMode) => {
    tweakMutation.mutate({ mode });
  };

  const onCopy = async () => {
    if (!fullText) return;
    try {
      await navigator.clipboard.writeText(fullText);
      toast.success(t.format.copySuccess);
    } catch {
      toast.error(t.format.copyError);
    }
  };

  const persistFullText = async () => {
    if (fullText === (data.full_text ?? "")) return;
    try {
      await updateNodeData(node.id, { full_text: fullText });
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.detail : "Не удалось сохранить",
      );
    }
  };

  const persistBody = async () => {
    if (bodyDraft === (data.body ?? "")) return;
    const newFull =
      (hookDraft || "") + "\n\n" + bodyDraft + "\n\n" + (ctaDraft || "");
    setFullText(newFull);
    try {
      await updateNodeData(node.id, {
        body: bodyDraft,
        full_text: newFull,
      });
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.detail : "Не удалось сохранить",
      );
    }
  };

  const persistCta = async () => {
    if (ctaDraft === (data.cta ?? "")) return;
    const newFull =
      (hookDraft || "") + "\n\n" + (bodyDraft || "") + "\n\n" + ctaDraft;
    setFullText(newFull);
    try {
      await updateNodeData(node.id, {
        cta: ctaDraft,
        full_text: newFull,
      });
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.detail : "Не удалось сохранить",
      );
    }
  };

  return (
    <>
      <div
        className="co-plan-drawer-overlay"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className="co-plan-drawer co-canvas-format-drawer"
        role="dialog"
        aria-modal
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="co-plan-drawer-head">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="co-plan-platform-tag">
              {PLATFORM_LABEL[platform]}
            </span>
            <span className="text-[12px] text-[color:var(--text-secondary)]">
              {data.talking_point_text
                ? `Из тезиса: ${truncate(data.talking_point_text, 80)}`
                : "Тезис не выбран"}
            </span>
            {scheduledDate && (
              <span
                className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold"
                style={{
                  borderColor: "rgba(124, 92, 252, 0.45)",
                  background: "rgba(124, 92, 252, 0.12)",
                  color: "var(--p-violet)",
                }}
              >
                <CalendarPlus size={11} />
                {scheduledDate}
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="ml-auto rounded-md p-1 text-[color:var(--text-muted)] hover:bg-foreground/5 hover:text-foreground"
              aria-label={t.common.close}
            >
              <X size={16} />
            </button>
          </div>
        </header>

        <div className="co-plan-drawer-body">
          {/* Hook (if hooks list exists, list them as radios) */}
          {Array.isArray(data.hooks) && data.hooks.length > 0 && (
            <section>
              <div className="co-plan-drawer-section-h">
                {t.format.hookHeader}
              </div>
              <div className="flex flex-col gap-1.5">
                {data.hooks.map((h, i) => (
                  <label
                    key={i}
                    className={cn(
                      "co-canvas-drawer-hook-row",
                      (data.selected_hook_index ?? 0) === i && "active",
                    )}
                  >
                    <input
                      type="radio"
                      name={`hook-${node.id}`}
                      checked={(data.selected_hook_index ?? 0) === i}
                      disabled={readOnly}
                      onChange={async () => {
                        const newFull =
                          h +
                          "\n\n" +
                          (bodyDraft || "") +
                          "\n\n" +
                          (ctaDraft || "");
                        setHookDraft(h);
                        setFullText(newFull);
                        try {
                          await updateNodeData(node.id, {
                            selected_hook_index: i,
                            full_text: newFull,
                          });
                        } catch {
                          /* updateNodeData toasts on error */
                        }
                      }}
                    />
                    <span>{h}</span>
                  </label>
                ))}
              </div>
            </section>
          )}

          {/* Body editor — large area, primary read+edit surface */}
          <section>
            <div className="co-plan-drawer-section-h">
              {t.format.bodyLabel}
            </div>
            <textarea
              className="co-plan-drawer-textarea"
              rows={16}
              value={bodyDraft}
              onChange={(e) => setBodyDraft(e.target.value)}
              onBlur={persistBody}
              disabled={readOnly}
              placeholder="Тело поста"
            />
          </section>

          {/* CTA */}
          <section>
            <div className="co-plan-drawer-section-h">
              {t.format.ctaLabel}
            </div>
            <textarea
              className="co-plan-drawer-textarea"
              rows={2}
              value={ctaDraft}
              onChange={(e) => setCtaDraft(e.target.value)}
              onBlur={persistCta}
              disabled={readOnly}
              placeholder="CTA"
            />
          </section>

          {/* Full text — assembled output, source of truth for copy/publish.
              For Telegram we offer a Preview/Edit toggle: most authors want
              the visual render so they don't have to mentally apply the
              <b>/<i>/<tg-spoiler> tags. Edit mode keeps the raw HTML
              textarea for power tweaks (and other platforms that publish
              plain text — LinkedIn, Twitter, Instagram). */}
          <FullTextSection
            fullText={fullText}
            setFullText={setFullText}
            onBlur={persistFullText}
            readOnly={readOnly}
            isTelegram={platform === "telegram"}
          />
        </div>

        {/* Footer actions */}
        {!readOnly && (
          <div className="co-canvas-drawer-actions">
            <div className="flex flex-wrap gap-2">
              <DrawerActionBtn
                Icon={Copy}
                label={t.format.actions.copy}
                onClick={() => void onCopy()}
                primary
                disabled={!fullText}
              />
              <DrawerActionBtn
                Icon={RefreshCw}
                label={t.format.actions.regenerate}
                onClick={() => handleTweak("regenerate")}
                busy={
                  tweakMutation.isPending &&
                  tweakMutation.variables?.mode === "regenerate"
                }
                disabled={running || tweakMutation.isPending}
              />
              <DrawerActionBtn
                Icon={RefreshCcw}
                label={t.format.actions.rehook}
                onClick={() => handleTweak("rehook")}
                busy={
                  tweakMutation.isPending &&
                  tweakMutation.variables?.mode === "rehook"
                }
                disabled={running || tweakMutation.isPending}
              />
              <DrawerActionBtn
                Icon={Zap}
                label={t.format.actions.shorten}
                onClick={() => handleTweak("shorten")}
                busy={
                  tweakMutation.isPending &&
                  tweakMutation.variables?.mode === "shorten"
                }
                disabled={running || tweakMutation.isPending}
              />
              <DrawerActionBtn
                Icon={Mic}
                label={t.format.actions.amplifyVoice}
                onClick={() => handleTweak("amplify_voice")}
                busy={
                  tweakMutation.isPending &&
                  tweakMutation.variables?.mode === "amplify_voice"
                }
                disabled={running || tweakMutation.isPending}
              />
              <DrawerActionBtn
                Icon={SpellCheck}
                label={t.format.actions.editText}
                onClick={() => handleTweak("edit")}
                busy={
                  tweakMutation.isPending &&
                  tweakMutation.variables?.mode === "edit"
                }
                disabled={running || tweakMutation.isPending}
              />
              <DrawerActionBtn
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
            <div className="flex flex-wrap gap-2">
              {fullText && (
                <button
                  type="button"
                  className="co-btn co-btn-ghost"
                  onClick={() => setScheduleOpen(true)}
                >
                  <CalendarPlus size={13} /> {t.plan.schedule.title}
                </button>
              )}
              {platform === "telegram" && fullText && (
                <button
                  type="button"
                  className="co-btn co-btn-primary"
                  onClick={() => setPublishOpen(true)}
                >
                  <Send size={13} /> {t.publish.title}
                </button>
              )}
              {!fullText && (
                <button
                  type="button"
                  className="co-btn co-btn-primary"
                  onClick={() => runNode(node.id)}
                  disabled={running}
                >
                  {running ? <Loader2 size={13} className="animate-spin" /> : null}
                  Сгенерировать
                </button>
              )}
            </div>
          </div>
        )}
      </aside>

      {!readOnly && fullText && platform === "telegram" && (
        <PublishDialog
          nodeId={node.id}
          open={publishOpen}
          onOpenChange={setPublishOpen}
        />
      )}

      {!readOnly && fullText && (
        <SchedulePickerDialog
          open={scheduleOpen}
          onOpenChange={setScheduleOpen}
          nodeId={node.id}
          platform={platform as PostPlatform}
          hook={hookDraft || null}
          onScheduled={(post) => {
            if (post.scheduled_date) {
              setScheduledBadge(node.id, post.scheduled_date);
            }
          }}
        />
      )}
    </>
  );
}

function DrawerActionBtn({
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
      className={cn("co-btn", primary ? "co-btn-primary" : "co-btn-ghost")}
      onClick={onClick}
      disabled={disabled}
    >
      {busy ? <Loader2 size={12} className="animate-spin" /> : <Icon size={12} />}
      {label}
    </button>
  );
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "…";
}


function FullTextSection({
  fullText,
  setFullText,
  onBlur,
  readOnly,
  isTelegram,
}: {
  fullText: string;
  setFullText: (v: string) => void;
  onBlur: () => void;
  readOnly?: boolean;
  isTelegram: boolean;
}) {
  // Preview is the default once there's any content. Empty draft → editor,
  // because writing into a "preview" of nothing is confusing.
  const [mode, setMode] = React.useState<"preview" | "edit">(() =>
    isTelegram && fullText.trim() ? "preview" : "edit",
  );
  // If the user switches platform (not via this drawer in practice, but
  // belt-and-braces) we reset to the sensible default.
  React.useEffect(() => {
    if (!isTelegram && mode === "preview") setMode("edit");
  }, [isTelegram, mode]);

  return (
    <section>
      <div className="flex items-center justify-between">
        <div className="co-plan-drawer-section-h">Готовый пост</div>
        {isTelegram && (
          <div className="inline-flex items-center gap-0.5 rounded-md border border-border bg-foreground/[0.03] p-0.5 text-[11px]">
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1 rounded px-1.5 py-0.5 transition",
                mode === "preview"
                  ? "bg-foreground/10 text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setMode("preview")}
              title="Превью как в Telegram"
            >
              <Eye size={11} />
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
              onClick={() => setMode("edit")}
              title="Редактировать сырой HTML"
            >
              <Pencil size={11} />
              Редактировать
            </button>
          </div>
        )}
      </div>
      {isTelegram && mode === "preview" ? (
        <div className="rounded-md border border-border/80 bg-foreground/[0.02] p-4">
          {fullText.trim() ? (
            <TelegramPreview text={fullText} />
          ) : (
            <div className="text-[12.5px] text-muted-foreground">
              Пост пуст. Переключись на «Редактировать», чтобы добавить
              текст, или запусти ноду заново.
            </div>
          )}
        </div>
      ) : (
        <textarea
          className="co-plan-drawer-textarea"
          rows={20}
          value={fullText}
          onChange={(e) => setFullText(e.target.value)}
          onBlur={onBlur}
          disabled={readOnly}
          placeholder="Здесь будет полный собранный пост"
        />
      )}
      <div className="text-[10.5px] text-[color:var(--text-muted)] mt-1">
        {fullText.length} символов
      </div>
    </section>
  );
}
