/**
 * Справочники и алгоритмы модуля «Запуски».
 *
 * Порт `design_handoff/workspace/prototype/launch-data.js` (ревизия 28.08.2026)
 * один к одному: те же длительности, те же квоты, тот же порядок сжатия и те же
 * формулировки находок. Логика намеренно повторена дословно — расхождение здесь
 * означало бы, что интерфейс показывает не то, что показывал прототип.
 *
 * Почему счёт идёт на клиенте, хотя у бэкенда есть `/plan` и `/report`.
 * Серверный отчёт отдаёт другую форму находки (`code`/`severity`/`fix_days`),
 * а прототип строит экраны на `risk`/`items`/`where`/`basis`/`go` — с этими
 * полями сделаны и очередь «что починить», и переходы из находки в день плана.
 * Пересобирать контракт под макет сейчас значило бы ломать работающий бэкенд
 * ради вёрстки, поэтому расчёт живёт здесь, а сервер остаётся хранилищем.
 * Выравнивание контракта — отдельной задачей.
 *
 * Справочники неизменяемы и живут в коде: их же отдаёт `GET /api/v1/launches/reference`.
 */

/* ─── даты ─── */

const MON = ["января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря"];
const MONS = ["янв", "фев", "мар", "апр", "мая", "июн",
  "июл", "авг", "сен", "окт", "ноя", "дек"];
export const WD = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

export const D = (s: string): Date => {
  const p = String(s).split("-").map(Number);
  return new Date(p[0], p[1] - 1, p[2]);
};
export const dateStr = (dt: Date): string =>
  dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0");
export const add = (s: string, n: number): string => {
  const dt = D(s);
  dt.setDate(dt.getDate() + n);
  return dateStr(dt);
};
export const diff = (a: string, b: string): number =>
  Math.round((D(b).getTime() - D(a).getTime()) / 86400000);
/** День недели, 0 — понедельник. */
export const wd = (s: string): number => (D(s).getDay() + 6) % 7;
export const fmt = (s?: string | null): string =>
  s ? D(s).getDate() + " " + MON[D(s).getMonth()] : "—";
export const fmtS = (s?: string | null): string =>
  s ? D(s).getDate() + " " + MONS[D(s).getMonth()] : "—";
export const plural = (n: number, a: string, b: string, c: string): string => {
  const m = n % 100, k = n % 10;
  return n + " " + (m > 10 && m < 20 ? c : k === 1 ? a : k > 1 && k < 5 ? b : c);
};

/**
 * «Сегодня» модуля. В прототипе прибито к 28.08.2026, чтобы мок-данные
 * выглядели одинаково при каждом открытии. Здесь берём настоящую дату:
 * запуски приходят из базы и живут в реальном времени.
 */
export const today = (): string => dateStr(new Date());

/* ─── 02. Семь этапов ─── */

export interface Stage {
  n: number;
  key: StageKey;
  name: string;
  short: string;
  min: number;
  def: number;
  max: number;
  bg?: boolean;
  ours?: boolean;
  task: string;
}
export type StageKey = "regular" | "soft" | "reveal" | "active" | "keystep" | "hype" | "sales";

export const STAGES: Stage[] = [
  { n: 1, key: "regular", name: "Регулярный контент", short: "Регулярный", min: 0, def: 0, max: 0, bg: true, task: "База, на которой стоят все запуски. Идёт всегда — до и во время." },
  { n: 2, key: "soft", name: "Мягкий прогрев", short: "Мягкий", min: 7, def: 21, max: 45, task: "Вкидываем основные смыслы на низкой частоте, поднимаем интерес к теме." },
  { n: 3, key: "reveal", name: "Вброс идеи", short: "Вброс", min: 1, def: 1, max: 2, task: "Вскрываем карты и собираем реакцию на саму идею продукта." },
  { n: 4, key: "active", name: "Активный прогрев", short: "Активный", min: 7, def: 10, max: 15, task: "Максимальная интенсивность, выкладываем козыри." },
  { n: 5, key: "keystep", name: "Прогрев к ключевому шагу", short: "Ключевой шаг", min: 4, def: 6, max: 10, task: "Гоним на вебинар или бесплатник, собираем регистрации." },
  { n: 6, key: "hype", name: "Ажиотаж", short: "Ажиотаж", min: 0, def: 1, max: 2, task: "Показываем, сколько людей хотят и как мало мест." },
  { n: 7, key: "sales", name: "Окно продаж", short: "Продажи", min: 1, def: 7, max: 21, ours: true, task: "Продажа каждый день, снятие возражений, дожим последнего дня." },
];
export const byKey: Record<string, Stage> = {};
STAGES.forEach((s) => { byKey[s.key] = s; });

/* ─── 04. Двенадцать рубрик ─── */

