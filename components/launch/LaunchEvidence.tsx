"use client";

/**
 * Фактура — порт `LxEvidence` (launch-evidence.jsx).
 *
 * Спринт по одной карточке вместо анкеты на сорок полей: спрашиваем в порядке
 * дней плана, сначала то, что понадобится на этой неделе. «Нет» — нормальный
 * ответ, из него получается задача на добычу с дедлайном.
 */

import * as React from "react";
import {
  ArrowRight, CalendarDays, Check, ListChecks, MessageCircle, Paperclip, X,
} from "lucide-react";

import {
  type EvidenceState,
  MEANINGS, QUESTIONS, add, diff, fmt, fmtS, plural, today,
} from "@/lib/launch/core";
import type { LaunchCtx } from "@/components/launch/ctx";

const LC_ST: Array<[EvidenceState, string]> = [
  ["proof", "есть с пруфом"], ["claimed", "заявлено словами"], ["none", "нет"],
];

export function LaunchEvidence(ctx: LaunchCtx) {
  const { launch, data, report, setEvidence, toast, setLtab, goDay } = ctx;
  const TODAY = today();
  const [idx, setIdx] = React.useState(0);
  const [hidden, setHidden] = React.useState<Record<string, number>>({});

  // Когда смысл понадобится в первый раз — по нему и сортируется очередь.
  const need: Record<string, string> = {};
  data.slots.forEach((s) => { if (!need[s.meaning] || s.date < need[s.meaning]) need[s.meaning] = s.date; });

  const queue = MEANINGS.filter((m) => data.evidence[m.key] !== "proof").sort((a, b) => {
    const da = need[a.key] || "9999-99-99", db = need[b.key] || "9999-99-99";
    return da < db ? -1 : da > db ? 1 : a.q - b.q;
  });
  const cur = queue.length ? queue[idx % queue.length] : null;

  const answer = (st: EvidenceState) => {
    if (!cur) return;
    setEvidence(cur.key, st);
    toast(st === "proof" ? "Смысл закрыт — идёт в покрытие"
      : st === "claimed" ? "Заявлено словами · проверка напомнит, что пруфа нет"
        : "Ушло в задачи на добычу");
  };

  const perQ = QUESTIONS.map((q) => {
    const pool = MEANINGS.filter((m) => m.q === q.n);
    return {
      q, total: pool.length,
      proof: pool.filter((m) => data.evidence[m.key] === "proof").length,
      claimed: pool.filter((m) => data.evidence[m.key] === "claimed").length,
    };
  });

  const tasks = MEANINGS.filter((m) => data.evidence[m.key] === "none" && !hidden[m.key]).map((m) => {
    const by = need[m.key] ? add(need[m.key], -2) : add(launch.sales_open, -10);
    return { m, by, slots: data.slots.filter((s) => s.meaning === m.key) };
  }).sort((a, b) => (a.by < b.by ? -1 : 1));

  return (
    <>
      <div className="ph" style={{ marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 23 }}>Фактура</h1>
          <p>
            Не «идеи для постов», а ответ на вопрос: чем вообще есть что доказывать. Это
            инвентаризация, а не экзамен — «нет» нормальный ответ, из него получается список задач.
          </p>
        </div>
        <div className="r">
          <button className="btn btn-w" onClick={() => setLtab("plan")}><CalendarDays size={16} />К плану</button>
        </div>
      </div>

      {queue.length === 0 || !cur ? (
        <div className="lc-allgood">
          <Check size={17} />Все сорок смыслов закрыты пруфами. Дальше — только план и съёмка.
        </div>
      ) : (
        <div className="lc-sprint">
          <div>
            <div className="q">
              вопрос {cur.q} · {QUESTIONS.find((x) => x.n === cur.q)!.title}
              {cur.key === "q3_bridge" && <span className="chip or" style={{ marginLeft: 9 }}>критично всегда</span>}
              {cur.ours && (
                <span className="lc-tag tt" data-tt="в методологии этого смысла нет — добавлен нами"
                  style={{ marginLeft: 9 }}>наше</span>
              )}
            </div>
            <h2>{cur.name}</h2>
            <p className="ask">
              {cur.ask ? "Что собрать: " + cur.ask + "." : "Есть ли у тебя, чем это показать — событие, скрин, цифра, история?"}
              {cur.key === "q3_bridge" && " Без мостика аудитория видит только вершину и решает, что у неё так не выйдет."}
            </p>
            <div className="acts">
              <button className="btn btn-or" onClick={() => answer("proof")}><Paperclip size={15} />Есть — приложу пруф</button>
              <button className="btn btn-w" onClick={() => answer("claimed")}>Скажу словами</button>
              <button className="btn btn-w" onClick={() => answer("none")}><ListChecks size={15} />Нет — в задачи</button>
              <button className="btn btn-g" onClick={() => setIdx(idx + 1)}>Потом<ArrowRight size={14} /></button>
            </div>
            <div className="need">
              {need[cur.key]
                ? "Нужно к " + fmt(add(need[cur.key], -2)) + ": стоит в " +
                  plural(data.slots.filter((s) => s.meaning === cur.key).length, "слоте", "слотах", "слотах") + " — " +
                  data.slots.filter((s) => s.meaning === cur.key).slice(0, 3).map((s) => fmtS(s.date)).join(", ") + "."
                : "В плане пока не используется — спрашиваем по порядку вопросов."}
            </div>
          </div>
          <div>
            <div className="cap" style={{ marginBottom: 12 }}>покрытие по вопросам</div>
            <div className="lc-prog-s">
              {perQ.map((r) => (
                <div className="lc-qbar" key={r.q.n}>
                  <span className="tt" data-tt={r.q.title}
                    style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.q.n} · {r.q.short}
                  </span>
                  <span className="v">{r.proof}/{r.total}</span>
                  <span className="t" style={{ gridColumn: "1 / -1" }}>
                    <i style={{ width: (r.proof / r.total) * 100 + "%" }} />
                    <i className="q" style={{ width: (r.claimed / r.total) * 100 + "%" }} />
                  </span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--p-line)" }}>
              <div className="lc-count"><b>{queue.length}</b><span>осталось пройти</span></div>
              <p className="lc-note" style={{ marginTop: 8 }}>
                Спрашиваем в порядке дней плана: сначала то, что понадобится на этой неделе.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="lc-sec">
        <h2>Задачи на добычу</h2>
        <span className="chip amber">{tasks.length}</span>
        <span className="mono" style={{ fontSize: 11.5, color: "var(--p-ink-3)" }}>
          дедлайн считается от дня, где смысл понадобится
        </span>
      </div>
      {tasks.length === 0 && <p className="lc-note">Задач нет — всё, что нужно ближайшим слотам, уже есть.</p>}
      {tasks.slice(0, 9).map((t) => {
        const soon = diff(TODAY, t.by) <= 7;
        return (
          <div className="lc-task" key={t.m.key} data-done={data.tasks[t.m.key] ? "1" : "0"}>
            <span className="dl" data-far={soon ? "0" : "1"}>до {fmtS(t.by)}</span>
            <span className="t">
              {t.m.ask ? t.m.ask.charAt(0).toUpperCase() + t.m.ask.slice(1) : "Собрать материал: " + t.m.name.toLowerCase()}
              <span>
                закрывает «{t.m.name}» · вопрос {t.m.q}
                {t.slots.length ? " · стоит в плане " + t.slots.slice(0, 2).map((s) => fmtS(s.date)).join(", ") : ""}
              </span>
            </span>
            {t.slots.length > 0 && (
              <button className="lc-daych" onClick={() => goDay(t.slots[0].date, "plan")}>в план</button>
            )}
            <button className="btn btn-w btn-sm"
              onClick={() => { setEvidence(t.m.key, "proof"); toast("Добыто — смысл закрыт пруфом"); }}>
              <Check size={13} />Готово
            </button>
            <button className="ib tt" data-tt="Убрать задачу" aria-label="Убрать"
              onClick={() => setHidden({ ...hidden, [t.m.key]: 1 })}><X size={13} /></button>
          </div>
        );
      })}
      {tasks.length > 9 && (
        <p className="lc-note" style={{ marginTop: 6 }}>
          ещё {tasks.length - 9} — появятся, когда закроешь ближайшие
        </p>
      )}

      <div className="lc-sec">
        <h2>Карта смыслов</h2>
        <span className="mono" style={{ fontSize: 11.5, color: "var(--p-ink-3)" }}>
          {report.checkpoints_total} смыслов на четыре вопроса покупателя · можно отвечать прямо здесь
        </span>
      </div>
      <div className="lc-evgrid">
        {QUESTIONS.map((q) => {
          const pool = MEANINGS.filter((m) => m.q === q.n);
          const proof = pool.filter((m) => data.evidence[m.key] === "proof").length;
          return (
            <div className="lc-evcol" key={q.n}>
              <div className="lc-evcol-hd">
                <b>{q.n} · {q.title}</b>
                <span>{proof} из {pool.length} с пруфом</span>
              </div>
              {pool.map((m) => {
                const st = data.evidence[m.key];
                return (
                  <div className="lc-evrow" key={m.key} data-st={st}>
                    <span className="lc-dot" style={{
                      background: st === "proof" ? "var(--p-green)"
                        : st === "claimed" ? "var(--p-amber)" : "var(--p-line-2)",
                    }} />
                    <span className="t">
                      {m.name}
                      {m.ours && <span className="lc-tag tt" data-tt="добавлено нами" style={{ marginLeft: 6 }}>наше</span>}
                    </span>
                    <span className="lc-3">
                      {LC_ST.map(([k, tt]) => (
                        <button key={k} className="tt dn" data-tt={tt} data-on={st === k ? "1" : "0"}
                          aria-label={tt} onClick={() => setEvidence(m.key, k)}>
                          {k === "proof" ? <Paperclip size={11} />
                            : k === "claimed" ? <MessageCircle size={11} /> : <X size={11} />}
                        </button>
                      ))}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      <p className="lc-note" style={{ marginTop: 16 }}>
        В покрытие идёт только то, что ты подтвердил руками. Уверенное «всё готово» на невыверенной
        разметке обходится дороже честного «не проверено»: человек идёт в запуск с дырой, о которой
        ему сказали, что её нет.
      </p>
    </>
  );
}
