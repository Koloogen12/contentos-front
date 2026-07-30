"use client";

/**
 * Rendered carousel slide strip + lightbox + download-archive.
 *
 * Extracted from FormatNode so the canvas-node component stays focused
 * on the format-text editor; this surface owns ALL post-render UX:
 *
 *   - Horizontal scrollable thumbnail strip (96×120 each)
 *   - Wheel-to-horizontal + chevron buttons (◄ ►) for discoverability
 *   - Click thumbnail → in-canvas Lightbox modal
 *     · keyboard nav (← / → / Esc)
 *     · slide counter "N / total"
 *     · "Скачать слайд" → single JPEG
 *     · "Скачать архив" → ZIP of all slides + README.txt (talking_point + caption)
 *
 * The strip is rendered INSIDE a React Flow node, so we go to some lengths
 * to keep canvas interactions (pan / zoom / drag) from intercepting our
 * own pointer events:
 *   - `nodrag` class on every scrollable / clickable surface
 *   - `onMouseDown` / `onWheel` stop propagation so RF doesn't pan
 *   - The lightbox renders via React portal at document.body, ABOVE
 *     React Flow's viewport so panning underneath doesn't bleed through
 */

import * as React from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Package,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

import { API_BASE_URL, ApiError } from "@/lib/api";
import { tweakSlide } from "@/lib/render";
import { getAccessToken } from "@/stores/auth";
import { useCanvasNodeContext } from "@/components/canvas/canvasContext";
import type { RenderedCarouselResult, RenderedSlide } from "@/lib/types";


// Quick-prompt chips — UI affordances over an empty input. Inspired by
// Virale's slide-edit suggestions ("Изменить текст / цвета / стиль /
// Добавить элементы"). Our list is text-focused because the visual
// style is locked to the editorial template for MVP; expand once we
// ship multiple templates.
const TWEAK_SUGGESTIONS: { label: string; prompt: string }[] = [
  { label: "Сократить", prompt: "Сократи слайд в 1.5 раза, сохрани смысл и тон" },
  { label: "Сделать ярче", prompt: "Сделай заголовок и body эмоциональнее, с конкретным образом или цифрой" },
  { label: "Другой угол", prompt: "Переформулируй ту же мысль с другого угла, можно провокационнее" },
  { label: "Конкретнее", prompt: "Добавь в body одну конкретную цифру / факт / пример вместо абстракции" },
];

const SLIDE_W = 96;
const SLIDE_H = 120;
const SCROLL_STEP = 220; // ~2 slides per chevron click


export function RenderedSlidesStrip({
  nodeId,
  rendered,
}: {
  nodeId: string;
  rendered: RenderedCarouselResult;
}) {
  const [lightboxIdx, setLightboxIdx] = React.useState<number | null>(null);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const [overflowing, setOverflowing] = React.useState(false);

  // Detect horizontal overflow so we only show chevrons when useful.
  // ResizeObserver because the parent node can be resized via canvas zoom
  // and we want the indicator to stay accurate.
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () => setOverflowing(el.scrollWidth > el.clientWidth + 4);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [rendered.slides.length]);

  // Wheel-to-horizontal scroll: React Flow eats vertical wheel events to
  // pan the canvas; here we translate deltaY → scrollLeft and stop
  // propagation so the canvas doesn't pan while the user is reviewing
  // slides.
  const onWheel = React.useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return; // already horizontal
    el.scrollLeft += e.deltaY;
    e.stopPropagation();
    e.preventDefault();
  }, []);

  const scrollBy = (dir: -1 | 1) => {
    scrollRef.current?.scrollBy({
      left: SCROLL_STEP * dir,
      behavior: "smooth",
    });
  };

  return (
    <div className="rounded-md border border-warn/30 bg-warn/[0.05] p-2">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="text-[10px] uppercase tracking-wider text-warn">
          Готовый визуал · {rendered.slides.length} слайд
          {rendered.slides.length === 1 ? "" : "ов"}
        </div>
        <div className="flex items-center gap-1.5">
          <DownloadArchiveButton nodeId={nodeId} />
          <div
            className="text-[9px] uppercase tracking-wider text-warn/70"
            title={`Стиль: ${rendered.style} · ${rendered.duration_seconds.toFixed(0)}s`}
          >
            {rendered.style}
          </div>
        </div>
      </div>

      <div className="relative">
        <div
          ref={scrollRef}
          className="nodrag flex gap-1.5 overflow-x-auto pb-1 scroll-smooth"
          onWheel={onWheel}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {rendered.slides.map((s, i) => (
            <button
              key={`${s.index}-${s.url}`}
              type="button"
              className="group relative shrink-0 overflow-hidden rounded border border-border hover:border-warn/60 focus:outline-none focus:ring-1 focus:ring-warn/70 nodrag"
              style={{ width: SLIDE_W, height: SLIDE_H }}
              title={`Слайд ${s.index} · ${s.w}×${s.h} · открыть превью`}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIdx(i);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.url}
                alt={`Слайд ${s.index}`}
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
                draggable={false}
              />
              <span className="absolute left-1 top-1 rounded-sm bg-black/65 px-1 text-[8.5px] font-medium text-white">
                {s.index}
                {s.is_cover ? " ✦" : ""}
              </span>
            </button>
          ))}
        </div>

        {overflowing && (
          <>
            <ChevronButton dir="left" onClick={() => scrollBy(-1)} />
            <ChevronButton dir="right" onClick={() => scrollBy(1)} />
          </>
        )}
      </div>

      {lightboxIdx !== null && (
        <CarouselLightbox
          slides={rendered.slides}
          initialIndex={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          nodeId={nodeId}
        />
      )}
    </div>
  );
}


