"use client";

/**
 * THE DRAFT landing — «живые» экраны продукта для блоков 8, 9, 13.
 * Порт экранов из `prototype/product-ui.jsx`.
 *
 * Все данные — статические примеры из хендоффа (копия выверена дизайном,
 * менять только по согласованию). Ни одного запроса на бэкенд здесь нет.
 */

import * as React from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FileText,
  FileUp,
  GripVertical,
  Instagram,
  LayoutGrid,
  Linkedin,
  MessageCircle,
  Mic,
  PenLine,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  User,
  Youtube,
} from "lucide-react";
import { PuiNode, PuiPot, PuiWindow, XIcon } from "./PuiPrimitives";
import { LandingSlot } from "../LandingSlot";

const POINTS: [string, number][] = [
  ["Если ты всё ещё всё контролируешь — ты растёшь слишком медленно", 18],
  ["Мы саботируем не blitzscaling — мы саботируем себя", 18],
  ["Я продаю раньше, чем продукт готов", 17],
];

/* ---- 01 · экран «Голос» ---- */

export function PuiVoice({ full = false }: { full?: boolean }) {
  const sources: [string, React.ReactNode, string][] = [
    ["Telegram · @dkochnev", <Send size={12} key="t" style={{ color: "var(--por)" }} />, "32 поста"],
    ["YouTube · выступления", <Youtube size={12} key="y" style={{ color: "#B91C1C" }} />, "6 видео"],
    ["Вставленные тексты", <FileUp size={12} key="f" style={{ color: "var(--pink2)" }} />, "4 текста"],
  ];
  const axes: [string, number][] = [
    ["длина фраз", 92],
    ["лексика", 86],
    ["структура", 78],
    ["табу соблюдены", 100],
  ];
  return (
    <div className="pui">
      <PuiWindow
        sidebar={full}
        crumb={full ? null : ["THE DRAFT", "Голос"]}
        title="Голос"
        active="Голос"
        sub="Длина фраз, любимые слова, темы и то, чего ты не говоришь никогда."
        chips={
          <span className="pui-chip green" style={{ marginLeft: "auto" }}>
            голос обучен · 28 образцов
          </span>
        }
      >
        <div className="pui-pane">
          <div>
            {sources.map(([n, ic, m]) => (
              <div className="pui-src" key={n}>
                {ic}
                {n}
                <span className="m">{m}</span>
              </div>
            ))}
          </div>
          <div className="pui-fld">
            <div className="pui-fld-l">характерные слова</div>
            <div className="pui-chips">
              {["честно говоря", "по сути", "это не про", "смотри", "конкретика"].map((w) => (
                <span className="pui-wchip" key={w}>
                  {w}
                </span>
              ))}
            </div>
          </div>
          <div className="pui-fld">
            <div className="pui-fld-l">табу</div>
            <div className="pui-chips">
              {["в современном мире", "не секрет, что", "давайте разберёмся"].map((w) => (
                <span className="pui-wchip no" key={w}>
                  {w}
                </span>
              ))}
            </div>
          </div>
          <div className="pui-fld">
            <div className="pui-fld-l">совпадение по осям</div>
            <div className="pui-bars">
              {axes.map(([l, v]) => (
                <div className="pui-b4" key={l}>
                  <span>{l}</span>
                  <span className="t">
                    <i style={{ width: v + "%" }} />
                  </span>
                  <span className="v">{v}%</span>
                </div>
              ))}
            </div>
            <div className="pui-meta" style={{ marginLeft: 0, marginTop: 2 }}>
              Средняя доля правок — 12%. Ниже 15% считается «звучит как ты».
            </div>
          </div>
        </div>
      </PuiWindow>
    </div>
  );
}

/* ---- 02 · нода извлечения идей ---- */

export function PuiExtract() {
  const rows: [string, number][] = [
    ...POINTS,
    ["Exceptional — это не талант, это чеклист из 8 привычек", 17],
  ];
  return (
    <div className="pui">
      <PuiNode
        label="Идеи"
        labelIcon={<Sparkles size={10} />}
        icon={<Sparkles size={11} />}
        title="Извлечение"
        meta="34 идеи · отранжированы"
        sel
        footer={
          <>
            <button className="pui-btn or" type="button">
              <PenLine size={10} />
              Сделать пост
            </button>
            <button className="pui-btn ghost" type="button">
              <RefreshCw size={10} />
              Ещё идеи
            </button>
            <span className="pui-meta">рубрики R1–R4</span>
          </>
        }
      >
        {rows.map(([txt, s], i) => (
          <div className="pui-tp" key={txt} data-sel={i === 0 ? "1" : "0"}>
            <PuiPot v={s} />
            <span className="pui-tp-t">{txt}</span>
            <span className="pui-chip violet" style={{ marginLeft: "auto" }}>
              {i === 2 ? "R1" : "R2"}
            </span>
          </div>
        ))}
      </PuiNode>
    </div>
  );
}

