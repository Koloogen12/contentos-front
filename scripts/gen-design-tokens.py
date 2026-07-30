"""Генерирует токен-слой globals.css из палитры хендоффа workspace/prime2.css.

Скрипт нужен, потому что shadcn-токены приложение потребляет как `hsl(var(--x))`
и на них навешано 204 opacity-модификатора (`bg-card/40`) — значит они обязаны
остаться безголовыми HSL-тройками. Считать hex→HSL руками для 40 значений в двух
темах — гарантированные опечатки, поэтому перевод автоматический.
"""

import re

# ---- палитра хендоффа, скопирована из prime2.css :root и [data-theme="dark"] ----

LIGHT = {
    "paper": "#F4F3F1", "card": "#FFFFFF", "card-2": "#FCFBFA",
    "ink": "#171717", "ink-2": "#5A5A57", "ink-3": "#767573",
    "line": "rgba(23,23,23,.09)", "line-2": "rgba(23,23,23,.16)",
    "or": "#F2601A", "or-soft": "rgba(242,96,26,.1)",
    "teal": "#0E5B55", "teal-soft": "rgba(14,91,85,.1)",
    "violet": "#6B4EE6", "violet-soft": "rgba(107,78,230,.1)",
    "green": "#15803D", "green-soft": "rgba(21,128,61,.1)",
    "amber": "#B45309", "amber-soft": "rgba(180,83,9,.09)",
    "dark": "#1A1A1A",
    # красного в хендоффе нет — amber там про «требует внимания», а не про
    # необратимое действие. Для destructive берём отдельный красный.
    "red": "#DC2626", "on-accent": "#FFFFFF",
    # просветы внутри знака: в светлой — как в исходнике, в тёмной — фон
    "mark-cut": "#F9F8F6",
}

DARK = {
    "paper": "#0B0B0B", "card": "#151514", "card-2": "#1B1B1A",
    "ink": "#F4F3F1", "ink-2": "#A9A8A4", "ink-3": "#7D7C79",
    "line": "rgba(255,255,255,.1)", "line-2": "rgba(255,255,255,.2)",
    "or": "#FF7A3D", "or-soft": "rgba(255,122,61,.14)",
    "teal": "#3FBFA8", "teal-soft": "rgba(63,191,168,.14)",
    "violet": "#9B85FF", "violet-soft": "rgba(155,133,255,.14)",
    "green": "#4ADE80", "green-soft": "rgba(74,222,128,.13)",
    "amber": "#FBBF24", "amber-soft": "rgba(251,191,36,.13)",
    "dark": "#242423",
    "red": "#F87171", "on-accent": "#FFFFFF",
    "mark-cut": "#0B0B0B",
}

# ---- цветовая математика ----


def parse(c):
    """hex или rgba() → (r, g, b, a) в 0..255 / 0..1."""
    c = c.strip()
    if c.startswith("#"):
        h = c[1:]
        if len(h) == 3:
            h = "".join(ch * 2 for ch in h)
        return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 1.0
    m = re.match(r"rgba?\(([^)]+)\)", c)
    parts = [p.strip() for p in m.group(1).split(",")]
    a = float(parts[3]) if len(parts) > 3 else 1.0
    return int(parts[0]), int(parts[1]), int(parts[2]), a


def over(fg, bg):
    """Наложить полупрозрачный fg на непрозрачный bg → непрозрачный цвет.

    Нужно для --border/--input: Tailwind применяет к ним альфу сам
    (`border-border/40`), поэтому в токене альфы быть не должно.
    """
    fr, fg_, fb, fa = parse(fg)
    br, bg_, bb, _ = parse(bg)
    mix = lambda f, b: round(f * fa + b * (1 - fa))
    return f"#{mix(fr, br):02X}{mix(fg_, bg_):02X}{mix(fb, bb):02X}"


def rgb_channels(c):
    """Цвет → «R G B» без обёртки.

    Нужно для семантических цветов Tailwind, объявленных как
    `rgb(var(--x-rgb) / <alpha-value>)`: только в таком виде работают
    модификаторы прозрачности вида `bg-warn/30`.
    """
    r, g, b, _ = parse(c)
    return f"{r} {g} {b}"


def hsl(c):
    """Цвет → «H S% L%» без функции-обёртки, как ждёт `hsl(var(--x))`."""
    r, g, b, _ = parse(c)
    r, g, b = r / 255, g / 255, b / 255
    mx, mn = max(r, g, b), min(r, g, b)
    l = (mx + mn) / 2
    d = mx - mn
    if d == 0:
        h = s = 0.0
    else:
        s = d / (2 - mx - mn) if l > 0.5 else d / (mx + mn)
        if mx == r:
            h = ((g - b) / d) % 6
        elif mx == g:
            h = (b - r) / d + 2
        else:
            h = (r - g) / d + 4
        h *= 60
    return f"{round(h)} {round(s * 100)}% {round(l * 100)}%"


# ---- карта: токен приложения → чем он становится ----
# ref("x")     — взять токен палитры как есть (цвет с альфой сохраняется)
# hslref("x")  — токен палитры, переведённый в HSL-тройку (для shadcn)
# flat("x","y")— x, наложенный на y, затем в HSL (для непрозрачных бордеров)


