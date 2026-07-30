"use client";

/**
 * THE DRAFT landing — блоки 6–10. Порт `prototype/landing-v2-a.jsx` (6–7)
 * и `landing-v2-b.jsx` (8–10).
 */

import * as React from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  History,
  LayoutTemplate,
  Link as LinkIcon,
  Mic,
  Type,
  Youtube,
} from "lucide-react";
import { PuiNode, PuiPot } from "../product/PuiPrimitives";
import {
  PuiAssistant,
  PuiCarousel,
  PuiExtract,
  PuiFormats,
  PuiPlan,
  PuiVoice,
} from "../product/PuiScreens";
import { SecHd } from "../Chrome";
import { track } from "@/lib/landing/analytics";

/* =============== 6 · УЗНАЁШЬ СЕБЯ? =============== */

const RECOGNIZE: [string, string[]][] = [
  [
    "Ты фаундер?",
    [
      "Записал эфир на час — он лежит третий месяц",
      "«Начну постить с понедельника» — третий понедельник подряд",
      "Конкурент публикуется три раза в неделю и собирает твоих людей",
      "Инвестор перед звонком открыл твой канал и увидел пост от марта",
    ],
  ],
  [
    "Ты эксперт или консультант?",
    [
      "Рассказываешь одно и то же каждому клиенту на созвоне — и нигде это не записано",
      "Клиенты приходят только по рекомендациям, поток не управляется",
      "Написал пост, перечитал, не отправил",
      "В канале три поста за полгода, а в голове — материал на книгу",
    ],
  ],
  [
    "Ты в найме и строишь личный бренд?",
    [
      "Коллега ведёт канал и ушёл на позицию выше — а ты умеешь не меньше",
      "Сел писать вечером после работы, встал через час без результата",
      "Боишься, что твой опыт покажется банальным",
      "Проходил интервью и понял, что о тебе нечего найти в поиске",
    ],
  ],
];

