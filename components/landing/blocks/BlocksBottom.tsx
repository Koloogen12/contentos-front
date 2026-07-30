"use client";

/**
 * THE DRAFT landing — блоки 11–15. Порт `prototype/landing-v2-b.jsx`.
 * Тарифы берутся из `lib/landing/config.ts` (хендофф: не хардкодить в разметке).
 */

import * as React from "react";
import Link from "next/link";
import { Check, Cpu, Send, Workflow, X } from "lucide-react";
import { PuiCanvases, PuiKb, PuiPlan } from "../product/PuiScreens";
import { LandingSlot } from "../LandingSlot";
import { PillLabel, SecHd } from "../Chrome";
import { LANDING_PLANS } from "@/lib/landing/config";
import { ctaHref } from "@/lib/landing/cta";
import { track } from "@/lib/landing/analytics";

/* =============== 11 · ЧТО ИЗМЕНИТСЯ =============== */

const STOP = [
  "Смотреть на папку с записями и чувствовать вину",
  "Начинать «с понедельника» третий понедельник подряд",
  "Переписывать за ИИ каждый абзац",
  "Терять темы, которые были горячими две недели назад",
  "Копировать текст между ChatGPT, заметками и Telegram",
  "Публиковаться рывками — три поста за вечер, потом месяц тишины",
];

const START = [
  "Публиковать три-четыре раза в неделю, не садясь писать",
  "Достраивать канал из того, что уже наговорил",
  "Держать очередь постов на неделю вперёд",
  "Отвечать на чужие статьи и отчёты в день выхода",
  "Видеть, какие мысли заходят, и делать больше таких",
  "Приходить на звонки к клиентам, которые тебя уже читали",
];

