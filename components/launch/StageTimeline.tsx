"use client";

/**
 * Ось запуска: семь этапов от мягкого прогрева до закрытия продаж.
 *
 * Работает в двух режимах. Пока плана нет — показывает, что человек
 * получит, из типовых длительностей: раньше до нажатия кнопки экран не
 * давал ни одной подсказки о результате. Когда план собран — показывает
 * реальные окна и наполнение каждого этапа.
 *
 * Ось намеренно продолжается за дату открытия продаж: в методологии
 * первоисточника этапы там обрываются, хотя именно в окне продаж делается
 * заметная часть выручки.
 */

import * as React from "react";
import { AlertTriangle } from "lucide-react";

import { STAGE_TONE, formatDay, type StageWindow } from "@/lib/launches";
import { cn } from "@/lib/utils";

export interface StageRow {
  stage: number;
  title: string;
  purpose: string;
  days: number;
  /** Реальные даты. В режиме предпросмотра их нет. */
  start?: string;
  end?: string;
  slots?: number;
  withIdea?: number;
}

function pluralDays(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} день`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} дня`;
  return `${n} дней`;
}

export function StageTimeline({
  rows,
  compressed,
  dropped,
  preview,
}: {
  rows: StageRow[];
  compressed?: string[];
  dropped?: string[];
  /** true — плана ещё нет, показываем ожидаемую форму. */
  preview?: boolean;
}) {
  const total = rows.reduce((sum, r) => sum + r.days, 0) || 1;

  return (
    <section className="flex flex-col gap-3">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">
          {preview ? "Что получится" : "Этапы запуска"}
        </h2>
        <span className="text-xs text-muted-foreground">
          {rows.length} этапов, {pluralDays(total)}
        </span>
      </header>

      {preview && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          План разворачивается назад от даты продаж: каждому этапу свои дни,
          каналы и рубрики. Даты появятся после сборки.
        </p>
      )}

      <div className="flex h-2.5 w-full overflow-hidden rounded-full">
        {rows.map((r) => (
          <div
            key={r.stage}
            className={cn(STAGE_TONE[r.stage] ?? "bg-muted", "min-w-[3px]")}
            style={{ width: `${(r.days / total) * 100}%` }}
            title={`${r.title} — ${pluralDays(r.days)}`}
          />
        ))}
      </div>

      <ul className="flex flex-col gap-px overflow-hidden rounded-lg border border-border bg-card">
        {rows.map((r) => (
          <li
            key={r.stage}
            className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border px-3 py-2.5 last:border-b-0"
          >
            <span
              className={cn(
                "h-2 w-2 shrink-0 translate-y-[-1px] rounded-full",
                STAGE_TONE[r.stage] ?? "bg-muted",
              )}
            />
            <span className="text-sm font-medium">{r.title}</span>
            <span className="text-xs text-muted-foreground">
              {r.start && r.end
                ? `${formatDay(r.start)} — ${formatDay(r.end)}`
                : pluralDays(r.days)}
            </span>
            {typeof r.slots === "number" && (
              <span
                className={cn(
                  "ml-auto shrink-0 text-xs tabular-nums",
                  r.withIdea === r.slots
                    ? "text-muted-foreground"
                    : "text-warn",
                )}
              >
                {r.withIdea} из {r.slots} с идеей
              </span>
            )}
            <p className="w-full text-xs leading-relaxed text-muted-foreground">
              {r.purpose}
            </p>
          </li>
        ))}
      </ul>

      {(compressed?.length || dropped?.length) ? (
        <div className="flex items-start gap-2 rounded-lg border border-warn/40 bg-warn/10 p-3 text-xs">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
          <div>
            <p className="font-medium">До продаж мало времени — план урезан</p>
            <ul className="mt-1 list-disc pl-4 text-muted-foreground">
              {dropped?.map((d) => <li key={d}>{d}</li>)}
              {compressed?.map((c) => <li key={c}>{c}</li>)}
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}

/** Свести реальные окна и слоты в строки оси. */
export function rowsFromWindows(
  windows: StageWindow[],
  counts: Map<number, { slots: number; withIdea: number }>,
): StageRow[] {
  return windows.map((w) => ({
    stage: w.stage,
    title: w.title,
    purpose: w.purpose,
    days: w.days,
    start: w.start,
    end: w.end,
    slots: counts.get(w.stage)?.slots ?? 0,
    withIdea: counts.get(w.stage)?.withIdea ?? 0,
  }));
}
