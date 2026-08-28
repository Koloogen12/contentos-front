"use client";

/**
 * Оболочка модуля «Запуски»: шапка, список, мастер, рамка.
 * Порт `launch-shell.jsx` (LxHeader / LxList / LxWizard / LxFrame).
 */

import * as React from "react";
import {
  AlertTriangle, Archive, ArrowLeft, ArrowRight, CalendarDays, Check,
  ChevronRight, ListChecks, Plus, RefreshCw, Rocket, Settings, X,
} from "lucide-react";

import {
  type Launch, type PlanResult, type Report, type Slot,
  CADENCE, LC_STATUS, PLATFORMS, STAGES, add, byKey, diff, fmt, fmtS,
  launchMode, plan as buildPlan, plural, slotsFor, today,
} from "@/lib/launch/core";
import { LaunchAxis } from "@/components/launch/LaunchAxis";
import type { LaunchTab } from "@/components/launch/ctx";

/* ─── шапка запуска ─── */

export function LaunchHeader({
  launch, report, tab, setTab, onBack, onFrame,
}: {
  launch: Launch; report: Report | null; tab: LaunchTab;
  setTab: (t: LaunchTab) => void; onBack: () => void; onFrame: () => void;
}) {
  const TODAY = today();
  const mode = launchMode(launch);
  const dd = diff(TODAY, launch.sales_open);
  const dayIn = diff(launch.sales_open, TODAY) + 1;
  const win = launch.sales_close ? diff(launch.sales_open, launch.sales_close) + 1 : 7;
  const st = LC_STATUS[launch.status] || LC_STATUS.draft;
  const tabs: Array<[LaunchTab, string]> = [["hq", "Штаб"], ["plan", "План"], ["evidence", "Фактура"], ["retro", "Разбор"]];
  return (
    <div className="lc-hd">
      <div className="lc-hd-t">
        <button className="ib tt dn" data-tt="Все запуски" aria-label="Все запуски" onClick={onBack}>
          <ArrowLeft size={15} />
        </button>
        <h1>{launch.name}</h1>
        <span className={"chip " + st[1]}><span className="lc-dot" data-s={launch.status} />{st[0]}</span>
        {mode !== "closed" && (dd > 0
          ? <span className="chip">до продаж {plural(dd, "день", "дня", "дней")}</span>
          : <span className="chip or">день {dayIn} из {win} · окно закрывается {fmtS(launch.sales_close)}</span>)}
        <div className="r">
          <button className="btn btn-w btn-sm" onClick={onFrame}><Settings size={14} />Рамка</button>
        </div>
      </div>
      <div className="lc-hd-b">
        <div className="seg" role="tablist">
          {tabs.map(([k, t]) => (
            <button key={k} role="tab" aria-selected={tab === k} data-on={tab === k ? "1" : "0"}
              disabled={k === "retro" && mode !== "closed"}
              title={k === "retro" && mode !== "closed" ? "Откроется после закрытия продаж" : ""}
              onClick={() => setTab(k)}>{t}</button>
          ))}
        </div>
        {report && !report.empty && (report.critical > 0
          ? <button className="chip or" style={{ cursor: "pointer", border: "1px solid rgba(242,96,26,.35)" }}
              onClick={() => setTab("hq")}>
              <AlertTriangle size={11} />починить {report.findings.length} · критичных {report.critical}
            </button>
          : <span className="chip green"><Check size={11} />критичного нет</span>)}
        <span className="mono" style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--p-ink-3)" }}>
          {launch.product} · {launch.price} · поток {launch.launch_number}
        </span>
      </div>
    </div>
  );
}

/* ─── список запусков ─── */

export interface ListRow {
  launch: Launch;
  plan: PlanResult | null;
  slots: Slot[];
  report: Report;
}