export interface Rubric {
  n: number;
  key: string;
  name: string;
  q: 1 | 2 | 3 | 4;
  lever: string;
  formats: string[];
  ours?: boolean;
}
export const RUBRICS: Rubric[] = [
  { n: 1, key: "background", name: "Фоновый контент", q: 1, lever: "relevance", formats: ["any"] },
  { n: 2, key: "lifestyle", name: "Стиль жизни", q: 1, lever: "sympathy", formats: ["stories", "reels"] },
  { n: 3, key: "topic", name: "Продажа темы", q: 1, lever: "dream_life", formats: ["reels", "post"] },
  { n: 4, key: "expertise", name: "Экспертиза и авторитет", q: 2, lever: "expertness", formats: ["reels", "post"] },
  { n: 5, key: "newsjack", name: "Инфоповоды", q: 1, lever: "events", formats: ["stories", "reels"] },
  { n: 6, key: "clients", name: "Клиенты и проекты", q: 2, lever: "authority", formats: ["stories", "post"] },
  { n: 7, key: "students", name: "Ученики и комьюнити", q: 3, lever: "social_proof", formats: ["stories", "reels"] },
  { n: 8, key: "product", name: "Продукт", q: 4, lever: "clarity", formats: ["stories", "post"] },
  { n: 9, key: "hype", name: "Ажиотаж", q: 4, lever: "scarcity", formats: ["stories"] },
  { n: 10, key: "freebie", name: "Бесплатник", q: 4, lever: "reciprocity", formats: ["stories", "post"] },
  { n: 11, key: "sales", name: "Продажи в блоге", q: 4, lever: "scarcity", formats: ["stories", "post"] },
  { n: 12, key: "objections", name: "Снятие возражений", q: 3, lever: "guarantee", formats: ["stories", "post"], ours: true },
];
export const rubByKey: Record<string, Rubric> = {};
RUBRICS.forEach((r) => { rubByKey[r.key] = r; });

/** Целевые доли рубрик по этапам. Сумма внутри этапа = 1. */
export const QUOTA: Record<string, Record<string, number>> = {
  soft: { background: .25, lifestyle: .25, topic: .25, expertise: .20, newsjack: .05 },
  reveal: { topic: .40, product: .60 },
  active: { lifestyle: .10, topic: .20, expertise: .25, clients: .05, students: .25, product: .15 },
  keystep: { expertise: .25, students: .25, freebie: .50 },
  hype: { students: .30, hype: .70 },
  sales: { students: .20, hype: .15, sales: .40, objections: .25 },
  lastday: { hype: .50, sales: .50 },
};

/* ─── 05. Четыре вопроса и сорок смыслов ─── */

export interface Question { n: number; title: string; short: string; note: string }
export const QUESTIONS: Question[] = [
  { n: 1, title: "Точно ли эта тема закроет мою потребность", short: "Тема закроет потребность", note: "Продаём тему, а не себя. Человек должен поверить в саму сферу." },
  { n: 2, title: "Точно ли ты эксперт в этой теме", short: "Ты эксперт", note: "Право вести. Не «я хороший», а доказательства компетентности." },
  { n: 3, title: "Точно ли получится у меня", short: "Получится у меня", note: "Снятие возражений фактами и примерами с похожей стартовой точки." },
  { n: 4, title: "Почему именно твой продукт", short: "Почему твой продукт", note: "Отстройка от альтернатив: другого продукта, самообучения, откладывания." },
];

export interface Meaning { key: string; q: number; name: string; ask?: string; ours?: boolean }
const M = (key: string, q: number, name: string, ask?: string, ours?: boolean): Meaning =>
  ({ key, q, name, ask, ours });

export const MEANINGS: Meaning[] = [
  M("q1_results", 1, "Твои результаты"), M("q1_story", 1, "Твоя история"),
  M("q1_role_model", 1, "Ты был на месте зрителя"),
  M("q1_lifestyle", 1, "Лайфстайл: быт, покупки, окружение", "снять 3 сторис из обычного дня: где работаешь, что покупаешь, кто рядом"),
  M("q1_numbers", 1, "Статистика и цифры"),
  M("q1_passion", 1, "Увлечённость и кайф от темы", "записать рилс о том, почему тебе это до сих пор интересно"),
  M("q1_how", 1, "Как это вообще работает"), M("q1_ease", 1, "Лёгкость входа"),
  M("q1_safety", 1, "Безопасность", "собрать 2 примера, где риск не сработал — и почему это нормально"),
  M("q1_ceiling", 1, "Отсутствие потолка"), M("q1_benefits", 1, "Выгоды сферы"),
  M("q1_pains", 1, "Закрытие болей"), M("q1_future", 1, "Перспектива"),
  M("q2_credentials", 2, "Достижения и регалии"), M("q2_projects", 2, "Реальные проекты"),
  M("q2_student_results", 2, "Результаты учеников", "попросить у трёх учеников видеоотзыв с описанием стартовой точки"),
  M("q2_speaker", 2, "Востребованность как спикера", "достать фото и записи выступлений за последний год"),
  M("q2_peers", 2, "Что говорят авторитетные люди", "взять короткий отзыв у двух авторитетных для аудитории людей"),
  M("q2_people", 2, "Мнение обычных людей о тебе", "собрать скрины сообщений подписчиков — что им дал твой контент"),
  M("q2_expert_content", 2, "Экспертный контент"), M("q2_unique", 2, "Уникальный опыт"),
  M("q2_enemy", 2, "Отстройка от вредного подхода"), M("q2_mistakes", 2, "Понимание ошибок"),
  M("q3_objections", 3, "Разбор страхов и возражений", "выписать 8 возражений из переписок и ответить на каждое фактом"),
  M("q3_same_start", 3, "Ученик с той же стартовой точки", "найти ученика, который начинал с нуля, и попросить его цифры"),
  M("q3_proof", 3, "Доказательство фактами, а не словами", "собрать скрины кабинетов, выписок, дашбордов — не слова, а пруфы"),
  M("q3_bridge", 3, "Мостик: свои провалы и трудности", "записать историю провала: сколько потерял и что не получалось"),
  M("q4_content", 4, "Наполнение продукта"), M("q4_path", 4, "Путь, который пройдёт человек"),
  M("q4_support", 4, "Форматы поддержки"),
  M("q4_team", 4, "Команда проекта", "сфотографировать команду и описать, кто за что отвечает"),
  M("q4_wow", 4, "Фишки и вау-эффект"),
  M("q4_safe", 4, "Безопасно", "сформулировать условия возврата и проверить их с юристом"),
  M("q4_fast", 4, "Быстро"), M("q4_easy", 4, "Легко"),
  M("q4_community", 4, "Комьюнити", "собрать скрины чата прошлого потока"),
  M("q4_pleasure", 4, "Удовольствие от процесса", "снять, как проходит одно занятие изнутри"),
  M("q4_exclusive", 4, "Интрига и эксклюзив", "придумать, что будет только у этого потока, и чем это доказать"),
  M("q4_criteria", 4, "Частные критерии решения"),
  M("q4_guarantee", 4, "Гарантия и условия возврата", "описать гарантию одной фразой и что именно она покрывает", true),
];
export const meanByKey: Record<string, Meaning> = {};
MEANINGS.forEach((m) => { meanByKey[m.key] = m; });