export function ChangeBlock() {
  return (
    <section className="wrap sec">
      <SecHd
        title="Что изменится"
        right="Не «станет удобнее». Конкретные вещи, которые исчезнут из твоей недели и появятся в ней."
      />
      <div className="change">
        <div className="chcard stop">
          <h4>Ты перестанешь</h4>
          <ul>
            {STOP.map((x) => (
              <li key={x}>
                <X size={14} />
                {x}
              </li>
            ))}
          </ul>
        </div>
        <div className="chcard start-l">
          <h4>Ты начнёшь</h4>
          <ul>
            {START.map((x) => (
              <li key={x}>
                <Check size={14} />
                {x}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* =============== 12 · ПОЧЕМУ МЫ, А НЕ… =============== */

const OBJECTIONS: [string, string][] = [
  [
    "«Попрошу ChatGPT»",
    "Просил. Получил гладкий текст ни о чём и переписывал его сорок минут. В новом чате он снова не знает, как ты пишешь и о чём ты уже постил. Один пост за сессию — а тебе нужна неделя. Здесь голос сохраняется, а из одного источника выходит очередь.",
  ],
  [
    "«Напишу сам, когда будет время»",
    "Время не появится — ты не публикуешь не от лени, а потому что пост это три часа, которых нет ни в один вечер. Здесь эти три часа превращаются в пять минут выбора из готового.",
  ],
  [
    "«Найму копирайтера»",
    "От сорока тысяч в месяц, и первый месяц уходит, чтобы он поймал твой голос. Ревьюишь всё равно ты. Уйдёт — начинаешь с нуля. Здесь голос принадлежит тебе и никуда не уходит.",
  ],
  [
    "«Найму SMM-агентство»",
    "Напишут гладко и безлично, канал станет похож на сто других. Твоя аудитория подписана на тебя, а не на «редакцию».",
  ],
  [
    "«Куплю курс по контенту»",
    "Узнаешь про хуки и воронки — писать всё равно придётся самому, теми же тремя часами. Здесь методология уже внутри: тезисы ранжируются, посты собираются по механикам площадок.",
  ],
];

export function ObjectionsBlock() {
  return (
    <section className="wrap sec">
      <SecHd
        title="Почему мы, а не…"
        right="Пять вариантов, которые ты уже рассматривал. По каждому — что именно ломается."
      />
      <div className="objs">
        {OBJECTIONS.map(([q, a], i) => (
          <div className="obj" key={q}>
            <div className="obj-q">
              <i>0{i + 1}</i>
              {q}
            </div>
            <div className="obj-a">{a}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* =============== 13 · КТО ЗА ЭТИМ СТОИТ =============== */

export function AuthorBlock() {
  const shots: [string, React.ReactNode][] = [
    ["Канвасы — каждый материал отдельной доской", <PuiCanvases key="c" />],
    ["База знаний — факты, из которых собираются посты", <PuiKb key="k" />],
    ["План — очередь, календарь и микс рубрик", <PuiPlan key="p" full />],
  ];
  return (
    <section className="wrap sec" id="author">
      <SecHd
        title="Кто за этим стоит"
        right="Инструмент вырос из личной задачи, а не из презентации для инвесторов."
      />
      <div className="author">
        <div className="author-photo">
          <LandingSlot asset="author" label="фото Данила" note="~600×760 webp" />
        </div>
        <div>
          <h3>Данил Кочнев</h3>
          <div className="author-facts">
            <div>
              <Cpu size={15} style={{ marginTop: 3, color: "var(--orange)", flex: "none" }} />
              <span>
                <b>Серийный фаундер:</b> 8+ продуктов, $550K привлечённых инвестиций
              </span>
            </div>
            <div>
              <Workflow
                size={15}
                style={{ marginTop: 3, color: "var(--orange)", flex: "none" }}
              />
              <span>
                Строит <b>THE MONO</b> (B2B-маркетплейс лёгкой промышленности) и{" "}
                <b>NEURIN AI</b>
              </span>
            </div>
            <div>
              <Send size={15} style={{ marginTop: 3, color: "var(--orange)", flex: "none" }} />
              <span>Ведёт свой канал и публикуется через THE DRAFT каждый день</span>
            </div>
          </div>
          <blockquote>
            Я сделал THE DRAFT для себя. У меня лежало двадцать часов записей и канал,
            который я забросил на три недели. Сначала это был инструмент на один аккаунт —
            мой. Потом им попросились пользоваться другие.
          </blockquote>
        </div>
      </div>
      <div className="shots-live">
        {shots.map(([cap, mock]) => (
          <figure className="shot-live" key={cap}>
            {mock}
            <figcaption>{cap}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

/* =============== 14 · ТАРИФЫ =============== */

export function PricingBlock() {
  return (
    <section className="wrap sec" id="pricing">
      <div className="sec-c">
        <PillLabel text="тарифы" />
        <h2 style={{ maxWidth: "22ch" }}>Начать можно без регистрации</h2>
        <div className="lead">
          Первый пост — бесплатно и без карты. Дальше решаешь, нравится ли, как он пишет.
        </div>
      </div>
      <div className="plans">
        {LANDING_PLANS.map((p) => (
          <div className={p.featured ? "plan hot" : "plan"} key={p.id}>
            <div className="plan-name">{p.name}</div>
            <div className="plan-price">
              <b>{p.price}</b>
              <span>{p.per}</span>
            </div>
            <div className="plan-desc">{p.desc}</div>
            <ul>
              {p.items.map((it) => (
                <li key={it}>
                  <Check size={13} />
                  {it}
                </li>
              ))}
            </ul>
            <Link
              className={p.featured ? "btn btn-or" : "btn btn-white"}
              href={ctaHref(p.id)}
              onClick={() => track("pricing_cta_click", { plan: p.id })}
            >
              {p.cta}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

/* =============== 15 · FAQ =============== */

const FAQ: [string, string][] = [
  [
    "У меня нет подкаста и записей.",
    "И не нужно. Голосовое на пять минут, чужая статья, с которой ты спорил, или мысль в одну строку — этого достаточно.",
  ],
  [
    "Аудитория поймёт, что это ИИ?",
    "Мысли твои — они из твоей записи или твоей строки. Формулировки собраны по твоим прошлым текстам. За тебя мы ничего не выдумываем: чего ты не говорил, того в посте не будет.",
  ],
  [
    "Сколько времени до первого поста?",
    "Минут пять. Ссылка на канал, материал — и читаешь готовый текст. Онбординга нет.",
  ],
  [
    "Не хочу разбираться в сложном интерфейсе.",
    "Основной путь — три кнопки. Канвас со связями нужен, когда захочешь собрать свой пайплайн; в первый раз он не нужен.",
  ],
  [
    "Что с текстами, если перестану платить?",
    "Всё сгенерированное остаётся у тебя и выгружается текстом. Твои посты мы в заложниках не держим.",
  ],
  [
    "Мой канал маленький, голосу хватит образцов?",
    "Хватит десятка постов. Меньше — можно вставить любые свои тексты руками, даже переписку, где ты объяснял что-то умное.",
  ],
];

/**
 * Последний вопрос («что происходит с моим материалом») в прототипе был
 * заглушкой с текстом «вписать реальную политику». Публиковать заглушку
 * нельзя, поэтому вопрос показывается только когда в конфиге появится
 * настоящий юридически проверенный ответ.
 */
const DATA_POLICY_ANSWER: string | null = null;

export function FaqBlock() {
  const [open, setOpen] = React.useState(0);
  const rows: [string, string][] = DATA_POLICY_ANSWER
    ? [...FAQ, ["Что происходит с моим материалом?", DATA_POLICY_ANSWER]]
    : FAQ;
  return (
    <section className="wrap sec" id="faq">
      <SecHd title="Вопросы" right="Если чего-то здесь нет — напиши, добавим." />
      <div className="faqv2">
        {rows.map(([q, a], i) => (
          <div className="faq-i" key={q}>
            <button
              className="faq-h"
              onClick={() => {
                const next = open === i ? -1 : i;
                setOpen(next);
                if (next === i) track("faq_open", { index: i, question: q });
              }}
              type="button"
              aria-expanded={open === i}
              style={{ width: "100%", background: "none", border: 0, textAlign: "left" }}
            >
              <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
                0{i + 1}
              </span>
              {q}
              <span className="pm">{open === i ? "–" : "+"}</span>
            </button>
            {open === i && <div className="faq-b">{a}</div>}
          </div>
        ))}
      </div>
    </section>
  );
}
