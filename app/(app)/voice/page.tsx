"use client";

/**
 * /voice — Voice training page.
 *
 * Single surface where the founder feeds posts to ContentOS's voice
 * retrieval layer (pgvector-backed few-shot at format time). Three import
 * paths in priority order:
 *
 *   1. Telegram public channel  — `@kochnefff` → web-view scrape
 *   2. YouTube channel          — `@danil`     → channel videos transcripts
 *   3. Blog URLs                — pasted list  → trafilatura article body
 *
 * Plus a manual-paste fallback dialog and a per-sample delete. After 3+
 * samples exist, "Изучить голос" hits `extract-traits` and pushes
 * voice_traits / voice_avoid / recurring_phrases / tone_calibration into
 * BrandContext so format-skills can use them deterministically (not only
 * via vector retrieval).
 */

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Check,
  Globe,
  Hash,
  Loader2,
  Mic,
  Plus,
  Send,
  Sparkles,
  Trash2,
  X,
  Youtube,
} from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import {
  createVoiceSample,
  deleteVoiceSample,
  extractTraits,
  importVoiceFromTelegram,
  importVoiceFromUrls,
  importVoiceFromYoutube,
  listVoiceSamples,
} from "@/lib/voice";
import type { VoiceImportResult, VoiceSampleOut } from "@/lib/types";
import { formatRelativeRu } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { TrialRedirect } from "@/components/TrialRedirect";

export default function VoicePage() {
  const qc = useQueryClient();
  const samplesQuery = useQuery({
    queryKey: ["voice-samples"],
    queryFn: listVoiceSamples,
  });
  const samples = samplesQuery.data ?? [];
  const ready = samples.length >= 3;

  const [addOpen, setAddOpen] = React.useState(false);
  const [extractedTraits, setExtractedTraits] = React.useState<
    Awaited<ReturnType<typeof extractTraits>> | null
  >(null);

  const extractMutation = useMutation({
    mutationFn: extractTraits,
    onSuccess: (data) => {
      setExtractedTraits(data);
      qc.invalidateQueries({ queryKey: ["brand-context"] });
      toast.success(`Изучил голос на ${data.samples_analyzed} образцах`);
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : "Не удалось изучить голос",
      ),
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <TrialRedirect />
      <header className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-content/15 text-content">
          <Mic size={20} />
        </div>
        <div className="flex-1">
          <h1 className="text-[22px] font-semibold leading-tight">
            Голос автора
          </h1>
          <p className="text-[13px] text-[color:var(--text-tertiary)]">
            Скорми мне свои посты — буду писать как ты, а не нейтрально. Используется
            как few-shot при каждой генерации.
          </p>
        </div>
        <Button
          onClick={() => extractMutation.mutate()}
          disabled={!ready || extractMutation.isPending}
          title={
            ready
              ? "Проанализировать все образцы и записать маркеры стиля в brand context"
              : "Нужно минимум 3 образца"
          }
        >
          {extractMutation.isPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Sparkles size={14} />
          )}
          Изучить голос
        </Button>
      </header>

      <section className="mb-8 grid grid-cols-1 gap-3 md:grid-cols-3">
        <TelegramImportCard
          onImported={() => qc.invalidateQueries({ queryKey: ["voice-samples"] })}
        />
        <YoutubeImportCard
          onImported={() => qc.invalidateQueries({ queryKey: ["voice-samples"] })}
        />
        <UrlImportCard
          onImported={() => qc.invalidateQueries({ queryKey: ["voice-samples"] })}
        />
      </section>

      {extractedTraits && (
        <section className="mb-8 rounded-xl border border-content/30 bg-content/[0.06] p-4">
          <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-content">
            <Check size={13} /> Голос изучен
          </div>
          <p className="mb-3 text-[13px] text-foreground">
            Проанализировано: {extractedTraits.samples_analyzed} образцов.
            Тон:{" "}
            <span className="text-content">
              {extractedTraits.tone_calibration || "—"}
            </span>
          </p>
          {extractedTraits.voice_traits.length > 0 && (
            <TraitChips
              label="Маркеры стиля"
              items={extractedTraits.voice_traits}
            />
          )}
          {extractedTraits.recurring_phrases.length > 0 && (
            <TraitChips
              label="Фразы-маркеры"
              items={extractedTraits.recurring_phrases}
            />
          )}
          {extractedTraits.voice_avoid.length > 0 && (
            <TraitChips
              label="Чего автор избегает"
              items={extractedTraits.voice_avoid}
              tone="warn"
            />
          )}
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">
            Образцы{" "}
            <span className="text-[color:var(--text-muted)]">
              · {samples.length}
            </span>
          </h2>
          <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
            <Plus size={14} /> Добавить вручную
          </Button>
        </div>

        {samplesQuery.isPending ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : samples.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-foreground/[0.02] p-8 text-center">
            <Mic size={28} className="mx-auto mb-2 text-muted-foreground" />
            <p className="text-[13px] text-muted-foreground">
              Пока ничего не загружено. Импортируй свой канал через одну из
              карточек выше — это быстрее чем копировать руками.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {samples.map((s) => (
              <SampleRow
                key={s.id}
                sample={s}
                onDeleted={() =>
                  qc.invalidateQueries({ queryKey: ["voice-samples"] })
                }
              />
            ))}
          </ul>
        )}
      </section>

      <ManualAddDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={() => qc.invalidateQueries({ queryKey: ["voice-samples"] })}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Import cards
// ---------------------------------------------------------------------------

function ImportCardShell({
  icon: Icon,
  title,
  subtitle,
  iconClass,
  children,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  iconClass?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-foreground/[0.02] p-4">
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            iconClass ?? "bg-foreground/5 text-foreground/80",
          )}
        >
          <Icon size={15} />
        </div>
        <div>
          <div className="text-[13px] font-semibold">{title}</div>
          <div className="text-[11px] text-[color:var(--text-muted)]">
            {subtitle}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

function TelegramImportCard({ onImported }: { onImported: () => void }) {
  const [handle, setHandle] = React.useState("");
  const [limit, setLimit] = React.useState(50);
  const mutation = useMutation({
    mutationFn: () =>
      importVoiceFromTelegram({ handle: handle.trim(), limit }),
    onSuccess: (r) => {
      summarizeImport(r);
      setHandle("");
      onImported();
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.detail : "Импорт не удался"),
  });
  return (
    <ImportCardShell
      icon={Send}
      title="Telegram-канал"
      subtitle="Публичный канал (не личный профиль), последние посты"
      iconClass="bg-info/20 text-info"
    >
      <Input
        placeholder="@durov"
        value={handle}
        onChange={(e) => setHandle(e.target.value)}
        disabled={mutation.isPending}
      />
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={5}
          max={100}
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value) || 50)}
          className="w-20"
          disabled={mutation.isPending}
        />
        <span className="text-[11px] text-[color:var(--text-muted)]">
          постов
        </span>
        <Button
          className="ml-auto"
          size="sm"
          disabled={!handle.trim() || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? (
            <Loader2 size={13} className="animate-spin" />
          ) : null}
          Импорт
        </Button>
      </div>
    </ImportCardShell>
  );
}

