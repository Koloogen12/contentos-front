/**
 * Тонкий слой аналитики лендинга.
 *
 * События из хендоффа: landing_view, hero_cta_click, proof_tab_switch,
 * platform_switch, faq_open, pricing_cta_click, scroll_depth.
 *
 * Провайдер пока не подключён — функция кладёт события в `window.dataLayer`
 * (совместимо с GTM/Яндекс.Метрика через dataLayer) и в dev-консоль. Когда
 * появится реальный провайдер, менять только это место.
 */
type Props = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

export function track(event: string, props: Props = {}) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...props });
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.debug("[landing]", event, props);
  }
}

/** Глубина скролла 25/50/75/100 — каждый порог сообщается один раз. */
export function initScrollDepth(): () => void {
  if (typeof window === "undefined") return () => {};
  const fired = new Set<number>();
  const onScroll = () => {
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    if (max <= 0) return;
    const pct = (window.scrollY / max) * 100;
    for (const step of [25, 50, 75, 100]) {
      if (pct >= step && !fired.has(step)) {
        fired.add(step);
        track("scroll_depth", { depth: step });
      }
    }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  return () => window.removeEventListener("scroll", onScroll);
}
