"use client";

/**
 * Общий набор пропсов, который прототип передавал во все табы объектом `common`.
 * Вынесен в тип, чтобы вкладки не расходились по сигнатурам.
 */

import { toast as sonner } from "sonner";

import type {
  BankIdea, EvidenceState, Launch, PlanResult, Report, Slot, StoryLine,
} from "@/lib/launch/core";

export interface LaunchState {
  plan: PlanResult | null;
  slots: Slot[];
  evidence: Record<string, EvidenceState>;
  lines: StoryLine[];
  readiness: Record<string, boolean>;
  tasks: Record<string, boolean>;
  /** Банк идей по рубрикам — приходит из раздела «Идеи». */
  bank: Record<string, BankIdea[]>;
  /** Что приложено под смысл. Ключ — смысл, значение — описание пруфа. */
  proofs: Record<string, string>;
}

export type LaunchTab = "hq" | "plan" | "evidence" | "retro";

export interface LaunchCtx {
  launch: Launch;
  data: LaunchState;
  report: Report;
  patch: (fn: (d: LaunchState) => LaunchState) => void;
  setEvidence: (key: string, st: EvidenceState) => void;
  setSlot: (id: string, upd: Partial<Slot>) => void;
  confirmStage: (stage: string) => void;
  goDay: (date: string, tab?: LaunchTab) => void;
  focusDate: string | null;
  setFocusDate: (d: string | null) => void;
  openSlot: (id: string | null) => void;
  slotId: string | null;
  toast: (msg: string, undo?: () => void) => void;
  setLtab: (t: LaunchTab) => void;
  rebuild: (durations: Record<string, number>) => void;
  moveSlot: (id: string, date: string) => void;
  addSlot: (date: string, platform: string) => void;
  delSlot: (id: string) => void;
  setLineRole: (slotId: string, lineId: string, role: "announce" | "close" | null) => void;
  toCanvas: (s: Slot) => void;
  setScreen?: (s: string) => void;
}

/**
 * Тост с откатом. Прототип принимал вторым аргументом функцию отмены —
 * у sonner это `action`, поэтому обёртка, а не прямой вызов.
 */
export function launchToast(msg: string, undo?: () => void) {
  if (undo) sonner.success(msg, { action: { label: "Отменить", onClick: undo } });
  else sonner.success(msg);
}
