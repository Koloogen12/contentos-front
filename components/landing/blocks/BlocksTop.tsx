"use client";

/**
 * THE DRAFT landing — блоки 1–5. Порт `prototype/landing-v2-a.jsx`.
 * Копия выверена под методологию (AJTBD) — менять только по согласованию.
 */

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Copy,
  Cpu,
  Eye,
  FileAudio,
  FileText,
  Link as LinkIcon,
  MessageCircle,
  Mic,
  Play,
  Send,
  Sparkles,
  Type,
  User,
  Workflow,
} from "lucide-react";
import { PuiNode } from "../product/PuiPrimitives";
import { PuiCanvas } from "../product/PuiCanvas";
import { PuiWindow } from "../product/PuiPrimitives";
import { PuiVoice } from "../product/PuiScreens";
import { LandingSlot } from "../LandingSlot";
import { SecHd } from "../Chrome";
import { ctaHref, scrollToId } from "@/lib/landing/cta";
import { track } from "@/lib/landing/analytics";

/* =============== 1 · HERO =============== */

const VALUE_ROWS: [React.ReactNode, string, string][] = [
  [<Mic size={14} key="m" />, "Твой голос", "учится на твоих прошлых постах, а не на среднем интернете"],
  [<Workflow size={14} key="w" />, "Конвейер", "из одного источника выходит неделя контента"],
  [<Send size={14} key="s" />, "Все площадки", "Telegram, LinkedIn, Instagram, X, карусели, лонгриды"],
];

