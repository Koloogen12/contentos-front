"use client";

/**
 * Корень модуля «Запуски».
 *
 * Состояние живёт на сервере. План, фактура и линии приходят запросами, все
 * правки уходят ручками и инвалидируют кеш — вкладку можно перезагрузить в
 * любой момент, ничего не потеряется.
 *
 * На клиенте остались две вещи, и обе намеренно.
 *
 * Первая — расчёт проверок. Серверный `/report` отдаёт другую форму находки
 * (`code`/`severity`/`fix_days`), а экраны построены на `risk`/`items`/`where`/
 * `basis`: на этих полях держатся и очередь «что починить», и переходы из
 * находки в конкретный день плана. Выравнивать контракт стоит отдельной
 * задачей, а не заодно с переключением на новые ручки.
 *
 * Вторая — предпросмотр в мастере. Там запуска ещё нет, спрашивать сервер не о
 * чем, а показать форму будущего плана надо до создания.
 */

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/lib/api";
import { listKnowledge } from "@/lib/knowledge";
import {
  archiveLaunch, confirmStage as apiConfirmStage, createLaunch, createSlot,
  deleteSlot, generatePlan, getEvidence, getPlan, listLaunches, listStoryLines,
  updateEvidence, updateLaunch, updateSlot, updateStoryLine,
} from "@/lib/launches";
import {
  toApiIntensity, toEvidence, toLaunch, toLine, toPlan, toProofs, toSlot,
} from "@/lib/launch/adapters";
import {
  type BankIdea, type Launch, type Slot,
  CADENCE, FIT, MEANINGS, QUOTA, byKey, evidenceSeed, fmt,
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
const planKey = (id: string) => ["launch-plan", id];
const evidenceKey = (id: string) => ["launch-evidence", id];
const linesKey = (id: string) => ["launch-lines", id];

export default function LaunchesPage() {
  const qc = useQueryClient();
  const [lid, setLid] = React.useState<string>("");
  const [ltab, setLtab] = React.useState<LaunchTab>("hq");
  const [wizard, setWizard] = React.useState(false);
  const [frame, setFrame] = React.useState(false);
  const [slotId, setSlotId] = React.useState<string | null>(null);
  const [focusDate, setFocusDate] = React.useState<string | null>(null);

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
      return out;
    },
    staleTime: 60_000,
  });

  const launches = React.useMemo(
    () => (apiLaunches || []).map(toLaunch), [apiLaunches]);
  const launch = launches.find((x) => x.id === lid) || null;

  const { data: planRes } = useQuery({
    queryKey: planKey(lid),
    queryFn: () => getPlan(lid),
    enabled: Boolean(lid),
  });
  const { data: evidenceRows } = useQuery({
    queryKey: evidenceKey(lid),
    queryFn: () => getEvidence(lid),
    enabled: Boolean(lid),
  });
  const { data: lineRows } = useQuery({
    queryKey: linesKey(lid),
    queryFn: () => listStoryLines(lid),
    enabled: Boolean(lid),
  });

  const data: LaunchState | null = React.useMemo(() => {
    if (!launch) return null;
    return {
      plan: planRes ? toPlan(planRes) : null,
      slots: (planRes?.slots || []).map(toSlot),
      evidence: evidenceRows ? toEvidence(evidenceRows) : evidenceSeed(),
      proofs: evidenceRows ? toProofs(evidenceRows) : {},
      lines: (lineRows || []).map(toLine),
      readiness: launch.readiness,
      tasks: {},
      bank: bank || {},
    };
  }, [launch, planRes, evidenceRows, lineRows, bank]);

  const report = React.useMemo(
    () => (launch && data
      ? buildReport({
        launch, slots: data.slots, evidence: data.evidence,
        lines: data.lines, readiness: data.readiness,
      })
      : null),
    [launch, data]);

  const invalidatePlan = () => qc.invalidateQueries({ queryKey: planKey(lid) });
  const fail = (fallback: string) => (e: unknown) =>
    launchToast(e instanceof ApiError ? e.detail : fallback);

  /* ─── правки, которые уходят на сервер ─── */

  const slotMutation = useMutation({
    mutationFn: (v: { id: string; patch: Parameters<typeof updateSlot>[2] }) =>
      updateSlot(lid, v.id, v.patch),
    onSuccess: invalidatePlan,
    onError: (e) => {
      if (e instanceof ApiError && e.status === 409) {
        // Конфликт версий — не «ошибка сети»: чужую правку надо показать,
        // а не молча перетереть.
        invalidatePlan();
        launchToast("Слот успели изменить в другом окне — план обновлён, повторите правку");
        return;
      }
      fail("Не удалось сохранить слот")(e);
    },
  });

  const setSlot = (id: string, upd: Partial<Slot>) => {
    const slot = data?.slots.find((s) => s.id === id);
    if (!slot) return;
    const patch: Parameters<typeof updateSlot>[2] = { version: slot.version };
    if (upd.date !== undefined) patch.scheduled_date = upd.date;
    if (upd.rubric !== undefined) patch.rubric = upd.rubric;
    if (upd.meaning !== undefined) patch.meaning = upd.meaning;
    if (upd.is_pinned !== undefined) patch.is_pinned = upd.is_pinned;
    if (upd.reaction !== undefined && upd.reaction !== null) patch.reaction = upd.reaction;
    if (upd.status !== undefined) patch.status = upd.status;
    if (upd.draft !== undefined && upd.draft !== null) patch.draft_state = upd.draft;
    if (upd.chars !== undefined) patch.chars = upd.chars;
    if (upd.text !== undefined) patch.full_text = upd.text;
    if (upd.idea !== undefined && upd.idea !== null) patch.talking_point_text = upd.idea;
    if (upd.markup_origin === "human") patch.confirm = true;
    slotMutation.mutate({ id, patch });
  };

  const evidenceMutation = useMutation({
    mutationFn: (v: { key: string; state: "proof" | "claimed" | "none"; dismissed?: boolean }) =>
      updateEvidence(lid, v.key, { state: v.state, task_dismissed: v.dismissed }),
    onSuccess: () => qc.invalidateQueries({ queryKey: evidenceKey(lid) }),
    onError: fail("Не удалось сохранить фактуру"),
  });

  const confirmStageMutation = useMutation({
    // Этап целиком одним запросом: в нём бывает сорок слотов, и сорок
    // отдельных PATCH дали бы сорок гонок за версию.
    mutationFn: (stage: number) => apiConfirmStage(lid, stage),
    onSuccess: (r) => {
      invalidatePlan();
      launchToast("Разметка подтверждена: " + plural(r.confirmed, "слот", "слота", "слотов"));
    },
    onError: fail("Не удалось подтвердить разметку"),
  });

  const addSlotMutation = useMutation({
    mutationFn: (v: { date: string; platform: string; rubric: string; meaning: string }) =>
      createSlot(lid, {
        scheduled_date: v.date, platform: v.platform,
        rubric: v.rubric, meaning: v.meaning,
      }),
    onSuccess: (slot) => {
      invalidatePlan();
      setSlotId(slot.id);
      launchToast("Слот добавлен и закреплён");
    },
    onError: fail("Не удалось добавить слот"),
  });

  const delSlotMutation = useMutation({
    mutationFn: (id: string) => deleteSlot(lid, id),
    onSuccess: () => { invalidatePlan(); setSlotId(null); launchToast("Слот удалён"); },
    onError: fail("Не удалось удалить слот"),
  });

  const lineMutation = useMutation({
    mutationFn: (v: { id: string; body: Parameters<typeof updateStoryLine>[2] }) =>
      updateStoryLine(lid, v.id, v.body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: linesKey(lid) });
      invalidatePlan();
    },
    onError: fail("Не удалось привязать линию"),
  });

  const rebuildMutation = useMutation({
    mutationFn: () => generatePlan(lid),
    onSuccess: (res) => {
      invalidatePlan();
      qc.invalidateQueries({ queryKey: LAUNCHES_KEY });
      const empty = res.slots.filter((s) => !s.knowledge_item_id).length;
      launchToast(empty > 0
        ? `План собран: ${res.slots.length} слотов. Без идеи ${empty} — причина указана в каждом`
        : `План собран: ${res.slots.length} слотов, идеи подобраны`);
      setFrame(false);
    },
    onError: fail("Не удалось собрать план"),
  });

  const readinessMutation = useMutation({
    mutationFn: (readiness: Record<string, boolean>) =>
      updateLaunch(lid, { readiness }),
    onSuccess: () => qc.invalidateQueries({ queryKey: LAUNCHES_KEY }),
    onError: fail("Не удалось сохранить готовность"),
  });

  const createMutation = useMutation({
    mutationFn: async (v: { draft: Launch; f: WizardForm }) => {
      const created = await createLaunch({
        name: v.f.name || "Новый запуск",
        sales_open: v.draft.sales_open,
        sales_close: v.draft.sales_close || null,
        key_event_date: v.draft.key_event_date || null,
        key_event_type: v.draft.key_event_type || null,
        product_name: v.f.product || null,
        intensity: toApiIntensity(v.f.intensity),
        waitlist_goal: v.f.waitlist_goal || null,
      });
      // Мастер обещает «создать и развернуть план» — разворачиваем сразу,
      // иначе человек попадает в Штаб на пустой запуск.
      await generatePlan(created.id);
      return created;
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: LAUNCHES_KEY });
      setWizard(false); setLid(created.id); setLtab("hq");
      launchToast("Запуск создан, план развёрнут");
    },
    onError: fail("Не удалось создать запуск"),
  });

  const archiveMutation = useMutation({
    mutationFn: () => archiveLaunch(lid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LAUNCHES_KEY });
      setFrame(false); setLid("");
      launchToast("Запуск в архиве");
    },
    onError: fail("Не удалось архивировать"),
  });

  /* ─── горячие клавиши открытой панели слота ─── */
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setFrame(false); setSlotId(null); return; }
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      if (!slotId || /input|textarea|select/.test(tag)) return;
      const s = data?.slots.find((x) => x.id === slotId);
      if (!s) return;
      const k = e.key.toLowerCase();
      if (k === "p") setSlot(slotId, { is_pinned: !s.is_pinned });
      if (k === "c" && s.markup_origin !== "human") setSlot(slotId, { markup_origin: "human" });
      if ("123".indexOf(e.key) >= 0 && s.status === "published") {
        setSlot(slotId, { reaction: +e.key });
      }
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
    // Списку нужны только окна и число слотов. Гонять за планом каждого
    // запуска ради этого незачем — разворачиваем ось локально тем же
    // алгоритмом, что и сервер.
    const rows: ListRow[] = launches.map((l) => {
      const p = l.unrolled_on ? buildPlan(l) : null;
      const slots = p && !p.error ? slotsFor(l, p.windows, bank || {}) : [];
      return {
        launch: l, plan: p, slots,
        report: buildReport({
          launch: l, slots, evidence: evidenceSeed(), lines: [], readiness: l.readiness,
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
    return <div className="pad"><p className="lc-note">Загружаю запуск…</p></div>;
  }

  const slot = data.slots.find((s) => s.id === slotId) || null;

  const ctx: LaunchCtx = {
    launch, data, report,
    patch: (fn) => {
      // Единственное, что правится «состоянием», — готовность продукта:
      // это чеклист из пяти галочек, и он живёт на самом запуске.
      const next = fn(data);
      if (next.readiness !== data.readiness) readinessMutation.mutate(next.readiness);
    },
    setEvidence: (key, st) => evidenceMutation.mutate({ key, state: st }),
    setSlot,
    confirmStage: (stage) => confirmStageMutation.mutate(byKey[stage].n),
    goDay: (date, tab) => { setFocusDate(date); setLtab(tab || "plan"); },
    focusDate, setFocusDate, openSlot: setSlotId, slotId,
    toast: launchToast, setLtab,
    rebuild: () => rebuildMutation.mutate(),
    moveSlot: (id, date) => setSlot(id, { date }),
    addSlot: (date, platform) => {
      const window = data.plan?.windows.find((w) => date >= w.from && date <= w.to);
      if (!window) { launchToast("Эта дата вне оси запуска"); return; }
      const fits = FIT[platform];
      const quota = QUOTA[window.key];
      const rubric = Object.keys(quota).sort((a, b) => quota[b] - quota[a])
        .find((k) => rubByKey[k].formats.some((f) => fits.indexOf(f) >= 0)) || "background";
      const meaning = MEANINGS.filter((m) => m.q === rubByKey[rubric].q)[0];
      addSlotMutation.mutate({ date, platform, rubric, meaning: meaning.key });
    },
    delSlot: (id) => delSlotMutation.mutate(id),
    setLineRole: (slotIdArg, lineId, role) => {
      lineMutation.mutate({
        id: lineId,
        body: role === "announce" ? { announce_slot_id: slotIdArg }
          : role === "close" ? { close_slot_id: slotIdArg }
            : { announce_slot_id: null, close_slot_id: null },
      });
      launchToast(role === "announce" ? "Этот пост — анонс линии"
        : role === "close" ? "Этот пост закрывает обещание" : "Связь с линией снята");
    },
    toCanvas: (s) => {
      setSlot(s.id, { draft: "writing" });
      launchToast("Задание ушло на канвас: рубрика, вопрос, рычаг, смысл и пруф");
    },
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
          onRebuild={() => rebuildMutation.mutate()}
          onArchive={() => archiveMutation.mutate()}
        />
      )}
      {slot && <LaunchSlotDrawer slot={slot} ctx={ctx} onClose={() => setSlotId(null)} />}
    </>
  );
}
