"use client";

/**
 * Вторая дорожка запуска: готовность продукта.
 *
 * Все проверки методологии — про контент. Ни одна не про то, что продавать
 * будет нечего: прогрев может отработать идеально, а платёжка окажется не
 * подключена, и цена такой ошибки равна всему запуску.
 */

import * as React from "react";

import { READINESS_LABELS } from "@/lib/launches";

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

  return (
    <section className="flex flex-col gap-2">
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Готовность продукта</h2>
        <span className="text-xs text-muted-foreground">
          {done} из {keys.length}
        </span>
      </header>
      <p className="text-xs text-muted-foreground">
        Проверка контента этого не видит. Если продавать будет нечего, идеальный
        прогрев не поможет.
      </p>
      <ul className="flex flex-col gap-1">
        {keys.map((key) => (
          <li key={key}>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(readiness[key])}
                disabled={disabled}
                onChange={(e) =>
                  onChange({ ...readiness, [key]: e.target.checked })
                }
              />
              <span className={readiness[key] ? "text-muted-foreground line-through" : ""}>
                {READINESS_LABELS[key]}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
