import type { Metadata } from "next";
import { Onest } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

/**
 * Onest — гарнитура дизайн-системы (design_handoff/workspace).
 * next/font качает файлы на этапе сборки и раздаёт с нашего домена: запрос к
 * Google Fonts из РФ бывает нестабилен. Начертания — 400/500/600/700, как в
 * хендоффе; 800 в кабинете не используется, поэтому не тянем.
 */
const onest = Onest({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-onest",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "THE DRAFT",
  description:
    "Рабочее пространство THE DRAFT: из голосового, записи или одной мысли — готовые посты твоим языком.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // lang="ru", а не "en": интерфейс целиком на русском, иначе скринридер
    // читает русский текст английской фонетикой.
    // Класс темы больше не задаётся здесь: им управляет next-themes
    // (см. components/Providers.tsx). Захардкоженный "dark" делал светлую
    // тему недостижимой — она перебивалась на каждой загрузке страницы.
    <html lang="ru" className={`h-full ${onest.variable}`} suppressHydrationWarning>
      <body className="min-h-full bg-background text-foreground antialiased font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
