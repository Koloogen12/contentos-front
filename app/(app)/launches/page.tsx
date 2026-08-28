"use client";

/**
 * Список запусков.
 *
 * Прогрев живёт отдельным пространством, а не вкладкой контент-плана:
 * у запуска своя драматургия и своя плотность публикаций, и если смешать
 * его с регулярным блогом, через месяц не понять, где что.
 */

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Loader2, Plus, Rocket } from "lucide-react";
import { toast } from "sonner";

import { ApiError } from "@/lib/api";
import {
  archiveLaunch,
  createLaunch,
  listLaunches,
  type LaunchOut,
} from "@/lib/launches";

const LAUNCHES_KEY = ["launches"];

const STATUS_LABELS: Record<string, string> = {
  draft: "Черновик",
  active: "Идёт",
  paused: "На паузе",
  done: "Завершён",
  archived: "В архиве",
};

function daysLeft(iso: string): number {
  const target = new Date(`${iso}T00:00:00`);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86_400_000);
}

function formatRunway(days: number): string {
  if (days < 0) return "продажи уже открыты";
  if (days === 0) return "продажи открываются сегодня";
  if (days === 1) return "до продаж 1 день";
  if (days < 5) return `до продаж ${days} дня`;
  return `до продаж ${days} дней`;
}

export default function LaunchesPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = React.useState(false);
  const [name, setName] = React.useState("");
  const [salesOpen, setSalesOpen] = React.useState("");

  const { data: launches, isLoading } = useQuery({
    queryKey: LAUNCHES_KEY,
    queryFn: () => listLaunches(),
  });

  const createMutation = useMutation({
    mutationFn: () => createLaunch({ name: name.trim(), sales_open: salesOpen }),
    onSuccess: (launch) => {
      toast.success(`Запуск «${launch.name}» создан`);
      setCreating(false);
      setName("");
      setSalesOpen("");
      qc.invalidateQueries({ queryKey: LAUNCHES_KEY });
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError ? error.detail : "Не удалось создать запуск",
      );
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => archiveLaunch(id),
    onSuccess: () => {
      toast.success("Запуск в архиве. Опубликованное сохранено");
      qc.invalidateQueries({ queryKey: LAUNCHES_KEY });
    },
  });

  const canCreate = name.trim().length > 0 && salesOpen.length > 0;

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Запуски</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Прогрев к дате продаж: календарь по этапам и проверка, чего в нём
            не хватает. Единицы запуска не смешиваются с обычным планом.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-sm shrink-0"
          onClick={() => setCreating((v) => !v)}
        >
          <Plus className="mr-1 h-4 w-4" />
          Новый запуск
        </button>
      </header>

      {creating && (
        <section className="mb-8 rounded-lg border bg-card p-4">
          <h2 className="mb-1 text-sm font-semibold">Новый запуск</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Нужна одна дата — когда открываются продажи. Всё остальное
            развернётся назад от неё.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex-1 text-xs font-medium">
              Название
              <input
                className="input mt-1 w-full"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Например: третий поток курса"
              />
            </label>
            <label className="text-xs font-medium">
              Открытие продаж
              <input
                type="date"
                className="input mt-1 w-full"
                value={salesOpen}
                onChange={(e) => setSalesOpen(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={!canCreate || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Создать"
              )}
            </button>
          </div>
        </section>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Загружаю запуски
        </div>
      )}

      {!isLoading && launches?.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Rocket className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Запусков пока нет</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Создайте первый — укажите только дату открытия продаж, и система
            развернёт календарь прогрева назад от неё, а потом покажет, каких
            смыслов в нём не хватает.
          </p>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {launches?.map((launch: LaunchOut) => {
          const left = daysLeft(launch.sales_open);
          const urgent = left >= 0 && left <= 7;
          return (
            <li key={launch.id}>
              <div className="flex items-center justify-between gap-4 rounded-lg border bg-card p-4">
                <Link href={`/launches/${launch.id}`} className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{launch.name}</span>
                    <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                      {STATUS_LABELS[launch.status] ?? launch.status}
                    </span>
                    {launch.launch_number > 1 && (
                      <span className="text-[11px] text-muted-foreground">
                        поток №{launch.launch_number}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5" />
                    <span className={urgent ? "font-medium text-amber-600" : ""}>
                      {formatRunway(left)}
                    </span>
                    <span>·</span>
                    <span>продажи с {launch.sales_open}</span>
                  </div>
                </Link>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs shrink-0"
                  onClick={() => archiveMutation.mutate(launch.id)}
                >
                  В архив
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