/* ─── 06. Восемнадцать рычагов ─── */

export interface Lever { key: string; name: string; cat: string; stage: number; why: string }
export const LEVERS: Lever[] = [
  { key: "relevance", name: "Релевантность", cat: "Понимание", stage: 1, why: "Близкая стартовая точка вызывает «это про меня»." },
  { key: "events", name: "События", cat: "Срочность", stage: 1, why: "Запуск должен быть событием, которое ждут." },
  { key: "sympathy", name: "Симпатия", cat: "Доверие", stage: 2, why: "Покупают у того, кто похож и понятен." },
  { key: "dream_life", name: "Жизнь мечты", cat: "Желание", stage: 2, why: "Покупают образ жизни, а не навык." },
  { key: "expertness", name: "Экспертность", cat: "Доверие", stage: 2, why: "Осведомлённость и опыт в конкретном вопросе." },
  { key: "clarity", name: "Ясность", cat: "Понимание", stage: 3, why: "В понятное легче поверить." },
  { key: "social_proof", name: "Социальные доказательства", cat: "Доверие", stage: 4, why: "Люди ориентируются на выбор и результаты других." },
  { key: "authority", name: "Авторитет", cat: "Доверие", stage: 4, why: "Признание со стороны отключает критическую оценку." },
  { key: "belonging", name: "Принадлежность к сильной группе", cat: "Желание", stage: 4, why: "Люди хотят быть частью сильной группы." },
  { key: "reciprocity", name: "Благодарность", cat: "Вовлечение", stage: 5, why: "За полученное бесплатно хочется отплатить." },
  { key: "scarcity", name: "Дефицит", cat: "Срочность", stage: 6, why: "Ограниченность мест и времени повышает ценность." },
  { key: "consistency", name: "Последовательность", cat: "Вовлечение", stage: 0, why: "После маленького шага легче сделать следующий." },
  { key: "realism", name: "Реалистичность", cat: "Доверие", stage: 0, why: "Неидеальная картинка вызывает больше доверия." },
  { key: "ease", name: "Лёгкость", cat: "Желание", stage: 0, why: "Простой и быстрый путь к результату." },
  { key: "guarantee", name: "Гарантия", cat: "Снятие риска", stage: 0, why: "Понятные условия безопасности и возврата." },
  { key: "transformation", name: "Трансформация личности", cat: "Желание", stage: 0, why: "Меняется не только результат, но и сам человек." },
  { key: "involvement", name: "Причастность", cat: "Вовлечение", stage: 0, why: "Свой вклад создаёт обязательство." },
  { key: "common_enemy", name: "Общий враг", cat: "Вовлечение", stage: 0, why: "Общая проблема объединяет автора и аудиторию." },
];
export const levByKey: Record<string, Lever> = {};
LEVERS.forEach((l) => { levByKey[l.key] = l; });

/* ─── 03. Каденция ─── */

export type PlatformKey = "stories" | "reels" | "telegram";
export interface Platform { key: PlatformKey; name: string; short: string; format: string }
export const PLATFORMS: Platform[] = [
  { key: "stories", name: "сторис", short: "СТ", format: "stories" },
  { key: "reels", name: "рилс", short: "РИЛ", format: "reels" },
  { key: "telegram", name: "telegram", short: "TG", format: "post" },
];

export interface Cadence {
  name: string; note: string;
  stories: number[]; reels: number[]; telegram: number[];
  reelsActive?: number[];
}
export const CADENCE: Record<string, Cadence> = {
  light: { name: "Лёгкая", note: "до ~2 тыс. подписчиков, первый запуск", stories: [0, 2, 4], reels: [2], telegram: [4] },
  normal: { name: "Обычная", note: "дефолт", stories: [0, 1, 2, 3, 4, 5, 6], reels: [0, 2, 4], reelsActive: [0, 1, 3, 4], telegram: [1, 4] },
  dense: { name: "Плотная", note: "прогретая аудитория, не первый поток", stories: [0, 1, 2, 3, 4, 5, 6], reels: [0, 1, 2, 3, 4], telegram: [0, 2, 4] },
};

