"use client";

/**
 * THE DRAFT landing — навбар и футер. Порт `LightNav` / `FooterLight`.
 *
 * Отличие от прототипа (осознанное): в прототипе ссылки навигации вели на
 * `#platforms` и `#numbers`, которых в v2 больше нет — это были мёртвые
 * анкоры из прошлой версии страницы. Переведены на реально существующие
 * секции. Переключатель языка не переносим: страница только RU (см. README).
 */

import * as React from "react";
import Link from "next/link";
import { ArrowRight, User } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { ctaHref } from "@/lib/landing/cta";
import { track } from "@/lib/landing/analytics";

const NAV_LINKS: [string, string, boolean][] = [
  ["Как работает", "#how", false],
  ["Примеры", "#proof", true],
  ["Что получишь", "#features", false],
  ["Тарифы", "#pricing", false],
];

export function LandingNav() {
  return (
    <div className="nav">
      <div className="nav-in">
        <a className="logo" href="#top">
          {/* Тот же знак, что в кабинете — марка должна быть одна.
              Раньше здесь был квадрат с иконкой пера. */}
          <BrandMark height={24} />
          THE DRAFT
        </a>
        <div className="nav-links">
          {NAV_LINKS.map(([label, href, isNew]) => (
            <a href={href} key={href}>
              {label}
              {isNew && <span className="tag-new">NEW</span>}
            </a>
          ))}
        </div>
        <div className="nav-right">
          <Link
            className="btn btn-or btn-sm"
            href={ctaHref()}
            onClick={() => track("nav_cta_click")}
          >
            Попробовать
          </Link>
          <Link
            className="iconbtn"
            href="/login"
            title="Войти"
            aria-label="Войти"
            onClick={() => track("nav_login_click")}
          >
            <User size={17} />
          </Link>
        </div>
      </div>
    </div>
  );
}

const FOOTER_COLS: [string, string[]][] = [
  [
    "продукт",
    ["Канвас", "Модель голоса", "Оценка потенциала", "Контент-план", "Публикация в Telegram"],
  ],
  ["материалы", ["Гайды", "Changelog", "Блог", "FAQ"]],
  ["компания", ["О нас", "Контакты", "Политика данных", "Условия"]],
];

export function LandingFooter() {
  return (
    <div className="wrap">
      <div className="foot">
        <span className="plus pl-tl">+</span>
        <span className="plus pl-tr">+</span>
        <div className="rail top" />
        <div className="foot-in">
          <div>
            <div className="foot-logo">
              <BrandMark height={20} />
              THE DRAFT
            </div>
            <h3>Не пропусти следующий апдейт</h3>
            <form
              className="mailrow"
              onSubmit={(e) => {
                e.preventDefault();
                // TODO: подключить реальную подписку (эндпоинт рассылки).
                track("footer_subscribe_submit");
              }}
            >
              <input placeholder="Твой email" type="email" aria-label="Email" />
              <button type="submit" aria-label="Подписаться">
                <ArrowRight size={16} />
              </button>
            </form>
            <div className="foot-note">
              Первым узнаешь о новых скиллах и платформах. Отписаться можно в любой
              момент.
            </div>
          </div>
          {FOOTER_COLS.map(([title, links]) => (
            <div className="foot-col" key={title}>
              <b>{title}</b>
              {links.map((l) => (
                <a href="#top" key={l}>
                  {l}
                </a>
              ))}
            </div>
          ))}
        </div>
        <div className="foot-bot">
          <span>THE DRAFT 2026© · draft.neurin.tech</span>
          <div className="links">
            <a href="#top">Политика данных</a>
            <a href="#top">Условия</a>
            <a href="#top">Telegram</a>
          </div>
        </div>
        <div className="foot-ghost" aria-hidden="true">
          THE DRAFT
        </div>
      </div>
    </div>
  );
}

/* ---- мелкие общие элементы ---- */

export function SecHd({
  title,
  sub,
  right,
}: {
  title: string;
  sub?: string;
  right?: string;
}) {
  return (
    <div className="sec-split">
      <h2>
        {title}
        {sub && (
          <>
            <br />
            <span className="gray">{sub}</span>
          </>
        )}
      </h2>
      {right && <div className="lead">{right}</div>}
    </div>
  );
}

export function PillLabel({ text }: { text: string }) {
  return (
    <div className="pill-lbl">
      <span className="pill-dot">
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" />
        </svg>
      </span>
      {text}
    </div>
  );
}

export function XRow() {
  return (
    <div className="xrow" aria-hidden="true">
      <span>×</span>
      <span>×</span>
      <span>×</span>
      <span>×</span>
    </div>
  );
}
