"use client";

/**
 * Страница запуска: проверка, ось этапов, календарь и готовность продукта.
 *
 * Порядок блоков не случайный. Сверху — находки: человек приходит сюда с
 * вопросом «я ничего не забыл?», а не «покажи мне сетку». Календарь ниже,
 * потому что он следствие, а не причина.
 */

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, RefreshCw, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { ApiError } from "@/lib/api";
import {
  assignIdeas,
  confirmSlot,
  generatePlan,
  getLaunch,
  getPlan,
  getReport,
  markupBank,
  updateLaunch,
  type LaunchSlot,
} from "@/lib/launches";
import { FindingsPanel } from "@/components/launch/FindingsPanel";
import { ReadinessChecklist } from "@/components/launch/ReadinessChecklist";
import { SlotCalendar } from "@/components/launch/SlotCalendar";
import { StageTimeline } from "@/components/launch/StageTimeline";

export default function LaunchPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const qc = useQueryClient();

  const launchKey = ["launch", id];
  const planKey = ["launch-plan", id];
  const reportKey = ["launch-report", id];

  const { data: launch } = useQuery({
    queryKey: launchKey,
    queryFn: () => getLaunch(id),
    enabled: Boolean(id),
  });
  const { data: plan, isLoading: planLoading } = useQuery({
    queryKey: planKey,
    queryFn: () => getPlan(id),
    enabled: Boolean(id),
  });
  const { data: report, isLoading: reportLoading } = useQuery({
    queryKey: reportKey,
    queryFn: () => getReport(id),
    enabled: Boolean(id),
  });

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: planKey });
    qc.invalidateQueries({ queryKey: reportKey });
    qc.invalidateQueries({ queryKey: launchKey });
  };

  const buildMutation = useMutation({
    mutationFn: () => generatePlan(id),
    onSuccess: (result) => {
      const empty = result.slots.filter((s) => !s.knowledge_item_id).length;
      toast.success(
        empty > 0
          ? `План собран. Без идеи осталось ${empty} — причина указана в каждом`
          : "План собран, идеи подобраны",
      );
      refreshAll();
    },
    onError: (error) =>
      toast.error(
        error instanceof ApiError ? error.detail : "Не удалось собрать план",
      ),
  });

  const assignMutation = useMutation({
    mutationFn: () => assignIdeas(id),
    onSuccess: (r) => {
      toast.success(`Подобрано идей: ${r.filled}. Без идеи: ${r.empty}`);
      refreshAll();
    },
  });

  const markupMutation = useMutation({
    mutationFn: () => markupBank(false),
    onSuccess: (r) => {
      toast.success(
        `Размечено идей: ${r.marked} из ${r.total}. Это черновик — подтвердите вручную`,
      );
      refreshAll();
    },
  });

  const readinessMutation = useMutation({
    mutationFn: (readiness: Record<string, boolean>) =>
      updateLaunch(id, { readiness }),
    onSuccess: refreshAll,
  });

  const confirmMutation = useMutation({
    mutationFn: (slot: LaunchSlot) =>
      confirmSlot(id, slot.id, { confirm: true, version: slot.version }),
    onSuccess: () => {
      toast.success("Разметка подтверждена — теперь идёт в зачёт");
      refreshAll();
    },
    onError: (error) =>
      toast.error(
        error instanceof ApiError ? error.detail : "Не удалось подтвердить",
      ),
  });

  if (!launch) {
    return (
      <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Загружаю запуск
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/launches"
            className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
          >
            <ArrowLeft className="h-3 w-3" />
            Все запуски
          </Link>
          <h1 className="truncate text-2xl font-semibold tracking-tight">
            {launch.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Продажи открываются {launch.sales_open}
            {launch.sales_close ? `, закрываются ${launch.sales_close}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => markupMutation.mutate()}
            disabled={markupMutation.isPending}
          >
            <Wand2 className="mr-1 h-4 w-4" />
            Разметить банк
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => assignMutation.mutate()}
            disabled={assignMutation.isPending}
          >
            <Sparkles className="mr-1 h-4 w-4" />
            Подобрать идеи
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => buildMutation.mutate()}
            disabled={buildMutation.isPending}
          >
            {buildMutation.isPending ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-1 h-4 w-4" />
            )}
            Собрать план
          </button>
        </div>
      </header>

      <FindingsPanel report={report} isLoading={reportLoading} />

      <ReadinessChecklist
        readiness={launch.readiness ?? {}}
        onChange={(next) => readinessMutation.mutate(next)}
        disabled={readinessMutation.isPending}
      />

      {plan && (
        <StageTimeline
          windows={plan.windows}
          compressed={plan.compressed}
          dropped={plan.dropped}
        />
      )}

      {planLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Загружаю календарь
        </div>
      ) : (
        <SlotCalendar
          slots={plan?.slots ?? []}
          onConfirm={(slot) => confirmMutation.mutate(slot)}
        />
      )}
    </div>
  );
}
