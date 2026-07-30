"""Стадия 2: перевод захардкоженных цветов Tailwind на токены дизайн-системы.

Почему скриптом: 444 вхождения в 40 файлах. Руками это часы механической
работы с гарантированными пропусками, а любой пропуск виден глазом только в
одной из двух тем — то есть найдётся уже после деплоя.

Карта построена по смыслу, а не по похожести цвета:
  zinc      → уровни текста (foreground / muted-foreground)
  white/N   → полупрозрачные поверхности и границы (foreground/N, border)
  amber     → warn      (предупреждение, непроверенный факт, триал)
  emerald   → success   (готово, опубликовано, подтверждено)
  sky       → info      (в палитре хендоффа синего нет; ближайший по роли
                         «информация/источник» — teal)
  violet    → content   (готовый контент, рубрики)
  red       → destructive
  black/N   → оставляем: затемняющая подложка модалки должна быть тёмной и в
              светлой теме, это не тема, а слой.
"""

import pathlib
import re
import sys

# (что искать, на что менять). Порядок важен: более длинные шаблоны раньше,
# иначе `text-zinc-500` частично совпадёт с правилом для `text-zinc-5`.
RULES: list[tuple[str, str]] = [
    # --- серые: уровни текста ---
    ("text-zinc-100", "text-foreground"),
    ("text-zinc-200", "text-foreground"),
    ("text-zinc-300", "text-foreground/80"),
    ("text-zinc-400", "text-muted-foreground"),
    ("text-zinc-500", "text-muted-foreground"),
    ("text-zinc-600", "text-muted-foreground"),
    ("bg-zinc-800", "bg-muted"),
    ("bg-zinc-900", "bg-card"),
    ("border-zinc-700", "border-border"),
    ("border-zinc-800", "border-border"),
    # --- белый: поверхности, границы, текст ---
    ("bg-white/5", "bg-foreground/5"),
    ("bg-white/10", "bg-foreground/10"),
    ("bg-white/15", "bg-foreground/15"),
    ("bg-white/20", "bg-foreground/20"),
    ("border-white/5", "border-border/60"),
    ("border-white/8", "border-border/80"),
    ("border-white/10", "border-border"),
    ("border-white/15", "border-border"),
    ("border-white/20", "border-border"),
    ("ring-white/50", "ring-ring"),
    ("text-white/40", "text-muted-foreground"),
    ("text-white/60", "text-muted-foreground"),
    ("text-white/70", "text-foreground/70"),
    # --- предупреждения ---
    ("bg-amber-400/30", "bg-warn/30"),
    ("bg-amber-400/20", "bg-warn/20"),
    ("bg-amber-500/15", "bg-warn/15"),
    ("bg-amber-400", "bg-warn"),
    ("bg-amber-300", "bg-warn"),
    ("bg-amber-500", "bg-warn"),
    ("text-amber-200", "text-warn"),
    ("text-amber-300/80", "text-warn/80"),
    ("text-amber-300", "text-warn"),
    ("text-amber-400", "text-warn"),
    ("border-amber-400/70", "border-warn/70"),
    ("border-amber-400/60", "border-warn/60"),
    ("border-amber-400/40", "border-warn/40"),
    ("border-amber-400/30", "border-warn/30"),
    ("border-amber-500/40", "border-warn/40"),
    # --- успех ---
    ("bg-emerald-500/20", "bg-success/20"),
    ("bg-emerald-500/15", "bg-success/15"),
    ("bg-emerald-500", "bg-success"),
    ("bg-emerald-400", "bg-success"),
    ("text-emerald-200", "text-success"),
    ("text-emerald-300/70", "text-success/70"),
    ("text-emerald-300", "text-success"),
    ("text-emerald-400", "text-success"),
    ("border-emerald-500/40", "border-success/40"),
    ("border-emerald-500/30", "border-success/30"),
    # --- информация / источник ---
    ("bg-sky-400", "bg-info"),
    ("bg-sky-500", "bg-info"),
    ("text-sky-100/90", "text-info/90"),
    ("text-sky-100", "text-info"),
    ("text-sky-200", "text-info"),
    ("text-sky-300", "text-info"),
    ("border-sky-400/30", "border-info/30"),
    ("border-sky-500/25", "border-info/25"),
    # --- контент ---
    ("bg-violet-400", "bg-content"),
    ("bg-violet-500", "bg-content"),
    ("text-violet-200", "text-content"),
    ("text-violet-300", "text-content"),
    ("border-violet-400/30", "border-content/30"),
    ("text-indigo-200", "text-content"),
    # --- ошибки ---
    ("text-red-200", "text-destructive"),
    ("text-red-300", "text-destructive"),
    ("border-red-500/40", "border-destructive/40"),
    ("bg-red-500/15", "bg-destructive/15"),
]

# Эти не трогаем — с обоснованием, чтобы следующий не «дочистил» их вслепую.
KEEP = {
    # Затемняющий слой модалки/дропдауна: должен быть тёмным в любой теме.
    "bg-black/30", "bg-black/60", "bg-black/70", "bg-black/85", "bg-black/40",
    "bg-black/50", "bg-black/80", "bg-black/90", "bg-black",
    # Логотип и знак THE DRAFT — фирменные, не зависят от темы.
    "bg-[#F2601A]", "bg-[#FC3F1D]",
}


def token_boundary(cls: str) -> re.Pattern[str]:
    """Класс как отдельный токен: слева граница слова или начало,
    справа — не буква/цифра/дефис/слэш, чтобы `bg-white` не съел
    `bg-white/5`, а `text-warn` не совпал внутри `text-warning-foo`."""
    return re.compile(r"(?<![\w/-])" + re.escape(cls) + r"(?![\w/-])")


def main(paths: list[pathlib.Path], apply: bool) -> int:
    total = 0
    per_file: dict[str, int] = {}
    for path in paths:
        text = original = path.read_text()
        count = 0
        for src, dst in RULES:
            pattern = token_boundary(src)
            text, n = pattern.subn(dst, text)
            count += n
        if count and apply:
            path.write_text(text)
        if count:
            per_file[str(path)] = count
            total += count
        if text != original and not apply:
            pass
    for f, n in sorted(per_file.items(), key=lambda kv: -kv[1]):
        print(f"{n:4}  {f}")
    print(f"\nвсего замен: {total} в {len(per_file)} файлах")
    return total


if __name__ == "__main__":
    apply = "--apply" in sys.argv
    roots = [pathlib.Path("components"), pathlib.Path("app")]
    files = [p for r in roots for p in r.rglob("*.tsx") if "landing" not in str(p)]
    main(files, apply)
