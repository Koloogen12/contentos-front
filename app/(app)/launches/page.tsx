"use client";

/**
 * Корень модуля «Запуски» — порт `LxModule` (launch-shell.jsx).
 *
 * Прототип держал всё в одном экране с табами и локальным состоянием; здесь так
 * же, потому что модуль так и спроектирован: запуск открывается тем, что нужно
 * сегодня, а не отдельным роутом на каждую вкладку.
 *
 * Что уже ходит в бэкенд: список запусков, создание, готовность продукта, архив.
 * Что живёт в состоянии клиента и требует эндпоинтов (список — в LAUNCHES.md
 * хендоффа): слоты (перенос, добавление, удаление, отметки `status`/`reaction`),
 * фактура по сорока смыслам, привязка анонса и раскрытия линии к конкретным
 * слотам, связь слота с документом канваса. Пока их нет, план разворачивается
 * на клиенте тем же алгоритмом, что и на сервере, — форма и цифры совпадают.
 */

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/lib/api";
import { listKnowledge } from "@/lib/knowledge";
import {
  archiveLaunch, createLaunch, listLaunches, updateLaunch,
  type LaunchOut,
} from "@/lib/launches";
import {
  type BankIdea, type Launch, type Slot, type StoryLine,
  CADENCE, FIT, MEANINGS, QUOTA, add, diff, evidenceSeed, fmt, linkLines,
  plan as buildPlan, plural, report as buildReport, rubByKey, slotsFor, today,
} from "@/lib/launch/core";
import {
  LaunchFrame, LaunchHeader, LaunchList, LaunchWizard, type ListRow, type WizardForm,
} from "@/components/launch/LaunchShell";
import { LaunchHQ } from "@/components/launch/LaunchHQ";
import { LaunchPlan, LaunchSlotDrawer } from "@/components/launch/LaunchPlan";
import { LaunchEvidence } from "@/components/launch/LaunchEvidence";
import { LaunchRetro } from "@/components/launch/LaunchRetro";
import { launchToast, type LaunchCtx, type LaunchState, type LaunchTab } from "@/components/launch/ctx";

const LAUNCHES_KEY = ["launches"];

/**
 * Статус запуска в модуле выводится из дат, а не из поля бэкенда: там свой
 * набор (`draft`/`active`/`paused`/`done`/`archived`), у модуля свой
 * (`draft`/`warm`/`sales`/`closed`), и совпадают они только по краям.
 */
function statusFor(l: LaunchOut): Launch["status"] {
  const T = today();
  if (l.archived_at) return "closed";
  if (l.sales_close && diff(l.sales_close, T) > 0) return "closed";
  if (diff(l.sales_open, T) >= 0) return "sales";
  return l.status === "draft" ? "draft" : "warm";
}

/** Запуск бэкенда → запуск модуля. Чего нет в контракте, помечено дефолтом. */
function toModuleLaunch(l: LaunchOut): Launch {
  return {
    id: l.id,
    name: l.name,
    product: l.product_name || "—",
    price: "—",
    sales_open: l.sales_open,
    sales_close: l.sales_close || "",
    key_event_date: l.key_event_date || "",
    key_event_type: l.key_event_type || "",
    launch_number: l.launch_number,
    // Бэкенд знает `heavy`, прототип — `dense`. Одно и то же, имя разное.
    intensity: l.intensity === "heavy" ? "dense" : l.intensity,
    durations: (l.durations as Record<string, number>) || {},
    audience: "",
    collect: "заявка через бота",
    waitlist_goal: l.waitlist_goal ?? 0,
    waitlist: 0,
    paid: 0,
    paid_goal: l.waitlist_goal ?? 0,
    unrolled_on: l.status === "draft" ? "" : l.created_at.slice(0, 10),
    status: statusFor(l),
    readiness: l.readiness || {},
    archived: !!l.archived_at,
  };
}