/** Канал слота → форматы идей, которые в него ложатся. */
export const FIT: Record<string, string[]> = {
  stories: ["stories", "any"],
  reels: ["reels", "any"],
  telegram: ["post", "any"],
};

/* ─── типы модуля ─── */

export type LaunchStatus = "draft" | "warm" | "sales" | "closed";
export type MarkupOrigin = "rule" | "llm" | "human";
export type SlotStatus = "planned" | "published" | "missed";
export type DraftState = null | "writing" | "ready";
export type EvidenceState = "proof" | "claimed" | "none";

export interface Launch {
  id: string;
  name: string;
  product: string;
  price: string;
  sales_open: string;
  sales_close: string;
  key_event_date: string;
  key_event_type: string;
  launch_number: number;
  intensity: string;
  durations?: Record<string, number>;
  audience?: string;
  collect?: string;
  waitlist_goal?: number;
  waitlist?: number;
  paid?: number;
  paid_goal?: number;
  unrolled_on?: string;
  status: LaunchStatus;
  readiness: Record<string, boolean>;
  archived?: boolean;
  lines?: StoryLine[];
}

export interface Slot {
  id: string;
  date: string;
  platform: PlatformKey;
  stage: StageKey;
  rubric: string;
  meaning: string;
  trigger_key: string;
  idea: string | null;
  reason?: string | null;
  markup_origin: MarkupOrigin;
  is_pinned: boolean;
  is_last_day: boolean;
  version: number;
  status: SlotStatus;
  draft: DraftState;
  chars: number;
  text?: string;
  reaction: number | null;
  line_id: string | null;
  line_role: "announce" | "close" | null;
}

export interface StoryLine {
  id: string;
  title: string;
  payoff: string;
  announced_on: string;
  closes_on: string;
  announce_slot?: string | null;
  close_slot?: string | null;
}

export interface Window { key: StageKey; from: string; to: string; days: number }

export interface PlanResult {
  windows: Window[];
  compressed: Array<{ key: string; name: string; from: number; to: number }>;
  dropped: Array<{ key: string; name: string; why: string }>;
  error: string | null;
  avail: number;
  note: string | null;
}

/* ─── 03. Разворот календаря ─── */

/**
 * Развернуть календарь назад от даты открытия продаж.
 * Детерминированный, без модели: план обязан быть воспроизводимым.
 */
export function plan(l: Partial<Launch>, floorDate?: string): PlanResult {
  const out: PlanResult = { windows: [], compressed: [], dropped: [], error: null, avail: 0, note: null };
  if (!l.sales_open) {
    out.error = "Не задана дата открытия продаж — от неё считается весь план.";
    return out;
  }
  if (l.sales_close && diff(l.sales_open, l.sales_close) < 0) {
    out.error = "Закрытие продаж раньше открытия. Ближайшая корректная дата — " + fmt(add(l.sales_open, 6)) + ".";
    return out;
  }
  if (l.key_event_date && diff(l.key_event_date, l.sales_open) < 0) {
    out.error = "Ключевое событие позже открытия продаж. Поставь его не позже " + fmt(add(l.sales_open, -1)) + ".";
    return out;
  }
  const floor = floorDate || l.unrolled_on || today();
  const first = add(floor, 1), lastBefore = add(l.sales_open, -1);
  const avail = diff(first, lastBefore) + 1;
  out.avail = avail;
  if (avail <= 0) {
    out.error = "До открытия продаж не осталось дней на прогрев.";
    return out;
  }
  const dur = l.durations || {};
  const get = (k: string) => {
    const st = byKey[k];
    return Math.max(st.min, Math.min(st.max, dur[k] != null ? dur[k] : st.def));
  };
  const len: Record<string, number> = {
    soft: get("soft"), reveal: get("reveal"), active: get("active"),
    keystep: get("keystep"), hype: get("hype"),
  };
  if (l.key_event_date) {
    const gap = diff(l.key_event_date, lastBefore);
    len.hype = Math.max(0, Math.min(byKey.hype.max, gap));
    if (gap > byKey.hype.max) {
      out.note = "Между " + l.key_event_type + " и продажами " + plural(gap, "день", "дня", "дней") +
        " — ажиотаж растянут дольше рекомендуемых двух.";
    }
    if (out.note) len.hype = gap;
  }
  let excess = len.soft + len.reveal + len.active + len.keystep + len.hype - avail;
  // Порядок жертвования зафиксирован: мягкий → вброс → активный → ключевой шаг.
  // Ажиотаж и окно продаж не режутся никогда — без них запуска нет.
  ([["soft", byKey.soft.min], ["reveal", 0], ["active", byKey.active.min], ["keystep", byKey.keystep.min]] as Array<[string, number]>)
    .forEach(([k, floorLen]) => {
      if (excess <= 0) return;
      const can = len[k] - floorLen;
      if (can <= 0) return;
      const take = Math.min(can, excess), was = len[k];
      len[k] -= take; excess -= take;
      if (len[k] === 0) out.dropped.push({ key: k, name: byKey[k].name, why: "схлопнут в активный прогрев" });
      else out.compressed.push({ key: k, name: byKey[k].name, from: was, to: len[k] });
    });
  if (excess > 0) {
    out.error = "До продаж " + plural(avail, "день", "дня", "дней") + " — не хватает " +
      plural(excess, "дня", "дней", "дней") + " даже по минимумам этапов. Сдвинь открытие на " +
      fmt(add(l.sales_open, excess)) + " или убери ключевое событие.";
    return out;
  }
  let cur = lastBefore;
  const win: Record<string, Window> = {};
  (["hype", "keystep", "active", "reveal", "soft"] as StageKey[]).forEach((k) => {
    if (!len[k]) return;
    const to = cur, from = add(cur, -(len[k] - 1));
    win[k] = { key: k, from, to, days: len[k] };
    cur = add(from, -1);
  });
  out.windows = (["soft", "reveal", "active", "keystep", "hype"] as StageKey[])
    .filter((k) => win[k]).map((k) => win[k]);
  const close = l.sales_close || add(l.sales_open, byKey.sales.def - 1);
  out.windows.push({ key: "sales", from: l.sales_open, to: close, days: diff(l.sales_open, close) + 1 });
  return out;
}

