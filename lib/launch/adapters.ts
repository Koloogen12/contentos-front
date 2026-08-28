/**
 * Перевод между формой бэкенда и формой модуля.
 *
 * Две формы существуют не по недосмотру. Бэкенд говорит на языке хранения
 * (`scheduled_date`, `launch_stage` числом, `talking_point_text`), модуль — на
 * языке методологии (`date`, `stage` ключом этапа, `idea`). Свести их в одну
 * значило бы либо тащить в интерфейс имена колонок, либо переименовывать
 * колонки под вёрстку. Перевод в одном месте дешевле обоих вариантов.
 */

import {
  type EvidenceState, type Launch, type PlanResult, type Slot, type StageKey,
  type StoryLine,
  MEANINGS, RUBRICS, STAGES, rubByKey,
} from "@/lib/launch/core";
import type { EvidenceRow, LaunchOut, LaunchSlot, StoryLine as ApiLine } from "@/lib/launches";

const STAGE_BY_NUM: Record<number, StageKey> = {};
STAGES.forEach((s) => { STAGE_BY_NUM[s.n] = s.key; });

/**
 * Статус слота. У бэкенда их шесть (общий контент-план), у запуска
 * осмысленны три: запланирован, вышел, не вышел. Остальное — черновиковые
 * состояния плана, и для ведения это «запланирован».
 */
function slotStatus(s: string): Slot["status"] {
  if (s === "published") return "published";
  if (s === "missed") return "missed";
  return "planned";
}

/**
 * Рубрика и смысл со страховкой.
 *
 * У слотов, созданных до миграции 0018, смысла могло не быть вовсе: тогда
 * рубрика лежала в колонке `meaning`, а смыслы — в массиве `checkpoints`,
 * который заполнялся не у всех. Интерфейс ищет смысл в справочнике и без
 * страховки падал бы на первом же открытии такого слота.
 *
 * Подставляется первый смысл того вопроса, к которому относится рубрика, —
 * ровно то же правило, по которому смысл раздаёт планировщик. Это дефолт, а
 * не выдумка: он ничего не «подтверждает», разметка остаётся неподтверждённой.
 */
function markup(row: LaunchSlot): { rubric: string; meaning: string } {
  const rubric = row.rubric && rubByKey[row.rubric] ? row.rubric : RUBRICS[0].key;
  if (row.meaning && MEANINGS.some((m) => m.key === row.meaning)) {
    return { rubric, meaning: row.meaning };
  }
  const q = rubByKey[rubric].q;
  return { rubric, meaning: MEANINGS.find((m) => m.q === q)!.key };
}

export function toSlot(row: LaunchSlot): Slot {
  const { rubric, meaning } = markup(row);
  return {
    id: row.id,
    date: row.scheduled_date || "",
    platform: row.platform as Slot["platform"],
    stage: STAGE_BY_NUM[row.launch_stage ?? 0] || "soft",
    rubric,
    meaning,
    trigger_key: row.trigger_key && row.trigger_key.length
      ? row.trigger_key
      : rubByKey[rubric].lever,
    idea: row.talking_point_text,
    // Причина хранится на сервере дословно; `notes` — запасной путь для
    // слотов, созданных до миграции 0018.
    reason: row.empty_reason ?? row.notes,
    markup_origin: (row.markup_origin as Slot["markup_origin"]) || "rule",
    is_pinned: row.is_pinned,
    is_last_day: row.is_last_day,
    version: row.version,
    status: slotStatus(row.status),
    draft: row.draft_state,
    chars: row.chars ?? 0,
    text: row.full_text || undefined,
    reaction: row.reaction,
    line_id: row.story_line_id,
    line_role: row.line_role,
  };
}

export function toLine(row: ApiLine): StoryLine {
  return {
    id: row.id,
    title: row.title,
    payoff: row.payoff || "",
    announced_on: row.announced_on || "",
    closes_on: row.closes_on || "",
    announce_slot_id: row.announce_slot_id,
    close_slot_id: row.close_slot_id,
    // Имена, под которыми линию читают экраны модуля.
    announce_slot: row.announce_slot_id,
    close_slot: row.close_slot_id,
  } as StoryLine;
}

export function toEvidence(rows: EvidenceRow[]): Record<string, EvidenceState> {
  const out: Record<string, EvidenceState> = {};
  rows.forEach((r) => { out[r.meaning_key] = r.state; });
  return out;
}

export function toProofs(rows: EvidenceRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  rows.forEach((r) => { if (r.proof_note) out[r.meaning_key] = r.proof_note; });
  return out;
}

/**
 * Запуск бэкенда → запуск модуля.
 *
 * `status` берётся из посчитанного сервером `mode`, а не выводится здесь
 * заново: у бэкенда свой набор состояний жизненного цикла, и смешивать их с
 * режимом прогрева — верный способ получить два разных ответа на один вопрос.
 */
export function toLaunch(l: LaunchOut): Launch {
  return {
    id: l.id,
    name: l.name,
    product: l.product_name || "—",
    price: l.price || "—",
    sales_open: l.sales_open,
    sales_close: l.sales_close || "",
    key_event_date: l.key_event_date || "",
    key_event_type: l.key_event_type || "",
    launch_number: l.launch_number,
    // `dense` и `heavy` — одно и то же; бэкенд принимает оба, интерфейс
    // говорит `dense`.
    intensity: l.intensity === "heavy" ? "dense" : l.intensity,
    durations: (l.durations as Record<string, number>) || {},
    audience: l.audience || "",
    collect: l.collect || "заявка через бота",
    waitlist_goal: l.waitlist_goal ?? 0,
    waitlist: l.waitlist ?? 0,
    paid: l.paid ?? 0,
    paid_goal: l.paid_goal ?? l.waitlist_goal ?? 0,
    unrolled_on: l.unrolled_on || "",
    status: l.mode,
    readiness: l.readiness || {},
    archived: !!l.archived_at,
  };
}

/** Интенсивность модуля → та, что понимает бэкенд. */
export const toApiIntensity = (v: string): "light" | "normal" | "heavy" =>
  (v === "dense" ? "heavy" : v) as "light" | "normal" | "heavy";

/**
 * План сервера → план модуля.
 *
 * Окна сервер отдаёт с номером этапа и заголовком, модулю нужны только ключ
 * и границы: остальное он и так знает из справочника, а дублирование дало бы
 * два источника правды для одного и того же названия.
 */
export function toPlan(res: {
  windows: Array<{ key: string; start: string; end: string; days: number }>;
  compressed: string[];
  dropped: string[];
}): PlanResult {
  return {
    windows: res.windows.map((w) => ({
      key: w.key as StageKey, from: w.start, to: w.end, days: w.days,
    })),
    compressed: [],
    dropped: [],
    notes: [...res.compressed, ...res.dropped],
    error: null,
    avail: 0,
    note: null,
  };
}
