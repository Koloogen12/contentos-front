"use client";

/**
 * Ось запуска — общий компонент Штаба, Плана и мастера.
 *
 * Порт `LxAxis` из прототипа (launch-shell.jsx) один к одному.
 *
 * Отвечает на один вопрос: успеваю ли я и где дыра. Правило отбора для любого
 * элемента: если это можно так же понятно написать текстом — на оси ему не место.
 * Поэтому здесь нет списка этапов с датами (он дублировал бы саму полосу), нет
 * процентов покрытия и нет диапазона дат в шапке — он уже под осью.
 *
 * Три режима выбираются сами по состоянию: `preview` — слотов нет, показываем
 * только форму будущего плана; `plan` — план собран, старт впереди; `live` —
 * сегодня внутри диапазона.
 *
 * Инверсия акцента в дорожке дней — ключевое решение: заполненное приглушено,
 * пустое подсвечено. Дорожка существует ради дыр, а не ради галочек.
 */

import * as React from "react";

import {
  type EvidenceState, type Gap, type Launch, type PlanResult, type Slot,
  type StoryLine, type Window,
  PLATFORMS, byKey, diff, fmt, fmtS, gapsFor, plural, today,
} from "@/lib/launch/core";

const AX_C: Record<string, string> = {
  soft: "var(--s2)", reveal: "var(--s3)", active: "var(--s4)",
  keystep: "var(--s5)", hype: "var(--s6)", sales: "var(--s7)",
};
const AX_SC = [null, null, "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)", "var(--s6)", "var(--s7)"];

export interface AxisData {
  plan: PlanResult | null;
  slots?: Slot[];
  evidence?: Record<string, EvidenceState>;
}