/** Квоты → рубрики: наибольший остаток, затем раскладка вперемешку. */
export function allocate(quota: Record<string, number>, n: number): string[] {
  if (!n) return [];
  const keys = Object.keys(quota);
  const rows = keys.map((k) => {
    const v = quota[k] * n;
    return { k, c: Math.floor(v), f: v - Math.floor(v) };
  });
  let left = n - rows.reduce((a, b) => a + b.c, 0);
  rows.slice().sort((a, b) => b.f - a.f || (a.k < b.k ? -1 : 1)).forEach((r) => {
    if (left > 0) { r.c++; left--; }
  });
  const buckets = rows.filter((r) => r.c > 0).map((r) => ({ k: r.k, left: r.c }));
  const out: string[] = [];
  while (out.length < n && buckets.length) {
    buckets.sort((a, b) => b.left - a.left || (a.k < b.k ? -1 : 1));
    if (buckets[0].left <= 0) break;
    out.push(buckets[0].k);
    buckets[0].left--;
  }
  return out;
}

function assignRubrics(list: Slot[], quota: Record<string, number>) {
  const pool = allocate(quota, list.length);
  const rest = pool.slice();
  list.forEach((s) => {
    const fits = FIT[s.platform];
    let i = rest.findIndex((k) => rubByKey[k].formats.some((f) => fits.indexOf(f) >= 0));
    if (i < 0) i = rest.findIndex((k) => k);
    s.rubric = i >= 0 ? rest.splice(i, 1)[0] : (s.platform === "stories" ? "hype" : "background");
  });
}

/** Одна идея банка в том виде, в каком её видит подбор. */
export interface BankIdea { id: string; title: string; format: string }

/**
 * Развернуть окна в слоты по каденции и раздать рубрики по квотам.
 * Банк передаётся снаружи: в прототипе он был мок-константой, здесь приходит
 * из раздела «Идеи».
 */
export function slotsFor(l: Launch, windows: Window[], bank?: Record<string, BankIdea[]>): Slot[] {
  const cad = CADENCE[l.intensity] || CADENCE.normal;
  const all: Slot[] = [];
  let idx = 0;
  windows.forEach((w) => {
    const list: Slot[] = [];
    for (let d = 0; d < w.days; d++) {
      const date = add(w.from, d), day = wd(date);
      PLATFORMS.forEach((p) => {
        let days = cad[p.key];
        if (p.key === "reels" && cad.reelsActive &&
          ["active", "keystep", "hype", "sales"].indexOf(w.key) >= 0) days = cad.reelsActive;
        if (days.indexOf(day) < 0) return;
        list.push({
          id: "", date, platform: p.key, stage: w.key, rubric: "", meaning: "", trigger_key: "",
          idea: null, markup_origin: "rule", is_pinned: false,
          is_last_day: w.key === "sales" && date === w.to, version: 1,
          status: "planned", draft: null, chars: 0, reaction: null, line_id: null, line_role: null,
        });
      });
    }
    const last = list.filter((s) => s.is_last_day);
    assignRubrics(list.filter((s) => !s.is_last_day), QUOTA[w.key]);
    assignRubrics(last, QUOTA.lastday);
    list.forEach((s) => { s.id = l.id + "-s" + idx++; all.push(s); });
  });
  fillSlots(all, bank || {});
  return all;
}

/**
 * Подставить идеи и смыслы. Пустой слот всегда получает причину:
 * молчаливая дыра в плане — это день, в который человек не понимает, что снимать.
 */
function fillSlots(slots: Slot[], bank: Record<string, BankIdea[]>) {
  const used: Record<string, string[]> = {};
  const qCursor: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const mCount: Record<string, number> = {};
  slots.forEach((s, i) => {
    const rub = rubByKey[s.rubric], fits = FIT[s.platform];
    const pool = bank[s.rubric] || [];
    used[s.rubric] = used[s.rubric] || [];
    const free = pool.filter((b) => used[s.rubric].indexOf(b.id) < 0);
    const ok = free.filter((b) => fits.indexOf(b.format) >= 0);
    if (ok.length) {
      s.idea = ok[0].title;
      used[s.rubric].push(ok[0].id);
    } else {
      s.idea = null;
      s.reason = !pool.length
        ? "в банке нет идей рубрики «" + rub.name + "»"
        : free.length
          ? "идеи рубрики «" + rub.name + "» есть, но не под формат «" + PLATFORMS.find((p) => p.key === s.platform)!.name + "»"
          : "идеи рубрики «" + rub.name + "» закончились — все уже стоят в плане";
    }
    const mp = MEANINGS.filter((m) => m.q === rub.q);
    let pick: Meaning | null = null;
    for (let k = 0; k < mp.length; k++) {
      const m = mp[(qCursor[rub.q] + k) % mp.length];
      if ((mCount[m.key] || 0) < 2) {
        pick = m;
        qCursor[rub.q] = (qCursor[rub.q] + k + 1) % mp.length;
        break;
      }
    }
    pick = pick || mp[i % mp.length];
    s.meaning = pick.key;
    mCount[pick.key] = (mCount[pick.key] || 0) + 1;
    s.trigger_key = rub.lever;
  });
}