function ChevronButton({
  dir,
  onClick,
}: {
  dir: "left" | "right";
  onClick: () => void;
}) {
  const Icon = dir === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      className={`absolute top-1/2 ${
        dir === "left" ? "left-0" : "right-0"
      } -translate-y-1/2 nodrag inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-warn backdrop-blur hover:bg-black/85 focus:outline-none focus:ring-1 focus:ring-warn/70`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onMouseDown={(e) => e.stopPropagation()}
      aria-label={dir === "left" ? "Назад" : "Вперёд"}
    >
      <Icon size={14} />
    </button>
  );
}


// =============================================================================
// Lightbox — full-screen carousel preview overlaid on the canvas
// =============================================================================

function CarouselLightbox({
  slides,
  initialIndex,
  onClose,
  nodeId,
}: {
  slides: RenderedSlide[];
  initialIndex: number;
  onClose: () => void;
  nodeId: string;
}) {
  const [idx, setIdx] = React.useState(initialIndex);
  const [editOpen, setEditOpen] = React.useState(false);
  const [prompt, setPrompt] = React.useState("");
  const total = slides.length;
  const slide = slides[idx];

  // Canvas context — needed to wire the slide-tweak SkillRun into the
  // global node-status / SSE-subscription pipeline. When the run
  // completes, CanvasEditor refetches the canvas; props.slides arrives
  // with the new URL and the <img key={slide.url}> re-mounts.
  const { attachSkillRun, isRunning } = useCanvasNodeContext();
  const nodeIsRunning = isRunning(nodeId);

  const tweakMutation = useMutation({
    mutationFn: ({ slideIndex, userPrompt }: { slideIndex: number; userPrompt: string }) =>
      tweakSlide(nodeId, slideIndex, userPrompt),
    onSuccess: ({ skill_run_id }) => {
      attachSkillRun(nodeId, skill_run_id);
      setPrompt("");
      setEditOpen(false);
      toast.success("Перерендериваю слайд...");
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : "Не удалось отправить запрос",
      ),
  });

  const submitTweak = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || slide.is_cover) return;
    tweakMutation.mutate({ slideIndex: slide.index, userPrompt: trimmed });
  };

  const go = React.useCallback(
    (delta: number) => {
      setIdx((cur) => {
        const next = cur + delta;
        if (next < 0) return total - 1;
        if (next >= total) return 0;
        return next;
      });
    },
    [total],
  );

  // Keyboard nav + body-scroll lock while open.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        go(1);
      }
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [go, onClose]);

  const onBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleDownloadOne = () => {
    // The slide URL is `https://draft.neurin.tech/api/v1/media/<key>`,
    // which 302s to a presigned S3 URL. Appending `?download=<filename>`
    // makes the backend ask S3 (via the signed `response-content-disposition`
    // parameter) to serve the object with `Content-Disposition: attachment`,
    // which makes the browser trigger a save dialog regardless of CORS
    // (CORS only restricts JS reads, not direct navigations).
    //
    // We programmatically click an `<a>` rather than navigating the window
    // so the canvas stays in place when the download starts.
    const filename = `slide-${String(slide.index).padStart(2, "0")}.jpg`;
    const sep = slide.url.includes("?") ? "&" : "?";
    const downloadUrl = `${slide.url}${sep}download=${encodeURIComponent(filename)}`;
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Render into document.body so the lightbox isn't clipped by React Flow's
  // viewport transform / overflow rules.
  return createPortal(
    <div
      // Всегда тёмная поверхность, как просмотрщик фотографий: ниже
      // намеренно используется явный white/black, а не токены темы —
      // в светлой теме токены дали бы тёмное на тёмном.
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/85 backdrop-blur-sm"
      onClick={onBackdropClick}
      onMouseDown={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
    >
      {/* Counter + close + actions, top bar */}
      <div className="absolute left-0 right-0 top-0 flex items-center justify-between px-5 py-4">
        <div className="text-[12px] font-medium uppercase tracking-wider text-white/80">
          Слайд {idx + 1} / {total}
          {slide.is_cover && (
            <span className="ml-2 rounded-sm bg-warn/30 px-1.5 py-0.5 text-[10px] text-warn">
              Обложка
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!slide.is_cover && (
            <button
              type="button"
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium text-white transition ${
                editOpen
                  ? "bg-warn/30 hover:bg-warn/40"
                  : "bg-white/10 hover:bg-white/15"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                setEditOpen((v) => !v);
              }}
              title="Изменить этот слайд через AI"
              disabled={nodeIsRunning || tweakMutation.isPending}
            >
              <Wand2 size={12} />
              {editOpen ? "Скрыть редактор" : "Редактировать"}
            </button>
          )}
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-white/15"
            onClick={(e) => {
              e.stopPropagation();
              void handleDownloadOne();
            }}
            title="Скачать этот слайд как JPEG"
          >
            <Download size={12} />
            Скачать слайд
          </button>
          <DownloadArchiveButton nodeId={nodeId} compact />
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/15 focus:outline-none focus:ring-1 focus:ring-ring"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            title="Закрыть (Esc)"
            aria-label="Закрыть превью"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Image — wrapped so we can overlay a "rerendering" spinner during
          a slide-tweak without losing scale/aspect. */}
      <div
        className="relative flex max-h-[85vh] max-w-[85vw] items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={slide.url} /* force re-mount → fade-in transition */
          src={slide.url}
          alt={`Слайд ${slide.index}`}
          className={`max-h-[85vh] max-w-[85vw] rounded-lg object-contain shadow-2xl transition-opacity ${
            nodeIsRunning ? "opacity-50" : "opacity-100"
          }`}
          draggable={false}
        />
        {nodeIsRunning && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-2 rounded-full bg-black/70 px-4 py-2 text-[12px] font-medium text-white backdrop-blur">
              <Loader2 size={14} className="animate-spin" />
              Перерендериваю…
            </div>
          </div>
        )}
      </div>

      {/* Left / Right nav arrows */}
      {total > 1 && (
        <>
          <button
            type="button"
            className="absolute left-4 top-1/2 -translate-y-1/2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 focus:outline-none focus:ring-1 focus:ring-ring"
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            aria-label="Предыдущий слайд"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            type="button"
            className="absolute right-4 top-1/2 -translate-y-1/2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 focus:outline-none focus:ring-1 focus:ring-ring"
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            aria-label="Следующий слайд"
          >
            <ChevronRight size={22} />
          </button>
        </>
      )}

      {/* Edit panel — open via "Редактировать" button, lives just above
          the dot indicator. Hidden entirely for cover slides since the
          backend rejects those (AI image background can't be re-composed
          from text edits alone). */}
      {editOpen && !slide.is_cover && (
        <div
          className="absolute bottom-16 left-1/2 w-[min(640px,90vw)] -translate-x-1/2 rounded-xl border border-border bg-muted/95 p-3 shadow-2xl backdrop-blur"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="mb-2 flex flex-wrap gap-1.5">
            {TWEAK_SUGGESTIONS.map((s) => (
              <button
                key={s.label}
                type="button"
                className="rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[11px] font-medium text-white hover:border-warn/60 hover:bg-warn/10 disabled:opacity-50"
                onClick={(e) => {
                  e.stopPropagation();
                  // Single-click chip = immediate submit. Power users
                  // who want to tweak the wording can type in the input
                  // below instead.
                  submitTweak(s.prompt);
                }}
                disabled={tweakMutation.isPending || nodeIsRunning}
                title={s.prompt}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="shrink-0 text-warn" />
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submitTweak(prompt);
                }
              }}
              placeholder="Что изменить в слайде?"
              className="flex-1 rounded-md border border-border bg-black/40 px-3 py-2 text-[12px] text-white placeholder:text-muted-foreground focus:border-warn/60 focus:outline-none disabled:opacity-50"
              disabled={tweakMutation.isPending || nodeIsRunning}
              autoFocus
            />
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md bg-warn px-3 py-2 text-[12px] font-medium text-black hover:bg-warn disabled:cursor-not-allowed disabled:opacity-60"
              onClick={(e) => {
                e.stopPropagation();
                submitTweak(prompt);
              }}
              disabled={
                !prompt.trim() || tweakMutation.isPending || nodeIsRunning
              }
            >
              {tweakMutation.isPending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Wand2 size={12} />
              )}
              Применить
            </button>
          </div>
          <div className="mt-1.5 text-[10px] text-muted-foreground">
            Enter — применить · перерендер занимает ~5–10 сек
          </div>
        </div>
      )}

      {/* Bottom dot indicator — taps work as direct nav */}
      {total > 1 && (
        <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`h-2 rounded-full transition-all ${
                i === idx
                  ? "w-6 bg-white"
                  : "w-2 bg-white/40 hover:bg-white/60"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                setIdx(i);
              }}
              aria-label={`Перейти к слайду ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}


// =============================================================================
// Archive download button — single source of truth, used in strip + lightbox
// =============================================================================

function DownloadArchiveButton({
  nodeId,
  compact = false,
}: {
  nodeId: string;
  compact?: boolean;
}) {
  const [busy, setBusy] = React.useState(false);

  const handle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // Authenticated fetch (Bearer token). We do this in JS rather than
      // a plain `<a href>` because the endpoint requires the access token
      // and we don't want to leak it in URL params.
      const token = getAccessToken();
      const resp = await fetch(
        `${API_BASE_URL}/api/v1/nodes/${nodeId}/render-archive`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        },
      );
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(text || `HTTP ${resp.status}`);
      }
      const blob = await resp.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      // Try to pick up server-suggested filename; fall back to a sane default.
      const cd = resp.headers.get("Content-Disposition") || "";
      const m = cd.match(/filename="?([^";]+)"?/i);
      a.download = m?.[1] ?? `carousel-${nodeId.slice(0, 8)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? `Не удалось скачать архив: ${err.message}`
          : "Не удалось скачать архив",
      );
    } finally {
      setBusy(false);
    }
  };

  if (compact) {
    return (
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-white/15 disabled:opacity-60 nodrag"
        onClick={(e) => {
          e.stopPropagation();
          void handle();
        }}
        onMouseDown={(e) => e.stopPropagation()}
        disabled={busy}
        title="Скачать ZIP всех слайдов + README"
      >
        <Package size={12} />
        {busy ? "Готовлю…" : "Скачать архив"}
      </button>
    );
  }

  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 rounded border border-warn/40 bg-warn/[0.08] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-warn hover:border-warn/70 hover:bg-warn/[0.14] disabled:opacity-60 nodrag"
      onClick={(e) => {
        e.stopPropagation();
        void handle();
      }}
      onMouseDown={(e) => e.stopPropagation()}
      disabled={busy}
      title="Скачать ZIP всех слайдов + README"
    >
      <Package size={10} />
      {busy ? "..." : "ZIP"}
    </button>
  );
}
