"use client";

/**
 * Потенциал идеи — четыре деления вместо голого «Score 17/20».
 *
 * Портировано из прототипа (prime2: .pot). Смысл замены в том, что число
 * от 1 до 20 читается как точная оценка, которой на деле нет: модель
 * ставит его приблизительно. Четыре деления показывают порядок величины
 * честнее, а само число остаётся рядом для тех, кто им пользуется.
 */

import * as React from "react";

export function Potential({ value }: { value: number }) {
  const filled = Math.round(value / 5);
  return (
    <span className="pot tt" data-tt={`Потенциал ${value} из 20`}>
      <span className="bars">
        {[0, 1, 2, 3].map((i) => (
          <i key={i} data-on={i < filled ? "1" : "0"} />
        ))}
      </span>
      {value}
    </span>
  );
}
