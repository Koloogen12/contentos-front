"use client";

/**
 * THE DRAFT landing — примитивы «настоящего интерфейса» продукта.
 * Порт `prototype/product-ui.jsx`. Вся стилизация — классы `.pui*` из
 * `app/landing.css` (в прототипе они уже были заскоупены под `.pui`).
 *
 * Это декоративные мокапы: живого состояния и запросов здесь нет, только
 * разметка, повторяющая продукт 1:1.
 */

import * as React from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  LayoutTemplate,
  Mic,
  Plus,
  Search,
  Sparkles,
  ArrowRight,
} from "lucide-react";

/* ---- бренд-иконки: в lucide нет залитых Telegram/X, взяты из прототипа ---- */

export function TelegramIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21.05 3.45L2.5 10.6c-.6.23-.59.55-.1.7l4.76 1.49 1.85 5.65c.22.62.34.85.7.85.27 0 .42-.13.6-.31l2.32-2.25 4.83 3.56c.88.49 1.5.24 1.72-.82l3.12-14.7c.32-1.3-.5-1.88-1.34-1.5l-.07.18z" />
    </svg>
  );
}

export function XIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817-5.97 6.817H1.673l7.73-8.835L1.254 2.25h6.83l4.713 6.231 5.447-6.231zm-1.16 17.52h1.834L7.084 4.126H5.117l11.967 15.644z" />
    </svg>
  );
}

/* ---- оболочка приложения: сайдбар + топбар ---- */

const NAV: [string, React.ReactNode][] = [
  ["Канвасы", <LayoutGrid size={13} key="c" />],
  ["Идеи", <Sparkles size={13} key="i" />],
  ["База знаний", <BookOpen size={13} key="k" />],
  ["План", <LayoutTemplate size={13} key="p" />],
  ["Голос", <Mic size={13} key="v" />],
];

export interface PuiSeg {
  items: string[];
  on: number;
}

export function PuiWindow({
  crumb,
  title,
  sub,
  tabs,
  chips,
  seg,
  sidebar = true,
  active = "Канвасы",
  children,
}: {
  crumb?: [string, string] | null;
  title?: string;
  sub?: string;
  tabs?: string[];
  chips?: React.ReactNode;
  seg?: PuiSeg;
  sidebar?: boolean;
  active?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={sidebar ? "pui-win" : "pui-win nosb"}>
      {sidebar && (
        <div className="pui-sb">
          <div className="pui-logo">
            THE DRAFT
            <ChevronLeft size={12} />
          </div>
          {NAV.map(([n, ic]) => (
            <div className="pui-item" key={n} data-on={active === n ? "1" : "0"}>
              {ic}
              {n}
            </div>
          ))}
          <div className="pui-lbl">
            проекты
            <Plus size={11} />
          </div>
          <div className="pui-item" data-on="1">
            <LayoutGrid size={12} />
            Все
          </div>
          <div className="pui-item">
            <i style={{ background: "#6B4EE6" }} />
            THE MONO
          </div>
          <div className="pui-item">
            <i style={{ background: "#0E5B55" }} />
            Kochnefff
          </div>
        </div>
      )}
      <div className="pui-main">
        <div className="pui-top">
          {crumb ? (
            <>
              {crumb[0]}
              <ChevronRight size={11} />
              <b>{crumb[1]}</b>
            </>
          ) : (
            <>
              danil&apos;s workspace
              <span className="pui-chip">Автор · 41/60 постов</span>
            </>
          )}
          <div className="pui-search">
            <Search size={11} />
            Идеи, канвасы, посты, действия<kbd>⌘K</kbd>
          </div>
          <div className="pui-me">
            <span className="pui-av">D</span>
            <span>Данил К.</span>
            <ChevronDown size={11} />
          </div>
        </div>
        {title && (
          <div className="pui-hd">
            <div style={{ minWidth: 0 }}>
              <h4>{title}</h4>
              {sub && <p>{sub}</p>}
            </div>
            {seg && (
              <div className="pui-seg" style={{ marginLeft: "auto" }}>
                {seg.items.map((s, i) => (
                  <span key={s} data-on={i === seg.on ? "1" : "0"}>
                    {s}
                  </span>
                ))}
              </div>
            )}
            {chips}
          </div>
        )}
        {tabs && (
          <div className="pui-tabs">
            {tabs.map((t, i) => (
              <div key={t} data-on={i === 1 ? "1" : "0"}>
                {i === 1 && <LayoutGrid size={10} />}
                {t}
              </div>
            ))}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

/** Индикатор «потенциала» идеи: 4 деления + число. */
export function PuiPot({ v }: { v: number }) {
  const on = Math.round(v / 5);
  return (
    <span className="pui-pot">
      <span className="bars">
        {[0, 1, 2, 3].map((i) => (
          <i key={i} data-on={i < on ? "1" : "0"} />
        ))}
      </span>
      {v}
    </span>
  );
}

export function PuiNode({
  tone = "or",
  icon,
  title,
  meta,
  children,
  footer,
  ask,
  sel,
  style,
  ports,
  label,
  labelIcon,
  tabs,
  status,
  head,
}: {
  tone?: "or" | "teal" | "violet" | "gray";
  icon?: React.ReactNode;
  title?: string;
  meta?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  ask?: string;
  sel?: boolean;
  style?: React.CSSProperties;
  /** "out" — только выходной порт, "in" — только входной, "none" — без портов */
  ports?: "in" | "out" | "none";
  label?: string;
  labelIcon?: React.ReactNode;
  tabs?: [React.ReactNode, string][];
  status?: number;
  head?: React.ReactNode;
}) {
  return (
    <div style={style}>
      {label && (
        <div className="pui-nlabel">
          {labelIcon}
          {label}
        </div>
      )}
      <div className="pui-node" data-sel={sel ? "1" : "0"}>
        <div className="pui-node-hd">
          {tabs ? (
            <div className="pui-ntabs">
              {tabs.map(([ic, t], i) => (
                <span className="pui-ntab" key={t} data-on={i === (status ?? 0) ? "1" : "0"}>
                  {ic}
                  {t}
                </span>
              ))}
            </div>
          ) : (
            head || (
              <>
                <span className={"pui-ic " + tone}>{icon}</span>
                {title}
                {meta && <span className="pui-meta">{meta}</span>}
              </>
            )
          )}
          {tabs && <span className="pui-dot" />}
        </div>
        <div className="pui-b">{children}</div>
        {footer && <div className="pui-f">{footer}</div>}
        {ask && (
          <div className="pui-ask">
            <span>{ask}</span>
            <i>
              <ArrowRight size={11} />
            </i>
          </div>
        )}
        {ports !== "out" && ports !== "none" && (
          <span className="pui-port in">
            <ArrowRight size={9} />
          </span>
        )}
        {ports !== "in" && ports !== "none" && (
          <span className="pui-port out">
            <ArrowRight size={9} />
          </span>
        )}
      </div>
    </div>
  );
}