export function LaunchAxis({
  launch, data, lines, onStage, onDay, onLine, onGap,
}: {
  launch: Partial<Launch> & { sales_open: string; sales_close?: string };
  data: AxisData;
  lines?: StoryLine[];
  onStage?: (key: string, from: string) => void;
  onDay?: (date: string) => void;
  onLine?: (line: StoryLine) => void;
  onGap?: (gap: Gap) => void;
}) {
  const p = data.plan;
  const box = React.useRef<HTMLDivElement>(null);
  const [bw, setBw] = React.useState(0);
  const [allGaps, setAllGaps] = React.useState(false);
  const TODAY = today();

  React.useEffect(() => {
    if (!box.current || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((e) => setBw(e[0].contentRect.width));
    ro.observe(box.current);
    setBw(box.current.clientWidth);
    return () => ro.disconnect();
  }, []);

  if (!p || p.error || !p.windows.length) return null;

  const slots = data.slots || [], ev = data.evidence || {};
  const w0 = p.windows[0], wl = p.windows[p.windows.length - 1];
  const total = diff(w0.from, wl.to) + 1;
  const pos = (d: string) => Math.max(0, Math.min(100, (diff(w0.from, d) / total) * 100));
  const started = diff(w0.from, TODAY) >= 0, ended = diff(wl.to, TODAY) > 0;
  const mode = !slots.length ? "preview" : started ? "live" : "plan";
  const nowWin = p.windows.find((w) => diff(w.from, TODAY) >= 0 && diff(TODAY, w.to) >= 0);
  const narrow = bw > 0 && bw < 640;

  const noProof = slots.filter((s) => s.idea && ev[s.meaning] !== "proof").length;
  const openL = (lines || []).filter((x) =>
    !x.close_slot || !x.closes_on || (launch.sales_close ? diff(x.closes_on, launch.sales_close) < 0 : false));
  const gaps = mode === "preview" ? [] : gapsFor(slots, ev);
  const crit = gaps.filter((g) => g.critical).length;
  const dd = diff(TODAY, launch.sales_open);
  const inSales = !!launch.sales_close &&
    diff(launch.sales_open, TODAY) >= 0 && diff(TODAY, launch.sales_close) >= 0;

  const lead: string | [string, string] = mode === "preview" ? "Так будет выглядеть план"
    : ended ? "Запуск завершён"
      : mode === "live" && nowWin ? ["Идёт ", byKey[nowWin.key].name.toLowerCase()]
        : "План собран";

  const facts: Array<[string | number, string, number?]> = [];
  if (mode === "preview") {
    facts.push([plural(diff(TODAY, wl.to), "день", "дня", "дней"), "до конца продаж"]);
    facts.push([fmtS(w0.from), "старт"]);
  } else if (mode === "plan") {
    facts.push([plural(slots.length, "слот", "слота", "слотов"), ""]);
    if (noProof) facts.push([noProof, "без фактуры", 1]);
    if (crit) facts.push([crit, crit === 1 ? "критичный пропуск" : "критичных пропуска", 1]);
    facts.push([plural(Math.max(0, diff(TODAY, w0.from)), "день", "дня", "дней"), "до старта"]);
  } else {
    facts.push([inSales ? "день " + (diff(launch.sales_open, TODAY) + 1)
      : plural(dd > 0 ? dd : 0, "день", "дня", "дней"), inSales ? "окна продаж" : "до продаж"]);
    if (noProof) facts.push([noProof, "слотов без фактуры", 1]);
    if (openL.length) facts.push([openL.length, openL.length === 1 ? "линия не закрыта" : "линий не закрыто", 1]);
    if (crit) facts.push([crit, crit === 1 ? "критичный пропуск" : "критичных пропуска", 1]);
  }

  const days: Array<{ date: string; past: boolean; units: Array<{ ch: string; st: string }> }> = [];
  if (mode !== "preview") {
    for (let i = 0; i < total; i++) {
      const d = addDays(w0.from, i);
      days.push({
        date: d,
        past: diff(d, TODAY) > 0,
        units: slots.filter((s) => s.date === d).map((s) => ({
          ch: s.platform,
          st: !s.idea ? "empty" : ev[s.meaning] === "proof" ? "proof" : "plain",
        })),
      });
    }
  }
  const dayW = bw > 0 ? (bw - (total - 1) * 2) / total : 20;
  // Дорожка дней схлопывается в недели, когда день уже 6px — иначе она
  // вырождается в шум и перестаёт показывать форму дефицита.
  const weeks = days.length > 0 && (dayW < 6 || (narrow && total > 28));
  const buckets: (typeof days)[] = [];
  if (weeks) for (let i = 0; i < days.length; i += 7) buckets.push(days.slice(i, i + 7));

  const evs: Array<{ date: string; label: string; big?: boolean }> = [];
  if (launch.key_event_date) evs.push({ date: launch.key_event_date, label: launch.key_event_type || "событие" });
  if (launch.sales_open) evs.push({ date: launch.sales_open, label: "открытие продаж", big: true });
  evs.sort((a, b) => (a.date < b.date ? -1 : 1));
  const shown = allGaps ? gaps : gaps.slice(0, 5);

  return (
    <div className="lc-ax" data-ended={ended ? "1" : "0"}>
      <div className="lc-ax-hd">
        <div className="lc-ax-lead">
          {Array.isArray(lead) ? <>{lead[0]}<b>{lead[1]}</b></> : lead}
        </div>
        <div className="lc-ax-facts">
          {facts.map((f, i) => (
            <div className="lc-ax-f" key={i} data-w={f[2] ? "1" : "0"}>
              <b>{f[0]}</b>{f[1] ? " " + f[1] : ""}
            </div>
          ))}
        </div>
      </div>

      <div className="lc-ax-body" ref={box}>
        <div className="lc-ax-st">
          {p.windows.map((w) => {
            const st = byKey[w.key];
            const segPx = bw > 0 ? ((bw - (p.windows.length - 1) * 3) * w.days) / total : 999;
            const dens = slots.length ? slots.filter((s) => s.stage === w.key).length / w.days : 0;
            const load = dens < 1.2 ? 1 : dens < 1.8 ? 2 : dens < 2.6 ? 3 : 4;
            const tiny = segPx < st.short.length * 6.4 + 14;
            const hide = segPx < 26;
            const inStage = slots.filter((s) => s.stage === w.key);
            return (
              <div
                className={"lc-ax-sg tt" + (onStage ? " act" : "")}
                key={w.key}
                style={{ flexGrow: w.days, background: AX_C[w.key] }}
                data-past={diff(w.to, TODAY) > 0 ? "1" : "0"}
                data-tt={st.n + " · " + st.name + " · " +
                  (w.days === 1 ? fmtS(w.from) : fmtS(w.from) + " — " + fmtS(w.to)) + " · " +
                  plural(w.days, "день", "дня", "дней") +
                  (slots.length ? " · " + plural(inStage.length, "слот", "слота", "слотов") +
                    ", без фактуры " + inStage.filter((s) => ev[s.meaning] !== "proof").length : "")}
                onClick={onStage ? () => onStage(w.key, w.from) : undefined}
              >
                {load >= 3 && <span className="hatch" data-l={load} />}
                {!hide && <span className="lb" style={tiny ? { padding: "0 2px" } : undefined}>{tiny ? st.n : st.short}</span>}
              </div>
            );
          })}
        </div>

        {days.length > 0 && !weeks && (
          <div className="lc-ax-days">
            {days.map((d) => (
              <div
                className={"lc-ax-d" + (onDay ? " act" : "")}
                key={d.date}
                data-past={d.past ? "1" : "0"}
                title={fmt(d.date) + " · " + (d.units.length ? plural(d.units.length, "единица", "единицы", "единиц") : "пусто")}
                onClick={onDay ? () => onDay(d.date) : undefined}
              >
                {d.units.map((u, i) => (<span className="lc-ax-u" key={i} data-s={u.st} />))}
              </div>
            ))}
          </div>
        )}
        {weeks && (
          <div className="lc-ax-days">
            {buckets.map((b, i) => {
              const u = b.reduce<Array<{ ch: string; st: string }>>((a, x) => a.concat(x.units), []);
              const e = u.filter((x) => x.st === "empty").length;
              return (
                <div
                  className={"lc-ax-d wk" + (onDay ? " act" : "")}
                  key={i}
                  data-past={b[b.length - 1].past ? "1" : "0"}
                  title={"неделя " + fmtS(b[0].date) + " — " + fmtS(b[b.length - 1].date) + " · " +
                    plural(u.length, "единица", "единицы", "единиц") + ", пустых " + e}
                  onClick={onDay ? () => onDay(b[0].date) : undefined}
                >
                  {e > 0 && <span className="lc-ax-u" data-s="empty" style={{ height: Math.max(6, (e / Math.max(1, u.length)) * 30) }} />}
                  {u.length - e > 0 && <span className="lc-ax-u" data-s="plain" style={{ height: Math.max(4, ((u.length - e) / Math.max(1, u.length)) * 30) }} />}
                </div>
              );
            })}
          </div>
        )}

        {lines && lines.length > 0 && (
          <div className="lc-ax-lines">
            {lines.map((x) => {
              const open = !x.close_slot || !x.closes_on ||
                (launch.sales_close ? diff(x.closes_on, launch.sales_close) < 0 : false);
              const from = pos(x.announced_on);
              const to = open ? 100 : pos(x.closes_on);
              return (
                <div className="lc-ax-lrow" key={x.id}>
                  <div
                    className={"lc-ax-lb tt" + (onLine ? " act" : "")}
                    data-open={open ? "1" : "0"}
                    style={{ left: from + "%", width: Math.max(12, to - from) + "%" }}
                    data-tt={"анонс " + fmtS(x.announced_on) +
                      (open ? " · раскрытие не поставлено в слот" : " · раскрытие " + fmtS(x.closes_on))}
                    onClick={onLine ? () => onLine(x) : undefined}
                  >
                    <i /><span className="t">{x.title}</span>{open && <span className="w">— не закрыта</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="lc-ax-ev">
          {evs.map((e, i) => {
            const l = pos(e.date), left = l < 6, right = l > 88;
            return (
              <div
                className="lc-ax-mark"
                key={i}
                data-big={e.big ? "1" : "0"}
                style={{
                  left: l + "%", top: i % 2 ? 24 : 0,
                  transform: right ? "translateX(-100%)" : left ? "none" : "translateX(-50%)",
                  alignItems: right ? "flex-end" : left ? "flex-start" : "center",
                }}
              >
                <span className="st" />
                <span className="lb">{e.label} {fmtS(e.date)}</span>
              </div>
            );
          })}
        </div>
        <div className="lc-ax-edges"><span>{fmtS(w0.from)}</span><span>{fmtS(wl.to)}</span></div>

        {started && !ended && (
          <div className="lc-ax-now" style={{ left: pos(TODAY) + "%" }}>
            <span
              className="p"
              style={pos(TODAY) > 85 ? { left: 0, transform: "translateX(-100%)" }
                : pos(TODAY) < 8 ? { left: 0, transform: "none" } : undefined}
            >
              сегодня {fmtS(TODAY)}
            </span>
          </div>
        )}
      </div>

      {mode !== "preview" && (
        <div className="lc-ax-gaps">
          {gaps.length === 0 ? (
            <div className="lc-ax-gap ok">
              <span className="dot" style={{ background: "var(--ok)" }} />дыр нет, план обеспечен фактурой
            </div>
          ) : (
            <>
              {shown.map((g) => (
                <div
                  className={"lc-ax-gap" + (onGap ? " act" : "")}
                  key={g.key}
                  onClick={onGap ? () => onGap(g) : undefined}
                >
                  <span className="dot" style={{ background: AX_SC[g.stage] || "var(--s4)" }} />
                  <span className="t">{g.title}</span>
                  <span className="n">{g.note}</span>
                  <span className="d" data-c={g.critical ? "1" : "0"}>
                    {g.days.slice(0, 3).map(fmtS).join(" · ")}
                    {g.days.length > 3 ? " +" + (g.days.length - 3) : ""}
                  </span>
                </div>
              ))}
              {gaps.length > 5 && (
                <button className="lc-ax-more" onClick={() => setAllGaps(!allGaps)}>
                  {allGaps ? "свернуть" : "ещё " + (gaps.length - 5)}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {(mode !== "preview" || p.notes.length > 0) && (
        <div className="lc-ax-foot">
          {mode !== "preview" && (
            <span className="lgd">
              <span><i data-s="empty" />слот пуст</span>
              <span><i data-s="plain" />идея без пруфа</span>
              <span><i data-s="proof" />есть фактура</span>
            </span>
          )}
          {p.notes.length > 0 && (
            <span className="w">
              до продаж мало времени — план урезан: {p.notes.join(", ")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/** Локальный сдвиг даты — вынесен, чтобы не тянуть `add` в каждую итерацию. */
function addDays(s: string, n: number): string {
  const p = s.split("-").map(Number);
  const dt = new Date(p[0], p[1] - 1, p[2]);
  dt.setDate(dt.getDate() + n);
  return dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0");
}

export { PLATFORMS, type Window };