function YoutubeImportCard({ onImported }: { onImported: () => void }) {
  const [channel, setChannel] = React.useState("");
  const [limit, setLimit] = React.useState(10);
  const mutation = useMutation({
    mutationFn: () =>
      importVoiceFromYoutube({ channel: channel.trim(), limit }),
    onSuccess: (r) => {
      summarizeImport(r);
      setChannel("");
      onImported();
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.detail : "Импорт не удался"),
  });
  return (
    <ImportCardShell
      icon={Youtube}
      title="YouTube-канал"
      subtitle="Транскрипты последних видео"
      iconClass="bg-destructive/20 text-destructive"
    >
      <Input
        placeholder="@danil или ссылка"
        value={channel}
        onChange={(e) => setChannel(e.target.value)}
        disabled={mutation.isPending}
      />
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={3}
          max={30}
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value) || 10)}
          className="w-20"
          disabled={mutation.isPending}
        />
        <span className="text-[11px] text-[color:var(--text-muted)]">
          видео
        </span>
        <Button
          className="ml-auto"
          size="sm"
          disabled={!channel.trim() || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? (
            <Loader2 size={13} className="animate-spin" />
          ) : null}
          Импорт
        </Button>
      </div>
    </ImportCardShell>
  );
}

function UrlImportCard({ onImported }: { onImported: () => void }) {
  const [raw, setRaw] = React.useState("");
  const mutation = useMutation({
    mutationFn: () =>
      importVoiceFromUrls({
        urls: raw
          .split(/\s+/)
          .map((u) => u.trim())
          .filter((u) => u.startsWith("http")),
      }),
    onSuccess: (r) => {
      summarizeImport(r);
      setRaw("");
      onImported();
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.detail : "Импорт не удался"),
  });
  const validUrls = raw
    .split(/\s+/)
    .map((u) => u.trim())
    .filter((u) => u.startsWith("http"));
  return (
    <ImportCardShell
      icon={Globe}
      title="Статьи / Блог"
      subtitle="До 20 ссылок, через пробел/перенос"
      iconClass="bg-success/20 text-success"
    >
      <Textarea
        placeholder="https://example.com/post-1&#10;https://blog.example.com/post-2"
        rows={3}
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        disabled={mutation.isPending}
      />
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-[color:var(--text-muted)]">
          {validUrls.length} ссылок
        </span>
        <Button
          className="ml-auto"
          size="sm"
          disabled={validUrls.length === 0 || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? (
            <Loader2 size={13} className="animate-spin" />
          ) : null}
          Импорт
        </Button>
      </div>
    </ImportCardShell>
  );
}

