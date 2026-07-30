"use client";

/**
 * Разбор мысли на тезисы — панель внутри экрана Идей.
 *
 * Одно поле: бросаешь мысль, кусок переписки, заметку — AI разбирает на
 * 3–7 тезисов с оценкой потенциала, и ты выбираешь, что сохранить.
 * Сохранённое становится записью банка и дальше видно на канвасе.
 *
 * Раньше это был отдельный экран /ideas, а банк жил на /knowledge. В
 * прототипе такого разделения нет: банк и есть «Идеи», а разбор мысли —
 * способ туда добавить, наравне с ручным вводом. Поэтому панель переехала
 * внутрь экрана.
 */

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Sparkles, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { ApiError } from "@/lib/api";
import {
  brainDump,
  createKnowledge,
  type BrainDumpProposal,
} from "@/lib/knowledge";


const KNOWLEDGE_QUERY_KEY = ["knowledge"];


export function BrainDumpPanel({ onSaved }: { onSaved?: () => void }) {
  const qc = useQueryClient();
  const [text, setText] = React.useState("");
  const [proposals, setProposals] = React.useState<BrainDumpProposal[]>([]);
  // Track which proposals have already been saved so we can disable
  // their "Сохранить" button after one click.
  const [savedIndexes, setSavedIndexes] = React.useState<Set<number>>(
    () => new Set(),
  );

  const dumpMutation = useMutation({
    mutationFn: () => brainDump(text.trim()),
    onSuccess: (data) => {
      setProposals(data.proposals);
      setSavedIndexes(new Set());
      if (data.proposals.length === 0) {
        toast.info("AI не нашёл ни одного тезиса — попробуй описать мысль конкретнее");
      } else {
        toast.success(`Разобрал на ${data.proposals.length} тезис${pluralRu(data.proposals.length)}`);
      }
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : "Не удалось разобрать brain-dump",
      ),
  });

  const saveMutation = useMutation({
    mutationFn: (proposal: BrainDumpProposal) =>
      createKnowledge({
        type: "tezis",
        title: proposal.title,
        body: proposal.body,
        viral_score: proposal.viral_score,
        pillar: proposal.pillar,
        tags: proposal.tags,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KNOWLEDGE_QUERY_KEY });
      onSaved?.();
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : "Не удалось сохранить тезис",
      ),
  });

  const onSave = async (i: number, p: BrainDumpProposal) => {
    if (savedIndexes.has(i)) return;
    try {
      await saveMutation.mutateAsync(p);
      setSavedIndexes((prev) => {
        const next = new Set(prev);
        next.add(i);
        return next;
      });
      toast.success("Сохранено в банк");
    } catch {
      // toast already shown in onError
    }
  };

  const onSaveAll = async () => {
    for (let i = 0; i < proposals.length; i += 1) {
      if (savedIndexes.has(i)) continue;
      await onSave(i, proposals[i]);
    }
  };

  const onReset = () => {
    setProposals([]);
    setSavedIndexes(new Set());
    setText("");
  };

  return (
    <div className="card" style={{ padding: 20, marginBottom: 16 }}>
      <div className="cap" style={{ marginBottom: 12 }}>разобрать мысль</div>

      <div className="mb-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Например: «вчера понял, что AI-агенты заменяют не разработчиков, а Trello — это вот это вот про tooling vs job replacement»"
          rows={6}
          className="w-full resize-y rounded-xl border border-border bg-card/50 p-4 text-[14px] leading-relaxed text-foreground placeholder:text-muted-foreground focus:border-warn/60 focus:outline-none focus:ring-1 focus:ring-warn/40"
          maxLength={8000}
          disabled={dumpMutation.isPending}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              if (text.trim().length >= 5 && !dumpMutation.isPending) {
                dumpMutation.mutate();
              }
            }
          }}
        />
        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{text.length} / 8000 · Cmd+Enter — разобрать</span>
          {proposals.length > 0 && (
            <button
              type="button"
              className="text-warn hover:text-warn"
              onClick={onReset}
            >
              Очистить
            </button>
          )}
        </div>
      </div>

      <div className="mb-8 flex items-center gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => dumpMutation.mutate()}
          disabled={text.trim().length < 5 || dumpMutation.isPending}
        >
          {dumpMutation.isPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Wand2 size={14} />
          )}
          Разобрать на тезисы
        </button>
        {proposals.length > 0 && savedIndexes.size < proposals.length && (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card/40 px-4 py-2 text-sm font-medium hover:bg-card/60 disabled:opacity-60"
            onClick={onSaveAll}
            disabled={saveMutation.isPending}
          >
            Сохранить все ({proposals.length - savedIndexes.size})
          </button>
        )}
      </div>

      {dumpMutation.isPending && (
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-card/40 px-4 py-6 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" />
          Разбираю…
        </div>
      )}

      {proposals.length > 0 && (
        <div className="space-y-3">
          {proposals.map((p, i) => (
            <ProposalCard
              key={i}
              proposal={p}
              saved={savedIndexes.has(i)}
              saving={saveMutation.isPending}
              onSave={() => void onSave(i, p)}
            />
          ))}
        </div>
      )}
    </div>
  );
}


function ProposalCard({
  proposal: p,
  saved,
  saving,
  onSave,
}: {
  proposal: BrainDumpProposal;
  saved: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <div
      className={`rounded-xl border p-4 transition ${
        saved
          ? "border-success/40 bg-success/[0.06]"
          : "border-border bg-card/40 hover:border-warn/30"
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="text-[15px] font-semibold leading-snug text-foreground">
            {p.title}
          </div>
          {p.body && p.body !== p.title && (
            <div className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
              {p.body}
            </div>
          )}
        </div>
        <button
          type="button"
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition ${
            saved
              ? "bg-success/20 text-success cursor-default"
              : "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60"
          }`}
          onClick={onSave}
          disabled={saved || saving}
        >
          {saved ? (
            <>
              <Check size={12} /> В банке
            </>
          ) : (
            <>
              <Sparkles size={12} /> Сохранить
            </>
          )}
        </button>
      </div>
      <div className="flex items-center gap-2 text-[11px]">
        <span className="rounded-sm bg-warn/20 px-1.5 py-0.5 font-medium text-warn">
          Score {p.viral_score}/20
        </span>
        {p.pillar && (
          <span className="rounded-sm bg-content/20 px-1.5 py-0.5 font-medium text-content">
            {p.pillar}
          </span>
        )}
        {p.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {p.tags.map((t) => (
              <span
                key={t}
                className="rounded-sm bg-foreground/5 px-1.5 py-0.5 text-muted-foreground"
              >
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


function pluralRu(n: number): string {
  // 1 тезис, 2-4 тезиса, 5-20 тезисов
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return "ов";
  if (mod10 === 1) return "";
  if (mod10 >= 2 && mod10 <= 4) return "а";
  return "ов";
}
