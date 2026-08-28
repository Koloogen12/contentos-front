"use client";

/**
 * Штаб — порт `LxHQ` (launch-hq.jsx).
 *
 * Один экран отвечает на «что делать сейчас» и «я в порядке». Проверка здесь
 * не отчёт, а очередь: каждая находка ведёт кнопкой туда, где чинится.
 */

import * as React from "react";
import {
  AlertTriangle, ArrowRight, CalendarDays, Check, ChevronDown, ChevronRight,
  ChevronUp, Flame, History, ListChecks, Minus, Package, PenLine, Pin,
  RefreshCw, Send, ThumbsDown, ThumbsUp, Zap,
} from "lucide-react";

import {
  type Finding, type Slot,
  MEANINGS, QUESTIONS, READINESS, WD, add, byKey, diff, fmt, fmtS,
  launchMode, levByKey, meanByKey, plural, rubByKey, today,
} from "@/lib/launch/core";
import { LaunchAxis } from "@/components/launch/LaunchAxis";
import type { LaunchCtx, LaunchTab } from "@/components/launch/ctx";

export const LC_REACT: Array<[number, string]> = [[1, "не зашло"], [2, "норм"], [3, "зашло"]];

const REACT_ICON: Record<number, React.ReactNode> = {
  1: <ThumbsDown size={11} />, 2: <Minus size={11} />, 3: <ThumbsUp size={11} />,
};

/** Оценка отклика: три позиции. Без неё разбор не увидит пост. */
export function LaunchReact({ v, onSet }: { v: number | null; onSet: (v: number) => void }) {
  if (v) {
    return (
      <span className="lc-tag" data-ok={v === 3 ? "1" : undefined} data-w={v === 1 ? "1" : undefined}>
        {REACT_ICON[v]}<span style={{ marginLeft: 5 }}>{LC_REACT.find((r) => r[0] === v)![1]}</span>
      </span>
    );
  }
  return (
    <span className="lc-3" onClick={(e) => e.stopPropagation()}>
      {LC_REACT.map(([k, t]) => (
        <button key={k} className="tt dn" data-tt={t + " · клавиша " + k} aria-label={t}
          onClick={(e) => { e.stopPropagation(); onSet(k); }}>{REACT_ICON[k]}</button>
      ))}
    </span>
  );
}

/** Задание на съёмку: не «пост», а что снимать и почему именно это. */
function LaunchShot({ slot, ctx }: { slot: Slot; ctx: LaunchCtx }) {
  const { data, openSlot, toast, setLtab, setSlot, toCanvas } = ctx;
  const rub = rubByKey[slot.rubric], mean = meanByKey[slot.meaning], lev = levByKey[slot.trigger_key];
  const q = QUESTIONS.find((x) => x.n === rub.q)!;
  const proof = data.evidence[slot.meaning];
  const pl = { stories: "сторис", reels: "рилс", telegram: "telegram" }[slot.platform];
  return (
    <div className="lc-shot">
      <div className="lc-shot-hd">
        <span className="chip">{pl}</span>
        <span className="lc-rb">{rub.name}</span>
        <span className="mono" style={{ fontSize: 11.5, color: "var(--p-ink-3)" }}>
          {fmt(slot.date)}, {WD[(new Date(slot.date + "T00:00:00").getDay() + 6) % 7]}
        </span>
        {slot.is_pinned && <span className="lc-tag"><Pin size={9} style={{ marginRight: 4 }} />закреплён</span>}
        {slot.markup_origin !== "human" && (
          <span className="lc-tag tt" data-tt={"разметка: " +
            (slot.markup_origin === "rule" ? "правила по ключевым словам" : "модель") + " · в покрытие не идёт"}>
            не проверено
          </span>
        )}
        {slot.draft === "ready" && <span className="lc-tag" data-ok="1">текст готов · {slot.chars}</span>}
        {slot.draft === "writing" && <span className="lc-tag">пишется на канвасе</span>}
        {slot.line_id && (
          <span className="lc-tag" style={{ color: "var(--p-violet)", borderColor: "rgba(107,78,230,.26)", background: "var(--p-violet-soft)" }}>
            {slot.line_role === "announce" ? "анонс линии" : "раскрытие линии"}
          </span>
        )}
        {proof !== "proof" && (
          <span className="lc-tag" data-w="1">{proof === "claimed" ? "без пруфа" : "нечем доказать"}</span>
        )}
      </div>
      <div className={"tx" + (slot.idea ? "" : " lc-empty")}>{slot.idea || slot.reason}</div>
      <div className="why">
        <div><span>вопрос</span><em>{q.title}</em></div>
        <div><span>смысл</span><em>{mean.name}</em></div>
        <div><span>рычаг</span><em>{lev.name} — {lev.why.toLowerCase()}</em></div>
      </div>
      <div className="acts">
        {!slot.idea
          ? <button className="btn btn-or btn-sm" onClick={() => setLtab("evidence")}><ListChecks size={14} />Добыть фактуру</button>
          : slot.draft === "ready"
            ? (slot.status === "published"
              ? <LaunchReact v={slot.reaction} onSet={(v) => { setSlot(slot.id, { reaction: v }); toast("Отметка учтена — уйдёт в разбор"); }} />
              : <button className="btn btn-or btn-sm" onClick={() => { setSlot(slot.id, { status: "published" }); toast("Опубликовано · отметь реакцию", () => setSlot(slot.id, { status: "planned" })); }}><Send size={14} />Опубликовать</button>)
            : <button className="btn btn-or btn-sm" onClick={() => toCanvas(slot)}><PenLine size={14} />Собрать текст на канвасе</button>}
        <button className="btn btn-w btn-sm" onClick={() => openSlot(slot.id)}>Разобрать слот</button>
      </div>
    </div>
  );
}

