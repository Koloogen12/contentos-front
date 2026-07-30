"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, ArrowRight, Check, Copy as CopyIcon, LibraryBig, MoreHorizontal, Pencil, Plus, RefreshCw, Search, Settings, Sparkles, Trash2 } from "lucide-react";
import { ApiError } from "@/lib/api";
import {
  duplicateCanvas,
  getCanvas,
  listCanvases,
  listCanvasTemplates,
} from "@/lib/canvases";
import { listProjects } from "@/lib/projects";
import { listVoiceSamples } from "@/lib/voice";
import { getPerformanceOverview } from "@/lib/performance";
import type {
  CanvasDetail,
  CanvasOut,
  EdgeOut,
  NodeOut,
  ProjectOut,
} from "@/lib/types";
import { t, formatRelativeRu } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateCanvasDialog } from "@/components/CreateCanvasDialog";
import { RenameCanvasDialog } from "@/components/RenameCanvasDialog";
import { DeleteCanvasDialog } from "@/components/DeleteCanvasDialog";
import { TemplatesPickerDialog } from "@/components/canvas/TemplatesPickerDialog";
import { WhatToWriteWidget } from "@/components/plan/WhatToWriteWidget";
import { useAuthStore } from "@/stores/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const organization = useAuthStore((s) => s.organization);
  const projectId = searchParams.get("project");
  const [search, setSearch] = React.useState("");
  const [templatesOpen, setTemplatesOpen] = React.useState(false);
  const [renameTarget, setRenameTarget] = React.useState<CanvasOut | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = React.useState<CanvasOut | null>(
    null,
  );

  const canvasesQuery = useQuery({
    queryKey: ["canvases", { projectId: projectId ?? null, recents: true }],
    // "Недавние" must NEVER include templates — otherwise the user's own
    // canvas (named e.g. "YouTube → Telegram") sits next to the auto-seeded
    // template with the same name, and clicking the wrong one drops the
    // user into a stale canvas instead of a fresh template-spawn.
    queryFn: () =>
      listCanvases({
        project_id: projectId ?? undefined,
        is_template: false,
      }),
  });

  const templatesQuery = useQuery({
    queryKey: ["canvas-templates"],
    queryFn: () => listCanvasTemplates(),
  });

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: listProjects,
  });

  // Онбординг-полоса из прототипа: три шага. Состояние берём из настоящих
  // данных, чтобы полоса не врала — образцы голоса, канвасы, публикации.
  const voiceQuery = useQuery({
    queryKey: ["voice-samples"],
    queryFn: listVoiceSamples,
  });
  const perfQuery = useQuery({
    queryKey: ["performance-overview"],
    queryFn: getPerformanceOverview,
  });

  const activeProject: ProjectOut | null = React.useMemo(() => {
    if (!projectId || !projectsQuery.data) return null;
    return projectsQuery.data.find((p) => p.id === projectId) ?? null;
  }, [projectId, projectsQuery.data]);

  const filtered = React.useMemo(() => {
    const items = canvasesQuery.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description ?? "").toLowerCase().includes(q),
    );
  }, [canvasesQuery.data, search]);

  // Три шага онбординга — структура и копия из прототипа
  // (prime2-shell.jsx#CanvasesScreen), состояние из настоящих данных.
  const voiceSamples = voiceQuery.data?.length ?? 0;
  const canvasCount = canvasesQuery.data?.length ?? 0;
  const publishedCount = perfQuery.data?.total_posts ?? 0;
  const steps: {
    title: string;
    desc: string;
    done: boolean;
    href: string;
    note: string;
  }[] = [
    {
      title: "Подключи голос",
      desc: "Ссылка на твой канал — система разберёт, как ты пишешь. Полторы минуты, один раз.",
      done: voiceSamples > 0,
      href: "/voice",
      note:
        voiceSamples > 0
          ? `Голос обучен · ${voiceSamples} ${plural(voiceSamples, "образец", "образца", "образцов")}`
          : "Голос ещё не подключён",
    },
    {
      title: "Брось материал",
      desc: "Голосовое, запись созвона, чужая статья или мысль в одну строку.",
      done: canvasCount > 0,
      href: "/dashboard",
      note:
        canvasCount > 0
          ? `${canvasCount} ${plural(canvasCount, "материал", "материала", "материалов")} в работе`
          : "Ни одного материала пока нет",
    },
    {
      title: "Выбери идею и опубликуй",
      desc: "Смотришь идеи с оценкой потенциала, получаешь пост, ставишь в план.",
      done: publishedCount > 0,
      href: "/ideas",
      note:
        publishedCount > 0
          ? `${publishedCount} ${plural(publishedCount, "пост", "поста", "постов")} опубликовано`
          : "Ни один пост ещё не опубликован",
    },
  ];
  const doneCount = steps.filter((st) => st.done).length;
  const allDone = doneCount === steps.length;

  return (
    <div className="pad">
      <div className="ph">
        <div>
          <h1>Канвасы</h1>
          <p>
            Каждый материал — отдельный канвас: источник, идеи, готовые посты.
            {allDone ? "" : " Осталось закрыть шаг настройки."}
          </p>
        </div>
        <div className="r">
          <button
            type="button"
            className="btn btn-or"
            onClick={() => setTemplatesOpen(true)}
          >
            <Plus size={16} />
            Новый канвас
          </button>
        </div>
      </div>

      {/* Полоса скрывается, когда все шаги закрыты — так в хендоффе. */}
      {!allDone && (
        <>
          <div className="onb-bar">
            <i style={{ width: `${(doneCount / steps.length) * 100}%` }} />
          </div>
          <div className="onb">
            {steps.map((st, i) => (
              <div className="onb-c" key={st.title} data-done={st.done ? "1" : "0"}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="onb-n">
                    {st.done ? <Check size={13} /> : i + 1}
                  </span>
                  <b>{st.title}</b>
                </div>
                <p>{st.desc}</p>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: st.done ? "var(--p-green)" : "var(--p-ink-3)",
                  }}
                >
                  {st.note}
                </div>
                {!st.done && (
                  <Link
                    href={st.href}
                    className="btn btn-or btn-sm"
                    style={{ alignSelf: "flex-start" }}
                  >
                    Продолжить
                    <ArrowRight size={13} />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="ph" style={{ marginBottom: 14 }}>
        <h1 style={{ fontSize: 20 }}>В работе</h1>
        {activeProject && (
          <div className="r">
            <span className="chip" style={{ gap: 7 }}>
              <i
                aria-hidden
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 99,
                  background: activeProject.color,
                  display: "block",
                }}
              />
              {activeProject.name}
            </span>
          </div>
        )}
      </div>

      <div className="cvgrid">
        <div
          className="cvnew"
          role="button"
          tabIndex={0}
          onClick={() => setTemplatesOpen(true)}
          onKeyDown={(e) => e.key === "Enter" && setTemplatesOpen(true)}
        >
          <Plus size={22} />
          <b>Новый канвас</b>
          <span>Пустая доска или шаблон</span>
        </div>

        {canvasesQuery.isPending
          ? Array.from({ length: 3 }).map((_, i) => (
              <div className="cvcard" key={i} aria-hidden>
                <div className="cvthumb" />
                <div className="cvcard-b">
                  <div className="n">&nbsp;</div>
                  <div className="m mono">загружаем…</div>
                </div>
              </div>
            ))
          : filtered.map((canvas) => (
              <CanvasCard
                key={canvas.id}
                canvas={canvas}
                onRename={() => setRenameTarget(canvas)}
                onDelete={() => setDeleteTarget(canvas)}
              />
            ))}
      </div>

      {canvasesQuery.isError && (
        <div className="mono" style={{ marginTop: 14, color: "var(--p-red)" }}>
          {canvasesQuery.error instanceof ApiError
            ? canvasesQuery.error.detail
            : "Не удалось загрузить канвасы"}
        </div>
      )}

      <TemplatesPickerDialog
        open={templatesOpen}
        onOpenChange={setTemplatesOpen}
        defaultProjectId={projectId}
      />
      <RenameCanvasDialog
        canvas={renameTarget}
        open={!!renameTarget}
        onOpenChange={(open) => !open && setRenameTarget(null)}
      />
      <DeleteCanvasDialog
        canvas={deleteTarget}
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      />
    </div>
  );
}

/** Русские падежи для счётчиков в онбординге. */
function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

function NewCanvasTile({
  defaultProjectId,
}: {
  defaultProjectId: string | null;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button
        type="button"
        className="relative co-canvas-card-create cursor-pointer text-left"
        onClick={() => setOpen(true)}
      >
        <Plus size={20} />
        <div style={{ fontSize: 13, fontWeight: 500 }}>
          {t.dash.cardCreateTitle}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
          {t.dash.cardCreateSub}
        </div>
      </button>
      <CreateCanvasDialog
        defaultProjectId={defaultProjectId}
        open={open}
        onOpenChange={setOpen}
        hideTrigger
      />
    </>
  );
}

function CanvasCard({
  canvas,
  onRename,
  onDelete,
}: {
  canvas: CanvasOut;
  onRename: () => void;
  onDelete: () => void;
}) {
  // .cvcard из прототипа: миниатюра графа, название, мета, чипы счётчиков.
  // Меню действий наше — в прототипе его нет, показываем по наведению.
  return (
    <div className="cvcard group">
      <Link href={`/canvas/${canvas.id}`} style={{ display: "block" }}>
        <CanvasThumb canvasId={canvas.id} />
        <div className="cvcard-b">
          <div className="n">{canvas.name}</div>
          <CanvasCardMeta canvasId={canvas.id} updatedAt={canvas.updated_at} />
        </div>
      </Link>
      <div className="absolute right-2 top-2 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Канвас ${canvas.name}: действия`}
              className="grid h-7 w-7 place-items-center rounded-lg border border-[color:var(--p-line)] bg-[color:var(--p-card)] text-[color:var(--p-ink-3)] hover:text-[color:var(--p-ink)]"
            >
              <MoreHorizontal size={14} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                onRename();
              }}
            >
              <Pencil className="h-3.5 w-3.5" /> Переименовать
            </DropdownMenuItem>
            <DropdownMenuItem
              destructive
              onSelect={(e) => {
                e.preventDefault();
                onDelete();
              }}
            >
              <Trash2 className="h-3.5 w-3.5" /> Удалить
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function CanvasThumb({ canvasId }: { canvasId: string }) {
  const detail = useCanvasDetail(canvasId);
  if (!detail) return <ThumbPlaceholder />;
  return <ThumbMiniGraph nodes={detail.nodes} edges={detail.edges} />;
}


/** Compact platform/type label for the mini-strip below a node. */
/**
 * Мета под названием канваса: число нод и когда правили.
 * Число берём из того же кэша, что и миниатюра (useCanvasDetail), — у списка
 * канвасов в API этого поля нет, а второй запрос за ним был бы лишним.
 */
function CanvasCardMeta({
  canvasId,
  updatedAt,
}: {
  canvasId: string;
  updatedAt: string;
}) {
  const detail = useCanvasDetail(canvasId);
  const count = detail?.nodes.length;
  return (
    <div className="m mono">
      {count != null
        ? `${count} ${plural(count, "нода", "ноды", "нод")} · `
        : ""}
      {relativeTime(updatedAt)}
    </div>
  );
}

/** «2 часа назад» — как в мете карточек прототипа. */
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "только что";
  if (min < 60) return `${min} ${plural(min, "минуту", "минуты", "минут")} назад`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} ${plural(h, "час", "часа", "часов")} назад`;
  const d = Math.floor(h / 24);
  if (d === 1) return "вчера";
  return `${d} ${plural(d, "день", "дня", "дней")} назад`;
}

function platformLabel(n: NodeOut): string | null {
  const platform = (n.data as { platform?: string }).platform;
  if (typeof platform === "string" && platform.length > 0) {
    switch (platform) {
      case "telegram":
        return "TG";
      case "linkedin":
        return "LI";
      case "carousel":
        return "карусель";
      case "reels":
        return "reels";
      case "hooks":
        return "хуки";
      case "article":
        return "статья";
      default:
        return platform.slice(0, 8);
    }
  }
  // Sources may carry input_type — show a hint.
  if (n.type === "source") {
    const it = (n.data as { input_type?: string }).input_type;
    if (it === "youtube") return "YT";
    if (it === "url") return "URL";
    if (it === "file_upload") return "файл";
    if (it === "text") return "текст";
  }
  return null;
}

/** Подписи типов нод под миниатюрой — как в прототипе (ЗАПИСЬ, ИДЕИ, …). */
const NODE_LABEL: Record<NodeOut["type"], string> = {
  source: "источник",
  extract: "идеи",
  llm: "ассистент",
  format: "контент",
};

/**
 * Миниатюра графа на карточке канваса — 1:1 по разметке прототипа
 * (prime2-shell.jsx#CanvasThumb): viewBox по границам нод, кабели кривыми
 * Безье, у каждой ноды три полосы-скелета и подпись типа под ней.
 *
 * Цвета не задаются здесь: обводка ноды берётся из классов `.tn.src/.ext/
 * .llm/.post`, кабель из `.te`, подпись из `.tt2` — все в workspace.css,
 * поэтому миниатюра следует теме сама.
 */
function ThumbMiniGraph({
  nodes,
  edges,
}: {
  nodes: NodeOut[];
  edges: EdgeOut[];
}) {
  if (nodes.length === 0) return <ThumbPlaceholder />;

  // Ноды на канвасе примерно такого размера; точные ширины разных типов
  // на миниатюре неразличимы.
  const W = 320;
  const H = 180;
  const PAD = 34;
  const LAB = 22;

  const xs = nodes.map((n) => n.position_x);
  const ys = nodes.map((n) => n.position_y);
  const x0 = Math.min(...xs) - PAD;
  const y0 = Math.min(...ys) - PAD;
  const x1 = Math.max(...xs) + W + PAD;
  const y1 = Math.max(...ys) + H + PAD + LAB;

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const thumbClass: Record<NodeOut["type"], string> = {
    source: "src",
    extract: "ext",
    llm: "llm",
    format: "post",
  };

  return (
    <div className="cvthumb">
      <svg
        viewBox={`${x0} ${y0} ${x1 - x0} ${y1 - y0}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        {edges.map((e) => {
          const a = byId.get(e.source_node_id);
          const b = byId.get(e.target_node_id);
          if (!a || !b) return null;
          const sx = a.position_x + W;
          const sy = a.position_y + H / 2;
          const ex = b.position_x;
          const ey = b.position_y + H / 2;
          const dx = Math.max(30, (ex - sx) * 0.55);
          return (
            <path
              key={e.id}
              className="te"
              d={`M ${sx} ${sy} C ${sx + dx} ${sy}, ${ex - dx} ${ey}, ${ex} ${ey}`}
            />
          );
        })}
        {nodes.map((n) => {
          const x = n.position_x;
          const y = n.position_y;
          return (
            <g key={n.id}>
              <rect
                className={`tn ${thumbClass[n.type]}`}
                x={x}
                y={y}
                width={W}
                height={H}
                rx={12}
              />
              <rect className="tb" x={x + 12} y={y + 14} width={W * 0.48} height={7} rx={3.5} />
              <rect className="tb" x={x + 12} y={y + 32} width={W - 24} height={6} rx={3} />
              <rect className="tb" x={x + 12} y={y + 46} width={(W - 24) * 0.78} height={6} rx={3} />
              <text className="tt2" x={x} y={y + H + 16}>
                {platformLabel(n) ?? NODE_LABEL[n.type]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function ThumbPlaceholder() {
  // Пустая доска: та же поверхность и та же точечная сетка, что у миниатюры
  // с графом, только без нод — карточки в сетке не «прыгают» по высоте.
  return <div className="cvthumb" aria-hidden />;
}

function useCanvasDetail(canvasId: string): CanvasDetail | undefined {
  // Single per-card useQuery via useQueries with a single key.
  // Using one entry keeps the API consistent and TanStack-pure.
  const results = useQueries({
    queries: [
      {
        queryKey: ["canvas", canvasId],
        queryFn: () => getCanvas(canvasId),
        staleTime: 30 * 1000,
        gcTime: 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
      },
    ],
  });
  return results[0]?.data;
}

function CanvasGridSkeleton({ small }: { small?: boolean } = {}) {
  return (
    <div className="co-dash-grid">
      {Array.from({ length: small ? 3 : 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-border/60 bg-foreground/[0.02] overflow-hidden"
          aria-hidden
        >
          <Skeleton className="h-[130px] w-full rounded-none" />
          <div className="p-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="mt-2 h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function CanvasErrorState({
  detail,
  onRetry,
}: {
  detail: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/15 text-destructive">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-medium text-foreground">
            {t.dash.couldNotLoad}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
        </div>
      </div>
      <div className="mt-5">
        <Button onClick={onRetry} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4" /> {t.dash.retry}
        </Button>
      </div>
    </div>
  );
}