export function HeroBlock() {
  return (
    <section className="hero" id="top">
      <div className="hero-glow" aria-hidden="true" />
      <div className="wrap hero-in">
        <div className="badge">
          <span className="avstack">
            {[1, 2, 3].map((n) => (
              <span key={n} style={{ position: "relative" }}>
                <LandingSlot
                  asset={`face-${n}`}
                  label=""
                  note="фото пользователя, 96×96 webp"
                  round
                />
              </span>
            ))}
          </span>
          Для тех, у кого есть что сказать и нет времени это писать
        </div>
        <h1 style={{ maxWidth: "17ch" }}>
          Публикуй регулярно,
          <br />
          <span className="or">не жди вдохновения</span>
        </h1>
        <div className="lead">
          Наговори голосовое, брось ссылку на запись или чужую статью, скинь мысль одной
          строкой — THE DRAFT достанет сильные тезисы и напишет из них готовые посты.
          Твоим языком, а не языком ChatGPT.
        </div>
      </div>

      <div className="appshell">
        <div className="pui" style={{ maxWidth: 1140, margin: "0 auto", textAlign: "left" }}>
          <PuiWindow
            crumb={["Канвасы", "Подкаст Лекса Фридмана"]}
            title="Подкаст Лекса Фридмана"
            tabs={["Обзор", "Доска", "Список", "Таймлайн"]}
            chips={
              <span className="pui-chip" style={{ marginLeft: "auto" }}>
                34 идеи · 7 постов
              </span>
            }
          >
            <PuiCanvas />
          </PuiWindow>
        </div>
      </div>

      <div className="wrap hero-in hero-in-b">
        <div className="closer">Всё, чтобы твой материал перестал лежать в черновиках.</div>
        <div className="hero-btns">
          <Link
            className="btn btn-dark"
            href={ctaHref()}
            onClick={() => track("hero_cta_click", { placement: "hero" })}
          >
            Попробовать на своём
            <span className="chev">
              <ArrowRight size={14} />
            </span>
          </Link>
          <button
            className="btn btn-white"
            type="button"
            onClick={() => {
              scrollToId("proof");
              track("hero_secondary_click");
            }}
          >
            Показать пример текста
          </button>
        </div>
        <div className="vstack">
          {VALUE_ROWS.map(([ic, b, t]) => (
            <div className="vrow" key={b}>
              <span className="vrow-ic">{ic}</span>
              <span>
                <b>{b}</b> — {t}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* =============== 2 · ДЛЯ КОГО ЭТО =============== */

const ROLES: [React.ReactNode, string, string, string][] = [
  [
    <Cpu size={17} key="c" />,
    "Ты фаундер, и канал должен приводить лиды, а не лежать?",
    "Восемь тысяч подписчиков, которых я собрал два года назад. Последний пост — три недели назад. Я знаю, что из канала приходят и клиенты, и кандидаты, и инвесторы. Но между продуктом, продажами и наймом текст всегда последний. Записей эфиров и созвонов часов на двадцать. Лежат.",
    "Публиковаться регулярно, не отнимая время у продукта — из материала, который у тебя уже есть.",
  ],
  [
    <MessageCircle size={17} key="m" />,
    "Ты эксперт или консультант, и клиенты приходят только по рекомендациям?",
    "Я могу час рассказывать про свою тему кому угодно. Сажусь писать пост — получается сухо и не то. Понимаю, что канал давал бы поток клиентов сам, без сарафана. Только на него нужен вечер в неделю, которого нет.",
    "Превращать то, что ты и так говоришь клиентам, в контент, который приводит новых.",
  ],
  [
    <User size={17} key="u" />,
    "Ты специалист в найме и хочешь, чтобы офферы приходили в личку?",
    "Все вокруг ведут каналы и получают предложения в личку. Мне есть что сказать — я делаю это каждый день на работе. Но после десятичасового дня сесть и написать пост нереально. И страшно: напишу — а вдруг скажут, что банально.",
    "Собрать личный бренд на том опыте, который у тебя уже есть — по 15 минут, а не по вечерам.",
  ],
];

export function RolesBlock() {
  return (
    <section className="wrap sec" id="roles">
      <SecHd
        title="Для кого это"
        right="Три ситуации, в которых THE DRAFT забирает работу целиком. Найди свою — дальше страница будет говорить с тобой."
      />
      <div className="roles">
        {ROLES.map(([ic, h, q, job], i) => (
          <div className="role" key={h}>
            <div className="role-n">
              <span className="role-ic">{ic}</span>0{i + 1}
            </div>
            <h3>{h}</h3>
            <blockquote>«{q}»</blockquote>
            <div className="role-job">
              <b>какие задачи решишь</b>
              {job}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* =============== 3 · ТАКЖЕ БУДЕТ ЦЕННО =============== */

const ALSO_FOR: [string, string][] = [
  ["SMM-специалистам и агентствам", "вести несколько клиентских голосов, не смешивая их"],
  ["Ghostwriter'ам", "писать за автора его языком, а не своим"],
  ["Авторам курсов", "греть аудиторию между запусками из архива эфиров"],
  ["Ведущим подкастов", "превращать каждый выпуск в неделю анонсов и нарезок"],
  ["Продавцам и B2B-специалистам", "чтобы клиент приходил на звонок уже прогретым"],
];

export function AlsoForBlock() {
  return (
    <section className="wrap sec" style={{ paddingTop: 0 }}>
      <div style={{ marginBottom: 8 }}>
        <h3 style={{ fontSize: 19 }}>Также будет ценно</h3>
      </div>
      <div className="alsofor">
        {ALSO_FOR.map(([b, t]) => (
          <div key={b}>
            <ArrowRight
              size={15}
              style={{ marginTop: 4, flex: "none", color: "var(--orange)" }}
            />
            <span>
              <b>{b}</b> — {t}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* =============== 4 · ВОТ ЧТО ОН ПИШЕТ =============== */

interface ProofItem {
  tab: string;
  srcT: string;
  srcW: string;
  post: string;
  note: string;
  icon: React.ReactNode;
}

const PROOF: ProofItem[] = [
  {
    tab: "Голосовое 5 минут",
    srcT: "Голосовое по дороге в офис · 5:12",
    srcW:
      "…я вот думаю, почему у нас первые полгода в THE MONO вообще ничего не двигалось. Мы же делали фичи, каталог, ИИ-подбор, всё как надо. А потом я сел с тремя клиентами и понял, что они вообще не про каталог думают. Они боятся сорвать заказ и объясняться с руководством…",
    post:
      "Полгода я делал фичи, которые никто не просил.\n\nКаталог, ИИ-подбор, удобный заказ — всё, что положено маркетплейсу. Конверсия 0,4%. Я честно думал, что проблема в воронке.\n\nПотом сел с тремя клиентами и просто спросил: что вы решаете, когда заходите.\n\nНи один не сказал «ищу каталог». Все три сказали примерно одно: не сорвать заказ на пять миллионов, не подвести своего клиента, не объяснять руководству, почему опять срок поехал.\n\nЯ переписал главную за вечер. Убрал «ИИ» и «маркетплейс», поставил «Заказывайте без рисков. Гарантируем сроки». Конверсия выросла в четыре раза за неделю.\n\nФичи я делал шесть месяцев. Разговор занял сорок минут.",
    note:
      "Источник — голосовое на 5 минут, наговорено по дороге. Пост собран целиком, руками не тронут.",
    icon: <Mic size={11} />,
  },
  {
    tab: "Запись созвона",
    srcT: "Созвон с клиентом THE MONO · 48 минут",
    srcW:
      "…мы же не за ценой к вам пришли, у нас байер уходит в отпуск и коллекция висит. Нам важно, чтобы кто-то держал сроки и писал сам, если что-то поехало. Мы готовы платить дороже за то, чтобы не проверять каждый день…",
    post:
      "Клиент сказал фразу, после которой я поменял прайс.\n\n«Мы готовы платить дороже за то, чтобы не проверять каждый день».\n\nМы полгода конкурировали ценой. Считали маржу, сравнивали с чужими прайсами, придумывали скидки за объём. А клиент на созвоне спокойно объяснил, что дешевле ему не нужно — ему нужно перестать держать это в голове.\n\nПолучается, мы продавали не то, что он покупает. Он покупает спокойствие: чтобы кто-то держал срок и сам написал, если что-то поехало.\n\nМы вынесли это в отдельный тариф и подняли цену. Ни один клиент не ушёл.\n\nСамые дорогие вещи в продукте обычно уже сказаны клиентом вслух. Просто не записаны.",
    note: "Источник — запись созвона 48 минут. Тезис выбран из 31, пост собран без правок.",
    icon: <Play size={11} />,
  },
  {
    tab: "Чужая статья",
    srcT: "Статья про ИИ-агентов в продажах · 12 мин чтения",
    srcW:
      "Автор утверждает, что ИИ-агенты заменят SDR-команды к 2027 году, и приводит кейсы автоматизации холодных касаний с ростом конверсии на 30%…",
    post:
      "Прочитал очередной текст про то, что ИИ-агенты заменят продавцов. Не заменят, и вот почему.\n\nВ статье все кейсы про холодные касания: написать больше писем, быстрее ответить, поднять конверсию на тридцать процентов. Это правда. Но это самая дешёвая часть работы продавца.\n\nДорогая часть — понять, что клиент имел в виду, когда сказал «мы подумаем». Услышать, что решение блокирует не он. Заметить, что ему важнее не потерять лицо, чем сэкономить.\n\nЭто не автоматизируется, потому что клиент сам не формулирует это словами.\n\nИИ снимет с продавца всю рутину и сделает его дороже, а не ненужнее. Заменят не продавцов — заменят тех, кто занимался только рассылкой.",
    note:
      "Источник — чужая статья по ссылке. Позиция автора взята из его прошлых постов на эту тему.",
    icon: <LinkIcon size={11} />,
  },
  {
    tab: "Одна мысль в строку",
    srcT: "«регулярность важнее качества поста»",
    srcW:
      "Одна строка. Больше материала не было — остальное ассистент собрал из прошлых постов автора и его контекста.",
    post:
      "Восемь моих продуктов умерли, а канал жив только потому, что я публиковался плохо, но регулярно.\n\nПять лет я думал, что нужно писать хорошо. Садился раз в месяц, вымучивал текст на три часа, получал двадцать лайков и молчал ещё месяц.\n\nПотом посмотрел на людей, у которых канал реально работает. Ни один не пишет шедевры. Все пишут постоянно.\n\nАлгоритм и человеческая память устроены одинаково: они помнят того, кто был на виду вчера. Гениальный пост раз в квартал проигрывает нормальному посту три раза в неделю.\n\nПоэтому я перестал делать ставку на качество отдельного текста и начал держать очередь. Плохой пост можно исправить следующим. Молчание исправить нечем.",
    note: "Источник — одна строка. Всё остальное собрано из твоих прошлых текстов.",
    icon: <Type size={11} />,
  },
];

export function ProofBlock() {
  const [i, setI] = React.useState(0);
  const p = PROOF[i];
  const [title, meta] = p.srcT.split(" · ");
  return (
    <section className="wrap sec" id="proof">
      <SecHd
        title="Вот что он пишет"
        sub="Ни одной правки руками."
        right="Решай сам, публиковать такое или нет. Четыре разных входа — от голосовой до одной строки."
      />
      <div className="tabs" role="tablist">
        {PROOF.map((x, j) => (
          <button
            className="tab"
            key={x.tab}
            data-on={i === j ? "1" : "0"}
            onClick={() => {
              setI(j);
              track("proof_tab_switch", { tab: x.tab });
            }}
            type="button"
            role="tab"
            aria-selected={i === j}
          >
            {x.tab}
          </button>
        ))}
      </div>
      <div className="proof">
        <div className="pui">
          <PuiNode
            ports="out"
            label="Источник"
            labelIcon={<FileAudio size={10} />}
            icon={p.icon}
            title={title}
            meta={meta || "источник"}
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
            <div className="pui-quote">{p.srcW}</div>
          </PuiNode>
        </div>
        <div className="tgpost">
          <div className="tgpost-hd">
            <i />
            <div>
              <b>Данил Кочнев · продукты и найм</b>
              <span>8 240 подписчиков</span>
            </div>
            <span
              style={{
                marginLeft: "auto",
                border: "1px solid var(--line)",
                borderRadius: 8,
                padding: "5px 9px",
                font: "500 11px/1 var(--font-jbmono),monospace",
                color: "var(--ink-3)",
              }}
            >
              предпросмотр
            </span>
          </div>
          <div className="tgpost-b">{p.post}</div>
          <div className="tgpost-f">
            <Eye size={12} />
            1,2K · <Copy size={12} />
            скопировать · <Send size={12} />
            опубликовать
          </div>
        </div>
      </div>
      <div className="caption">{p.note}</div>
    </section>
  );
}

/* =============== 5 · ПОЧЕМУ ЭТО ЗВУЧИТ КАК ТЫ =============== */

const CHATGPT_TEXT =
  "В современном мире продуктовой разработки крайне важно понимать потребности целевой аудитории. Методология Jobs To Be Done позволяет взглянуть на продукт под новым углом и выявить истинные мотивы пользователей. Давайте разберёмся, как применять её на практике.";

const DRAFT_TEXT =
  "7 из 8 моих продуктов умерли. Не из-за кода. Из-за того что я не понимал кого нанимаю на работу.\n\nПо факту вся история про JTBD сводится к одной мысли: люди не покупают продукты. Они нанимают их на работу. И увольняют, если работу не делает.";

export function VoiceBlock() {
  return (
    <section className="wrap sec" id="voice">
      <SecHd
        title="Почему это звучит как ты,"
        sub="а не как ChatGPT"
        right="Дай ссылку на свой канал — он заберёт последние посты и разберёт, как ты пишешь: какой длины у тебя фразы, какие слова ты любишь, чего не говоришь никогда. Одна ссылка, полторы минуты. Анкет и настроек нет."
      />
      <div className="bigline" style={{ marginBottom: 30 }}>
        ChatGPT читал интернет. <span className="or">THE DRAFT читает тебя.</span>
      </div>
      <div className="voice-grid">
        <PuiVoice />
        <div>
          <div className="cmp">
            <div className="cmp-c">
              <div className="cmp-l">chatgpt, обычный промпт</div>
              <div className="cmp-t">{CHATGPT_TEXT}</div>
            </div>
            <div className="cmp-c win">
              <div className="cmp-l">the draft, твой голос</div>
              <div className="cmp-t">{DRAFT_TEXT}</div>
            </div>
          </div>
          <div className="caption">Оба текста об одном. Разница в том, какой из них твой.</div>
        </div>
      </div>
    </section>
  );
}