/* ─── 08. Проверки ─── */

export interface Finding {
  key: string;
  level: "critical" | "important";
  title: string;
  risk: string;
  items: string[];
  where: string[];
  basis: "confirmed" | "assumption";
  go: "plan" | "evidence" | "report" | "lines";
}

export interface Report {
  findings: Finding[];
  slots_total: number;
  slots_with_idea: number;
  slots_with_proof: number;
  checkpoints_total: number;
  confirmed: number;
  claimed: number;
  triggers_used: number;
  triggers_total: number;
  ready: boolean;
  empty: boolean;
  critical: number;
  leversStaged?: number;
}

export interface ReportInput {
  launch: Launch;
  slots: Slot[];
  evidence: Record<string, EvidenceState>;
  lines: StoryLine[];
  readiness: Record<string, boolean>;
}

export function report(st: ReportInput): Report {
  const l = st.launch, slots = st.slots || [], ev = st.evidence || {},
    lines = st.lines || [], rd = st.readiness || {};
  const r: Report = {
    findings: [], slots_total: slots.length, slots_with_idea: 0, slots_with_proof: 0,
    checkpoints_total: MEANINGS.length, confirmed: 0, claimed: 0,
    triggers_used: 0, triggers_total: LEVERS.length, ready: false,
    empty: !slots.length, critical: 0,
  };
  if (r.empty) return r;

  const conf: Record<string, boolean> = {}, clm: Record<string, boolean> = {};
  const byMean: Record<string, Slot[]> = {};
  slots.forEach((s) => {
    if (s.idea) r.slots_with_idea++;
    if (ev[s.meaning] === "proof") r.slots_with_proof++;
    if (!s.meaning) return;
    (byMean[s.meaning] = byMean[s.meaning] || []).push(s);
    if (s.markup_origin === "human") conf[s.meaning] = true; else clm[s.meaning] = true;
  });
  r.confirmed = Object.keys(conf).length;
  r.claimed = Object.keys(byMean).length;
  const levers: Record<string, boolean> = {};
  slots.forEach((s) => { levers[s.trigger_key] = true; });
  r.triggers_used = Object.keys(levers).length;
  const dates = (f: (s: Slot) => boolean, n?: number) =>
    Array.from(new Set(slots.filter(f).map((s) => s.date))).slice(0, n || 4);

  QUESTIONS.forEach((q) => {
    const pool = MEANINGS.filter((m) => m.q === q.n);
    const open = pool.filter((m) => !conf[m.key]);
    if (!open.length) return;
    const none = pool.filter((m) => !conf[m.key] && !clm[m.key]);
    const critical = none.length === pool.length;
    r.findings.push({
      key: "mean-q" + q.n,
      level: critical ? "critical" : "important",
      title: critical
        ? "Ни один смысл вопроса «" + q.short + "» не закрыт"
        : plural(open.length, "смысл", "смысла", "смыслов") + " вопроса «" + q.short + "» не подтверждены",
      risk: critical
        ? q.note + " Пока этого нет в плане, человек отвечает на вопрос сам — и обычно не в твою пользу."
        : "Смыслы стоят в слотах, но разметка не выверена руками: в покрытие они не идут.",
      items: open.slice(0, 6).map((m) => m.name),
      where: dates((s) => rubByKey[s.rubric].q === q.n),
      basis: critical ? "confirmed" : "assumption",
      go: "plan",
    });
  });

  if (!conf.q3_bridge) {
    r.findings.push({
      key: "bridge", level: "critical", title: "Мостик не показан ни разу",
      risk: "Аудитория видит только вершину и решает, что у неё так не выйдет. Это самая частая причина, по которой прогрев не конвертит.",
      items: ["Свои провалы и трудности: с чего начинал и что не получалось"],
      where: dates((s) => s.stage === "soft" || s.stage === "active", 4),
      basis: ev.q3_bridge === "none" ? "confirmed" : "assumption", go: "evidence",
    });
  }

  const firstHype = slots.find((s) => s.rubric === "hype" || s.rubric === "sales");
  const firstProof = slots.find((s) => s.rubric === "expertise" || s.rubric === "topic");
  if (firstHype && firstProof && diff(firstHype.date, firstProof.date) > 0) {
    r.findings.push({
      key: "order", level: "critical", title: "Ажиотаж раньше, чем раскрыты тема и эксперт",
      risk: "Аудитория узнаёт цену до того, как поняла зачем.",
      items: ["Ажиотаж " + fmt(firstHype.date) + " · первая экспертиза " + fmt(firstProof.date)],
      where: [firstHype.date], basis: "confirmed", go: "plan",
    });
  }

  const unused = LEVERS.filter((x) => !levers[x.key]);
  if (unused.length) {
    const cross = unused.filter((x) => !x.stage), staged = unused.filter((x) => x.stage);
    r.findings.push({
      key: "levers", level: "important",
      title: plural(unused.length, "рычаг", "рычага", "рычагов") + " не задействован ни разу",
      risk: "Нельзя перепрыгнуть пропасть на 99%: не дожал — значит не купил. " +
        (cross.length ? "Сквозные рычаги не ждёт ни один этап, поэтому они выпадают чаще всего." : ""),
      items: unused.map((x) => x.name + (x.stage ? " · этап " + x.stage : " · сквозной")),
      where: dates((s) => s.stage === "active" || s.stage === "sales"),
      basis: "confirmed", go: "plan",
    });
    r.leversStaged = staged.length;
  }

  const claimedNoProof = slots.filter((s) => s.meaning && ev[s.meaning] === "claimed");
  if (claimedNoProof.length) {
    r.findings.push({
      key: "claimed", level: "important",
      title: plural(claimedNoProof.length, "слот", "слота", "слотов") + " заявляет смысл, который нечем показать",
      risk: "Слова — самый неубедительный вид доказательства. Смысл объявлен, но за ним нет события, скрина или цифры.",
      items: Array.from(new Set(claimedNoProof.map((s) => meanByKey[s.meaning].name))).slice(0, 5),
      where: claimedNoProof.slice(0, 4).map((s) => s.date),
      basis: "confirmed", go: "evidence",
    });
  }

  const gapsBy: Record<string, number> = {};
  slots.filter((s) => !s.idea).forEach((s) => { gapsBy[s.rubric] = (gapsBy[s.rubric] || 0) + 1; });
  const gapKeys = Object.keys(gapsBy);
  if (gapKeys.length) {
    r.findings.push({
      key: "bank", level: "important",
      title: plural(slots.filter((s) => !s.idea).length, "слот", "слота", "слотов") + " без идеи",
      risk: "Пустой слот — это день, в который ты не понимаешь, что снимать. Затыкать чем попало нельзя: повтор внутри запуска считывается как «ему нечего сказать».",
      items: gapKeys.map((k) => rubByKey[k].name + " · " + plural(gapsBy[k], "слот", "слота", "слотов")),
      where: dates((s) => !s.idea), basis: "confirmed", go: "plan",
    });
  }

  const seen: Record<string, Slot> = {};
  const dupes: Array<[Slot, Slot]> = [];
  slots.forEach((s) => {
    if (!s.idea) return;
    if (seen[s.idea]) dupes.push([seen[s.idea], s]); else seen[s.idea] = s;
  });
  if (dupes.length) {
    r.findings.push({
      key: "dupe", level: "important", title: "Одна идея стоит в двух слотах",
      risk: "Повтор в пределах запуска аудитория считывает как «ему нечего сказать».",
      items: dupes.map((d) => "«" + d[0].idea + "» · " + fmtS(d[0].date) + " и " + fmtS(d[1].date)),
      where: dupes.map((d) => d[1].date), basis: "confirmed", go: "plan",
    });
  }

  const RD: Array<[string, string]> = [["program", "программа"], ["offer", "оффер и цена"],
    ["payment", "приём оплаты"], ["access", "выдача доступов"], ["support", "поддержка"]];
  const off = RD.filter((x) => !rd[x[0]]);
  r.ready = !off.length;
  if (off.length) {
    r.findings.push({
      key: "readiness", level: "critical",
      title: "Продукт не готов к продажам: " + off.map((x) => x[1]).join(", "),
      risk: "Окно открывается " + fmt(l.sales_open) + ". Если в этот день нельзя принять деньги и выдать доступ, весь прогрев уходит в ноль.",
      items: off.map((x) => x[1]), where: [l.sales_open], basis: "confirmed", go: "report",
    });
  }

  const openLines = lines.filter((x) =>
    !x.closes_on || !x.close_slot || (l.sales_close && diff(x.closes_on, l.sales_close) < 0));
  if (openLines.length) {
    r.findings.push({
      key: "lines", level: "critical",
      title: plural(openLines.length, "сюжетная линия", "сюжетные линии", "сюжетных линий") + " без раскрытия",
      risk: "Анонс без закрытия — сожжённое доверие. Люди помнят обещание дольше, чем кажется. Раскрытие считается закрытым только тогда, когда под него стоит конкретный пост.",
      items: openLines.map((x) => "«" + x.title + "» · анонс " + fmtS(x.announced_on) +
        (!x.closes_on ? " · раскрытие не назначено"
          : !x.close_slot ? " · раскрытие " + fmtS(x.closes_on) + " не стоит ни в одном слоте"
            : " · раскрытие " + fmtS(x.closes_on) + " — после закрытия продаж")),
      where: openLines.map((x) => x.announced_on), basis: "confirmed", go: "lines",
    });
  }

  r.findings.sort((a, b) => (a.level === b.level ? 0 : a.level === "critical" ? -1 : 1));
  r.critical = r.findings.filter((f) => f.level === "critical").length;
  return r;
}

