"use client";

/**
 * План по этапам и панель слота — порт `LxPlan` / `LxSlot` (launch-plan.jsx).
 *
 * Слот здесь — задание на съёмку, а не карточка контента: он знает рубрику,
 * вопрос покупателя, рычаг, смысл и фактуру под него. Этого хватает, чтобы
 * из него собрался текст.
 */

import * as React from "react";
import {
  CalendarDays, Check, ChevronDown, ChevronRight, Copy, GripVertical, Link2,
  MoreHorizontal, Paperclip, PenLine, Pin, Plus, RefreshCw, Send, Trash2, X,
} from "lucide-react";

import {
  type Slot,
  FIT, MEANINGS, PLATFORMS, QUESTIONS, QUOTA, WD, add, byKey, diff, fmt, fmtS,
  levByKey, meanByKey, plural, rubByKey, today, wd,
} from "@/lib/launch/core";
import { LaunchAxis } from "@/components/launch/LaunchAxis";
import { LaunchReact } from "@/components/launch/LaunchHQ";
import type { LaunchCtx } from "@/components/launch/ctx";

const LC_FILTERS: Array<[string, string]> = [
  ["all", "все"], ["noidea", "без идеи"], ["noproof", "без пруфа"],
  ["unconf", "не подтверждено"], ["nodraft", "без текста"], ["pinned", "закреплённые"],
];