/* ---- 03 · нода формата с переключателем площадок (интерактивная) ---- */

const FORMAT_TABS: [React.ReactNode, string, string][] = [
  [
    <Send size={9} key="tg" />,
    "TG",
    "Я продаю раньше, чем продукт готов. И это не риск, а способ не строить в пустоту.\n\nНикаких «доделаем и покажем». Собираю деньги, пока продукт ещё не достроен — так я тестирую спрос, а не свои фантазии о рынке.",
  ],
  [
    <Linkedin size={9} key="li" />,
    "LI",
    "Я продаю раньше, чем продукт готов.\n\n→ спрос проверяется деньгами, а не опросами\n→ первый платёж говорит больше, чем двадцать интервью\n→ месяцы разработки не уходят в пустоту\n\nЧто вы проверяете раньше: продукт или спрос?",
  ],
  [
    <Instagram size={9} key="car" />,
    "CAR",
    "Слайд 1 · Я продаю раньше, чем продукт готов\nСлайд 2 · Почему это не риск\nСлайд 3 · Что говорит первый платёж\n…8 слайдов, отрисованы",
  ],
  [
    <XIcon size={9} key="x" />,
    "X",
    "1/ Я продаю раньше, чем продукт готов.\n\n2/ Не «доделаем и покажем». Собираю деньги, пока продукт не достроен — и экономлю месяцы.",
  ],
];

export function PuiFormats({ onSwitch }: { onSwitch?: (platform: string) => void }) {
  const [i, setI] = React.useState(0);
  return (
    <div className="pui">
      <PuiNode
        label="Контент"
        labelIcon={<PenLine size={10} />}
        sel
        head={
          <>
            <div className="pui-ntabs">
              {FORMAT_TABS.map(([tic, tn], j) => (
                <button
                  className="pui-ntab"
                  key={tn}
                  data-on={j === i ? "1" : "0"}
                  onClick={() => {
                    setI(j);
                    onSwitch?.(tn);
                  }}
                  style={{ cursor: "pointer" }}
                  type="button"
                >
                  {tic}
                  {tn}
                </button>
              ))}
            </div>
            <span className="pui-dot" />
          </>
        }
        footer={
          <>
            <button className="pui-btn" type="button">
              <Copy size={10} />
              Скопировать
            </button>
            <button className="pui-btn ghost" type="button">
              <Send size={10} />
              Опубликовать
            </button>
            <span className="pui-meta">твой голос · 12%</span>
          </>
        }
      >
        <div className="pui-sec">хук — выбери один</div>
        <div className="pui-radio" data-on="1">
          <span className="r" />Я продаю раньше, чем продукт готов — и это не риск.
        </div>
        <div className="pui-radio">
          <span className="r" />Собираю деньги, пока продукт ещё не достроен.
        </div>
        <div className="pui-sec">тело поста</div>
        <div className="pui-txt ink" style={{ whiteSpace: "pre-wrap", minHeight: 96 }}>
          {FORMAT_TABS[i][2]}
        </div>
      </PuiNode>
    </div>
  );
}

/* ---- 04 · карусель ---- */

export function PuiCarousel() {
  return (
    <div className="pui">
      <PuiNode
        label="Карусель"
        labelIcon={<LayoutGrid size={10} />}
        icon={<Instagram size={11} />}
        title="Карусель"
        meta="8 слайдов · отрисованы"
        footer={
          <>
            <button className="pui-btn" type="button">
              <Download size={10} />
              Скачать JPEG
            </button>
            <button className="pui-btn ghost" type="button">
              <RefreshCw size={10} />
              Другой шаблон
            </button>
          </>
        }
      >
        <div className="pui-slides">
          {[1, 2, 3, 4].map((n) => (
            <div className="pui-slide" key={n}>
              <LandingSlot
                asset={`slide-${n}`}
                label={`слайд ${n}`}
                note="реальный JPEG из рендера карусели"
              />
            </div>
          ))}
        </div>
      </PuiNode>
    </div>
  );
}

