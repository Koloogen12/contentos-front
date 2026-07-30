"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { LIGHT_THEME_READY } from "@/lib/theme-flags";

/**
 * Тумблер светлой и тёмной темы (хендофф: в топбаре, рядом с аватаром).
 *
 * До монтирования показываем нейтральную заглушку: `resolvedTheme` на сервере
 * неизвестен, и если отрисовать по догадке, при гидратации иконка прыгнет.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Прятать переключатель, ведущий в недоделанную тему, честнее, чем
  // показывать его и ловить жалобы на съехавшие экраны.
  if (!LIGHT_THEME_READY) return null;

  const isDark = resolvedTheme === "dark";
  const label = isDark ? "Светлая тема" : "Тёмная тема";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        className,
      )}
      // Иконки декоративные, смысл кнопки несёт только это имя.
      aria-label={label}
      title={label}
    >
      {!mounted ? (
        <span className="h-4 w-4" />
      ) : isDark ? (
        <Sun size={16} />
      ) : (
        <Moon size={16} />
      )}
    </button>
  );
}