function summarizeImport(r: VoiceImportResult) {
  if (r.created > 0) {
    toast.success(
      `Добавлено ${r.created} образцов из ${r.source}${
        r.skipped > 0 ? `, пропущено ${r.skipped}` : ""
      }`,
    );
  }
  for (const n of r.notes) {
    toast.message(n);
  }
}

// ---------------------------------------------------------------------------
// Sample list + manual add
// ---------------------------------------------------------------------------

function SampleRow({
  sample,
  onDeleted,
}: {
  sample: VoiceSampleOut;
  onDeleted: () => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const deleteMutation = useMutation({
    mutationFn: () => deleteVoiceSample(sample.id),
    onSuccess: onDeleted,
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : "Не удалось удалить образец",
      ),
  });
  const meta = sample.meta as Record<string, unknown>;
  const sourceUrl = (meta?.url as string) || undefined;
  const channel = (meta?.channel as string) || undefined;

  return (
    <li className="rounded-lg border border-border/80 bg-foreground/[0.02] p-3">
      <div className="mb-1.5 flex items-center gap-2 text-[10.5px] uppercase tracking-wider text-[color:var(--text-muted)]">
        {sample.platform && (
          <span className="rounded-full bg-foreground/5 px-2 py-0.5 font-semibold">
            {sample.platform}
          </span>
        )}
        {channel && (
          <span className="font-semibold text-info">@{channel}</span>
        )}
        {sample.has_embedding ? (
          <span className="text-success" title="Эмбеддинг есть">
            ● проиндексирован
          </span>
        ) : (
          <span className="text-warn" title="Без эмбеддинга — retrieval не сработает">
            <AlertCircle size={10} className="inline" /> без эмбеддинга
          </span>
        )}
        <span className="ml-auto text-muted-foreground">
          {formatRelativeRu(sample.created_at)}
        </span>
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-foreground"
            title="Открыть источник"
          >
            <Hash size={11} />
          </a>
        )}
        <button
          type="button"
          onClick={() => deleteMutation.mutate()}
          className="text-muted-foreground hover:text-destructive"
          disabled={deleteMutation.isPending}
          title="Удалить"
        >
          {deleteMutation.isPending ? (
            <Loader2 size={11} className="animate-spin" />
          ) : (
            <Trash2 size={11} />
          )}
        </button>
      </div>
      <div
        className={cn(
          "whitespace-pre-wrap text-[12.5px] leading-snug text-foreground",
          !expanded && "line-clamp-3",
        )}
        onClick={() => setExpanded((v) => !v)}
        role="button"
      >
        {sample.text}
      </div>
    </li>
  );
}

function ManualAddDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [text, setText] = React.useState("");
  const [platform, setPlatform] = React.useState("");
  const mutation = useMutation({
    mutationFn: () =>
      createVoiceSample({
        text: text.trim(),
        platform: platform.trim() || null,
      }),
    onSuccess: () => {
      toast.success("Образец добавлен");
      setText("");
      setPlatform("");
      onOpenChange(false);
      onCreated();
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : "Не удалось добавить",
      ),
  });
  React.useEffect(() => {
    if (!open) {
      setText("");
      setPlatform("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Добавить образец вручную</DialogTitle>
          <DialogDescription>
            Вставь свой пост целиком. Минимум 20 символов.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ms-text">Текст</Label>
            <Textarea
              id="ms-text"
              rows={10}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Скопируй сюда свой пост"
              disabled={mutation.isPending}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ms-plat">Платформа (опционально)</Label>
            <Input
              id="ms-plat"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              placeholder="telegram / linkedin / blog"
              disabled={mutation.isPending}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Отмена
          </Button>
          <Button
            disabled={text.trim().length < 20 || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? (
              <Loader2 size={13} className="animate-spin" />
            ) : null}
            Добавить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Small bits
// ---------------------------------------------------------------------------

function TraitChips({
  label,
  items,
  tone = "default",
}: {
  label: string;
  items: string[];
  tone?: "default" | "warn";
}) {
  return (
    <div className="mb-2">
      <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((t, i) => (
          <span
            key={i}
            className={cn(
              "rounded-full border px-2 py-0.5 text-[11px]",
              tone === "warn"
                ? "border-destructive/30 bg-destructive/10 text-destructive"
                : "border-content/30 bg-content/10 text-content",
            )}
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
