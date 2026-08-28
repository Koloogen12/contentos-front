"use client";

/**
 * Страница запуска.
 *
 * Первая версия открывалась стеной проверок и тремя равнозначными
 * кнопками в углу шапки. Порядок между ними был обязательным, но нигде не
 * назван: «Подобрать идеи» на пустом запуске честно отвечала «подобрано 0»,
 * и с той стороны экрана это выглядело сломанной кнопкой.
 *
 * Отсюда порядок блоков. Сверху — сценарий из трёх шагов, он же отвечает на
 * «с чего начать». Дальше — что получится: пока плана нет, ось этапов
 * рисуется из типовых длительностей. Проверки уходят вниз: они осмысленны
 * только тогда, когда есть что проверять.
 */

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { ApiError } from "@/lib/api";
import {
  assignIdeas,
  confirmSlot,
  generatePlan,
  getLaunch,
  getPlan,
  getReference,
  getReport,
  markupBank,
  updateLaunch,
  formatDay,
  type LaunchSlot,
} from "@/lib/launches";
import { FindingsPanel } from "@/components/launch/FindingsPanel";
import { LaunchFlow, type FlowStep } from "@/components/launch/LaunchFlow";
import { ReadinessChecklist } from "@/components/launch/ReadinessChecklist";
import { SlotCalendar } from "@/components/launch/SlotCalendar";
import {
  StageTimeline,
  rowsFromWindows,
  type StageRow,
} from "@/components/launch/StageTimeline";
import { Skeleton } from "@/components/ui/skeleton";

