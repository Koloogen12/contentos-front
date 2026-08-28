"use client";

/**
 * Проверка прогрева.
 *
 * Раньше панель открывалась стеной красных карточек — на пустом запуске их
 * было семь, ещё до того как человек хоть что-то сделал. Тон был выбран
 * неверно: инструмент отчитывал за работу, которая не начиналась.
 *
 * Теперь сверху видно продвижение, критичное развёрнуто, остальное убрано
 * под «показать ещё». Проценты по-прежнему не показываем: «покрытие 87%»
 * не говорит человеку, что делать, — а «поставьте это в такие-то дни»
 * говорит.
 */

import * as React from "react";
import { AlertTriangle, CheckCircle2, HelpCircle, Info } from "lucide-react";

import type { Finding, LaunchReport } from "@/lib/launches";
import { SEVERITY_LABELS, formatDay } from "@/lib/launches";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SEVERITY_STYLES: Record<Finding["severity"], string> = {
  critical: "border-l-destructive bg-destructive/[0.06]",
  high: "border-l-warn bg-warn/[0.07]",
  medium: "border-l-border bg-muted/40",
};

function Meter({
  label,
  value,
  total,
  hint,
}: {
  label: string;
  value: number;
  total: number;
  hint: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-1.5" title={hint}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium tabular-nums">
        {value}{" "}
        <span className="text-xs font-normal text-muted-foreground">
          из {total}
        </span>
      </span>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            pct === 100 ? "bg-success" : pct > 0 ? "bg-accent2" : "bg-transparent",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function FindingsPanel({
  report,
  isLoading,
}: {
  report?: LaunchReport;
  isLoading?: boolean;
}) {
  const [expanded, setExpanded] = React.useState(false);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
        Проверяю прогрев…
      </div>
    );
  }
  if (!report) return null;

  const findings = report.findings;
  const critical = findings.filter((f) => f.severity === "critical");
  const rest = findings.filter((f) => f.severity !== "critical");
  const shown = expanded ? findings : critical;
  const hidden = findings.length - shown.length;

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">Проверка прогрева</h2>
        <span
          className={cn(
            "text-xs",
            report.ready ? "text-success" : "text-muted-foreground",
          )}
        >
          {report.ready
            ? "критичных пропусков нет"
            : `${critical.length} критичных · ${rest.length} на ваше усмотрение`}
        </span>
      </header>

      <div className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-3">
        <Meter
          label="Смыслы закрыты"
          value={report.checkpoints_confirmed}
          total={report.checkpoints_total}
          hint="Смыслы, которые вы подтвердили вручную. Автоматическая разметка в зачёт не идёт."
        />
        <Meter
          label="Рычаги задействованы"
          value={report.triggers_used}
          total={report.triggers_total}
          hint="Психологические рычаги, использованные хотя бы раз в подтверждённых слотах."
        />
        <Meter
          label="Слоты с идеей"
          value={report.slots_with_idea}
          total={report.slots_total}
          hint="Сколько дней плана обеспечены материалом из банка."
        />
      </div>

      {report.checkpoints_claimed > report.checkpoints_confirmed && (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3">
          <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Ещё {report.checkpoints_claimed - report.checkpoints_confirmed}{" "}
            смыслов размечены автоматически. Пока вы их не подтвердите, они не
            идут в зачёт: разметка по ключевым словам ошибается, а уверенное
            «всё готово» обходится дороже честного «не проверено».
          </p>
        </div>
      )}

      {report.ready && (
        <div className="flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 p-3 text-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
          <span>
            Критичных пропусков нет. Оставшиеся замечания — на ваше усмотрение.
          </span>
        </div>
      )}

      {shown.length > 0 && (
        <ul className="flex flex-col gap-2">
          {shown.map((finding) => (
            <li
              key={finding.code}
              className={cn(
                "rounded-lg border border-l-[3px] border-border p-3",
                SEVERITY_STYLES[finding.severity],
              )}
            >
              <div className="flex items-start gap-2.5">
                {finding.severity === "critical" ? (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                ) : (
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{finding.title}</span>
                    <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {SEVERITY_LABELS[finding.severity]}
                    </span>
                    {!finding.verified && (
                      <span className="rounded-full border border-dashed border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        не проверено вручную
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {finding.message}
                  </p>
                  {finding.fix_days.length > 0 && (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Чинится в днях:{" "}
                      {finding.fix_days.slice(0, 3).map(formatDay).join(", ")}
                      {finding.fix_days.length > 3 &&
                        ` и ещё ${finding.fix_days.length - 3}`}
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {hidden > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="self-start px-0"
          onClick={() => setExpanded(true)}
        >
          Показать ещё {hidden}
        </Button>
      )}
      {expanded && findings.length > critical.length && (
        <Button
          variant="ghost"
          size="sm"
          className="self-start px-0"
          onClick={() => setExpanded(false)}
        >
          Свернуть
        </Button>
      )}
    </section>
  );
}