/* ---- 05 · ассистент на канвасе ---- */

export function PuiAssistant() {
  return (
    <div className="pui">
      <PuiNode
        label="LLM · Opus 4.8"
        labelIcon={<MessageCircle size={10} />}
        tone="or"
        icon={<Sparkles size={11} />}
        title="Ассистент"
        meta="3 в контексте"
        sel
        ask="Спроси или попроси доработать…"
      >
        <div className="pui-chat me">
          <span className="who">
            <User size={11} />
          </span>
          <span className="txt">Хук слабый. Что тут можно усилить?</span>
        </div>
        <div className="pui-chat">
          <span className="who">
            <Sparkles size={11} />
          </span>
          <span className="txt">
            В записи ты сказал «$550K привлечено» — это конкретнее, чем «я привлекал
            инвестиции». Поставь цифру в первую строку, а вывод про спрос убери в конец.
          </span>
        </div>
        <div className="pui-chat me">
          <span className="who">
            <User size={11} />
          </span>
          <span className="txt">Согласен. Собери так.</span>
        </div>
      </PuiNode>
    </div>
  );
}

/* ---- 06 · экран «План» ---- */

const PUI_WEEKS: [number, number?, number?][][] = [
  [[29, 1], [30, 1], [1], [2], [3], [4], [5]],
  [[6], [7], [8], [9], [10], [11], [12]],
  [[13], [14], [15], [16], [17], [18], [19]],
  [[20], [21], [22], [23], [24], [25], [26, 0, 1]],
];
const PUI_POSTS: Record<number, [string, string][]> = {
  8: [["LI", "Продаю раньше"]],
  10: [["CAR", "Окружение за минимум"]],
  16: [["TG", "$2.5M без питч-дека"]],
};

export function PuiPlan({ full = false }: { full?: boolean }) {
  const queue: [string, string, string][] = [
    ["TG", "R2", "Мы саботируем не blitzscaling"],
    ["LI", "R1", "Я продаю раньше, чем продукт готов"],
    ["CAR", "R2", "Exceptional — чеклист из 8 привычек"],
  ];
  const mix: [string, number][] = [
    ["R1", 20],
    ["R2", 60],
    ["R3", 20],
    ["R4", 0],
  ];
  return (
    <div className="pui">
      <PuiWindow
        sidebar={full}
        active="План"
        crumb={full ? null : ["THE DRAFT", "План"]}
        title="План"
        seg={{ items: ["Неделя", "Месяц", "Список", "Аналитика"], on: 1 }}
      >
        <div className="pui-plan">
          <div className="pui-card pui-queue">
            <div className="pui-cap">очередь · 3</div>
            {queue.map(([p, r, t]) => (
              <div className="pui-qitem" key={t}>
                <div className="m">
                  <span className="pui-chip or">{p}</span>
                  <span className="pui-chip violet">{r}</span>
                  <GripVertical
                    size={10}
                    style={{ marginLeft: "auto", color: "var(--pink3)" }}
                  />
                </div>
                {t}
              </div>
            ))}
            <div className="pui-dashed">Перетащи в день календаря</div>
          </div>
          <div className="pui-card">
            <div className="pui-calhd">
              <ChevronLeft size={12} />
              Июль 2026
              <ChevronRight size={12} />
              <span className="m">3 поста в месяце</span>
            </div>
            <div className="pui-cal">
              {["пн", "вт", "ср", "чт", "пт", "сб", "вс"].map((d) => (
                <div className="d" key={d}>
                  {d}
                </div>
              ))}
              {PUI_WEEKS.flat().map(([n, out, today], i) => (
                <div
                  className={"c" + (out ? " out" : "") + (today ? " today" : "")}
                  key={i}
                >
                  {n}
                  {!out &&
                    (PUI_POSTS[n] || []).map(([p, t]) => (
                      <div className="p" key={t}>
                        <b>{p}</b>
                        <span>{t}</span>
                      </div>
                    ))}
                </div>
              ))}
            </div>
          </div>
          <div className="pui-rail">
            <div className="pui-rail-c">
              <div className="pui-cap">эта неделя</div>
              <div className="big">3 поста</div>
              <div className="sub">Telegram, карусель · цель 4</div>
            </div>
            <div className="pui-rail-c">
              <div className="pui-cap">микс рубрик</div>
              {mix.map(([r, v]) => (
                <div className="pui-mix" key={r}>
                  <span>{r}</span>
                  <span className="t">
                    <i style={{ width: v + "%" }} />
                  </span>
                  <span className="v">{v}%</span>
                </div>
              ))}
              <div className="pui-warn">
                <AlertCircle size={11} />
                Мало личного (R4)
              </div>
            </div>
          </div>
        </div>
      </PuiWindow>
    </div>
  );
}