function daysUntil(iso: string): number {
  const target = new Date(`${iso}T00:00:00`);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86_400_000);
}

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
  // Справочник методологии нужен только до сборки — показать форму результата.
  const { data: reference } = useQuery({
    queryKey: ["launch-reference"],
    queryFn: getReference,
    staleTime: Infinity,
  });

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: planKey });
    qc.invalidateQueries({ queryKey: reportKey });
    qc.invalidateQueries({ queryKey: launchKey });
  };

  const fail = (fallback: string) => (error: unknown) =>
    toast.error(error instanceof ApiError ? error.detail : fallback);

  const buildMutation = useMutation({
    mutationFn: () => generatePlan(id),
    onSuccess: (result) => {
      const empty = result.slots.filter((s) => !s.knowledge_item_id).length;
      toast.success(
        empty > 0
          ? `План собран: ${result.slots.length} слотов. Без идеи ${empty} — причина указана в каждом`
          : `План собран: ${result.slots.length} слотов, идеи подобраны`,
      );
      refreshAll();
    },
    onError: fail("Не удалось собрать план"),
  });

  const assignMutation = useMutation({
    mutationFn: () => assignIdeas(id),
    onSuccess: (r) => {
      toast.success(
        r.filled === 0 && r.empty === 0
          ? "Все слоты уже с идеями — подбирать нечего"
          : `Подобрано идей: ${r.filled}. Без идеи осталось: ${r.empty}`,
      );
      refreshAll();
    },
    onError: fail("Не удалось подобрать идеи"),
  });

  const markupMutation = useMutation({
    mutationFn: () => markupBank(false),
    onSuccess: (r) => {
      toast.success(
        r.total === 0
          ? "Банк идей пуст — сначала наполните раздел «Идеи»"
          : `Размечено идей: ${r.marked} из ${r.total}. Это черновик — подтвердите в календаре`,
      );
      refreshAll();
    },
    onError: fail("Не удалось разметить банк"),
  });

  const readinessMutation = useMutation({
    mutationFn: (readiness: Record<string, boolean>) =>
      updateLaunch(id, { readiness }),
    onSuccess: refreshAll,
    onError: fail("Не удалось сохранить готовность"),
  });

  const confirmMutation = useMutation({
    mutationFn: (slot: LaunchSlot) =>
      confirmSlot(id, slot.id, { confirm: true, version: slot.version }),
    onSuccess: () => {
      toast.success("Разметка подтверждена — теперь идёт в зачёт");
      refreshAll();
    },
    onError: fail("Не удалось подтвердить"),
  });

  // Подтверждение этапа: слотов в нём немного, шлём последовательно, чтобы
  // не ловить конфликт версий на соседних записях.
  const confirmManyMutation = useMutation({
    mutationFn: async (slots: LaunchSlot[]) => {
      let ok = 0;
      for (const slot of slots) {
        try {
          await confirmSlot(id, slot.id, { confirm: true, version: slot.version });
          ok += 1;
        } catch {
          /* пропускаем — итог покажем числом */
        }
      }
      return { ok, total: slots.length };
    },
    onSuccess: ({ ok, total }) => {
      toast.success(
        ok === total
          ? `Подтверждено слотов: ${ok}`
          : `Подтверждено ${ok} из ${total}. Остальные обновились в другой вкладке — обновите страницу`,
      );
      refreshAll();
    },
  });

  if (!launch) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const hasPlan = (plan?.slots.length ?? 0) > 0;
  const bankTotal = report?.bank_total ?? 0;
  const bankMarked = report?.bank_marked ?? 0;
  const emptySlots = plan?.slots.filter((s) => !s.knowledge_item_id).length ?? 0;
  const runway = daysUntil(launch.sales_open);

  const steps: FlowStep[] = [
    {
      title: "Разметить банк",
      hint: "Пройдём по вашим идеям и предложим, какую рубрику прогрева закрывает каждая. Это черновик — подтвердите вручную.",
      state:
        bankTotal === 0
          ? "банк пуст"
          : `${bankMarked} из ${bankTotal} размечено`,
      done: bankTotal > 0 && bankMarked > 0,
      blockedBy:
        bankTotal === 0
          ? "Сначала наполните раздел «Идеи» — размечать пока нечего."
          : undefined,
      action: {
        label: bankMarked > 0 ? "Разметить ещё" : "Разметить",
        onClick: () => markupMutation.mutate(),
        pending: markupMutation.isPending,
      },
    },
    {
      title: "Собрать план",
      hint: "Развернём календарь назад от даты продаж: семь этапов, слоты по дням и каналам, идеи из банка.",
      state: hasPlan
        ? `${plan!.slots.length} слотов, ${plan!.windows.length} этапов`
        : "план не собран",
      done: hasPlan,
      action: {
        label: hasPlan ? "Пересобрать" : "Собрать план",
        onClick: () => buildMutation.mutate(),
        pending: buildMutation.isPending,
      },
    },
    {
      title: "Дожать",
      hint: "Заполним пустые слоты и покажем, каких смыслов не хватает и в какие дни это чинится.",
      state: !hasPlan
        ? "—"
        : emptySlots > 0
          ? `${emptySlots} слотов без идеи`
          : "все слоты с идеей",
      done: hasPlan && emptySlots === 0,
      blockedBy: hasPlan ? undefined : "Появится, когда план будет собран.",
      action: {
        label: "Подобрать идеи",
        onClick: () => assignMutation.mutate(),
        pending: assignMutation.isPending,
      },
    },
  ];

  // Наполнение этапов — для оси. Считаем по слотам, а не по окнам.
  const stageCounts = new Map<number, { slots: number; withIdea: number }>();
  for (const slot of plan?.slots ?? []) {
    const stage = slot.launch_stage ?? 0;
    const cur = stageCounts.get(stage) ?? { slots: 0, withIdea: 0 };
    cur.slots += 1;
    if (slot.knowledge_item_id) cur.withIdea += 1;
    stageCounts.set(stage, cur);
  }

  const stageRows: StageRow[] = hasPlan
    ? rowsFromWindows(plan!.windows, stageCounts)
    : (reference?.stages ?? []).map((s) => ({
        stage: s.num,
        title: s.title,
        purpose: s.purpose,
        days: s.default_days,
      }));

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-8">
      <header className="flex flex-col gap-1">
        <Link
          href="/launches"
          className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Все запуски
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {launch.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Продажи открываются {formatDay(launch.sales_open)}
          {launch.sales_close ? `, закрываются ${formatDay(launch.sales_close)}` : ""}
          {runway > 0 && ` · через ${runway} дн.`}
          {runway === 0 && " · сегодня"}
          {runway < 0 && " · уже открыты"}
        </p>
      </header>

      <LaunchFlow steps={steps} />

      {stageRows.length > 0 && (
        <StageTimeline
          rows={stageRows}
          compressed={plan?.compressed}
          dropped={plan?.dropped}
          preview={!hasPlan}
        />
      )}

      {planLoading && !hasPlan && (
        <Skeleton className="h-32 w-full" />
      )}

      {hasPlan && (
        <SlotCalendar
          slots={plan!.slots}
          windows={plan!.windows}
          onConfirm={(slot) => confirmMutation.mutate(slot)}
          onConfirmMany={(slots) => confirmManyMutation.mutate(slots)}
        />
      )}

      {hasPlan && <FindingsPanel report={report} isLoading={reportLoading} />}

      <ReadinessChecklist
        readiness={launch.readiness ?? {}}
        onChange={(next) => readinessMutation.mutate(next)}
        disabled={readinessMutation.isPending}
      />
    </div>
  );
}
