"use client";

/**
 * Ось запуска: семь этапов от мягкого прогрева до закрытия продаж.
 *
 * Ось намеренно продолжается за дату открытия продаж — в методологии
 * первоисточника этапы там обрываются, хотя именно в окне продаж делается
 * заметная часть выручки.
 */

import * as React from "react";

import type { StageWindow } from "@/lib/launches";

const STAGE_TONE: Record<number, string> = {
  1: "bg-slate-200 dark:bg-slate-800",
  2: "bg-sky-200 dark:bg-sky-900",
  3: "bg-sky-300 dark:bg-sky-800",
  4: "bg-teal-300 dark:bg-teal-800",
  5: "bg-teal-400 dark:bg-teal-700",
  6: "bg-amber-400 dark:bg-amber-700",
  7: "bg-rose-400 dark:bg-rose-800",
};

export function StageTimeline({
  windows,
  compressed,
  dropped,
}: {
  windows: StageWindow[];
  compressed?: string[];
  dropped?: string[];
}) {
  const total = windows.reduce((sum, w) => sum + w.days, 0) || 1;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold">Этапы запуска</h2>

      <div className="flex w-full overflow-hidden rounded-md border">
        {windows.map((w) => (
          <div
            key={w.stage}
            className={`${STAGE_TONE[w.stage] ?? "bg-slate-200"} min-w-[2px] px-1 py-2`}
            style={{ width: `${(w.days / total) * 100}%` }}
            title={`${w.title}: ${w.start} — ${w.end} (${w.days} дн.) · ${w.purpose}`}
          />
        ))}
      </div>

      <ul className="grid gap-1.5 sm:grid-cols-2">
        {windows.map((w) => (
          <li key={w.stage} className="flex items-baseline gap-2 text-xs">
            <span
              className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${STAGE_TONE[w.stage] ?? "bg-slate-300"}`}
            />
            <span className="font-medium">{w.title}</span>
            <span className="text-muted-foreground">
              {w.start} — {w.end}, {w.days} дн.
            </span>
          </li>
        ))}
      </ul>

      {(compressed?.length || dropped?.length) ? (
        <div className="rounded-md border border-amber-400/50 bg-amber-50/60 p-3 text-xs dark:bg-amber-950/20">
          <p className="font-medium">До продаж мало времени — план урезан</p>
          <ul className="mt-1 list-disc pl-4 text-muted-foreground">
            {dropped?.map((d) => <li key={d}>{d}</li>)}
            {compressed?.map((c) => <li key={c}>{c}</li>)}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
