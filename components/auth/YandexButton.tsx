"use client";

import { API_BASE_URL, yandexStartUrl } from "@/lib/api";

/**
 * Вход через Яндекс.
 *
 * Обычная ссылка, а не кнопка с fetch: OAuth начинается с полноценного
 * перехода браузера на oauth.yandex.ru, из XHR это сделать нельзя.
 *
 * Знак нарисован здесь примитивом — «Я» в красном круге. Это заглушка под
 * официальный ассет Яндекса: их гайдлайн требует конкретный логотип, и когда
 * он появится в public/, надо заменить (см. TODO ниже).
 */

function YandexMark() {
  return (
    <span
      aria-hidden
      className="grid h-4 w-4 flex-none place-items-center rounded-full bg-[#FC3F1D] text-[11px] font-bold leading-none text-white"
    >
      Я
    </span>
  );
}

export function YandexButton({
  next,
  label = "Войти через Яндекс",
}: {
  next?: string | null;
  label?: string;
}) {
  // Если бэкенд поднят на другом хосте, ссылка всё равно должна вести на него,
  // а не на текущий origin — иначе OAuth-редирект уйдёт в никуда.
  const href = yandexStartUrl(next);
  const disabled = !API_BASE_URL;

  return (
    <a
      href={disabled ? undefined : href}
      className="flex h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-border bg-card text-sm font-medium text-foreground transition hover:border-border/80 hover:bg-accent"
    >
      <YandexMark />
      {label}
    </a>
  );
}

export function AuthDivider({ text = "или" }: { text?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-border" />
      <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
        {text}
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
