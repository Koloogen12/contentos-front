import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./landing.css";
import { LandingPage } from "@/components/landing/LandingPage";

/**
 * `/` — публичная посадочная страница THE DRAFT.
 *
 * Раньше здесь стоял redirect на /dashboard, из-за чего продукт был целиком за
 * авторизацией, а публичной страницы не существовало. Приложение живёт на
 * /dashboard, вход — /login, песочница без регистрации — /try.
 *
 * Шрифты: next/font скачивает и раздаёт их с нашего домена (хендофф просил
 * self-hosted вместо Google Fonts — запрос из РФ бывает нестабилен), плюс
 * `display: swap` и preload для основного шрифта.
 *
 * Тема: приложение тёмное (<html class="dark">), лендинг светлый. Поэтому
 * страница обёрнута в `.tdl` — под этим классом лежат все токены и правила из
 * `landing.css`, и они не протекают в канвас.
 */

// Onest объявлен один раз в app/layout.tsx и доступен здесь через --font-onest.
// Второе объявление тянуло бы на этот маршрут второй набор файлов шрифта:
// начертание 800 в вёрстке лендинга не используется, различий нет.
const jbMono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
  variable: "--font-jbmono",
  display: "swap",
  preload: false,
});

const TITLE = "THE DRAFT — публикуйся регулярно, не садясь писать";
const DESCRIPTION =
  "Наговори голосовое, брось ссылку на запись или чужую статью, скинь мысль одной строкой — THE DRAFT достанет сильные тезисы и напишет из них готовые посты для Telegram, LinkedIn и Instagram. Твоим языком, а не языком ChatGPT.";
const SITE_URL = "https://draft.neurin.tech";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "THE DRAFT",
    locale: "ru_RU",
    type: "website",
    // TODO: положить public/landing/og.png (1200×630) и раскомментировать
    // images: [{ url: `${SITE_URL}/landing/og.png`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "THE DRAFT",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: SITE_URL,
  description: DESCRIPTION,
  inLanguage: "ru",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "RUB",
    description: "Первый пост бесплатно, без регистрации и карты",
  },
};

export default function Home() {
  return (
    <div className={`tdl ${jbMono.variable}`} lang="ru">
      <script
        type="application/ld+json"
        // статический объект из этого файла, пользовательского ввода нет
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <LandingPage />
    </div>
  );
}
