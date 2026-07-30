import { CTA_PATH } from "./config";

/**
 * Единый хелпер для всех CTA лендинга.
 *
 * Прокидывает UTM-метки из текущего URL дальше в продукт (иначе атрибуция
 * регистрации теряется на первом же переходе) и добавляет `?plan=` для кнопок
 * тарифов — так внутри можно сразу показать нужный план.
 */
export function ctaHref(plan?: string): string {
  const params = new URLSearchParams();
  if (typeof window !== "undefined") {
    const current = new URLSearchParams(window.location.search);
    for (const key of [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
      "ref",
    ]) {
      const v = current.get(key);
      if (v) params.set(key, v);
    }
  }
  if (plan) params.set("plan", plan);
  const qs = params.toString();
  return qs ? `${CTA_PATH}?${qs}` : CTA_PATH;
}

/** Плавный скролл к секции (кнопка «Показать пример текста»). */
export function scrollToId(id: string, offset = 40) {
  const el = document.getElementById(id);
  if (!el) return;
  window.scrollTo({ top: el.offsetTop - offset, behavior: "smooth" });
}
