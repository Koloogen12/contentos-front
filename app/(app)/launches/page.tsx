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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/EmptyState";
import {
  archiveLaunch,
  createLaunch,
  listLaunches,
  formatDay,
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
        <Button className="shrink-0" onClick={() => setCreating((v) => !v)}>
          <Plus className="h-4 w-4" />
          Новый запуск
        </Button>
      </header>

      {creating && (
        <section className="mb-8 rounded-xl border border-border bg-card p-4">
          <h2 className="mb-1 text-sm font-semibold">Новый запуск</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Нужна одна дата — когда открываются продажи. Всё остальное
            развернётся назад от неё.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex-1 text-xs font-medium">
              Название
              <Input
                className="mt-1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Например: третий поток курса"
              />
            </label>
            <label className="text-xs font-medium">
              Открытие продаж
              <Input
                type="date"
                className="mt-1"
                value={salesOpen}
                onChange={(e) => setSalesOpen(e.target.value)}
              />
            </label>
            <Button
              disabled={!canCreate || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Создать
            </Button>
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
        <EmptyState
          icon={<Rocket className="h-5 w-5" />}
          title="Запусков пока нет"
          description="Создайте первый — укажите только дату открытия продаж. Календарь прогрева развернётся назад от неё, а проверка покажет, каких смыслов не хватает."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" />
              Новый запуск
            </Button>
          }
        />
      )}

      <ul className="flex flex-col gap-3">
        {launches?.map((launch: LaunchOut) => {
          const left = daysLeft(launch.sales_open);
          const urgent = left >= 0 && left <= 7;
          return (
            <li key={launch.id}>
              <div className="group flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/20">
                <Link href={`/launches/${launch.id}`} className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{launch.name}</span>
                    <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
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
                    <span className={urgent ? "font-medium text-warn" : ""}>
                      {formatRunway(left)}
                    </span>
                    <span>·</span>
                    <span>продажи с {formatDay(launch.sales_open)}</span>
                  </div>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                  onClick={() => archiveMutation.mutate(launch.id)}
                >
                  В архив
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