export function RecognizeBlock() {
  return (
    <section className="wrap sec">
      <SecHd
        title="Узнаёшь себя?"
        right="Если хотя бы две строки из твоей колонки — про тебя, дальше можно не читать, а попробовать."
      />
      <div className="rec">
        {RECOGNIZE.map(([h, items]) => (
          <div className="rec-col" key={h}>
            <h4>{h}</h4>
            <ul>
              {items.map((x) => (
                <li key={x}>
                  <CheckCircle2 size={15} />
                  {x}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

/* =============== 7 · ПОЧЕМУ СЕЙЧАС =============== */

const NOW_LIST: [string, string][] = [
  [
    "Охват идёт к регулярным.",
    "В Telegram, LinkedIn и Instagram выигрывает тот, кто публикуется постоянно, — не тот, кто пишет хорошо раз в месяц.",
  ],
  [
    "ИИ-текстом генерируют все.",
    "И почти весь он обезличенный. Узнаваемый голос выделяется сильнее, чем год назад.",
  ],
  [
    "Твой материал стареет.",
    "Запись с прошлого квартала ещё актуальна. С позапрошлого года — уже нет.",
  ],
];

const FORK_ROWS: [string, string, string][] = [
  ["Материал", "разобран, темы вышли свежими", "половина записей устарела"],
  ["Канал", "100–150 постов, тебя узнают", "подписчики есть, но тебя забыли"],
  ["Входящие", "клиенты и офферы приходят сами", "всё те же рекомендации и холодные контакты"],
];

export function WhyNowBlock() {
  return (
    <section className="wrap sec">
      <SecHd
        title="Почему сейчас"
        right="Через год этот же материал будет стоить дешевле, а внимание — дороже."
      />
      <div className="now-grid">
        <div className="now-list">
          {NOW_LIST.map(([b, t]) => (
            <div key={b}>
              <ArrowUpRight
                size={16}
                style={{ marginTop: 3, flex: "none", color: "var(--orange)" }}
              />
              <span>
                <b>{b}</b> {t}
              </span>
            </div>
          ))}
          <svg className="forksvg" viewBox="0 0 520 150" aria-hidden="true">
            <line x1="10" y1="140" x2="510" y2="140" stroke="rgba(23,23,23,.12)" />
            <path
              d="M 20 100 C 180 96, 300 60, 500 16"
              stroke="#F2601A"
              strokeWidth="2.5"
              fill="none"
            />
            <path
              d="M 20 100 C 180 106, 300 116, 500 128"
              stroke="rgba(23,23,23,.2)"
              strokeWidth="2"
              fill="none"
              strokeDasharray="5 5"
            />
            <circle cx="20" cy="100" r="4" fill="#F2601A" />
            <text
              x="24"
              y="118"
              style={{ fontSize: 11, fill: "#9A9A97", fontFamily: "var(--font-jbmono),monospace" }}
            >
              сегодня
            </text>
            <text
              x="470"
              y="10"
              style={{ fontSize: 11, fill: "#F2601A", fontFamily: "var(--font-jbmono),monospace" }}
              textAnchor="end"
            >
              начал
            </text>
            <text
              x="500"
              y="144"
              style={{ fontSize: 11, fill: "#9A9A97", fontFamily: "var(--font-jbmono),monospace" }}
              textAnchor="end"
            >
              не начал
            </text>
          </svg>
        </div>
        <div className="fork">
          <div className="fork-row hd">
            <div className="fork-c" />
            <div className="fork-c">через год, если начать сейчас</div>
            <div className="fork-c">через год, если не начинать</div>
          </div>
          {FORK_ROWS.map(([k, a, b]) => (
            <div className="fork-row" key={k}>
              <div className="fork-c">{k}</div>
              <div className="fork-c good">{a}</div>
              <div className="fork-c">{b}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* =============== 8 · ЧТО ТЫ ПОЛУЧИШЬ =============== */

export function FeaturesBlock() {
  const feats: [string, string, string, React.ReactNode][] = [
    [
      "Твой голос, а не голос модели",
      "Импорт из твоего канала — система разбирает длину фраз, любимые слова, темы и табу. Дальше каждый текст собирается по этой модели.",
      "~1,5 минуты на подключение",
      <PuiVoice key="v" />,
    ],
    [
      "Тезисы из любого материала",
      "Из одного часа записи — 15–40 самостоятельных мыслей, каждая с оценкой по четырём осям: попадание в аудиторию, крючок, новизна, соответствие тебе.",
      "~2 минуты на извлечение",
      <PuiExtract key="e" />,
    ],
    [
      "Готовый пост под каждую площадку",
      "Telegram, LinkedIn, Instagram, X, карусель, лонгрид. У каждой — свои механики, а не один текст, вставленный четыре раза. Переключи площадку в макете справа.",
      "~2 минуты на пост",
      <PuiFormats key="f" onSwitch={(p) => track("platform_switch", { platform: p })} />,
    ],
    [
      "Карусели, отрисованные целиком",
      "Восемь слайдов с обложкой — сразу картинками, без дизайнера и Figma.",
      "~3 минуты на карусель",
      <PuiCarousel key="c" />,
    ],
    [
      "Ассистент прямо на канвасе",
      "Подключаешь к нему источники, тезисы или готовый пост — и обсуждаешь: усилить хук, поспорить, найти слабое место. Он видит весь подключённый материал.",
      "когда нужно подумать вместе",
      <PuiAssistant key="a" />,
    ],
    [
      "Очередь и публикация",
      "Контент-план на неделю, публикация в Telegram прямо из окна, метрики по вышедшим постам.",
      "~1 минута на постановку в план",
      <PuiPlan key="p" />,
    ],
  ];
  return (
    <section className="wrap sec" id="features">
      <SecHd
        title="Что ты получишь"
        right="Шесть вещей, каждая — с оценкой времени. Ниже показан настоящий интерфейс, а не схемы."
      />
      <div className="feats">
        {feats.map(([h, t, time, mock], i) => (
          <div className="feat" key={h}>
            <div>
              <div className="feat-n">0{i + 1}</div>
              <h3>{h}</h3>
              <p>{t}</p>
              <div className="feat-time">
                <History size={13} />
                {time}
              </div>
            </div>
            <div className="feat-v">{mock}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* =============== 9 · С ЧЕГО НАЧАТЬ =============== */

const STARTS: [string, string, React.ReactNode, string, string][] = [
  [
    "Наговори голосовое",
    "Пять минут по дороге к машине. Расшифруем, вытащим мысли, напишем три поста.",
    <Mic size={11} key="m" />,
    "Голосовая",
    "5:12 · расшифровано",
  ],
  [
    "Разбери свою запись",
    "Эфир, вебинар, выступление, созвон с клиентом. Час материала — это месяц контента.",
    <Youtube size={11} key="y" />,
    "Запись",
    "48 минут",
  ],
  [
    "Ответь на чужое",
    "Прочитал статью или отчёт, есть что сказать. Ссылка → твой разбор с твоей позицией, пока тема горячая.",
    <LinkIcon size={11} key="l" />,
    "Ссылка",
    "статья 12 мин",
  ],
  [
    "Скинь одну мысль",
    "Материала нет, а мысль есть. Напиши строкой — ассистент разложит её, поспорит и поможет собрать пост.",
    <Type size={11} key="t" />,
    "Заметка",
    "одна строка",
  ],
  [
    "Собери неделю за раз",
    "Из одного источника очередь постов, разложенная по дням и площадкам.",
    <LayoutTemplate size={11} key="p" />,
    "Контент-план",
    "7 постов",
  ],
  [
    "Веди несколько голосов",
    "Отдельный профиль на каждого автора или клиента. Голоса не смешиваются.",
    <Mic size={11} key="m2" />,
    "Профили голоса",
    "3 автора",
  ],
];

export function StartBlock() {
  return (
    <section className="wrap sec" id="start">
      <SecHd
        title="С чего начать"
        sub="Записей может не быть вообще."
        right="Достаточно того, что у тебя уже есть. Любой из шести входов доводит до готового поста."
      />
      <div className="starts">
        {STARTS.map(([h, t, ic, nodeT, nodeM], i) => (
          <div className="start" key={h}>
            <div className="start-n">0{i + 1}</div>
            <h4>{h}</h4>
            <p>{t}</p>
            <div className="pui" style={{ marginTop: "auto" }}>
              <PuiNode ports="none" icon={ic} title={nodeT} meta={nodeM}>
                <div
                  className="pui-tp"
                  data-sel="1"
                  style={{ marginBottom: 0, padding: 0 }}
                >
                  <PuiPot v={18} />
                  <span className="pui-tp-t">идея выбрана → пост</span>
                </div>
              </PuiNode>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* =============== 10 · КАК ЭТО РАБОТАЕТ =============== */

const STEPS: [string, string, string][] = [
  [
    "Подключаешь голос",
    "Ссылка на твой канал — система забирает последние посты и разбирает, как ты пишешь. Один раз.",
    "@dkochnev · 32 поста",
  ],
  [
    "Кидаешь материал",
    "Голосовое, ссылка на запись, файл, чужая статья или мысль в строку.",
    "аудио 5:12 · расшифровано",
  ],
  [
    "Выбираешь мысль",
    "Смотришь идеи с оценкой потенциала и решаешь, что заходит.",
    "34 идеи · топ 18/20",
  ],
  [
    "Получаешь пост и публикуешь",
    "Прямо в Telegram или копированием. Остальные тезисы ждут в очереди.",
    "готов · 12% правок",
  ],
];

export function HowBlock() {
  return (
    <section className="wrap sec" id="how">
      <SecHd
        title="Как это работает"
        right="Четыре шага. Первый — один раз в жизни, остальные три занимают минуты."
      />
      <div className="steps">
        {STEPS.map(([h, t, m], i) => (
          <div className="step" key={h}>
            <div className="step-n">0{i + 1}</div>
            <h4>{h}</h4>
            <p>{t}</p>
            <div className="step-mini">{m}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
