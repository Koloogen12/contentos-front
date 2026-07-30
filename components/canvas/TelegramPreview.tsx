"use client";

/**
 * TelegramPreview — render Telegram-HTML markup the way Telegram itself
 * would, so authors editing a Format-node see a real preview instead of
 * a wall of `<b>` and `<i>` tags.
 *
 * Why DOMParser instead of `dangerouslySetInnerHTML` + a sanitizer pass:
 *     1. DOMParser is browser-native, handles malformed HTML gracefully
 *        (auto-closes, drops nonsense), and works on text the AI may
 *        occasionally fumble.
 *     2. We walk the DOM ourselves and emit React elements ONLY for an
 *        explicit whitelist of tags — anything else (e.g. a hallucinated
 *        `<script>`, inline `style=`, `<img onerror=…>`, etc.) is dropped
 *        before ever touching the React tree. No need for an external
 *        sanitizer dependency.
 *     3. The Spoiler effect requires per-instance React state for the
 *        click-to-reveal interaction — using dangerouslySetInnerHTML
 *        would mean separate event-delegation glue.
 *
 * Tags supported (matches Telegram parse_mode=HTML):
 *     <b>, <strong>      → bold
 *     <i>, <em>          → italic
 *     <u>                → underline
 *     <s>, <strike>, <del> → strikethrough
 *     <code>             → inline monospace
 *     <pre>              → block monospace
 *     <blockquote>       → quote
 *     <tg-spoiler>       → spoiler (click-to-reveal)
 *     <a href=…>         → link (https/http only — javascript: dropped)
 *     <br>               → line break
 *
 * Anything else is unwrapped (children flow through). Text whitespace is
 * preserved with `whitespace-pre-wrap` on the outer container so paragraph
 * breaks survive the round-trip.
 */

import * as React from "react";
import { cn } from "@/lib/utils";


export function TelegramPreview({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  // On the server (Next.js SSR / RSC bootstrap) DOMParser isn't available.
  // We render the raw text as a fallback and let hydration replace it with
  // the rich version. The container's whitespace-pre-wrap keeps newlines
  // visible in both states.
  const rendered = React.useMemo(() => {
    if (typeof window === "undefined") return text;
    return parseTelegramHtml(text);
  }, [text]);

  return (
    <div
      className={cn(
        "whitespace-pre-wrap break-words text-[13px] leading-[1.5] text-foreground",
        className,
      )}
    >
      {rendered}
    </div>
  );
}


function parseTelegramHtml(input: string): React.ReactNode {
  // Wrap in a div so DOMParser yields a stable single root we can walk.
  const parser = new DOMParser();
  const doc = parser.parseFromString(
    `<div>${input}</div>`,
    "text/html",
  );
  const root = doc.body.firstChild as Element | null;
  if (!root) return input;
  return renderChildren(root);
}


function renderChildren(node: Node): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  node.childNodes.forEach((child, i) => {
    out.push(renderNode(child, i));
  });
  return out;
}


function renderNode(node: Node, key: number): React.ReactNode {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  const children = renderChildren(el);

  switch (tag) {
    case "b":
    case "strong":
      return (
        <strong key={key} className="font-semibold text-foreground">
          {children}
        </strong>
      );
    case "i":
    case "em":
      return (
        <em key={key} className="italic">
          {children}
        </em>
      );
    case "u":
      return (
        <u key={key} className="underline">
          {children}
        </u>
      );
    case "s":
    case "strike":
    case "del":
      return (
        <s key={key} className="opacity-70 line-through">
          {children}
        </s>
      );
    case "code":
      return (
        <code
          key={key}
          className="rounded bg-foreground/[0.06] px-1 py-0.5 font-mono text-[12px]"
        >
          {children}
        </code>
      );
    case "pre":
      return (
        <pre
          key={key}
          className="my-1 overflow-x-auto rounded bg-foreground/[0.06] p-2 font-mono text-[12px]"
        >
          {children}
        </pre>
      );
    case "blockquote":
      return (
        <blockquote
          key={key}
          className="my-1 border-l-2 border-info/40 pl-3 text-muted-foreground"
        >
          {children}
        </blockquote>
      );
    case "tg-spoiler":
    case "span": {
      // Telegram's official `<tg-spoiler>` AND the legacy `<span class="tg-spoiler">`
      // both end up here. We treat them identically.
      if (
        tag === "tg-spoiler" ||
        (el.classList && el.classList.contains("tg-spoiler"))
      ) {
        return <Spoiler key={key}>{children}</Spoiler>;
      }
      // Otherwise a plain span — unwrap.
      return <React.Fragment key={key}>{children}</React.Fragment>;
    }
    case "a": {
      const href = el.getAttribute("href") || "";
      // Drop anything that isn't a real http(s) link — `javascript:`,
      // `data:`, relative paths to weird internal routes, etc.
      if (!/^https?:\/\//i.test(href)) {
        return <React.Fragment key={key}>{children}</React.Fragment>;
      }
      return (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-info underline-offset-2 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </a>
      );
    }
    case "br":
      return <br key={key} />;
    default:
      // Unknown tag — unwrap children so text content survives.
      return <React.Fragment key={key}>{children}</React.Fragment>;
  }
}


/**
 * Click-to-reveal spoiler. Matches Telegram's UX: covered text shown as
 * a dotted grey block; click reveals the original content. Once revealed
 * stays revealed — the canvas isn't a chat scroll, the user isn't going
 * to re-scroll back to "re-hide" the spoiler.
 */
function Spoiler({ children }: { children: React.ReactNode }) {
  const [revealed, setRevealed] = React.useState(false);
  if (revealed) {
    return <span className="rounded bg-foreground/[0.04] px-0.5">{children}</span>;
  }
  return (
    <span
      className="cursor-pointer rounded bg-muted/80 px-0.5 text-muted-foreground/80 transition-colors hover:bg-muted/80"
      onClick={(e) => {
        e.stopPropagation();
        setRevealed(true);
      }}
      title="Спойлер — клик чтобы открыть"
    >
      {children}
    </span>
  );
}