def build(pal):
    ref = lambda k: pal[k]
    hslref = lambda k: hsl(pal[k])
    flat = lambda k, base: hsl(over(pal[k], pal[base]))

    custom = [
        ("Поверхности канваса", [
            ("canvas-bg", ref("paper")),
            ("canvas-surface", ref("card-2")),
        ]),
        ("Ноды", [
            ("node-bg", ref("card")),
            ("node-border", ref("line")),
            ("node-border-hover", ref("line-2")),
            # выделенная нода — акцентным, как в прототипе
            ("node-border-selected", ref("or")),
            ("node-radius", "14px"),
        ]),
        ("Текст", [
            ("text-primary", ref("ink")),
            # у хендоффа три уровня текста, у приложения было четыре;
            # tertiary (0.85 от основного) ближе всего к основному
            ("text-tertiary", ref("ink")),
            ("text-secondary", ref("ink-2")),
            ("text-muted", ref("ink-3")),
        ]),
        ("Порты и кабели", [
            ("handle-bg", ref("card")),
            ("handle-border", ref("line-2")),
            ("port-bg", ref("card")),
            # в прототипе кабели акцентные: .edges path{stroke:var(--or)}
            ("edge-stroke", ref("or")),
        ]),
        ("Панели и кнопки", [
            ("toolbar-bg", ref("card")),
            ("btn-ghost-bg", ref("card")),
            ("btn-ghost-border", ref("line")),
            ("btn-primary-bg", ref("or")),
            ("btn-primary-border", ref("or")),
        ]),
        ("Статусы прогона ноды", [
            ("status-idle", ref("ink-3")),
            ("status-running", ref("or")),
            ("status-done", ref("green")),
            ("status-error", ref("red")),
        ]),
        ("Полосы потенциала идеи", [
            ("score-high", ref("green")),
            ("score-high-bg", ref("green-soft")),
            ("score-mid", ref("amber")),
            ("score-mid-bg", ref("amber-soft")),
            ("score-low", ref("ink-3")),
            ("score-low-bg", ref("line")),
        ]),
        ("Фирменный знак", [
            # Знак — трассировка рукописного завитка: светлые участки внутри
            # него залиты цветом, а не прозрачны. Поэтому просветы привязаны
            # к теме, иначе на тёмном фоне они читались бы как заливка.
            ("mark-ink", ref("or")),
            ("mark-cut", pal["mark-cut"]),
        ]),
        ("Границы", [
            ("border-subtle", ref("line")),
        ]),
        ("Контент-план: статусы", [
            ("plan-status-draft", ref("ink-3")),
            ("plan-status-ready", ref("violet")),
            # «orange = в плане, green = опубликован» — из спеки календаря
            ("plan-status-scheduled", ref("or")),
            ("plan-status-published", ref("green")),
            ("plan-status-skipped", ref("amber")),
        ]),
        ("Контент-план: рубрики", [
            ("plan-pillar-r1", ref("violet")),
            ("plan-pillar-r2", ref("teal")),
            ("plan-pillar-r3", ref("or")),
            ("plan-pillar-r4", ref("amber")),
        ]),
    ]

    shadcn = [
        ("background", hslref("paper")),
        ("foreground", hslref("ink")),
        ("card", hslref("card")),
        ("card-foreground", hslref("ink")),
        ("popover", hslref("card")),
        ("popover-foreground", hslref("ink")),
        # основное действие в системе — акцентное оранжевое (.btn-or),
        # раньше здесь было белое, что на светлом фоне не читается вовсе
        ("primary", hslref("or")),
        ("primary-foreground", hslref("on-accent")),
        ("secondary", hslref("card-2")),
        ("secondary-foreground", hslref("ink")),
        ("muted", hslref("card-2")),
        ("muted-foreground", hslref("ink-2")),
        ("accent", hslref("card-2")),
        ("accent-foreground", hslref("ink")),
        ("destructive", hslref("red")),
        ("destructive-foreground", hslref("on-accent")),
        # border/input без альфы: Tailwind навешивает её сам (border-border/40)
        ("border", flat("line", "paper")),
        ("input", flat("line", "paper")),
        ("ring", hslref("or")),
        ("radius", "14px"),
    ]
    return custom, shadcn


def emit(pal, indent="    "):
    custom, shadcn = build(pal)
    out = []
    # базовая палитра — как в хендоффе, для прямого использования в CSS
    # Префикс --p-: у хендоффа и у shadcn обоих есть токен `card`, но форматы
    # значений разные (hex против HSL-тройки) — без префикса второй затирает
    # первый и var(--card) в CSS отдаёт «0 0% 100%» вместо цвета.
    out.append(f"{indent}/* Палитра хендоффа (prime2.css) — источник правды */")
    for k in ["paper", "card", "card-2", "ink", "ink-2", "ink-3", "line", "line-2",
              "or", "or-soft", "teal", "teal-soft", "violet", "violet-soft",
              "green", "green-soft", "amber", "amber-soft", "dark", "red"]:
        out.append(f"{indent}--p-{k}: {pal[k]};")
    out.append("")
    out.append(f"{indent}/* Те же цвета каналами — для семантических утилит Tailwind */")
    for k in ["or", "teal", "violet", "green", "amber", "ink", "paper", "card", "red"]:
        out.append(f"{indent}--{k}-rgb: {rgb_channels(pal[k])};")
    for title, rows in custom:
        out.append("")
        out.append(f"{indent}/* {title} */")
        for k, v in rows:
            out.append(f"{indent}--{k}: {v};")
    out.append("")
    out.append(f"{indent}/* shadcn-токены: HSL-тройки, Tailwind оборачивает в hsl() */")
    for k, v in shadcn:
        out.append(f"{indent}--{k}: {v};")
    return "\n".join(out)


if __name__ == "__main__":
    print("/* СВЕТЛАЯ */")
    print(emit(LIGHT))
    print()
    print("/* ТЁМНАЯ */")
    print(emit(DARK))
