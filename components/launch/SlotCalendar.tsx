"use client";

/**
 * Календарь слотов запуска.
 *
 * Пустой слот здесь всегда объясняет, почему он пуст: молчаливая дыра в
 * плане — это день, в который человек не понимает, что снимать.
 */

import * as React from "react";
import { Check, CircleAlert, Pin } from "lucide-react";

import { CHANNEL_LABELS, type LaunchSlot } from "@/lib/launches";

const MEANING_LABELS: Record<string, string> = {
  background: "Фон",
  lifestyle: "Стиль жизни",
  topic: "Продажа темы",
  expertise: "Экспертиза",
  newsjack: "Инфоповод",
  clients: "Клиенты",
  students: "Ученики",
  product: "Продукт",
  hype: "Ажиотаж",
  freebie: "Бесплатник",
  sales: "Продажи",
  objections: "Возражения",
};

function groupByDay(slots: LaunchSlot[]): Array<[string, LaunchSlot[]]> {
  const map = new Map<string, LaunchSlot[]>();
  for (const slot of slots) {
    const key = slot.scheduled_date ?? "без даты";
    map.set(key, [...(map.get(key) ?? []), slot]);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export function SlotCalendar({
  slots,
  onConfirm,
}: {
  slots: LaunchSlot[];
  onConfirm?: (slot: LaunchSlot) => void;
}) {
  const days = React.useMemo(() => groupByDay(slots), [slots]);

  if (slots.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        План ещё не развёрнут. Нажмите «Собрать план» — система разложит
        календарь назад от даты продаж.
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold">Календарь</h2>
      <ul className="flex flex-col gap-2">
        {days.map(([day, daySlots]) => (
          <li key={day} className="rounded-md border">
            <div className="flex items-center justify-between border-b px-3 py-1.5">
              <span className="text-xs font-medium">{day}</span>
              {daySlots.some((s) => s.is_last_day) && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                  последний день продаж
                </span>
              )}
            </div>
            <div className="flex flex-col divide-y">
              {daySlots.map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-start justify-between gap-3 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {CHANNEL_LABELS[slot.platform] ?? slot.platform}
                      </span>
                      <span className="font-medium">
                        {slot.meaning
                          ? MEANING_LABELS[slot.meaning] ?? slot.meaning
                          : "без рубрики"}
                      </span>
                      {slot.is_pinned && (
                        <Pin className="h-3 w-3 text-muted-foreground" />
                      )}
                      {slot.markup_origin === "human" && (
                        <Check className="h-3 w-3 text-emerald-600" />
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-sm">
                      {slot.talking_point_text ?? (
                        <span className="text-muted-foreground">
                          {slot.notes ?? "идея не подобрана"}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {!slot.knowledge_item_id && (
                      <CircleAlert
                        className="h-4 w-4 text-amber-500"
                        aria-label="Слот без идеи"
                      />
                    )}
                    {onConfirm && slot.markup_origin !== "human" && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={() => onConfirm(slot)}
                      >
                        Подтвердить
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
