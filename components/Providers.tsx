"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { LIGHT_THEME_READY } from "@/lib/theme-flags";
import { Toaster } from "sonner";
import { AuthBootstrap } from "@/components/AuthBootstrap";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (failureCount, error) => {
              // Don't retry auth or client errors.
              const status =
                (error as { status?: number } | null)?.status ?? 0;
              if (status === 401 || status === 403 || status === 404) {
                return false;
              }
              return failureCount < 2;
            },
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      {/*
        Светлая по умолчанию — как на лендинге: человек приходит со светлой
        страницы, и продукт не должен встречать его сменой освещения.
        Тёмная доступна тумблером в топбаре, выбор сохраняется.

        `enableSystem` выключен намеренно: иначе пользователь с тёмной
        системной темой получил бы тёмный кабинет после светлого лендинга,
        то есть ровно тот разрыв, который мы убираем.

        attribute: ставим и класс, и data-theme. Класс нужен Tailwind
        (darkMode: "class"), data-theme — селекторам из хендоффа.
      */}
      <ThemeProvider
        attribute={["class", "data-theme"]}
        defaultTheme={LIGHT_THEME_READY ? "light" : "dark"}
        enableSystem={false}
        forcedTheme={LIGHT_THEME_READY ? undefined : "dark"}
        disableTransitionOnChange
      >
        <AppErrorBoundary>
          <AuthBootstrap>{children}</AuthBootstrap>
        </AppErrorBoundary>
        <Toaster
          theme="dark"
          position="bottom-right"
          richColors
          closeButton
        />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