export function LaunchList({
  rows, onOpen, onNew, loading,
}: {
  rows: ListRow[]; onOpen: (id: string) => void; onNew: () => void; loading?: boolean;
}) {
  const TODAY = today();
  const [arch, setArch] = React.useState(0);
  const all = rows;
  const list = all.filter((r) => (arch ? r.launch.archived : !r.launch.archived));
  const order: Record<string, number> = { sales: 0, warm: 1, draft: 2, closed: 3 };
  list.sort((a, b) => order[a.launch.status] - order[b.launch.status]);

  return (
    <div className="pad">
      <div className="ph">
        <span className="ph-ic" style={{ background: "var(--p-or-soft)", color: "var(--p-or)" }}>
          <Rocket size={20} />
        </span>
        <div>
          <h1>Запуски</h1>
          <p>
            Одна дата — открытие продаж. Всё остальное система разворачивает назад: этапы, дни,
            каналы, рубрики. Здесь видно, какой запуск требует внимания сегодня.
          </p>
        </div>
        <div className="r"><button className="btn btn-or" onClick={onNew}><Plus size={16} />Новый запуск</button></div>
      </div>

      <div className="filters" style={{ marginBottom: 18 }}>
        <div className="seg">
          {([["активные", all.filter((r) => !r.launch.archived).length],
            ["архив", all.filter((r) => r.launch.archived).length]] as Array<[string, number]>).map(([t, n], i) => (
            <button key={t} data-on={arch === i ? "1" : "0"} onClick={() => setArch(i)}>
              {t} <span style={{ opacity: .6 }}>{n}</span>
            </button>
          ))}
        </div>
        <span className="mono" style={{ fontSize: 11.5, color: "var(--p-ink-3)", marginLeft: "auto" }}>
          удаления нет — только архив: запуск это история, из которой учатся
        </span>
      </div>

      {loading ? (
        <div className="lc-list">
          {[0, 1, 2].map((i) => (
            <div className="lc-row" key={i} style={{ opacity: .5, pointerEvents: "none" }}>
              <div><div className="nm">Загружаю запуски…</div></div>
              <div className="mn" /><div className="al" /><span className="ch" />
            </div>
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="empty">
          <span className="empty-ic"><Rocket size={20} /></span>
          <h3>Запусков пока нет</h3>
          <p>
            Нужна одна дата — когда открываются продажи. Система развернёт этапы назад от неё,
            разложит дни по каналам и покажет, чего не хватает. Правки потом — по одному полю.
          </p>
          <button className="btn btn-or" onClick={onNew}><Plus size={16} />Собрать первый запуск</button>
        </div>
      ) : (
        <div className="lc-list">
          {list.map(({ launch: l, plan: p, slots, report: r }) => {
            const dd = diff(TODAY, l.sales_open);
            const nowKey = p && !p.error
              ? (p.windows.find((w) => diff(w.from, TODAY) >= 0 && diff(TODAY, w.to) >= 0) || { key: "" }).key
              : "";
            const st = LC_STATUS[l.status] || LC_STATUS.draft;
            return (
              <button className="lc-row" key={l.id} onClick={() => onOpen(l.id)}>
                <div>
                  <div className="nm">
                    <span className="lc-dot" data-s={l.status} />{l.name}
                    <span className={"chip " + st[1]} style={{ marginLeft: 2 }}>{st[0]}</span>
                  </div>
                  <div className="sub">
                    {l.product} · {l.price} · окно {fmtS(l.sales_open)}
                    {l.sales_close ? " — " + fmtS(l.sales_close) : ""}
                  </div>
                </div>
                <div className="mn">
                  {p && !p.error ? (
                    <>
                      <div className="lc-mini">
                        {p.windows.map((w) => (
                          <i key={w.key} data-k={w.key} data-on={w.key === nowKey ? "1" : "0"}
                            style={{ flexGrow: w.days, flexBasis: 0 }} />
                        ))}
                      </div>
                      <div className="lc-mini-l">
                        <span>{slots.length} слотов</span>
                        <span>{slots.filter((s) => !s.idea).length} без идеи</span>
                      </div>
                    </>
                  ) : (
                    <div className="mono" style={{ fontSize: 12, color: "var(--p-ink-3)" }}>план не развёрнут</div>
                  )}
                </div>
                <div className="al">
                  {l.archived ? <span className="chip">разбор готов</span>
                    : r.empty ? <span className="chip amber">нужен план</span>
                      : r.critical > 0 ? <span className="chip or">починить {r.critical}</span>
                        : <span className="chip green">критичного нет</span>}
                  <span className="mono" style={{ fontSize: 11.5, color: "var(--p-ink-3)" }}>
                    {l.archived ? "закрыт " + fmtS(l.sales_close)
                      : dd > 0 ? "до продаж " + plural(dd, "день", "дня", "дней")
                        : "окно · день " + (diff(l.sales_open, TODAY) + 1)}
                  </span>
                </div>
                <span className="ch"><ChevronRight size={17} /></span>
              </button>
            );
          })}
          {!arch && (
            <button className="lc-newrow" onClick={onNew}>
              <Plus size={17} /><b>Новый запуск</b><span>мастер на 3 шага · план собирается сразу</span>
            </button>
          )}
        </div>
      )}

      <div className="lc-sec"><h2>Как это работает</h2></div>
      <div className="lc-gates">
        {([[<CalendarDays key="a" size={16} />, "План собирается, а не пишется",
          "Задаёшь дату продаж — система разворачивает 7 этапов назад, раздаёт рубрики по квотам и честно говорит, что сжала и что выбросила."],
        [<ListChecks key="b" size={16} />, "Сначала фактура, потом слоты",
          "Прогрев начинается не с календаря, а с ответа «чем мне вообще есть что доказывать». Спрашиваем по одной карточке — и только то, что нужно ближайшим дням."],
        [<AlertTriangle key="c" size={16} />, "Проверка не отчёт, а очередь",
          "Восемь проверок ищут то, что стоит продаж: незакрытый мостик, ажиотаж раньше времени, обещание без раскрытия. Каждая находка ведёт в конкретный день."]] as Array<[React.ReactNode, string, string]>)
          .map(([ic, t, d]) => (
            <div className="lc-gate" key={t}>
              <div className="lc-gate-hd"><span style={{ color: "var(--p-or)" }}>{ic}</span><b>{t}</b></div>
              <p>{d}</p>
            </div>
          ))}
      </div>
    </div>
  );
}

/* ─── мастер: одна обязательная дата, форма плана видна сразу ─── */

interface Preset {
  key: string; name: string; note: string;
  v: { intensity: string; key_event_type: string; winLen: number; durations: Record<string, number> };
}
const LC_PRESETS: Preset[] = [
  { key: "info", name: "Первый поток инфопродукта", note: "обычная интенсивность · вебинар · окно 7 дней", v: { intensity: "normal", key_event_type: "вебинар", winLen: 7, durations: {} } },
  { key: "fast", name: "Быстрое окно на 5 дней", note: "плотная · без ключевого события · короткий прогрев", v: { intensity: "dense", key_event_type: "", winLen: 5, durations: { soft: 7, active: 7 } } },
  { key: "beta", name: "Ранний доступ / бета", note: "лёгкая · бесплатник · окно 7 дней", v: { intensity: "light", key_event_type: "бесплатник", winLen: 7, durations: {} } },
  { key: "zero", name: "С нуля", note: "ничего не подставляем", v: { intensity: "normal", key_event_type: "", winLen: 7, durations: {} } },
];

export interface WizardForm {
  name: string; product: string; price: string; sales_open: string; winLen: number;
  key_event_type: string; key_event_date: string; audience: string; warm: string;
  intensity: string; collect: string; waitlist_goal: number;
}

export function LaunchWizard({
  onCancel, onCreate, pending,
}: {
  onCancel: () => void;
  onCreate: (draft: Launch, f: WizardForm) => void;
  pending?: boolean;
}) {
  const TODAY = today();
  const [preset, setPreset] = React.useState("info");
  const [f, setF] = React.useState<WizardForm>({
    name: "", product: "", price: "", sales_open: add(TODAY, 52), winLen: 7,
    key_event_type: "вебинар", key_event_date: add(TODAY, 50), audience: "6 400",
    warm: "тёплая", intensity: "normal", collect: "бот с лид-магнитом", waitlist_goal: 150,
  });
  const set = <K extends keyof WizardForm>(k: K) => (v: WizardForm[K]) => setF({ ...f, [k]: v });
  const applyPreset = (p: Preset) => {
    setPreset(p.key);
    setF({ ...f, ...p.v, key_event_date: p.v.key_event_type ? add(f.sales_open, -2) : "" } as WizardForm);
  };

  const draft: Launch = {
    id: "new", name: f.name || "Новый запуск", product: f.product, price: f.price,
    sales_open: f.sales_open,
    sales_close: f.sales_open ? add(f.sales_open, Math.max(1, f.winLen) - 1) : "",
    key_event_date: f.key_event_type ? f.key_event_date : "",
    key_event_type: f.key_event_type, intensity: f.intensity, launch_number: 1,
    durations: LC_PRESETS.find((p) => p.key === preset)!.v.durations,
    status: "draft", readiness: {},
  };
  const p = buildPlan(draft, TODAY);
  const slots = p.error ? [] : slotsFor(draft, p.windows);
  const ok = !p.error && !!f.sales_open;

  return (
    <div className="pad">
      <div className="ph">
        <div>
          <h1>Новый запуск</h1>
          <p>
            Обязательна одна дата — открытие продаж. Остальное можно поправить потом: план
            пересобирается по кнопке и не затирает закреплённое.
          </p>
        </div>
        <div className="r"><button className="btn btn-w" onClick={onCancel}>Отмена</button></div>
      </div>

      <div className="lc-wiz">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="lc-card">
            <div className="lc-step"><i>1</i><b>Что и когда продаём</b><span>шаблон подставит остальное</span></div>
            <div className="lc-presets" style={{ marginBottom: 16 }}>
              {LC_PRESETS.map((p2) => (
                <button className="lc-preset" key={p2.key} data-on={preset === p2.key ? "1" : "0"}
                  onClick={() => applyPreset(p2)}>
                  <b>{p2.name}</b><span>{p2.note}</span>
                </button>
              ))}
            </div>
            <div className="lc-frow">
              <div className="fld">
                <div className="fld-l">название запуска</div>
                <input className="inp" placeholder="Мастер-группа · 1 поток" value={f.name}
                  onChange={(e) => set("name")(e.target.value)} />
              </div>
            </div>
            <div className="lc-frow c2">
              <div className="fld">
                <div className="fld-l">что продаём</div>
                <input className="inp" placeholder="6 недель, 4 разбора, 20 мест" value={f.product}
                  onChange={(e) => set("product")(e.target.value)} />
              </div>
              <div className="fld">
                <div className="fld-l">цена</div>
                <input className="inp" placeholder="90 000 ₽" value={f.price}
                  onChange={(e) => set("price")(e.target.value)} />
              </div>
            </div>
            <div className="lc-frow c2" style={{ marginBottom: 0 }}>
              <div className="fld">
                <div className="fld-l">открытие продаж · обязательно</div>
                <input className="inp" type="date" value={f.sales_open}
                  onChange={(e) => set("sales_open")(e.target.value)} />
              </div>
              <div className="fld">
                <div className="fld-l">длина окна продаж</div>
                <div className="lc-opt">
                  {[5, 7, 14].map((n) => (
                    <button className="lc-optb" key={n} data-on={f.winLen === n ? "1" : "0"}
                      onClick={() => set("winLen")(n)}>{n} дней</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="lc-card">
            <div className="lc-step"><i>2</i><b>Ключевое событие и сбор заявок</b><span>необязательно</span></div>
            <div className="fld" style={{ marginBottom: 13 }}>
              <div className="fld-l">событие, на которое гоним</div>
              <div className="lc-opt">
                {([["", "нет события"], ["вебинар", "вебинар"], ["бесплатник", "бесплатник"], ["эфир", "эфир"]] as Array<[string, string]>)
                  .map(([v, t]) => (
                    <button className="lc-optb" key={t} data-on={f.key_event_type === v ? "1" : "0"}
                      onClick={() => setF({ ...f, key_event_type: v, key_event_date: v ? (f.key_event_date || add(f.sales_open, -2)) : "" })}>
                      {t}
                    </button>
                  ))}
              </div>
            </div>
            {f.key_event_type && (
              <div className="lc-frow c2">
                <div className="fld">
                  <div className="fld-l">дата {f.key_event_type}а</div>
                  <input className="inp" type="date" value={f.key_event_date}
                    onChange={(e) => set("key_event_date")(e.target.value)} />
                </div>
                <div className="fld">
                  <div className="fld-l">цель по регистрациям</div>
                  <input className="inp" type="number" value={f.waitlist_goal}
                    onChange={(e) => set("waitlist_goal")(+e.target.value)} />
                </div>
              </div>
            )}
            <div className="fld" style={{ marginBottom: 0 }}>
              <div className="fld-l">как собираем заявки</div>
              <div className="lc-opt">
                {["бот с лид-магнитом", "ключевое слово в комментариях", "форма на лендинге"].map((t) => (
                  <button className="lc-optb" key={t} data-on={f.collect === t ? "1" : "0"}
                    onClick={() => set("collect")(t)}>{t}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="lc-card">
            <div className="lc-step"><i>3</i><b>Аудитория и интенсивность</b><span>отсюда каденция</span></div>
            <div className="lc-frow c2">
              <div className="fld">
                <div className="fld-l">размер аудитории</div>
                <input className="inp" value={f.audience} onChange={(e) => set("audience")(e.target.value)} />
              </div>
              <div className="fld">
                <div className="fld-l">прогретость</div>
                <div className="lc-opt">
                  {["холодная", "тёплая", "прогретая"].map((t) => (
                    <button className="lc-optb" key={t} data-on={f.warm === t ? "1" : "0"}
                      onClick={() => set("warm")(t)}>{t}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="fld" style={{ marginBottom: 0 }}>
              <div className="fld-l">интенсивность</div>
              <div className="lc-opt">
                {Object.keys(CADENCE).map((k) => (
                  <button className="lc-optb" key={k} data-on={f.intensity === k ? "1" : "0"}
                    onClick={() => set("intensity")(k)}>
                    {CADENCE[k].name}<i>{CADENCE[k].note}</i>
                  </button>
                ))}
              </div>
              <p className="lc-note" style={{ marginTop: 10 }}>
                Блогу на пятьсот подписчиков сорок единиц контента не нужны — он выгорит и не дойдёт
                до продаж. Профили каденции наши, не из методологии: их стоит замерить на первых запусках.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-or" disabled={!ok || pending} onClick={() => ok && onCreate(draft, f)}>
              <Rocket size={16} />Создать и развернуть план
            </button>
            <button className="btn btn-g" onClick={onCancel}>Отмена</button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, position: "sticky", top: 14 }}>
          <div className="cap">что получится</div>
          {p.error ? (
            <div className="lc-err">
              <AlertTriangle size={15} style={{ flex: "none", marginTop: 1 }} />
              <span><b>Даты не сходятся. </b>{p.error}</span>
            </div>
          ) : (
            <>
              <LaunchAxis launch={draft} data={{ plan: p }} />
              <div className="lc-gates" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div className="lc-gate">
                  <div className="cap">единиц контента</div>
                  <div className="big">{slots.length}</div>
                  <p>
                    {PLATFORMS.map((pl) => CADENCE[f.intensity][pl.key]
                      ? pl.name + " " + slots.filter((s) => s.platform === pl.key).length : null)
                      .filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="lc-gate">
                  <div className="cap">до продаж</div>
                  <div className="big">{diff(TODAY, f.sales_open)}<i>дней</i></div>
                  <p>прогрев стартует завтра, {fmt(add(TODAY, 1))}</p>
                </div>
              </div>
              <p className="lc-note">
                План можно пересобрать в любой момент. Закреплённые и опубликованные слоты
                пересборку переживают.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── рамка: правка запуска + пересборка плана ─── */

export function LaunchFrame({
  launch, slots, onClose, onPatch, onRebuild, onArchive,
}: {
  launch: Launch; slots: Slot[];
  onClose: () => void;
  onPatch: (upd: Partial<Launch>) => void;
  onRebuild: (durations: Record<string, number>) => void;
  onArchive: () => void;
}) {
  const [d, setD] = React.useState<Record<string, number>>({ ...(launch.durations || {}) });
  const stages = ["soft", "reveal", "active", "keystep", "hype", "sales"];
  return (
    <div className="drawer" role="dialog" aria-modal="true" aria-label="Рамка запуска" style={{ width: 440 }}>
      <div className="drawer-hd">
        <span className="cap">рамка запуска</span>
        <span className="chip">{launch.name}</span>
        <button className="ib tt dn" data-tt="Закрыть · esc" aria-label="Закрыть"
          style={{ marginLeft: "auto" }} onClick={onClose}><X size={14} /></button>
      </div>
      <div className="drawer-b">
        <div className="fld"><div className="fld-l">что продаём</div>
          <input className="inp" defaultValue={launch.product} /></div>
        <div className="two">
          <div className="fld"><div className="fld-l">цена</div><input className="inp" defaultValue={launch.price} /></div>
          <div className="fld"><div className="fld-l">поток по счёту</div>
            <input className="inp" type="number" defaultValue={launch.launch_number} /></div>
        </div>
        <div className="two">
          <div className="fld"><div className="fld-l">открытие продаж</div>
            <input className="inp" type="date" defaultValue={launch.sales_open} /></div>
          <div className="fld"><div className="fld-l">закрытие</div>
            <input className="inp" type="date" defaultValue={launch.sales_close} /></div>
        </div>
        <div className="two">
          <div className="fld"><div className="fld-l">{launch.key_event_type || "ключевое событие"}</div>
            <input className="inp" type="date" defaultValue={launch.key_event_date} /></div>
          <div className="fld"><div className="fld-l">цель по заявкам</div>
            <input className="inp" type="number" defaultValue={launch.waitlist_goal} /></div>
        </div>
        <div className="fld"><div className="fld-l">как собираем заявки</div>
          <input className="inp" defaultValue={launch.collect} /></div>
        <div className="fld">
          <div className="fld-l">интенсивность</div>
          <div className="lc-opt">
            {Object.keys(CADENCE).map((k) => (
              <button className="lc-optb" key={k} data-on={launch.intensity === k ? "1" : "0"}
                onClick={() => onPatch({ intensity: k })}>{CADENCE[k].name}</button>
            ))}
          </div>
        </div>
        <div className="fld">
          <div className="fld-l">длительности этапов, дней</div>
          {stages.map((k) => {
            const st = byKey[k], cur = d[k] != null ? d[k] : st.def;
            return (
              <div key={k} style={{ display: "grid", gridTemplateColumns: "1fr 76px", gap: 10, alignItems: "center", marginTop: 7 }}>
                <span style={{ fontSize: 13, color: "var(--p-ink-2)" }}>
                  {st.n} · {st.name}
                  <span className="mono" style={{ color: "var(--p-ink-3)", fontSize: 11, marginLeft: 7 }}>
                    {st.min}–{st.max}
                  </span>
                </span>
                <input className="inp" type="number" min={st.min} max={st.max} value={cur}
                  onChange={(e) => setD({ ...d, [k]: +e.target.value })} />
              </div>
            );
          })}
          <p className="lc-note" style={{ marginTop: 10 }}>
            Активный прогрев в методологии назван трижды по-разному — 7–15 дней с дефолтом 10
            наш компромисс, правь смело.
          </p>
        </div>
        <div className="lc-why">
          <span className="cap">пересборка плана</span>
          <p>
            Слоты, которые ты закрепил ({slots.filter((s) => s.is_pinned).length}) и уже
            опубликованные ({slots.filter((s) => s.status === "published").length}), останутся
            на месте. Остальное развернётся заново.
          </p>
          <button className="btn btn-w btn-sm" style={{ marginTop: 11 }} onClick={() => onRebuild(d)}>
            <RefreshCw size={14} />Развернуть план заново
          </button>
        </div>
      </div>
      <div className="drawer-f" style={{ gap: 9 }}>
        <button className="btn btn-or" style={{ flex: 1, justifyContent: "center" }} onClick={onClose}>
          <Check size={15} />Готово
        </button>
        <button className="btn btn-w tt" data-tt="В архив · удаления нет" aria-label="В архив" onClick={onArchive}>
          <Archive size={15} />
        </button>
      </div>
    </div>
  );
}

export { STAGES, ArrowRight };
