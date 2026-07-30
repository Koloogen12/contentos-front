"use client";

/**
 * Слот под реальный ассет (фото людей, фото автора, слайды карусели).
 *
 * В прототипе на этих местах стоял служебный `<image-slot>` из дизайн-среды —
 * он в продакшн не переносится. Здесь: если ассет уже положили в
 * `public/landing/<asset>.webp` и прописали в `LANDING_ASSETS` — рендерим
 * настоящий `<img>`; если нет — аккуратный подписанный плейсхолдер, который
 * выглядит намеренным, а не сломанным, и говорит, что сюда положить.
 *
 * Так блок остаётся на странице (интерфейс и композицию видно), но никто не
 * принимает заготовку за готовый контент.
 */

import * as React from "react";
import { LANDING_ASSETS } from "@/lib/landing/assets";

export function LandingSlot({
  asset,
  label,
  note,
  round,
}: {
  /** Ключ в LANDING_ASSETS. */
  asset: string;
  /** Что это за картинка — видно в плейсхолдере. */
  label: string;
  /** Подсказка для того, кто будет вставлять ассет. */
  note?: string;
  round?: boolean;
}) {
  const src = LANDING_ASSETS[asset];
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- ассеты лежат локально,
      // размеры задаёт контейнер слота; next/image здесь только усложнил бы вёрстку
      <img
        src={src}
        alt={label}
        loading="lazy"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          borderRadius: round ? "999px" : undefined,
        }}
      />
    );
  }
  return (
    <span
      title={note ? `${label} — ${note}` : label}
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        background: "rgba(23,23,23,.04)",
        border: "1px dashed rgba(23,23,23,.16)",
        borderRadius: round ? "999px" : 10,
        font: "500 9.5px/1.3 ui-monospace, monospace",
        color: "#9A9A97",
        textAlign: "center",
        padding: 4,
        overflow: "hidden",
      }}
    >
      {label}
    </span>
  );
}
