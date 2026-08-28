"use client";

/**
 * Разбор — порт `LxRetro` (launch-retro.jsx).
 *
 * Считается по фактическим отметкам запуска, а не по средним: неотмеченные
 * посты в статистику не идут, иначе средние врут.
 */

import * as React from "react";
import { ArrowRight, CalendarDays, Check, Download, History, ListChecks, Rocket, Users } from "lucide-react";

import {
  CADENCE, byKey, fmt, meanByKey, plural, retro as buildRetro, rubByKey,
} from "@/lib/launch/core";
import type { LaunchCtx } from "@/components/launch/ctx";

export function LaunchRetro(ctx: LaunchCtx) {
  const { launch, data, toast, setLtab } = ctx;

  const R = buildRetro(data.slots, data.evidence);
  const paid = launch.paid || 0, paidGoal = launch.paid_goal || launch.waitlist_goal || 1;
  const pct = R.planned ? Math.round((R.published / R.planned) * 100) : 0;
  const comp = (data.plan && data.plan.compressed) || [];
  const solid = R.rubrics.filter((r) => r[2] >= 2);
  const best = solid[0] || R.rubrics[0];
  const worst = solid.length > 1 ? solid[solid.length - 1] : R.rubrics[R.rubrics.length - 1];

  const takeItems: Array<[string, string]> = ([
    ["intensity", "Интенсивность «" + (CADENCE[launch.intensity]?.name || "обычная").toLowerCase() + "» — оставить"],
    best && ["best", "Поднять квоту рубрики «" + rubByKey[best[0]].name + "» — " + best[1] + " из 100 на " + plural(best[2], "посте", "постах", "постах")],
    worst && worst !== best && ["worst", "Урезать «" + rubByKey[worst[0]].name + "» — " + worst[1] + " из 100 на " + plural(worst[2], "посте", "постах", "постах")],
    comp.length
      ? ["dur", comp.map((c) => c.name.toLowerCase() + " " + c.to + " дн.").join(", ") + " — хватило, сделать дефолтом"]
      : ["bridge", "Мостик ставить в первую неделю, а не в активный прогрев"],
  ].filter(Boolean) as Array<[string, string]>);

  const [take, setTake] = React.useState<Record<string, boolean>>(
    takeItems.reduce((a, x) => Object.assign(a, { [x[0]]: true }), {}));

  if (launch.status !== "closed") {
    return (
      <div className="empty">
        <span className="empty-ic"><History size={20} /></span>
        <h3>Разбор откроется после закрытия продаж</h3>
        <p>
          {launch.sales_close ? "Окно закрывается " + fmt(launch.sales_close) + ". " : ""}
          До тех пор полезнее отмечать реакцию на выпущенные посты — именно из этих отметок разбор и собирается.
        </p>
        <button className="btn btn-w" onClick={() => setLtab("plan")}>Отметить в плане<ArrowRight size={14} /></button>
      </div>
    );
  }

  return (
    <>
      <div className="ph" style={{ marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 23 }}>Разбор</h1>
          <p>
            Продажи закрыты {fmt(launch.sales_close)}. Считаем по тому, что ты отмечал по ходу запуска:
            что вышло, как зашло, какая фактура сработала. Всё помеченное станет дефолтами следующего потока.
          </p>
        </div>
        <div className="r">
          <button className="btn btn-w" onClick={() => toast("Разбор выгружен текстом")}>
            <Download size={16} />Выгрузить разбор
          </button>
        </div>
      </div>

      <div className="lc-gates" style={{ marginBottom: 14 }}>
        <div className="lc-gate">
          <div className="lc-gate-hd"><CalendarDays size={16} style={{ color: "var(--p-or)" }} /><b>Выпущено против плана</b></div>
          <div className="big">{R.published}<i>из {R.planned} слотов · {pct}%</i></div>
          <div className="lc-bar2"><i style={{ width: pct + "%" }} /></div>
          <p>
            {R.missed
              ? plural(R.missed, "слот", "слота", "слотов") + " не вышел — по этим дням отклик не считаем."
              : "Все слоты вышли."}
          </p>
        </div>
        <div className="lc-gate">
          <div className="lc-gate-hd"><Users size={16} style={{ color: "var(--p-teal)" }} /><b>Заявки и оплаты</b></div>
          <div className="big">{paid}<i>из {paidGoal} мест</i></div>
          <div className="lc-bar2"><i style={{ width: Math.min(100, (paid / paidGoal) * 100) + "%" }} /></div>
          <p>Регистраций на {launch.key_event_type} — {launch.waitlist} при цели {launch.waitlist_goal}.</p>
        </div>
        <div className="lc-gate">
          <div className="lc-gate-hd"><ListChecks size={16} style={{ color: "var(--p-violet)" }} /><b>Отмечено вручную</b></div>
          <div className="big">{R.rated}<i>из {R.published} выпущенных</i></div>
          <div className="lc-bar2"><i style={{ width: (R.published ? (R.rated / R.published) * 100 : 0) + "%" }} /></div>
          <p>
            Разбор считается только по отмеченным постам. Неотмеченные в статистику не идут — иначе средние врут.
          </p>
        </div>
      </div>

      <div className="lc-retro">
        <div>
          <div className="lc-sec" style={{ marginTop: 0 }}>
            <h2>Отклик по рубрикам</h2>
            <span className="mono" style={{ fontSize: 11.5, color: "var(--p-ink-3)" }}>
              по твоим отметкам «зашло / норм / не зашло»
            </span>
          </div>
          <div className="lc-card">
            {R.rubrics.length === 0 && (
              <p className="lc-note">
                Ни один пост не отмечен. Открой план и отметь, как зашло — тогда разбор станет твоим,
                а не средним по методологии.
              </p>
            )}
            {R.rubrics.map(([k, v, n]) => (
              <div className="lc-rrow" key={k}>
                <span>{rubByKey[k].name} <span style={{ color: "var(--p-ink-3)" }}>· {n}</span></span>
                <span className="t"><i style={{ width: v + "%" }} /></span>
                <span className="v tt" data-tt={plural(n, "пост", "поста", "постов") + " с отметкой"}>{v}</span>
              </div>
            ))}
          </div>

          <div className="lc-sec">
            <h2>Что сработало из фактуры</h2>
            <span className="mono" style={{ fontSize: 11.5, color: "var(--p-ink-3)" }}>только смыслы с пруфом</span>
          </div>
          {R.worked.length === 0 && (
            <p className="lc-note">Пока нечего показать: нужны отмеченные посты со смыслами, закрытыми пруфом.</p>
          )}
          {R.worked.map(([k, v, n]) => (
            <div className="lc-task" key={k}>
              <span className="dl" data-far="1">вопрос {meanByKey[k].q}</span>
              <span className="t">
                {meanByKey[k].name}
                <span>{v} из 100 · {plural(n, "пост", "поста", "постов")} · пруф: {data.proofs[k] || "приложен"}</span>
              </span>
              <button className="btn btn-w btn-sm" onClick={() => toast("Уйдёт в фактуру следующего потока")}>
                <ArrowRight size={13} />В следующий
              </button>
            </div>
          ))}

          <div className="lc-sec"><h2>Этапы</h2></div>
          <div className="lc-card">
            {R.stages.map(([k, v, n, pub, tot]) => (
              <div key={k} style={{ display: "flex", gap: 12, padding: "12px 0", borderTop: "1px solid var(--p-line)", alignItems: "center" }}>
                <span className="cap" style={{ width: 130, flex: "none" }}>{byKey[k].short}</span>
                <span className="mono" style={{ fontSize: 12, color: "var(--p-ink-3)", width: 108, flex: "none" }}>
                  {pub} из {tot} выпущено
                </span>
                <span className="t" style={{ flex: 1, height: 7, borderRadius: 99, background: "color-mix(in oklab,var(--p-ink) 8%,transparent)", overflow: "hidden" }}>
                  <i style={{ display: "block", height: "100%", width: v + "%", background: "var(--p-teal)" }} />
                </span>
                <span className="mono" style={{ fontSize: 11.5, color: "var(--p-ink-3)", width: 34, textAlign: "right" }}>
                  {n ? v : "—"}
                </span>
              </div>
            ))}
            <p className="lc-note" style={{ marginTop: 12 }}>
              Веса смыслов не заданы: «мостик» и «фишки продукта» считаются равнозначными, хотя очевидно
              не равны. Этот разбор — первый замер, из которого веса можно вывести.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, position: "sticky", top: 14 }}>
          <div className="lc-goal">
            <div className="lc-gate-hd" style={{ marginBottom: 12 }}><b>Забрать в следующий поток</b></div>
            <div className="lc-check">
              {takeItems.map(([k, t]) => (
                <button className="lc-checkrow" key={k} data-on={take[k] ? "1" : "0"}
                  onClick={() => setTake({ ...take, [k]: !take[k] })}>
                  <span className="bx">{take[k] && <Check size={12} />}</span>{t}
                </button>
              ))}
            </div>
            <button className="btn btn-or" style={{ width: "100%", justifyContent: "center", marginTop: 14 }}
              onClick={() => toast("Второй поток создан: " + Object.values(take).filter(Boolean).length + " дефолтов перенесено")}>
              <Rocket size={15} />Создать 2-й поток
            </button>
            <p className="lc-note" style={{ marginTop: 11 }}>
              Номер потока вырастет, длительности и фактура подставятся отсюда. Что меняется на третьем
              потоке для той же аудитории — в методологии не описано, поэтому дефолты только твои.
            </p>
          </div>
          <div className="lc-goal">
            <div className="cap">воронка запуска</div>
            <div className="lc-funnel">
              {([["дошли до поста", 100], ["перешли в сбор", 38], ["оставили заявку", 21],
                ["оплатили", Math.round((paid / Math.max(1, launch.waitlist || 1)) * 100)]] as Array<[string, number]>)
                .map(([t, v]) => (
                  <div className="lc-fn" key={t}>
                    <div className="b"><i style={{ width: Math.min(100, v) + "%" }} /><span>{t}</span></div>
                    <span className="v">{v}%</span>
                  </div>
                ))}
            </div>
            <p className="lc-note" style={{ marginTop: 11 }}>Сбор шёл через «{launch.collect}».</p>
          </div>
        </div>
      </div>
    </>
  );
}
