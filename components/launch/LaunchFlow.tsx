"use client";

/**
 * Сценарий запуска: три шага в жёстком порядке.
 *
 * Первая версия давала три равнозначные кнопки в углу шапки. Порядок в них
 * был обязательным, но нигде не назван, поэтому «Подобрать идеи» на пустом
 * запуске честно возвращала «подобрано 0» — и с той стороны экрана это
 * неотличимо от неработающей кнопки. Здесь шаг, до которого дело не дошло,
 * выключен и объясняет, чего ждёт.
 */

import * as React from "react";
import { Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FlowStep {
  /** Что делает шаг — глаголом. */
  title: string;
  /** Что произойдёт после нажатия. Одна строка, без методологии. */
  hint: string;
  /** Текущее состояние: «49 из 50 размечено», «план не собран». */
  state: string;
  done: boolean;
  /** Причина, по которой шаг пока недоступен. Пусто — шаг доступен. */
  blockedBy?: string;
  action?: {
    label: string;
    onClick: () => void;
    pending?: boolean;
  };
}

export function LaunchFlow({ steps }: { steps: FlowStep[] }) {
  // Текущий — первый невыполненный и незаблокированный.
  const currentIndex = steps.findIndex((s) => !s.done && !s.blockedBy);

  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {steps.map((step, i) => {
          const isCurrent = i === currentIndex;
          const blocked = Boolean(step.blockedBy);

          return (
            <div
              key={step.title}
              className={cn(
                "flex flex-col gap-2 p-4",
                isCurrent && "bg-accent2/[0.06]",
                blocked && "opacity-55",
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    step.done
                      ? "bg-success/20 text-success"
                      : isCurrent
                        ? "bg-accent2 text-white"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {step.done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className="text-sm font-semibold">{step.title}</span>
              </div>

              <p className="text-xs leading-relaxed text-muted-foreground">
                {blocked ? step.blockedBy : step.hint}
              </p>

              <div className="mt-auto flex flex-col gap-2 pt-1">
                <span
                  className={cn(
                    "text-xs",
                    step.done ? "text-success" : "text-muted-foreground",
                  )}
                >
                  {step.state}
                </span>
                {step.action && !blocked && (
                  <Button
                    size="sm"
                    variant={isCurrent ? "default" : "outline"}
                    className="w-full"
                    onClick={step.action.onClick}
                    disabled={step.action.pending}
                  >
                    {step.action.pending && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    )}
                    {step.action.label}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