export function LaunchPlan(ctx: LaunchCtx) {
  const {
    launch, data, focusDate, setFocusDate, openSlot, slotId,
    confirmStage, toast, setSlot, moveSlot, addSlot,
  } = ctx;
  const p = data.plan;
  const TODAY = today();
  const [flt, setFlt] = React.useState("all");
  const [plat, setPlat] = React.useState("all");
  const [drop, setDrop] = React.useState<string | null>(null);
  const drag = React.useRef<Slot | null>(null);
  const [openSt, setOpenSt] = React.useState<Record<string, boolean>>({});

  const nowKey = p && !p.error
    ? (p.windows.find((w) => diff(w.from, TODAY) >= 0 && diff(TODAY, w.to) >= 0) || { key: "" }).key : "";
  const focusStage = focusDate && p && !p.error
    ? (p.windows.find((w) => diff(w.from, focusDate) >= 0 && diff(focusDate, w.to) >= 0) || { key: "" }).key : "";
  const isOpen = (k: string) =>
    openSt[k] != null ? openSt[k] : k === (focusStage || nowKey || (p && p.windows[0] ? p.windows[0].key : ""));

  if (!p || p.error) {
    return (
      <div className="empty">
        <span className="empty-ic"><CalendarDays size={20} /></span>
        <h3>{p && p.error ? "План не сошёлся по датам" : "План ещё не развёрнут"}</h3>
        <p>
          {p && p.error ? p.error
            : "Разворот занимает одну кнопку: этапы от даты продаж назад, дни по каналам, рубрики по квотам. Потом правишь руками — закреплённое переживёт любую пересборку."}
        </p>
        <button className="btn btn-or" onClick={() => ctx.rebuild(launch.durations || {})}>
          <RefreshCw size={16} />Развернуть план
        </button>
      </div>
    );
  }

  const pass = (s: Slot) => {
    if (plat !== "all" && s.platform !== plat) return false;
    if (flt === "noidea") return !s.idea;
    if (flt === "noproof") return data.evidence[s.meaning] !== "proof";
    if (flt === "unconf") return s.markup_origin !== "human";
    if (flt === "nodraft") return s.draft !== "ready";
    if (flt === "pinned") return s.is_pinned;
    return true;
  };
  const shown = data.slots.filter(pass);
  const wide = flt === "all" && plat === "all";

  return (
    <>
      <LaunchAxis
        launch={launch} data={data} lines={data.lines}
        onStage={(k, from) => { setOpenSt({ ...openSt, [k]: true }); setFocusDate(from); }}
        onDay={(d) => setFocusDate(d)}
        onLine={(x) => {
          const a = data.slots.find((s) => s.id === x.announce_slot);
          if (a) openSlot(a.id); else setFocusDate(x.announced_on);
        }}
        onGap={(g) => {
          setFocusDate(g.days[0]);
          setFlt(g.note.indexOf("доказать") >= 0 ? "noproof" : "noidea");
        }}
      />

      <div className="filters" style={{ marginTop: 16, marginBottom: 16 }}>
        {LC_FILTERS.map(([k, t]) => {
          const n = k === "all" ? data.slots.length : data.slots.filter((s) =>
            k === "noidea" ? !s.idea
              : k === "noproof" ? data.evidence[s.meaning] !== "proof"
                : k === "unconf" ? s.markup_origin !== "human"
                  : k === "nodraft" ? s.draft !== "ready" : s.is_pinned).length;
          return (
            <button className="pill" key={k} data-on={flt === k ? "1" : "0"} onClick={() => setFlt(k)}>
              {t} {n > 0 && <span style={{ opacity: .55 }}>{n}</span>}
            </button>
          );
        })}
        <div className="seg">
          {([["all", "все каналы"]] as Array<[string, string]>)
            .concat(PLATFORMS.map((x) => [x.key, x.name] as [string, string]))
            .map(([k, t]) => (
              <button key={k} data-on={plat === k ? "1" : "0"} onClick={() => setPlat(k)}>{t}</button>
            ))}
        </div>
        {focusDate && (
          <button className="chip or" style={{ marginLeft: "auto", cursor: "pointer" }}
            onClick={() => setFocusDate(null)}>
            <X size={11} />показан день {fmtS(focusDate)}
          </button>
        )}
      </div>

      {p.windows.map((w) => {
        const st = byKey[w.key];
        const all = data.slots.filter((s) => s.stage === w.key);
        const list = shown.filter((s) => s.stage === w.key);
        const noIdea = all.filter((s) => !s.idea).length;
        const unconf = all.filter((s) => s.markup_origin !== "human").length;
        const days: string[] = [];
        for (let i = 0; i < w.days; i++) {
          const d = add(w.from, i);
          if (wide || list.some((s) => s.date === d)) days.push(d);
        }
        return (
          <div className="lc-stage" key={w.key}>
            <button className="lc-stage-hd" onClick={() => setOpenSt({ ...openSt, [w.key]: !isOpen(w.key) })}>
              <span className="cap" style={{ width: 16 }}>{st.n}</span>
              <span className="nm">{st.name}</span>
              <span className="dt">{fmtS(w.from)} — {fmtS(w.to)} · {plural(w.days, "день", "дня", "дней")}</span>
              {w.key === nowKey && <span className="chip or">идёт сейчас</span>}
              {st.ours && (
                <span className="lc-tag tt" data-tt="этап добавлен нами: в методологии окно продаж без плана">наше</span>
              )}
              <span className="r">
                <span className="chip">{plural(all.length, "слот", "слота", "слотов")}</span>
                {noIdea > 0 && <span className="chip amber">{noIdea} без идеи</span>}
                {unconf > 0 && <span className="lc-tag">{unconf} не проверено</span>}
                <ChevronDown size={16} style={{ color: "var(--p-ink-3)", transform: isOpen(w.key) ? "rotate(180deg)" : "none" }} />
              </span>
            </button>
            {isOpen(w.key) && (
              <div className="lc-stage-b">
                <div className="lc-stage-note">
                  <span className="lc-note" style={{ flex: 1 }}>
                    {st.task} Квоты рубрик:{" "}
                    {Object.keys(QUOTA[w.key]).map((k) =>
                      rubByKey[k].name.toLowerCase() + " " + Math.round(QUOTA[w.key][k] * 100) + "%").join(" · ")}.
                  </span>
                  {unconf > 0 && (
                    <button className="btn btn-w btn-sm" style={{ flex: "none" }} onClick={() => confirmStage(w.key)}>
                      <Check size={13} />Подтвердить разметку этапа
                    </button>
                  )}
                </div>
                {days.length === 0 && (
                  <div style={{ padding: "16px 18px", color: "var(--p-ink-3)", fontSize: 13 }}>
                    Под фильтр ничего не попало.
                  </div>
                )}
                {days.map((d) => (
                  <div className="lc-day" key={d}
                    data-today={d === TODAY ? "1" : "0"}
                    data-focus={d === focusDate ? "1" : "0"}
                    data-drop={drop === d ? "1" : "0"}
                    onDragOver={(e) => { e.preventDefault(); if (drop !== d) setDrop(d); }}
                    onDragLeave={() => setDrop(null)}
                    onDrop={(e) => {
                      e.preventDefault(); setDrop(null);
                      const s = drag.current; drag.current = null;
                      if (s && s.date !== d) moveSlot(s.id, d);
                    }}>
                    <div className="dl">
                      <b>{fmtS(d)}</b>
                      <span>{WD[wd(d)]}</span>
                      {d === TODAY && <span className="chip or" style={{ marginTop: 6 }}>сегодня</span>}
                    </div>
                    <div className="lc-slots">
                      {list.filter((s) => s.date === d).map((s) => {
                        const ev = data.evidence[s.meaning];
                        const line = s.line_id ? data.lines.find((x) => x.id === s.line_id) : null;
                        return (
                          <div className="lc-slot" key={s.id} role="button" tabIndex={0} draggable
                            data-sel={slotId === s.id ? "1" : "0"}
                            onDragStart={() => { drag.current = s; }}
                            onDragEnd={() => { drag.current = null; setDrop(null); }}
                            onClick={() => openSlot(s.id)}
                            onKeyDown={(e) => { if (e.key === "Enter") openSlot(s.id); }}>
                            <GripVertical size={12} className="grip" />
                            <span className="pl">{PLATFORMS.find((x) => x.key === s.platform)!.short}</span>
                            <span className="lc-rb">{rubByKey[s.rubric].name}</span>
                            <span className={"tx" + (s.idea ? "" : " lc-empty")}>{s.idea || s.reason}</span>
                            <span className="tail">
                              {line && (
                                <span className="lc-tag tt"
                                  data-tt={(s.line_role === "announce" ? "анонс линии: " : "раскрытие линии: ") + line.title}
                                  style={{ color: "var(--p-violet)", borderColor: "rgba(107,78,230,.26)", background: "var(--p-violet-soft)" }}>
                                  <Link2 size={9} style={{ marginRight: 4 }} />
                                  {s.line_role === "announce" ? "анонс" : "раскрытие"}
                                </span>
                              )}
                              {s.is_last_day && <span className="lc-tag" data-w="1">последний день</span>}
                              {s.draft === "ready" && (
                                <span className="lc-tag tt" data-tt={"текст готов · " + s.chars + " знаков"} data-ok="1">текст</span>
                              )}
                              {s.draft === "writing" && <span className="lc-tag tt" data-tt="пишется на канвасе">канвас</span>}
                              {s.status === "missed" && <span className="lc-tag" data-w="1">не вышел</span>}
                              {ev === "claimed" && (
                                <span className="lc-tag tt" data-tt="смысл заявлен словами, пруфа нет" data-w="1">без пруфа</span>
                              )}
                              {ev === "none" && (
                                <span className="lc-tag tt" data-tt="этот смысл нечем доказать" data-w="1">нечем доказать</span>
                              )}
                              {s.markup_origin !== "human" && (
                                <span className="lc-tag tt"
                                  data-tt={"разметка: " + (s.markup_origin === "rule" ? "правила" : "модель") + " — в покрытие не идёт"}>
                                  не проверено
                                </span>
                              )}
                              {s.status === "published"
                                ? <LaunchReact v={s.reaction} onSet={(v) => { setSlot(s.id, { reaction: v }); toast("Отметка учтена — уйдёт в разбор"); }} />
                                : diff(s.date, TODAY) >= 0 && (
                                  <button className="ib tt dn" data-tt="Отметить выпущенным" aria-label="Отметить выпущенным"
                                    style={{ width: 24, height: 24, borderRadius: 7 }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSlot(s.id, { status: "published", draft: s.draft || "ready", chars: s.chars || 1180 });
                                      toast("Выпущено · отметь реакцию", () => setSlot(s.id, { status: "planned" }));
                                    }}>
                                    <Check size={12} />
                                  </button>
                                )}
                              {s.is_pinned && <Pin size={12} style={{ color: "var(--p-or)" }} />}
                              <ChevronRight size={14} style={{ color: "var(--p-ink-3)" }} />
                            </span>
                          </div>
                        );
                      })}
                      {wide && (
                        <div className="lc-add">
                          <span className="cap">добавить слот</span>
                          {PLATFORMS.map((pl) => (
                            <button key={pl.key} className="lc-daych" onClick={() => addSlot(d, pl.key)}>
                              + {pl.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <p className="lc-note" style={{ marginTop: 14 }}>
        Слот можно перетащить в другой день, добавить руками или удалить — добавленные вручную сразу
        закрепляются. Пересборка не затирает закреплённое:{" "}
        {plural(data.slots.filter((s) => s.is_pinned).length, "слот", "слота", "слотов")} закреплено.
      </p>
    </>
  );
}

/* ─── панель слота: задание на съёмку, а не карточка контента ─── */

export function LaunchSlotDrawer({
  slot, ctx, onClose,
}: {
  slot: Slot; ctx: LaunchCtx; onClose: () => void;
}) {
  const { data, setSlot, setEvidence, toast, setLtab, moveSlot, delSlot, setLineRole, toCanvas } = ctx;
  const rub = rubByKey[slot.rubric];
  const q = QUESTIONS.find((x) => x.n === rub.q)!;
  const lev = levByKey[slot.trigger_key];
  const pl = PLATFORMS.find((x) => x.key === slot.platform)!;
  const ev = data.evidence[slot.meaning];
  const quota = Math.round((QUOTA[slot.is_last_day ? "lastday" : slot.stage][slot.rubric] || 0) * 100);
  const pool = MEANINGS.filter((m) => m.q === rub.q);
  const others = pool.filter((m) => m.key !== slot.meaning).slice(0, 5);

  const takeIdea = () => {
    const used: Record<string, number> = {};
    data.slots.forEach((s) => { if (s.idea) used[s.idea] = 1; });
    const fits = FIT[slot.platform];
    const free = (data.bank[slot.rubric] || []).filter((b) => !used[b.title] && fits.indexOf(b.format) >= 0);
    if (!free.length) { toast("Нечего взять: " + (slot.reason || "идеи рубрики закончились")); return; }
    setSlot(slot.id, { idea: free[0].title, reason: null });
    toast("Идея поставлена в слот");
  };

  return (
    <div className="drawer" role="dialog" aria-modal="true" aria-label="Слот плана" style={{ width: 440 }}>
      <div className="drawer-hd">
        <span className="chip">{pl.name}</span>
        <span className="mono" style={{ fontSize: 12 }}>{fmt(slot.date)}, {WD[wd(slot.date)]}</span>
        <span className="lc-tag">{byKey[slot.stage].short}</span>
        <button className="ib tt dn" data-tt="Закрыть · esc" aria-label="Закрыть"
          style={{ marginLeft: "auto" }} onClick={onClose}><X size={14} /></button>
      </div>
      <div className="drawer-b">
        <div>
          <div className="lc-rb" style={{ fontSize: 12 }}>{rub.name}</div>
          <div style={{ fontSize: 17.5, fontWeight: 700, letterSpacing: "-.03em", lineHeight: 1.3, marginTop: 10 }}>
            {slot.idea || slot.reason}
          </div>
          {!slot.idea && (
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button className="btn btn-w btn-sm" onClick={takeIdea}><Plus size={13} />Взять из банка</button>
              <button className="btn btn-g btn-sm" onClick={() => setLtab("evidence")}>Поставить задачу</button>
            </div>
          )}
        </div>

        {slot.draft === "ready" ? (
          <div className="lc-draft">
            <div className="lc-gate-hd">
              <span className="lc-tag" data-ok="1"><Check size={9} style={{ marginRight: 4 }} />текст готов</span>
              <span className="mono" style={{ fontSize: 11, color: "var(--p-ink-3)" }}>
                {slot.chars} знаков · твой голос · правок 12%
              </span>
            </div>
            <p>{slot.text || slot.idea}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn btn-w btn-sm" onClick={() => toCanvas(slot)}><PenLine size={13} />Открыть на канвасе</button>
              {slot.status !== "published" && (
                <button className="btn btn-or btn-sm"
                  onClick={() => { setSlot(slot.id, { status: "published" }); toast("Опубликовано · отметь реакцию", () => setSlot(slot.id, { status: "planned" })); }}>
                  <Send size={13} />Опубликовать
                </button>
              )}
            </div>
          </div>
        ) : slot.draft === "writing" ? (
          <div className="lc-draft">
            <div className="lc-gate-hd"><span className="lc-tag">текст пишется на канвасе</span></div>
            <p>
              Задание ушло с рубрикой, вопросом, рычагом и смыслом. Когда текст готов — вернётся сюда
              со счётчиком знаков и долей правок.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-w btn-sm" onClick={() => toCanvas(slot)}>Открыть канвас</button>
              <button className="btn btn-g btn-sm"
                onClick={() => { setSlot(slot.id, { draft: "ready", chars: 1180, text: slot.idea || "" }); toast("Текст вернулся в слот"); }}>
                Пометить готовым
              </button>
            </div>
          </div>
        ) : null}

        {slot.status === "published" && (
          <div className="fld">
            <div className="fld-l">как зашло · уйдёт в разбор</div>
            <LaunchReact v={slot.reaction} onSet={(v) => { setSlot(slot.id, { reaction: v }); toast("Отметка учтена"); }} />
            {!slot.reaction && (
              <div className="lc-note">
                Клавиши 1–3. Без отметок разбор будет считать по мокам, а не по твоему запуску.
              </div>
            )}
          </div>
        )}

        <div className="lc-why">
          <span className="cap">почему эта рубрика здесь</span>
          <p>
            В этапе «{byKey[slot.stage].name.toLowerCase()}» на «{rub.name.toLowerCase()}» отведено {quota}%
            слотов — это квота этапа, а не случайность.{" "}
            {slot.is_last_day ? "Последний день окна получает свой набор рубрик: ажиотаж и продажи по 50%." : ""}
          </p>
        </div>

        <div className="fld">
          <div className="fld-l">вопрос покупателя · {q.n}</div>
          <div style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: "-.02em" }}>{q.title}</div>
          <div className="lc-note">{q.note}</div>
        </div>

        <div className="fld">
          <div className="fld-l">смысл, который закрывает этот слот</div>
          <button className="lc-mchip" data-on="1" style={{ width: "100%" }}>
            <Check size={13} />{meanByKey[slot.meaning].name}
          </button>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 4 }}>
            {others.map((m) => (
              <button className="lc-mchip" key={m.key}
                onClick={() => { setSlot(slot.id, { meaning: m.key }); toast("Смысл заменён: " + m.name); }}>
                {m.name}
              </button>
            ))}
          </div>
        </div>

        <div className="fld">
          <div className="fld-l">рычаг</div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>
            {lev.name}{" "}
            <span className="mono" style={{ color: "var(--p-ink-3)", fontSize: 11.5 }}>
              {lev.cat.toLowerCase()}{lev.stage ? " · этап " + lev.stage : " · сквозной"}
            </span>
          </div>
          <div className="lc-note">{lev.why}</div>
        </div>

        <div className="fld">
          <div className="fld-l">фактура под этот смысл</div>
          {ev === "proof" ? (
            <div className="lc-mchip" data-on="1" style={{ alignItems: "flex-start" }}>
              <Paperclip size={13} style={{ marginTop: 2 }} />
              <span>{data.proofs[slot.meaning] || "пруф приложен"}</span>
            </div>
          ) : (
            <>
              <div className="lc-conflict">
                <b>{ev === "claimed" ? "Заявлено словами, показать нечем" : "Нечем доказать"}</b>
                {ev === "claimed"
                  ? "Смысл объявлен, но за ним нет события, скрина или цифры. Слова — самый неубедительный вид доказательства."
                  : (meanByKey[slot.meaning].ask ? "Нужно: " + meanByKey[slot.meaning].ask + "." : "Этого смысла нет в твоей фактуре.")}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 9 }}>
                <button className="btn btn-w btn-sm"
                  onClick={() => { setEvidence(slot.meaning, "proof"); toast("Пруф отмечен — смысл идёт в покрытие"); }}>
                  <Paperclip size={13} />Приложить пруф
                </button>
                <button className="btn btn-g btn-sm" onClick={() => setLtab("evidence")}>В задачи</button>
              </div>
            </>
          )}
        </div>

        {data.lines.length > 0 && (
          <div className="fld">
            <div className="fld-l">сюжетная линия</div>
            {data.lines.map((x) => {
              const isA = slot.line_id === x.id && slot.line_role === "announce";
              const isC = slot.line_id === x.id && slot.line_role === "close";
              return (
                <div className="lc-linerow" key={x.id}>
                  <span className="t">{x.title}</span>
                  <button className="lc-daych" data-on={isA ? "1" : "0"}
                    onClick={() => setLineRole(slot.id, x.id, isA ? null : "announce")}>анонс</button>
                  <button className="lc-daych" data-on={isC ? "1" : "0"}
                    onClick={() => setLineRole(slot.id, x.id, isC ? null : "close")}>раскрытие</button>
                </div>
              );
            })}
            <div className="lc-note">Раскрытие считается закрытым, только когда под него стоит конкретный пост.</div>
          </div>
        )}

        <div className="fld">
          <div className="fld-l">разметка</div>
          {slot.markup_origin === "human" ? (
            <div className="lc-mchip" data-on="1"><Check size={13} />подтверждена руками · идёт в покрытие</div>
          ) : (
            <>
              <div className="lc-note">
                Поставлено {slot.markup_origin === "rule" ? "правилами по ключевым словам" : "моделью"}.
                В покрытие такая разметка не идёт: на разобранном банке правила увели половину идей
                в «экспертизу», и дефицит плана оказался артефактом регулярки.
              </div>
              <button className="btn btn-or btn-sm" style={{ alignSelf: "flex-start", marginTop: 9 }}
                onClick={() => { setSlot(slot.id, { markup_origin: "human" }); toast("Разметка подтверждена"); }}>
                <Check size={14} />Подтвердить разметку<kbd style={{ marginLeft: 6 }}>c</kbd>
              </button>
            </>
          )}
        </div>

        <div className="fld">
          <div className="fld-l">слот</div>
          <button className="lc-checkrow" data-on={slot.is_pinned ? "1" : "0"}
            onClick={() => {
              setSlot(slot.id, { is_pinned: !slot.is_pinned });
              toast(slot.is_pinned ? "Слот больше не закреплён" : "Слот закреплён — переживёт пересборку плана");
            }}>
            <span className="bx">{slot.is_pinned && <Check size={12} />}</span>
            закрепить: не меняется при пересборке<kbd style={{ marginLeft: "auto" }}>p</kbd>
          </button>
          <div className="two" style={{ marginTop: 9 }}>
            <div className="fld">
              <div className="fld-l">перенести</div>
              <input className="inp" type="date" value={slot.date} onChange={(e) => moveSlot(slot.id, e.target.value)} />
            </div>
            <div className="fld">
              <div className="fld-l">убрать</div>
              <button className="btn btn-w btn-sm" style={{ height: 42, justifyContent: "center" }}
                onClick={() => delSlot(slot.id)}><Trash2 size={14} />Удалить слот</button>
            </div>
          </div>
          <div className="lc-note" style={{ marginTop: 8 }}>
            версия {slot.version} · правки из другой вкладки не перетрут твои молча — покажем чужую и дадим выбрать.
          </div>
        </div>
      </div>
      <div className="drawer-f" style={{ gap: 9 }}>
        <button className="btn btn-or" style={{ flex: 1, justifyContent: "center" }}
          disabled={!slot.idea} onClick={() => toCanvas(slot)}>
          <PenLine size={15} />{slot.draft === "ready" ? "Переписать на канвасе" : "Собрать текст на канвасе"}
        </button>
        <button className="btn btn-w tt" data-tt="Скопировать задание" aria-label="Скопировать"
          onClick={() => toast("Задание скопировано")}><Copy size={15} /></button>
        <button className="btn btn-w tt" data-tt="Ещё: дублировать, освободить" aria-label="Ещё">
          <MoreHorizontal size={15} />
        </button>
      </div>
    </div>
  );
}
