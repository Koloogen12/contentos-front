"use client";

/**
 * Общие примитивы нод канваса — вид взят из прототипа THE DRAFT (prime2.css).
 *
 * Раньше каждая нода объявляла свой PORT_STYLE_LEFT/RIGHT, и все четыре копии
 * разошлись: 26px вместо 18px и тень rgba(0,0,0,.4) — она рассчитана на тёмное
 * полотно и на светлой бумаге читается как грязное пятно. Теперь источник один.
 *
 * Геометрию порта (18px, кружок, вынос на половину за край) задаёт класс
 * `.port` из workspace.css. Здесь только то, что React Flow ставит инлайном
 * и потому перебивает CSS: сброс его собственных width/height/transform.
 */

import type * as React from "react";
import type { NodeStatus } from "@/lib/types";
import { t } from "@/lib/i18n";

/** Цвет точки статуса. Совпадает с палитрой прототипа (.nstatus). */
export const NODE_STATUS_COLOR: Record<NodeStatus, string> = {
  idle: "var(--p-ink-3)",
  running: "var(--p-or)",
  done: "var(--p-green)",
  error: "var(--p-red)",
};

export const NODE_STATUS_LABEL: Record<NodeStatus, string> = {
  idle: t.nodeStatus.idle,
  running: t.nodeStatus.running,
  done: t.nodeStatus.done,
  error: t.nodeStatus.error,
};

const PORT_BASE: React.CSSProperties = {
  width: 18,
  height: 18,
  minWidth: 18,
  minHeight: 18,
  borderRadius: 999,
  background: "var(--p-card)",
  border: "1px solid var(--p-line)",
  boxShadow: "0 3px 8px -5px rgba(23,23,23,.5)",
  color: "var(--p-or)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 3,
};

/** Входной порт — слева, вынесен на половину диаметра за край карточки. */
export const PORT_STYLE_LEFT: React.CSSProperties = { ...PORT_BASE, left: -9 };

/** Выходной порт — справа. */
export const PORT_STYLE_RIGHT: React.CSSProperties = { ...PORT_BASE, right: -9 };

/**
 * Служебный хендл: нода принимает связь, но точку рисовать не надо
 * (например, у Источника вход существует только для валидации).
 */
export const INVISIBLE_HANDLE: React.CSSProperties = {
  width: 1,
  height: 1,
  minWidth: 1,
  minHeight: 1,
  opacity: 0,
  border: 0,
  background: "transparent",
  pointerEvents: "none",
};
