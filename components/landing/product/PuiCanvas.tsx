"use client";

/**
 * THE DRAFT landing — анимированный канвас в hero. Порт `PuiCanvas` из
 * `prototype/product-ui.jsx` с тремя обязательными правками из хендоффа:
 *
 *  1. `requestAnimationFrame` вместо `setInterval(40)`, состояние коммитится
 *     не чаще ~40 мс — кадр тот же, но нет 60 ререндеров в секунду.
 *  2. `prefers-reduced-motion: reduce` → сразу финальное состояние, без цикла.
 *  3. `IntersectionObserver` → цикл не крутится, когда канвас вне вьюпорта.
 *
 * Кабели считаются от реальных координат нод (getBoundingClientRect) после
 * каждого layout — как в прототипе, иначе они разъезжаются на ресайзе.
 */

import * as React from "react";
import {
  Check,
  Copy,
  FileAudio,
  Hand,
  Link as LinkIcon,
  Maximize2,
  MessageCircle,
  MousePointer2,
  PenLine,
  Plus,
  Send,
  Sparkles,
  StickyNote,
  Type,
  Youtube,
  ZoomIn,
  ArrowUpRight,
  Zap,
} from "lucide-react";
import { PuiNode, PuiPot } from "./PuiPrimitives";

/** Таймлайн из прототипа (мс). Менять только вместе с дизайном. */
const PTL = {
  src: 300,
  e1: 1050,
  ext: 1725,
  p1: 2250,
  p2: 2625,
  p3: 3000,
  sel: 4050,
  e2: 4725,
  fmt: 5400,
  type: 5925,
  copy: 12900,
  end: 16500,
} as const;

const CHAR_MS = 12;
const COMMIT_MS = 40;

const POINTS: [string, number][] = [
  ["Если ты всё ещё всё контролируешь — ты растёшь слишком медленно", 18],
  ["Мы саботируем не blitzscaling — мы саботируем себя", 18],
  ["Я продаю раньше, чем продукт готов", 17],
];

const POST =
  "Я продаю раньше, чем продукт готов. И это не риск, а способ не строить в пустоту.\n\nНикаких «доделаем и покажем». Собираю деньги, пока продукт ещё не достроен — так я тестирую спрос, а не свои фантазии о рынке.";

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Кубическая кривая между портами двух нод — горизонтальная или вертикальная. */
function link(p: Box | null, q: Box | null): string {
  if (!p || !q) return "";
  if (q.x > p.x + p.w + 8) {
    const x1 = p.x + p.w;
    const y1 = p.y + p.h / 2;
    const x2 = q.x;
    const y2 = q.y + q.h / 2;
    const dx = Math.max(22, (x2 - x1) * 0.55);
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  }
  const x1 = p.x + Math.min(p.w * 0.4, 70);
  const y1 = p.y + p.h;
  const x2 = q.x + Math.min(q.w * 0.22, 55);
  const y2 = q.y;
  const dy = Math.max(16, (y2 - y1) * 0.6);
  return `M ${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`;
}