/* ─── дефицит для оси: то, чего не видно в самой полосе ─── */

export interface Gap {
  key: string; stage: number; title: string; note: string;
  days: string[]; critical: boolean;
}

export function gapsFor(slots: Slot[], evidence: Record<string, EvidenceState>): Gap[] {
  const ev = evidence || {}, out: Gap[] = [];
  const byRub: Record<string, { days: string[]; reason?: string | null; stage: number }> = {};
  slots.filter((s) => !s.idea).forEach((s) => {
    const r = byRub[s.rubric] = byRub[s.rubric] || { days: [], reason: s.reason, stage: byKey[s.stage].n };
    if (r.days.indexOf(s.date) < 0) r.days.push(s.date);
  });
  Object.keys(byRub).forEach((k) => out.push({
    key: "r" + k, stage: byRub[k].stage, title: rubByKey[k].name,
    note: byRub[k].reason || "нет идей", days: byRub[k].days, critical: false,
  }));
  if (!slots.some((s) => s.meaning === "q3_bridge" && s.markup_origin === "human")) {
    const where = slots.filter((s) => s.stage === "soft" || s.stage === "active");
    out.push({
      key: "bridge", stage: 4, title: "Мостик: свои провалы", note: "не показан ни разу",
      days: Array.from(new Set(where.map((s) => s.date))).slice(0, 3), critical: true,
    });
  }
  const byMean: Record<string, { days: string[]; stage: number }> = {};
  slots.filter((s) => s.idea && ev[s.meaning] === "none").forEach((s) => {
    const m = byMean[s.meaning] = byMean[s.meaning] || { days: [], stage: byKey[s.stage].n };
    if (m.days.indexOf(s.date) < 0) m.days.push(s.date);
  });
  Object.keys(byMean).forEach((k) => out.push({
    key: "m" + k, stage: byMean[k].stage, title: meanByKey[k].name,
    note: "нечем доказать", days: byMean[k].days, critical: false,
  }));
  out.sort((a, b) => (b.critical ? 1 : 0) - (a.critical ? 1 : 0) || b.days.length - a.days.length);
  return out;
}

