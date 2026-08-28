"use client";

/**
 * Панель находок.
 *
 * Главный экран модуля: не «покрытие 87%», а «ты ни разу не показал, что у
 * тебя не получалось, и вот в какие дни это чинится». Проценты здесь
 * намеренно не показываются — они не говорят человеку, что делать.
 */

import * as React from "react";
import { AlertTriangle, CheckCircle2, HelpCircle, Info } from "lucide-react";

import type { Finding, LaunchReport } from "@/lib/launches";
import { SEVERITY_LABELS } from "@/lib/launches";

const SEVERITY_STYLES: Record<Finding["severity"], string> = {
  critical: "border-l-red-500 bg-red-50/60 dark:bg-red-950/20",
  high: "border-l-amber-500 bg-amber-50/60 dark:bg-amber-950/20",
  medium: "border-l-slate-400 bg-slate-50/60 dark:bg-slate-900/30",
};

function formatDays(days: string[]): string {
  if (days.length === 0) return "";
  const shown = days.slice(0, 3).map((d) => d.slice(8, 10) + "." + d.slice(5, 7));
  const tail = days.length > 3 ? ` и ещё ${days.length - 3}` : "";
  return shown.join(", ") + tail;
}

export function FindingsPanel({
  report,
  isLoading,
}: {
  report?: LaunchReport;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        Проверяю прогрев…
      </div>
    );
  }
  if (!report) return null;

  const critical = report.findings.filter((f) => f.severity === "critical");

  return (
    <section className="flex flex-col gap-3">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Проверка прогрева</h2>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span title="Смыслы, подтверждённые вручную">
            смыслы: {report.checkpoints_confirmed} из {report.checkpoints_total}
          </span>
          <span title="Психологические рычаги, задействованные хотя бы раз">
            рычаги: {report.triggers_used} из {report.triggers_total}
          </span>
          <span title="Слоты, под которые подобрана идея">
            с идеей: {report.slots_with_idea} из {report.slots_total}
          </span>
        </div>
      </header>

      {report.checkpoints_claimed > report.checkpoints_confirmed && (
        <div className="flex items-start gap-2 rounded-md border bg-muted/40 p-3 text-xs">
          <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-muted-foreground">
            Ещё {report.checkpoints_claimed - report.checkpoints_confirmed}{" "}
            смыслов размечены автоматически. Пока вы их не подтвердите, они не
            идут в зачёт: разметка по ключевым словам ошибается, а уверенное
            «всё готово» обходится дороже честного «не проверено».
          </p>
        </div>
      )}

      {report.ready && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-50/60 p-3 text-sm dark:bg-emerald-950/20">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>
            Критичных пропусков нет. Оставшиеся замечания ниже — на ваше
            усмотрение.
          </span>
        </div>
      )}

      {critical.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {critical.length === 1
            ? "Одна вещь способна стоить вам продаж:"
            : `${critical.length} вещи способны стоить вам продаж:`}
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {report.findings.map((finding) => (
          <li
            key={finding.code}
            className={`rounded-md border border-l-4 p-3 ${SEVERITY_STYLES[finding.severity]}`}
          >
            <div className="flex items-start gap-2">
              {finding.severity === "critical" ? (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              ) : (
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{finding.title}</span>
                  <span className="rounded-full border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {SEVERITY_LABELS[finding.severity]}
                  </span>
                  {!finding.verified && (
                    <span className="rounded-full border border-dashed px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      не проверено вручную
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {finding.message}
                </p>
                {finding.fix_days.length > 0 && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Чинится в днях: {formatDays(finding.fix_days)}
                  </p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