/**
 * Находка. Формулировка обязана содержать четыре вещи: что не так, чем грозит,
 * где чинится и на чём основано. Важные свёрнуты в строку, критичные раскрыты.
 */
function LaunchFinding({
  f, goDay, setLtab, expanded, onToggle,
}: {
  f: Finding; goDay: LaunchCtx["goDay"]; setLtab: LaunchCtx["setLtab"];
  expanded: boolean; onToggle: () => void;
}) {
  // Куда ведёт находка. Линии и готовность чинятся в самом Штабе,
  // остальное — в плане или фактуре.
  const ACT: Record<Finding["go"], [string, LaunchTab]> = {
    plan: ["Открыть план", "plan"],
    evidence: ["В фактуру", "evidence"],
    lines: ["Назначить раскрытие", "hq"],
    report: ["Отметить готовность", "hq"],
  };
  const act = ACT[f.go] || ACT.plan;

  if (f.level !== "critical" && !expanded) {
    return (
      <button className="lc-findrow" onClick={onToggle}>
        <span className="chip amber">важно</span>
        <span className="t">{f.title}</span>
        <span className="mono" style={{ fontSize: 11.5, color: "var(--p-ink-3)" }}>
          {f.where.length ? fmtS(f.where[0]) + (f.where.length > 1 ? " +" + (f.where.length - 1) : "") : ""}
        </span>
        <ChevronDown size={15} style={{ color: "var(--p-ink-3)" }} />
      </button>
    );
  }
  return (
    <div className="lc-find" data-lv={f.level}>
      <div className="lc-find-hd">
        <span className={"chip " + (f.level === "critical" ? "or" : "amber")}>
          {f.level === "critical" ? "критично" : "важно"}
        </span>
        <h3>{f.title}</h3>
        {f.level !== "critical" && (
          <button className="ib tt dn" data-tt="Свернуть" aria-label="Свернуть" onClick={onToggle}>
            <ChevronUp size={14} />
          </button>
        )}
      </div>
      <div className="lc-find-b">
        <div>
          <p>{f.risk}</p>
          {f.items.length > 0 && <ul>{f.items.map((it, i) => (<li key={i}>{it}</li>))}</ul>}
        </div>
        <div className="lc-side">
          {f.where.length > 0 && (
            <div>
              <div className="cap" style={{ marginBottom: 8 }}>где чинится</div>
              <div className="lc-days">
                {f.where.slice(0, 4).map((d) => (
                  <button className="lc-daych" key={d} onClick={() => goDay(d, "plan")}>{fmtS(d)}</button>
                ))}
              </div>
            </div>
          )}
          <div className="lc-basis">
            <b style={{ fontWeight: 600 }}>на чём основано:</b>{" "}
            {f.basis === "confirmed" ? "подтверждённая разметка и факты запуска" : "предположение — разметка не выверена вручную"}
          </div>
          <button className="btn btn-w btn-sm" onClick={() => setLtab(act[1])}>
            {act[0]}<ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function LaunchHQ(ctx: LaunchCtx) {
  const { launch, data, report, goDay, setLtab, toast, openSlot, setScreen } = ctx;
  const [open, setOpen] = React.useState<Record<string, boolean>>({});
  const [showAll, setShowAll] = React.useState(false);
  const TODAY = today();
  const mode = launchMode(launch);
  const p = data.plan;
  const started = !!p && !p.error && diff(p.windows[0].from, TODAY) >= 0;
  const dd = diff(TODAY, launch.sales_open);
  const inSales = diff(launch.sales_open, TODAY) >= 0 && !!launch.sales_close && diff(TODAY, launch.sales_close) >= 0;
  const nowWin = p && !p.error ? p.windows.find((w) => diff(w.from, TODAY) >= 0 && diff(TODAY, w.to) >= 0) : null;
  const todaySlots = data.slots.filter((s) => s.date === TODAY);
  const tomorrow = data.slots.filter((s) => s.date === add(TODAY, 1));
  const missed = data.slots.filter((s) => s.status === "missed");
  const unrated = data.slots.filter((s) => s.status === "published" && !s.reaction);
  const first = data.slots.slice(0, 6);
  const rdOn = READINESS.filter((x) => data.readiness[x[0]]).length;
  const claimed = MEANINGS.filter((m) => data.evidence[m.key] === "claimed").length;
  const noneCnt = MEANINGS.filter((m) => data.evidence[m.key] === "none").length;

  if (mode === "draft") {
    return (
      <>
        <div className="lc-card" style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
          <span className="ph-ic" style={{ background: "var(--p-or-soft)", color: "var(--p-or)" }}>
            <CalendarDays size={20} />
          </span>
          <div style={{ flex: 1 }}>
            <b style={{ fontSize: 16.5, letterSpacing: "-.025em" }}>План ещё не развёрнут</b>
            <p className="lc-note" style={{ margin: "6px 0 0" }}>
              Продажи открываются {fmt(launch.sales_open)} — это {plural(dd, "день", "дня", "дней")}.
              Хватает на полный прогрев: 21 день мягкого, 10 активного, 6 на ключевой шаг.
              Разворот занимает одну кнопку и ничего не стоит.
            </p>
          </div>
          <button className="btn btn-or" onClick={() => ctx.rebuild(launch.durations || {})}>
            <RefreshCw size={16} />Развернуть план
          </button>
        </div>
        <div className="lc-two">
          <div>
            <div className="lc-sec" style={{ marginTop: 0 }}><h2>Пока плана нет, полезно другое</h2></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button className="lc-findrow" onClick={() => setLtab("evidence")}>
                <span className="chip teal">фактура</span>
                <span className="t">Пройти инвентаризацию: чем вообще есть что доказывать</span>
                <ArrowRight size={15} />
              </button>
              <button className="lc-findrow" onClick={() => setScreen && setScreen("ideas")}>
                <span className="chip violet">идеи</span>
                <span className="t">Разметить банк идей под рубрики прогрева</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
          <div className="lc-goal">
            <div className="cap">рамка</div>
            <p className="lc-note" style={{ marginTop: 10 }}>
              {launch.product}<br />{launch.price}<br />сбор заявок: {launch.collect}
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="lc-card" style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14, padding: "18px 22px" }}>
        <span className="ph-ic" style={{
          background: inSales ? "var(--p-green-soft)" : "var(--p-or-soft)",
          color: inSales ? "var(--p-green)" : "var(--p-or)",
        }}>
          {inSales ? <Zap size={20} /> : <Flame size={20} />}
        </span>
        <div style={{ flex: 1 }}>
          <b style={{ fontSize: 16.5, letterSpacing: "-.025em" }}>
            {mode === "closed" ? "Продажи закрыты " + fmt(launch.sales_close)
              : inSales ? "Окно продаж, день " + (diff(launch.sales_open, TODAY) + 1) + " из " + (diff(launch.sales_open, launch.sales_close) + 1)
                : started ? byKey[nowWin ? nowWin.key : "soft"].name + " · " + plural(todaySlots.length, "единица", "единицы", "единиц") + " контента на сегодня"
                  : "Прогрев стартует завтра, " + fmt(p!.windows[0].from)}
          </b>
          <p className="lc-note" style={{ margin: "6px 0 0" }}>
            {report.critical > 0
              ? "Сегодня главное не съёмка, а " + plural(report.critical, "критичная находка", "критичные находки", "критичных находок") +
                " ниже: до продаж " + plural(dd > 0 ? dd : 0, "день", "дня", "дней") + ", позже чинить будет нечем."
              : "Критичного нет. Дальше — по плану: снимай сегодняшнее и подтверждай разметку этапами."}
          </p>
        </div>
      </div>

      <LaunchAxis
        launch={launch} data={data} lines={data.lines}
        onStage={(_k, from) => goDay(from, "plan")}
        onDay={(d) => goDay(d, "plan")}
        onLine={(x) => {
          const a = data.slots.find((s) => s.id === x.announce_slot);
          if (a) { openSlot(a.id); setLtab("plan"); } else goDay(x.announced_on, "plan");
        }}
        onGap={(g) => goDay(g.days[0], "plan")}
      />

      <div className="lc-sec">
        <h2>{mode === "closed" ? "Запуск закрыт" : started ? (todaySlots.length ? "Что снимаем сегодня" : "Ближайшие дни") : "Первые дни прогрева"}</h2>
        <div className="r">
          <button className="btn btn-w btn-sm" onClick={() => setLtab("plan")}>Весь план<ArrowRight size={13} /></button>
        </div>
      </div>

      <div className="lc-two">
        {mode === "closed" ? (
          <div className="lc-card" style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span className="ph-ic" style={{ background: "var(--p-teal-soft)", color: "var(--p-teal)" }}><History size={20} /></span>
            <div style={{ flex: 1 }}>
              <b style={{ fontSize: 16, letterSpacing: "-.025em" }}>Разбор готов</b>
              <p className="lc-note" style={{ margin: "6px 0 0" }}>
                {plural(data.slots.filter((s) => s.status === "published").length, "пост", "поста", "постов")} выпущено,
                отклик посчитан по твоим отметкам. Забери дефолты в следующий поток.
              </p>
            </div>
            <button className="btn btn-or" onClick={() => setLtab("retro")}><History size={15} />Открыть разбор</button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {(todaySlots.length ? todaySlots : first.slice(0, 2)).slice(0, 3).map((s) => (
              <LaunchShot key={s.id} slot={s} ctx={ctx} />
            ))}
            {missed.length > 0 && (
              <>
                <div className="cap" style={{ marginTop: 6 }}>вчера не вышло</div>
                {missed.slice(0, 3).map((s) => (
                  <div className="lc-slim" data-miss="1" key={s.id}>
                    <span className="mono" style={{ fontSize: 11.5, color: "var(--p-amber)", flex: "none" }}>{fmtS(s.date)}</span>
                    <span className="t">{s.idea || s.reason}</span>
                    <button className="btn btn-w btn-sm" onClick={() => { ctx.setSlot(s.id, { status: "published" }); toast("Отмечено выпущенным"); }}>Выпустил</button>
                    <button className="btn btn-g btn-sm" onClick={() => { ctx.setSlot(s.id, { date: TODAY, status: "planned" }); toast("Перенесено на сегодня"); }}>На сегодня</button>
                  </div>
                ))}
              </>
            )}
            {unrated.length > 0 && (
              <div className="lc-slim" style={{ borderStyle: "dashed" }}>
                <ThumbsUp size={14} style={{ color: "var(--p-ink-3)", flex: "none" }} />
                <span className="t">
                  {plural(unrated.length, "выпущенный пост", "выпущенных поста", "выпущенных постов")} без отметки — разбор их не увидит
                </span>
                <button className="btn btn-w btn-sm" onClick={() => goDay(unrated[0].date, "plan")}>Отметить</button>
              </div>
            )}
            <div className="cap" style={{ marginTop: 6 }}>{started ? "завтра" : "дальше на этой неделе"}</div>
            {(started ? tomorrow : first.slice(2)).map((s) => (
              <button className="lc-slim" key={s.id} onClick={() => openSlot(s.id)}>
                <span className="mono" style={{ fontSize: 11, color: "var(--p-ink-3)", flex: "none", width: 46 }}>{fmtS(s.date)}</span>
                <span className="lc-rb">{rubByKey[s.rubric].name}</span>
                <span className="t">{s.idea || s.reason}</span>
                <ChevronRight size={14} style={{ color: "var(--p-ink-3)" }} />
              </button>
            ))}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="lc-goal">
            <div className="cap">
              {inSales ? "оплаты" : launch.key_event_type ? "регистрации на " + launch.key_event_type : "заявки"}
            </div>
            <div className="n">
              {inSales ? launch.paid ?? 0 : launch.waitlist ?? 0}
              <i> из {inSales ? launch.paid_goal ?? 0 : launch.waitlist_goal ?? 0}</i>
            </div>
            <div className="lc-track">
              <i
                data-ok={(inSales ? (launch.paid ?? 0) / (launch.paid_goal || 1) : (launch.waitlist ?? 0) / (launch.waitlist_goal || 1)) >= 1 ? "1" : "0"}
                style={{ width: Math.min(100, (inSales ? (launch.paid ?? 0) / (launch.paid_goal || 1) : (launch.waitlist ?? 0) / (launch.waitlist_goal || 1)) * 100) + "%" }}
              />
            </div>
            <p className="lc-note" style={{ marginTop: 10 }}>
              {inSales ? "Осталось " + plural(diff(TODAY, launch.sales_close), "день", "дня", "дней") + " окна. Сбор: " + launch.collect + "."
                : launch.key_event_date ? "До " + launch.key_event_type + "а " + plural(diff(TODAY, launch.key_event_date), "день", "дня", "дней") + ". Сбор: " + launch.collect + "."
                  : "Сбор: " + launch.collect + "."}
            </p>
            {inSales && (launch.paid ?? 0) / (launch.paid_goal || 1) < 0.6 && (
              <div className="lc-rescue">
                <b><AlertTriangle size={14} />Режим спасения</b>
                <p>Оплат вдвое меньше плана к середине окна. Система предлагает переставить остаток: вместо двух слотов ажиотажа — социальные доказательства и снятие возражений.</p>
                <button className="btn btn-or btn-sm" style={{ marginTop: 10, width: "100%", justifyContent: "center" }}
                  onClick={() => toast("Остаток окна перестроен: 2 слота ажиотажа → ученики и возражения")}>
                  Перестроить остаток окна
                </button>
              </div>
            )}
            {!inSales && !launch.waitlist && (
              <p className="lc-note" style={{ marginTop: 8, color: "var(--p-ink-3)" }}>
                Данных пока нет — заявки начнут собираться на этапе 5, у ключевого шага.
              </p>
            )}
            {(inSales || mode === "closed") && (
              <div className="lc-funnel">
                {([["дошли до поста", 100], ["перешли в сбор", 38], ["оставили заявку", 21], ["оплатили", 9]] as Array<[string, number]>).map(([t, v]) => (
                  <div className="lc-fn" key={t}>
                    <div className="b"><i style={{ width: v + "%" }} /><span>{t}</span></div>
                    <span className="v">{v}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lc-goal">
            <div className="lc-gate-hd" style={{ marginBottom: 11 }}>
              <b>Обещания</b>
              <span className="chip" style={{ marginLeft: "auto" }}>{data.lines.length}</span>
            </div>
            {data.lines.length === 0 && (
              <p className="lc-note">
                Линий нет. Три-пять обещаний с анонсом и раскрытием держат внимание через недели,
                которые иначе распадаются на отдельные посты.
              </p>
            )}
            {data.lines.map((x) => {
              const closed = !!x.close_slot && (!launch.sales_close || diff(x.closes_on, launch.sales_close) >= 0);
              const aSlot = data.slots.find((s) => s.id === x.announce_slot);
              return (
                <div key={x.id} style={{ padding: "10px 0", borderTop: "1px solid var(--p-line)" }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500, lineHeight: 1.4 }}>{x.title}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                    {aSlot
                      ? <button className="lc-daych" onClick={() => { openSlot(aSlot.id); setLtab("plan"); }}>анонс {fmtS(x.announced_on)} · пост есть</button>
                      : <span className="lc-tag" data-w="1">анонс {fmtS(x.announced_on)} · поста нет</span>}
                    {closed
                      ? <span className="lc-tag" data-ok="1">раскрытие {fmtS(x.closes_on)}</span>
                      : <button className="btn btn-w btn-sm" onClick={() => { goDay(x.closes_on || add(launch.sales_open, -2), "plan"); toast("Открой слот и отметь его раскрытием линии"); }}>Поставить раскрытие в слот</button>}
                  </div>
                </div>
              );
            })}
            <button className="dashed" style={{ marginTop: 11 }}
              onClick={() => toast("Новая линия: сформулируй обещание и назначь две даты")}>
              + Добавить обещание
            </button>
          </div>
        </div>
      </div>

      <div className="lc-sec">
        <h2>Готовность к продажам</h2>
        <span className="mono" style={{ fontSize: 11.5, color: "var(--p-ink-3)" }}>
          подтверждённое и заявленное считаются раздельно
        </span>
      </div>
      <div className="lc-gates">
        <div className="lc-gate">
          <div className="lc-gate-hd"><ListChecks size={16} style={{ color: "var(--p-teal)" }} /><b>Фактура</b></div>
          <div className="big">{report.confirmed}<i>из {report.checkpoints_total} смыслов</i></div>
          <div className="lc-bar2">
            <i style={{ width: (report.confirmed / report.checkpoints_total) * 100 + "%" }} />
            <i className="q" style={{ width: (claimed / report.checkpoints_total) * 100 + "%" }} />
          </div>
          <div className="lc-legend">
            <span><i style={{ background: "var(--p-green)" }} />подтверждено руками {report.confirmed}</span>
            <span><i style={{ background: "var(--p-amber)" }} />заявлено словами {claimed}</span>
          </div>
          <p>{noneCnt} смыслов нечем доказать — из них получается список задач на добычу.</p>
          <button className="btn btn-w btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => setLtab("evidence")}>
            Собрать фактуру<ArrowRight size={13} />
          </button>
        </div>
        <div className="lc-gate">
          <div className="lc-gate-hd"><CalendarDays size={16} style={{ color: "var(--p-or)" }} /><b>План</b></div>
          <div className="big">{report.slots_with_idea}<i>из {report.slots_total} слотов с идеей</i></div>
          <div className="lc-bar2">
            <i style={{ width: (report.slots_with_idea / Math.max(1, report.slots_total)) * 100 + "%", background: "var(--p-or)" }} />
          </div>
          <div className="lc-legend">
            <span><i style={{ background: "var(--p-or)" }} />{report.slots_total - report.slots_with_idea} без идеи</span>
            <span><i style={{ background: "color-mix(in oklab,var(--p-ink) 20%,transparent)" }} />
              {data.slots.filter((s) => s.markup_origin !== "human").length} не проверено вручную</span>
          </div>
          <p>Пустой слот показывает причину в строке: «в банке нет», «не под формат» или «закончились».</p>
          <button className="btn btn-w btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => setLtab("plan")}>
            Открыть план<ArrowRight size={13} />
          </button>
        </div>
        <div className="lc-gate">
          <div className="lc-gate-hd"><Package size={16} style={{ color: "var(--p-violet)" }} /><b>Продукт</b></div>
          <div className="big">{rdOn}<i>из 5 пунктов</i></div>
          <div className="lc-check">
            {READINESS.map(([k, t]) => (
              <button className="lc-checkrow" key={k} data-on={data.readiness[k] ? "1" : "0"}
                onClick={() => ctx.patch((d) => ({ ...d, readiness: { ...d.readiness, [k]: !d.readiness[k] } }))}>
                <span className="bx">{data.readiness[k] && <Check size={12} />}</span>{t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="lc-sec">
        <h2>Что починить</h2>
        {report.critical > 0
          ? <span className="chip or">{plural(report.critical, "критичная", "критичные", "критичных")}</span>
          : <span className="chip green">критичного нет</span>}
        <span className="mono" style={{ fontSize: 11.5, color: "var(--p-ink-3)" }}>
          всего находок {report.findings.length} · проценты покрытия ничего не говорят, поэтому их здесь нет
        </span>
      </div>
      {report.empty ? (
        <p className="lc-note">
          Проверки появятся, когда план развёрнут. Отчитывать за работу, которая не начиналась, — худшее,
          что может сделать инструмент.
        </p>
      ) : report.findings.length === 0 ? (
        <div className="lc-allgood"><Check size={17} />Все восемь проверок закрыты. Такое бывает редко — сохрани этот запуск как шаблон.</div>
      ) : (
        <div className="lc-fix">
          {(showAll ? report.findings : report.findings.filter((f, i) => f.level === "critical" || i < report.critical + 3)).map((f) => (
            <LaunchFinding key={f.key} f={f} goDay={goDay} setLtab={setLtab}
              expanded={!!open[f.key]} onToggle={() => setOpen({ ...open, [f.key]: !open[f.key] })} />
          ))}
          {!showAll && report.findings.length > report.critical + 3 && (
            <button className="dashed" onClick={() => setShowAll(true)}>
              Показать остальные находки · {report.findings.length - report.critical - 3}
            </button>
          )}
        </div>
      )}
      <p className="lc-note" style={{ marginTop: 16 }}>
        Успех запуска в этом инструменте — не «план собрался». План собирается одной кнопкой и ничего не стоит.
        Успех — когда за неделю до продаж ты <b style={{ fontWeight: 600 }}>меняешь</b> план из-за находки:
        доснимаешь мостик, добираешь отзывы, переставляешь ажиотаж.
      </p>
    </>
  );
}