/* ─── сюжетные линии → конкретные слоты ─── */

/**
 * Линия закрыта, только когда под раскрытие стоит конкретный слот, а не дата:
 * дата в календаре ничего не обещает аудитории, пост обещает.
 */
export function linkLines(lines: StoryLine[], slots: Slot[]): StoryLine[] {
  lines.forEach((x) => {
    const pick = (date: string) => {
      if (!date) return null;
      const day = slots.filter((s) => s.date === date);
      const near = day.length ? day : slots.filter((s) => diff(date, s.date) >= 0 && diff(date, s.date) <= 2);
      return near.find((n) => n.platform === "telegram") || near[0] || null;
    };
    const a = pick(x.announced_on);
    if (a) { x.announce_slot = a.id; a.line_id = x.id; a.line_role = "announce"; }
    const c = pick(x.closes_on);
    if (c && c !== a) { x.close_slot = c.id; c.line_id = x.id; c.line_role = "close"; }
  });
  return lines;
}

/* ─── разбор: считается по фактическим отметкам ─── */

export interface Retro {
  published: number; planned: number; missed: number; rated: number;
  rubrics: Array<[string, number, number]>;
  stages: Array<[string, number, number, number, number]>;
  worked: Array<[string, number, number]>;
}

export function retro(slots: Slot[], evidence: Record<string, EvidenceState>): Retro {
  const pub = slots.filter((s) => s.status === "published");
  const withR = pub.filter((s) => s.reaction);
  const score = (list: Slot[]) =>
    list.length ? Math.round(((list.reduce((a, s) => a + (s.reaction || 0), 0) / list.length) - 1) / 2 * 100) : 0;
  const rubrics = Object.keys(rubByKey)
    .map((k) => ({ k, list: withR.filter((s) => s.rubric === k) }))
    .filter((r) => r.list.length)
    .map((r) => [r.k, score(r.list), r.list.length] as [string, number, number])
    .sort((a, b) => b[1] - a[1]);
  const stages = STAGES.filter((st) => slots.some((s) => s.stage === st.key)).map((st) => {
    const list = withR.filter((s) => s.stage === st.key);
    return [st.key, score(list), list.length,
      pub.filter((s) => s.stage === st.key).length,
      slots.filter((s) => s.stage === st.key).length] as [string, number, number, number, number];
  });
  const worked = MEANINGS.map((m) => ({ m, list: withR.filter((s) => s.meaning === m.key) }))
    .filter((x) => x.list.length && evidence[x.m.key] === "proof")
    .map((x) => [x.m.key, score(x.list), x.list.length] as [string, number, number])
    .sort((a, b) => b[1] - a[1]).slice(0, 4);
  return {
    published: pub.length, planned: slots.length,
    missed: slots.filter((s) => s.status === "missed").length,
    rubrics, stages, worked, rated: withR.length,
  };
}

/** Пять ворот готовности продукта. Проверка контента их не видит. */
export const READINESS: Array<[string, string]> = [
  ["program", "Программа собрана"],
  ["offer", "Оффер и цена зафиксированы"],
  ["payment", "Приём оплаты подключён"],
  ["access", "Выдача доступов проверена"],
  ["support", "Поддержка на поток назначена"],
];

/** Стартовое состояние фактуры: ни один смысл не подтверждён. */
export const evidenceSeed = (): Record<string, EvidenceState> => {
  const e: Record<string, EvidenceState> = {};
  MEANINGS.forEach((m) => { e[m.key] = "none"; });
  return e;
};

/** Режим запуска: план не развёрнут · идёт · закрыт. */
export const launchMode = (l: Launch): "draft" | "run" | "closed" =>
  !l.unrolled_on ? "draft" : l.status === "closed" ? "closed" : "run";

export const LC_STATUS: Record<string, [string, string]> = {
  draft: ["черновик", ""],
  warm: ["прогрев идёт", "or"],
  sales: ["окно продаж", "green"],
  closed: ["закрыт", ""],
};