/* ---- экран «Канвасы» с мини-картами ---- */

interface ThumbNode {
  id: string;
  t: "src" | "ext" | "llm" | "post";
  l: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const PUI_CV: {
  name: string;
  meta: string;
  ideas: string;
  posts: string;
  nodes: ThumbNode[];
  links: [string, string][];
}[] = [
  {
    name: "Подкаст Лекса Фридмана",
    meta: "4 ноды · 2 часа назад",
    ideas: "12 идей",
    posts: "2 поста",
    nodes: [
      { id: "a", t: "src", l: "запись", x: 0, y: 40, w: 152, h: 92 },
      { id: "b", t: "ext", l: "идеи", x: 232, y: 50, w: 132, h: 80 },
      { id: "c", t: "post", l: "tg", x: 434, y: 0, w: 142, h: 92 },
      { id: "d", t: "post", l: "li", x: 434, y: 132, w: 142, h: 84 },
    ],
    links: [
      ["a", "b"],
      ["b", "c"],
      ["b", "d"],
    ],
  },
  {
    name: "NEURIN · запуск",
    meta: "5 нод · 3 дня назад",
    ideas: "8 идей",
    posts: "3 поста",
    nodes: [
      { id: "a", t: "src", l: "файл", x: 0, y: 66, w: 140, h: 84 },
      { id: "b", t: "ext", l: "идеи", x: 214, y: 60, w: 130, h: 82 },
      { id: "c", t: "llm", l: "ассистент", x: 400, y: 0, w: 152, h: 94 },
      { id: "d", t: "post", l: "tg", x: 400, y: 138, w: 142, h: 82 },
    ],
    links: [
      ["a", "b"],
      ["b", "c"],
      ["b", "d"],
    ],
  },
  {
    name: "THE MONO · контент",
    meta: "4 ноды · вчера",
    ideas: "14 идей",
    posts: "1 пост",
    nodes: [
      { id: "a", t: "src", l: "статья", x: 0, y: 54, w: 144, h: 84 },
      { id: "b", t: "ext", l: "идеи", x: 208, y: 52, w: 130, h: 84 },
      { id: "c", t: "post", l: "li", x: 398, y: 8, w: 142, h: 82 },
      { id: "d", t: "post", l: "tg", x: 398, y: 128, w: 142, h: 82 },
    ],
    links: [
      ["a", "b"],
      ["b", "c"],
      ["b", "d"],
    ],
  },
];

export function PuiThumb({
  nodes,
  links,
}: {
  nodes: ThumbNode[];
  links: [string, string][];
}) {
  const by: Record<string, ThumbNode> = {};
  nodes.forEach((n) => {
    by[n.id] = n;
  });
  const pad = 34;
  const lab = 22;
  const x0 = Math.min(...nodes.map((n) => n.x)) - pad;
  const y0 = Math.min(...nodes.map((n) => n.y)) - pad;
  const x1 = Math.max(...nodes.map((n) => n.x + n.w)) + pad;
  const y1 = Math.max(...nodes.map((n) => n.y + n.h)) + pad + lab;
  return (
    <div className="pui-thumb">
      <svg
        viewBox={`${x0} ${y0} ${x1 - x0} ${y1 - y0}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        {links.map(([a, b]) => {
          const na = by[a];
          const nb = by[b];
          const sx = na.x + na.w;
          const sy = na.y + na.h / 2;
          const ex = nb.x;
          const ey = nb.y + nb.h / 2;
          const dx = Math.max(30, (ex - sx) * 0.55);
          return (
            <path
              className="te"
              key={`${a}-${b}`}
              d={`M ${sx} ${sy} C ${sx + dx} ${sy}, ${ex - dx} ${ey}, ${ex} ${ey}`}
            />
          );
        })}
        {nodes.map((n) => (
          <g key={n.id}>
            <rect className={"tn " + n.t} x={n.x} y={n.y} width={n.w} height={n.h} rx="12" />
            <rect className="tb" x={n.x + 12} y={n.y + 14} width={n.w * 0.48} height="7" rx="3.5" />
            <rect className="tb" x={n.x + 12} y={n.y + 32} width={n.w - 24} height="6" rx="3" />
            <rect
              className="tb"
              x={n.x + 12}
              y={n.y + 46}
              width={(n.w - 24) * 0.78}
              height="6"
              rx="3"
            />
            <text className="tl" x={n.x} y={n.y + n.h + 16}>
              {n.l}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function PuiCanvases({ full = true }: { full?: boolean }) {
  return (
    <div className="pui">
      <PuiWindow
        sidebar={full}
        active="Канвасы"
        title="Канвасы"
        sub="Каждый материал — отдельный канвас: источник, идеи, готовые посты."
        chips={
          <span className="pui-chip" style={{ marginLeft: "auto" }}>
            <Plus size={10} />
            Новый канвас
          </span>
        }
      >
        <div className="pui-cvgrid">
          {PUI_CV.map((c) => (
            <div className="pui-cvcard" key={c.name}>
              <PuiThumb nodes={c.nodes} links={c.links} />
              <div className="pui-cvb">
                <div className="n">{c.name}</div>
                <div className="m">{c.meta}</div>
                <div className="r">
                  <span className="pui-chip teal">{c.ideas}</span>
                  <span className="pui-chip">{c.posts}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </PuiWindow>
    </div>
  );
}

/* ---- экран «База знаний» ---- */

export function PuiKb({ full = true }: { full?: boolean }) {
  const rows: [string, string, string, string, string][] = [
    [
      "продукт",
      "THE MONO",
      "B2B-маркетплейс лёгкой промышленности: сводит бренды и фабрики.",
      "подтверждён",
      "использован в 14 постах",
    ],
    [
      "цифра",
      "$550K привлечённых инвестиций",
      "Суммарно по всем проектам, 8+ продуктов.",
      "подтверждён",
      "проверено 12 июля",
    ],
    [
      "кейс",
      "$2.5M pre-seed без питч-дека",
      "Стартап поднял раунд по одной странице: проблема, для кого, почему сейчас.",
      "не твой пример",
      "из записи",
    ],
  ];
  return (
    <div className="pui">
      <PuiWindow
        sidebar={full}
        active="База знаний"
        title="База знаний"
        sub="Факты, цифры и кейсы, которые система имеет право использовать в постах."
        chips={
          <span className="pui-chip teal" style={{ marginLeft: "auto" }}>
            34 записи · 12 проверенных цифр
          </span>
        }
      >
        <div className="pui-kb">
          <div className="pui-kbrow">
            {["все", "продукт", "цифра", "кейс", "офер", "файл"].map((p, i) => (
              <span className="pui-pill" key={p} data-on={i === 0 ? "1" : "0"}>
                {p}
              </span>
            ))}
          </div>
          {rows.map(([k, t, v, st, src]) => (
            <div className="pui-kbe" key={t}>
              <div className="pui-kbe-hd">
                <span className="pui-cap">{k}</span>
                <b>{t}</b>
                <span
                  className={st === "подтверждён" ? "pui-chip green" : "pui-chip or"}
                  style={{ marginLeft: "auto" }}
                >
                  {st}
                </span>
              </div>
              <p>{v}</p>
              <div className="f">
                <i>{src}</i>
              </div>
            </div>
          ))}
        </div>
      </PuiWindow>
    </div>
  );
}

/* ---- нода-источник (блок 4 и блок 9) ---- */

export function PuiSourceNode({
  icon,
  title,
  meta,
  text,
}: {
  icon?: React.ReactNode;
  title: string;
  meta: string;
  text: string;
}) {
  return (
    <div className="pui">
      <PuiNode
        label="Источник"
        labelIcon={<Mic size={10} />}
        icon={icon || <Mic size={11} />}
        title={title}
        meta={meta}
        ports="out"
        footer={
          <>
            <button className="pui-btn or" type="button">
              <Sparkles size={10} />
              Извлечь идеи
            </button>
            <button className="pui-btn ghost" type="button">
              <FileText size={10} />
              Транскрипт
            </button>
          </>
        }
      >
        <div className="pui-quote">{text}</div>
      </PuiNode>
    </div>
  );
}
