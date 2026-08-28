"use client";

/**
 * Календарь слотов запуска.
 *
 * Была плоская лента дней с кнопкой «Подтвердить» в каждой строке: на
 * стодневном прогреве это сотня одинаковых кнопок и ни одного ориентира,
 * где ты находишься. Здесь дни собраны в этапы, подтверждение — иконка,
 * а разбор завалов начинается с фильтра «без идеи».
 *
 * Пустой слот всегда объясняет, почему он пуст: молчаливая дыра в плане —
 * это день, в который человек не понимает, что снимать.
 */

import * as React from "react";
import { Check, ChevronDown, CircleAlert, Pin } from "lucide-react";

import {
  CHANNEL_LABELS,
  MEANING_LABELS,
  STAGE_TONE,
  formatDay,
  type LaunchSlot,
  type StageWindow,
} from "@/lib/launches";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Filter = "all" | "empty" | "unconfirmed";

function isConfirmed(slot: LaunchSlot): boolean {
  return slot.markup_origin === "human";
}

export function SlotCalendar({
  slots,
  windows,
  onConfirm,
  onConfirmMany,
}: {
  slots: LaunchSlot[];
  windows: StageWindow[];
  onConfirm?: (slot: LaunchSlot) => void;
  onConfirmMany?: (slots: LaunchSlot[]) => void;
}) {
  const [filter, setFilter] = React.useState<Filter>("all");
  const [collapsed, setCollapsed] = React.useState<Set<number>>(new Set());

  const emptyCount = slots.filter((s) => !s.knowledge_item_id).length;
  const unconfirmedCount = slots.filter((s) => !isConfirmed(s)).length;

  const visible = React.useMemo(() => {
    if (filter === "empty") return slots.filter((s) => !s.knowledge_item_id);
    if (filter === "unconfirmed") return slots.filter((s) => !isConfirmed(s));
    return slots;
  }, [slots, filter]);

  /** Слоты → этап → день. Порядок этапов задаёт сам план. */
  const grouped = React.useMemo(() => {
    const byStage = new Map<number, Map<string, LaunchSlot[]>>();
    for (const slot of visible) {
      const stage = slot.launch_stage ?? 0;
      const day = slot.scheduled_date ?? "без даты";
      if (!byStage.has(stage)) byStage.set(stage, new Map());
      const days = byStage.get(stage)!;
      days.set(day, [...(days.get(day) ?? []), slot]);
    }
    return [...byStage.entries()]
      .sort(([a], [b]) => a - b)
      .map(([stage, days]) => ({
        stage,
        window: windows.find((w) => w.stage === stage),
        days: [...days.entries()].sort(([a], [b]) => a.localeCompare(b)),
      }));
  }, [visible, windows]);

  if (slots.length === 0) return null;

  const filters: Array<{ key: Filter; label: string; count?: number }> = [
    { key: "all", label: "Все", count: slots.length },
    { key: "empty", label: "Без идеи", count: emptyCount },
    { key: "unconfirmed", label: "Не подтверждено", count: unconfirmedCount },
  ];

  return (
    <section className="flex flex-col gap-3">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Календарь</h2>
        <div className="flex flex-wrap gap-1">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs transition-colors",
                filter === f.key
                  ? "border-foreground/20 bg-foreground/[0.07] font-medium"
                  : "border-transparent text-muted-foreground hover:bg-muted",
              )}
            >
              {f.label}
              {typeof f.count === "number" && (
                <span className="ml-1 tabular-nums opacity-60">{f.count}</span>
              )}
            </button>
          ))}
        </div>
      </header>

      {visible.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Здесь пусто — по этому фильтру ничего не осталось.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {grouped.map(({ stage, window: win, days }) => {
            const stageSlots = days.flatMap(([, s]) => s);
            const stageUnconfirmed = stageSlots.filter((s) => !isConfirmed(s));
            const isCollapsed = collapsed.has(stage);

            return (
              <div
                key={stage}
                className="overflow-hidden rounded-xl border border-border bg-card"
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsed((prev) => {
                        const next = new Set(prev);
                        next.has(stage) ? next.delete(stage) : next.add(stage);
                        return next;
                      })
                    }
                    className="flex min-w-0 items-center gap-2 text-left"
                  >
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                        isCollapsed && "-rotate-90",
                      )}
                    />
                    <span
                      className={cn(
                        "h-2 w-2 shrink-0 rounded-full",
                        STAGE_TONE[stage] ?? "bg-muted",
                      )}
                    />
                    <span className="truncate text-sm font-medium">
                      {win?.title ?? `Этап ${stage}`}
                    </span>
                  </button>
                  {win && (
                    <span className="text-xs text-muted-foreground">
                      {formatDay(win.start)} — {formatDay(win.end)}
                    </span>
                  )}
                  <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
                    {stageSlots.length}
                  </span>
                  {onConfirmMany && stageUnconfirmed.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onConfirmMany(stageUnconfirmed)}
                    >
                      Подтвердить этап
                    </Button>
                  )}
                </div>

                {!isCollapsed &&
                  days.map(([day, daySlots]) => (
                    <div key={day} className="border-b border-border last:border-b-0">
                      <div className="flex items-center gap-2 bg-muted/40 px-3 py-1">
                        <span className="text-xs font-medium tabular-nums">
                          {day === "без даты" ? day : formatDay(day)}
                        </span>
                        {daySlots.some((s) => s.is_last_day) && (
                          <span className="rounded-full bg-accent2/15 px-2 py-0.5 text-[10px] font-medium text-accent2">
                            последний день продаж
                          </span>
                        )}
                      </div>
                      <ul>
                        {daySlots.map((slot) => (
                          <li
                            key={slot.id}
                            className="group flex items-center gap-3 px-3 py-2 hover:bg-muted/30"
                          >
                            <span className="w-16 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                              {CHANNEL_LABELS[slot.platform] ?? slot.platform}
                            </span>
                            <span className="w-28 shrink-0 truncate text-xs font-medium">
                              {slot.meaning
                                ? MEANING_LABELS[slot.meaning] ?? slot.meaning
                                : "без рубрики"}
                            </span>
                            <span
                              className={cn(
                                "min-w-0 flex-1 truncate text-sm",
                                !slot.talking_point_text && "text-muted-foreground",
                              )}
                            >
                              {slot.talking_point_text ??
                                slot.notes ??
                                "идея не подобрана"}
                            </span>
                            {slot.is_pinned && (
                              <Pin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            )}
                            {!slot.knowledge_item_id && (
                              <CircleAlert
                                className="h-4 w-4 shrink-0 text-warn"
                                aria-label="Слот без идеи"
                              />
                            )}
                            {isConfirmed(slot) ? (
                              <Check
                                className="h-4 w-4 shrink-0 text-success"
                                aria-label="Разметка подтверждена"
                              />
                            ) : (
                              onConfirm && (
                                <button
                                  type="button"
                                  onClick={() => onConfirm(slot)}
                                  title="Подтвердить разметку — только подтверждённая идёт в зачёт"
                                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground opacity-0 transition-opacity hover:border-success hover:text-success focus-visible:opacity-100 group-hover:opacity-100"
                                >
                                  <Check className="h-3 w-3" />
                                </button>
                              )
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