export function PuiCanvas() {
  const wrap = React.useRef<HTMLDivElement | null>(null);
  const nodeA = React.useRef<HTMLDivElement | null>(null);
  const nodeB = React.useRef<HTMLDivElement | null>(null);
  const nodeC = React.useRef<HTMLDivElement | null>(null);

  const [t, setT] = React.useState(0);
  const [runKey, setRunKey] = React.useState(0);
  const [paths, setPaths] = React.useState<[string, string]>(["", ""]);
  const [narrow, setNarrow] = React.useState(false);

  /* ---- раскладка нод: на узких экранах вертикально ---- */
  React.useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 760);
    onResize();
    let id: number | undefined;
    const debounced = () => {
      window.clearTimeout(id);
      id = window.setTimeout(onResize, 150);
    };
    window.addEventListener("resize", debounced);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("resize", debounced);
    };
  }, []);

  /* ---- кабели от реальных координат нод ---- */
  const measure = React.useCallback(() => {
    const w = wrap.current;
    if (!w) return;
    const wb = w.getBoundingClientRect();
    const box = (r: React.RefObject<HTMLDivElement | null>): Box | null => {
      if (!r.current) return null;
      const x = r.current.getBoundingClientRect();
      return { x: x.left - wb.left, y: x.top - wb.top, w: x.width, h: x.height };
    };
    setPaths([link(box(nodeA), box(nodeB)), link(box(nodeB), box(nodeC))]);
  }, []);

  React.useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (wrap.current) ro.observe(wrap.current);
    const id = window.setTimeout(measure, 60);
    return () => {
      ro.disconnect();
      window.clearTimeout(id);
    };
  }, [measure, narrow]);

  /* ---- таймлайн: rAF, пауза вне вьюпорта, respect reduced-motion ---- */
  React.useEffect(() => {
    const reduce =
      typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setT(PTL.end);
      return;
    }

    let raf = 0;
    let start: number | null = null;
    let lastCommit = 0;
    let visible = true;
    let pausedAt = 0;

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (!visible) {
          // запомнить прогресс и остановить кадры
          pausedAt = start === null ? 0 : performance.now() - start;
          start = null;
        }
      },
      { threshold: 0.15 },
    );
    if (wrap.current) io.observe(wrap.current);

    const tick = (now: number) => {
      if (visible) {
        if (start === null) start = now - pausedAt;
        const elapsed = now - start;
        if (elapsed - lastCommit >= COMMIT_MS || elapsed >= PTL.end) {
          lastCommit = elapsed;
          setT(elapsed > PTL.end ? PTL.end : elapsed);
        }
        if (elapsed >= PTL.end) return; // цикл завершён, ждём реплей
      }
      raf = requestAnimationFrame(tick);
    };

    setT(0);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [runKey]);

  const on = (k: keyof typeof PTL) => t >= PTL[k];
  const chars = Math.max(0, Math.floor((t - PTL.type) / CHAR_MS));
  const typed = POST.slice(0, chars);
  const typing = t >= PTL.type && chars < POST.length;
  const done = chars >= POST.length;
  const show = (k: keyof typeof PTL): React.CSSProperties => ({
    opacity: on(k) ? 1 : 0,
    transform: on(k) ? "none" : "translateY(8px)",
    transition: "opacity .4s,transform .4s",
  });

  const pos: React.CSSProperties[] = narrow
    ? [
        { left: "4%", top: 14, width: "90%" },
        { left: "7%", top: 168, width: "90%" },
        { left: "3%", top: 366, width: "93%" },
      ]
    : [
        { left: "3%", top: 14, width: "42%" },
        { left: "31%", top: 140, width: "54%" },
        { left: "4%", top: 300, width: "58%" },
      ];

  return (
    <div className="pui-canvas" ref={wrap}>
      <svg className="pui-edges" aria-hidden="true">
        <path
          pathLength="1"
          strokeDasharray="1"
          strokeDashoffset={on("e1") ? 0 : 1}
          style={{ transition: "stroke-dashoffset .7s ease" }}
          d={paths[0]}
        />
        <path
          pathLength="1"
          strokeDasharray="1"
          strokeDashoffset={on("e2") ? 0 : 1}
          style={{ transition: "stroke-dashoffset .7s ease" }}
          d={paths[1]}
        />
      </svg>

      <div ref={nodeA} style={{ position: "absolute", ...pos[0], ...show("src") }}>
        <PuiNode
          ports="out"
          label="Источник"
          labelIcon={<FileAudio size={10} />}
          tabs={[
            [<Type size={9} key="t" />, "Текст"],
            [<LinkIcon size={9} key="l" />, "URL"],
            [<Youtube size={9} key="y" />, "YouTube"],
            [<FileAudio size={9} key="f" />, "Файл"],
          ]}
          status={2}
        >
          <div className="pui-quote">
            Лекс Фридман: как строить продукты, которые покупают. Запись 1:23:00 —
            расшифрована, 34 тезиса найдено.
          </div>
        </PuiNode>
      </div>

      <div ref={nodeB} style={{ position: "absolute", ...pos[1], ...show("ext") }}>
        <PuiNode
          tone="or"
          sel={t >= PTL.ext && t < PTL.fmt}
          label="Идеи"
          labelIcon={<Sparkles size={10} />}
          icon={<Sparkles size={11} />}
          title="Извлечение"
          meta="34 идеи · с потенциалом"
        >
          {POINTS.map(([txt, s], i) => (
            <div
              className="pui-tp"
              key={txt}
              data-sel={i === 2 && on("sel") ? "1" : "0"}
              style={{
                opacity: on((["p1", "p2", "p3"] as const)[i]) ? 1 : 0,
                transition: "opacity .3s",
              }}
            >
              <PuiPot v={s} />
              <span className="pui-tp-t">{txt}</span>
            </div>
          ))}
        </PuiNode>
      </div>

      <div ref={nodeC} style={{ position: "absolute", ...pos[2], ...show("fmt") }}>
        <PuiNode
          sel={on("fmt")}
          ports="in"
          label="Контент"
          labelIcon={<PenLine size={10} />}
          icon={<Send size={11} />}
          title="Telegram"
          meta="твой голос · правок 12%"
          footer={
            done ? (
              <>
                <button className="pui-btn" type="button">
                  {on("copy") ? <Check size={10} /> : <Copy size={10} />}
                  {on("copy") ? "Скопировано" : "Скопировать"}
                </button>
                <button className="pui-btn ghost" type="button">
                  <Send size={10} />
                  Опубликовать
                </button>
                <span className="pui-meta">1 240 знаков</span>
              </>
            ) : null
          }
        >
          <div className="pui-txt ink" style={{ whiteSpace: "pre-wrap", minHeight: 52 }}>
            {typed}
            {typing && <span className="pui-caret" />}
          </div>
        </PuiNode>
      </div>

      <div className="pui-run">
        <button className="pui-btn or" type="button">
          <Zap size={11} />
          Запустить всё
        </button>
      </div>

      <div className="pui-toolbar">
        <button className="pui-ib" data-on="1" type="button" aria-label="Выбор">
          <MousePointer2 size={13} />
        </button>
        <button className="pui-ib" type="button" aria-label="Рука">
          <Hand size={13} />
        </button>
        {[
          <StickyNote size={13} key="n" />,
          <MessageCircle size={13} key="c" />,
          <Type size={13} key="t" />,
          <ArrowUpRight size={13} key="a" />,
          <Plus size={13} key="p" />,
        ].map((ic, i) => (
          <button className="pui-ib" key={i} type="button" tabIndex={-1} aria-hidden="true">
            {ic}
          </button>
        ))}
      </div>

      <div className="pui-zoomctl">
        <span className="ib">
          <Maximize2 size={12} />
        </span>
        <span className="ib">
          <ZoomIn size={12} />
        </span>
        <span className="pct">78%</span>
      </div>

      {/* мини-карта = кнопка реплея анимации */}
      <button
        className="pui-mini"
        onClick={() => setRunKey((k) => k + 1)}
        type="button"
        aria-label="Проиграть анимацию заново"
      >
        <i style={{ left: 12, top: 34, width: 26, height: 16 }} />
        <i style={{ left: 46, top: 40, width: 28, height: 20 }} />
        <i style={{ left: 84, top: 12, width: 30, height: 48 }} />
        <i className="vp" style={{ left: 6, top: 7, width: 104, height: 64 }} />
      </button>
    </div>
  );
}
