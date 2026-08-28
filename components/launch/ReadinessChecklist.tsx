"use client";

/**
 * Вторая дорожка запуска: готовность продукта.
 *
 * Все проверки методологии — про контент. Ни одна не про то, что продавать
 * будет нечего: прогрев может отработать идеально, а платёжка окажется не
 * подключена, и цена такой ошибки равна всему запуску.
 */

import * as React from "react";
import { Check } from "lucide-react";

import { READINESS_LABELS } from "@/lib/launches";
import { cn } from "@/lib/utils";

export function ReadinessChecklist({
  readiness,
  onChange,
  disabled,
}: {
  readiness: Record<string, boolean>;
  onChange: (next: Record<string, boolean>) => void;
  disabled?: boolean;
}) {
  const keys = Object.keys(READINESS_LABELS);
  const done = keys.filter((k) => readiness[k]).length;
  const allDone = done === keys.length;

  return (
    <section className="flex flex-col gap-3">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">Готовность продукта</h2>
        <span
          className={cn(
            "text-xs tabular-nums",
            allDone ? "text-success" : "text-muted-foreground",
          )}
        >
          {done} из {keys.length}
        </span>
      </header>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Проверка контента этого не видит. Если продавать будет нечего,
        идеальный прогрев не поможет.
      </p>

      <ul className="overflow-hidden rounded-xl border border-border bg-card">
        {keys.map((key) => {
          const checked = Boolean(readiness[key]);
          return (
            <li key={key} className="border-b border-border last:border-b-0">
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-muted/40",
                  disabled && "cursor-not-allowed opacity-60",
                )}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checked}
                  disabled={disabled}
                  onChange={(e) =>
                    onChange({ ...readiness, [key]: e.target.checked })
                  }
                />
                <span
                  className={cn(
                    "flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border transition-colors",
                    checked
                      ? "border-success bg-success text-white"
                      : "border-border",
                  )}
                  style={{ height: "1.125rem", width: "1.125rem" }}
                >
                  {checked && <Check className="h-3 w-3" />}
                </span>
                <span className={cn(checked && "text-muted-foreground")}>
                  {READINESS_LABELS[key]}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