export default function LaunchesPage() {
  const qc = useQueryClient();
  const [lid, setLid] = React.useState<string>("");
  const [ltab, setLtab] = React.useState<LaunchTab>("hq");
  const [wizard, setWizard] = React.useState(false);
  const [frame, setFrame] = React.useState(false);
  const [slotId, setSlotId] = React.useState<string | null>(null);
  const [focusDate, setFocusDate] = React.useState<string | null>(null);
  const [store, setStore] = React.useState<Record<string, LaunchState>>({});

  const { data: apiLaunches, isLoading } = useQuery({
    queryKey: LAUNCHES_KEY,
    queryFn: () => listLaunches(true),
  });

  /** Банк идей по рубрикам прогрева — из раздела «Идеи». */
  const { data: bank } = useQuery({
    queryKey: ["launch-bank"],
    queryFn: async () => {
      const items = await listKnowledge({});
      const out: Record<string, BankIdea[]> = {};
      items.forEach((it) => {
        const key = (it as { launch_meaning?: string | null }).launch_meaning;
        if (!key || !rubByKey[key]) return;
        (out[key] = out[key] || []).push({
          id: it.id,
          title: it.title,
          format: (it as { content_format?: string | null }).content_format || "any",
        });
      });
      Object.values(out).forEach((list) =>
        list.sort((a, b) => (a.title < b.title ? -1 : 1)));
      return out;
    },
    staleTime: 60_000,
  });

  const launches = React.useMemo(
    () => (apiLaunches || []).map(toModuleLaunch), [apiLaunches]);

  /** Развернуть состояние запуска, которого ещё нет в сторе. */
  const stateFor = React.useCallback((l: Launch): LaunchState => {
    const p = l.unrolled_on ? buildPlan(l) : null;
    const slots = p && !p.error ? slotsFor(l, p.windows, bank || {}) : [];
    const lines: StoryLine[] = [];
    linkLines(lines, slots);
    return {
      plan: p, slots, evidence: evidenceSeed(), lines,
      readiness: { ...l.readiness }, tasks: {}, bank: bank || {}, proofs: {},
    };
  }, [bank]);

  const launch = launches.find((x) => x.id === lid) || null;
  const data = lid ? store[lid] : null;

  // Состояние поднимается лениво: разворачивать план для каждого запуска
  // в списке незачем — там достаточно окон и числа слотов.
  React.useEffect(() => {
    if (!launch || store[launch.id]) return;
    setStore((s) => ({ ...s, [launch.id]: stateFor(launch) }));
  }, [launch, store, stateFor]);

  const report = React.useMemo(
    () => (launch && data
      ? buildReport({ launch, slots: data.slots, evidence: data.evidence, lines: data.lines, readiness: data.readiness })
      : null),
    [launch, data]);

  const patch = (id: string, fn: (d: LaunchState) => LaunchState) =>
    setStore((s) => (s[id] ? { ...s, [id]: fn(s[id]) } : s));

  /* ─── мутации, которые доходят до бэкенда ─── */

  const readinessMutation = useMutation({
    mutationFn: (v: { id: string; readiness: Record<string, boolean> }) =>
      updateLaunch(v.id, { readiness: v.readiness }),
    onError: (e) => launchToast(e instanceof ApiError ? e.detail : "Не удалось сохранить готовность"),
  });

  const createMutation = useMutation({
    mutationFn: (v: { draft: Launch; f: WizardForm }) =>
      createLaunch({
        name: v.f.name || "Новый запуск",
        sales_open: v.draft.sales_open,
        sales_close: v.draft.sales_close || null,
        key_event_date: v.draft.key_event_date || null,
        key_event_type: v.draft.key_event_type || null,
        product_name: v.f.product || null,
        intensity: (v.f.intensity === "dense" ? "heavy" : v.f.intensity) as "light" | "normal" | "heavy",
        waitlist_goal: v.f.waitlist_goal || null,
      }),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: LAUNCHES_KEY });
      const l = toModuleLaunch(created);
      l.unrolled_on = today();
      l.status = "warm";
      const st = stateFor(l);
      setStore((s) => ({ ...s, [created.id]: st }));
      setWizard(false); setLid(created.id); setLtab("hq");
      launchToast("Запуск создан · развёрнуто " + plural(st.slots.length, "слот", "слота", "слотов"));
    },
    onError: (e) => launchToast(e instanceof ApiError ? e.detail : "Не удалось создать запуск"),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => archiveLaunch(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LAUNCHES_KEY });
      setFrame(false); setLid("");
      launchToast("Запуск в архиве");
    },
    onError: (e) => launchToast(e instanceof ApiError ? e.detail : "Не удалось архивировать"),
  });

  /* ─── операции над состоянием запуска ─── */

  const setSlot = (id: string, upd: Partial<Slot>) =>
    patch(lid, (d) => ({ ...d, slots: d.slots.map((s) => (s.id === id ? { ...s, ...upd } : s)) }));

  const setEvidence = (key: string, st: LaunchState["evidence"][string]) =>
    patch(lid, (d) => ({ ...d, evidence: { ...d.evidence, [key]: st } }));

  const confirmStage = (stage: string) => {
    let n = 0;
    patch(lid, (d) => ({
      ...d,
      slots: d.slots.map((s) => {
        if (s.stage === stage && s.markup_origin !== "human") { n++; return { ...s, markup_origin: "human" as const }; }
        return s;
      }),
    }));
    launchToast("Разметка подтверждена: " + plural(n, "слот", "слота", "слотов"));
  };

  const goDay = (date: string, tab?: LaunchTab) => { setFocusDate(date); setLtab(tab || "plan"); };

  const winOf = (date: string) =>
    data && data.plan && !data.plan.error
      ? data.plan.windows.find((w) => diff(w.from, date) >= 0 && diff(date, w.to) >= 0)
      : null;

  const moveSlot = (id: string, date: string) => {
    const w = winOf(date);
    if (!w) { launchToast("Эта дата вне оси запуска"); return; }
    const prev = data!.slots;
    patch(lid, (d) => ({
      ...d,
      slots: d.slots.map((s) => (s.id === id
        ? { ...s, date, stage: w.key, is_last_day: w.key === "sales" && date === w.to } : s)),
    }));
    launchToast("Перенесено на " + fmt(date), () => patch(lid, (d) => ({ ...d, slots: prev })));
  };

  const addSlot = (date: string, platform: string) => {
    const w = winOf(date);
    if (!w || !data) { launchToast("Эта дата вне оси запуска"); return; }
    const fits = FIT[platform];
    const quota = QUOTA[w.key];
    const rubric = Object.keys(quota).sort((a, b) => quota[b] - quota[a])
      .find((k) => rubByKey[k].formats.some((f) => fits.indexOf(f) >= 0)) || "background";
    const used: Record<string, number> = {};
    data.slots.forEach((s) => { if (s.idea) used[s.idea] = 1; });
    const free = (data.bank[rubric] || []).filter((b) => !used[b.title] && fits.indexOf(b.format) >= 0);
    const mean = MEANINGS.filter((m) => m.q === rubByKey[rubric].q)[0];
    const s: Slot = {
      id: lid + "-m" + Math.random().toString(36).slice(2, 7),
      date, platform: platform as Slot["platform"], stage: w.key, rubric,
      is_last_day: w.key === "sales" && date === w.to, is_pinned: true, version: 1,
      idea: free.length ? free[0].title : null,
      reason: free.length ? null : "слот добавлен вручную — идею надо выбрать",
      meaning: mean.key, trigger_key: rubByKey[rubric].lever, markup_origin: "human",
      status: "planned", draft: null, chars: 0, reaction: null, line_id: null, line_role: null,
    };
    patch(lid, (d) => ({ ...d, slots: d.slots.concat([s]) }));
    launchToast("Слот добавлен и закреплён",
      () => patch(lid, (d) => ({ ...d, slots: d.slots.filter((x) => x.id !== s.id) })));
    setSlotId(s.id);
  };

  const delSlot = (id: string) => {
    const prev = data!.slots;
    patch(lid, (d) => ({ ...d, slots: d.slots.filter((s) => s.id !== id) }));
    setSlotId(null);
    launchToast("Слот удалён", () => patch(lid, (d) => ({ ...d, slots: prev })));
  };

  const setLineRole = (slotIdArg: string, lineId: string, role: "announce" | "close" | null) => {
    patch(lid, (d) => {
      const slots = d.slots.map((s) => {
        if (s.id === slotIdArg) return { ...s, line_id: role ? lineId : null, line_role: role };
        if (role && s.line_id === lineId && s.line_role === role) return { ...s, line_id: null, line_role: null };
        return s;
      });
      const lines = d.lines.map((x) => {
        if (x.id !== lineId) return x;
        const y = { ...x };
        if (role === "announce") { y.announce_slot = slotIdArg; y.announced_on = (slots.find((s) => s.id === slotIdArg) || { date: "" }).date; }
        if (role === "close") { y.close_slot = slotIdArg; y.closes_on = (slots.find((s) => s.id === slotIdArg) || { date: "" }).date; }
        return y;
      });
      return { ...d, slots, lines };
    });
    launchToast(role === "announce" ? "Этот пост — анонс линии"
      : role === "close" ? "Этот пост закрывает обещание" : "Связь с линией снята");
  };

  const toCanvas = (s: Slot) => {
    setSlot(s.id, { draft: "writing" });
    launchToast("Задание ушло на канвас: рубрика, вопрос, рычаг, смысл и пруф");
  };

  const rebuild = (durations: Record<string, number>) => {
    if (!launch || !data) return;
    const l2: Launch = { ...launch, durations };
    const p = buildPlan(l2, today());
    if (p.error) { launchToast(p.error); return; }
    const fresh = slotsFor(l2, p.windows, data.bank);
    const keep = data.slots.filter((s) => s.is_pinned || s.status === "published");
    const merged = fresh
      .filter((s) => !keep.some((k) => k.date === s.date && k.platform === s.platform))
      .concat(keep);
    merged.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    const lines = data.lines.map((x) => ({ ...x, announce_slot: null, close_slot: null }));
    linkLines(lines, merged);
    patch(lid, (d) => ({ ...d, plan: p, slots: merged, lines }));
    setFrame(false);
    launchToast(data.slots.length
      ? "План пересобран · " + plural(keep.length, "слот", "слота", "слотов") + " сохранено"
      : "План развёрнут · " + plural(merged.length, "слот", "слота", "слотов") + " по этапам");
  };

  /* ─── горячие клавиши открытой панели слота ─── */
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setFrame(false); setSlotId(null); return; }
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      if (!slotId || /input|textarea|select/.test(tag)) return;
      const d = store[lid]; if (!d) return;
      const s = d.slots.find((x) => x.id === slotId); if (!s) return;
      const k = e.key.toLowerCase();
      if (k === "p") { setSlot(slotId, { is_pinned: !s.is_pinned }); launchToast(s.is_pinned ? "Слот больше не закреплён" : "Слот закреплён"); }
      if (k === "c" && s.markup_origin !== "human") { setSlot(slotId, { markup_origin: "human" }); launchToast("Разметка подтверждена"); }
      if ("123".indexOf(e.key) >= 0 && s.status === "published") { setSlot(slotId, { reaction: +e.key }); launchToast("Отметка реакции учтена — уйдёт в разбор"); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  /* ─── экраны ─── */

  if (!launch) {
    if (wizard) {
      return (
        <LaunchWizard
          onCancel={() => setWizard(false)}
          pending={createMutation.isPending}
          onCreate={(draft, f) => createMutation.mutate({ draft, f })}
        />
      );
    }
    const rows: ListRow[] = launches.map((l) => {
      const st = store[l.id];
      const p = st ? st.plan : (l.unrolled_on ? buildPlan(l) : null);
      const slots = st ? st.slots : (p && !p.error ? slotsFor(l, p.windows, bank || {}) : []);
      return {
        launch: l, plan: p, slots,
        report: buildReport({
          launch: l, slots,
          evidence: st ? st.evidence : evidenceSeed(),
          lines: st ? st.lines : [],
          readiness: l.readiness,
        }),
      };
    });
    return (
      <LaunchList
        rows={rows} loading={isLoading}
        onOpen={(id) => { setLid(id); setLtab("hq"); }}
        onNew={() => setWizard(true)}
      />
    );
  }

  if (!data || !report) {
    return <div className="pad"><p className="lc-note">Разворачиваю запуск…</p></div>;
  }

  const slot = data.slots.find((s) => s.id === slotId) || null;
  const ctx: LaunchCtx = {
    launch, data, report,
    patch: (fn) => patch(lid, fn),
    setEvidence, setSlot, confirmStage, goDay, focusDate, setFocusDate,
    openSlot: setSlotId, slotId, toast: launchToast, setLtab, rebuild,
    moveSlot, addSlot, delSlot, setLineRole, toCanvas,
  };

  return (
    <>
      <LaunchHeader
        launch={launch} report={report} tab={ltab} setTab={setLtab}
        onBack={() => { setLid(""); setSlotId(null); }}
        onFrame={() => setFrame(true)}
      />
      <div className="pad" style={{ paddingTop: 22 }}>
        {ltab === "hq" && <LaunchHQ {...ctx} />}
        {ltab === "plan" && <LaunchPlan {...ctx} />}
        {ltab === "evidence" && <LaunchEvidence {...ctx} />}
        {ltab === "retro" && <LaunchRetro {...ctx} />}
      </div>
      {frame && (
        <LaunchFrame
          launch={launch} slots={data.slots}
          onClose={() => { setFrame(false); launchToast("Рамка сохранена"); }}
          onPatch={(upd) => {
            if (upd.intensity) {
              launchToast("Интенсивность: " + (CADENCE[upd.intensity]?.name || "").toLowerCase() +
                " · применится при пересборке плана");
            }
          }}
          onRebuild={rebuild}
          onArchive={() => archiveMutation.mutate(lid)}
        />
      )}
      {slot && <LaunchSlotDrawer slot={slot} ctx={ctx} onClose={() => setSlotId(null)} />}
      {/* Готовность продукта — единственное, что из Штаба уходит в базу сразу. */}
      <ReadinessSync
        launchId={lid}
        readiness={data.readiness}
        onSave={(readiness) => readinessMutation.mutate({ id: lid, readiness })}
      />
    </>
  );
}

/**
 * Сохранение готовности с задержкой: чеклист щёлкают подряд, и слать пять
 * запросов подряд незачем.
 */
function ReadinessSync({
  launchId, readiness, onSave,
}: {
  launchId: string; readiness: Record<string, boolean>; onSave: (r: Record<string, boolean>) => void;
}) {
  const first = React.useRef(true);
  React.useEffect(() => {
    if (first.current) { first.current = false; return; }
    const t = setTimeout(() => onSave(readiness), 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(readiness), launchId]);
  return null;
}
