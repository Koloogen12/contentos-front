import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Семантические цвета дизайн-системы. Смысл закреплён за цветом во
        // всём продукте (см. шапку globals.css): источник — info, действие и
        // извлечение — accent, готовый контент — content, завершено —
        // success, требует внимания — warn.
        //
        // Объявлены через каналы RGB, а не через var(--p-teal): только так
        // работают модификаторы прозрачности (bg-warn/30). Раньше вместо них
        // стояли палитровые классы Tailwind (amber-400, emerald-500, sky-400),
        // которые не знают про тему и в светлой выглядели чужеродно.
        accent2: "rgb(var(--or-rgb) / <alpha-value>)",
        info: "rgb(var(--teal-rgb) / <alpha-value>)",
        content: "rgb(var(--violet-rgb) / <alpha-value>)",
        success: "rgb(var(--green-rgb) / <alpha-value>)",
        warn: "rgb(var(--amber-rgb) / <alpha-value>)",
        ink: "rgb(var(--ink-rgb) / <alpha-value>)",
        paper: "rgb(var(--paper-rgb) / <alpha-value>)",
        surface: "rgb(var(--card-rgb) / <alpha-value>)",

        // Prototype canvas tokens (1:1 from THE CONTENT-2/styles.css)
        canvas: {
          bg: "var(--canvas-bg)",
          surface: "var(--canvas-surface)",
          node: "var(--node-bg)",
          toolbar: "var(--toolbar-bg)",
        },
        status: {
          idle: "var(--status-idle)",
          running: "var(--status-running)",
          done: "var(--status-done)",
          error: "var(--status-error)",
        },
      },
      borderRadius: {
        node: "var(--node-radius)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        // Onest — гарнитура дизайн-системы (см. app/layout.tsx, next/font).
        // Задана именно здесь, а не только в globals.css: на <body> висит
        // утилита font-sans, а утилиты перебивают правила из @layer base.
        sans: [
          "var(--font-onest)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      backdropBlur: {
        chrome: "14px",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "0.5", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.25)" },
        },
        "edge-flow": {
          to: { strokeDashoffset: "-24" },
        },
        "port-pulse": {
          "0%, 100%": { transform: "translate(-50%, -50%) scale(1)" },
          "50%": { transform: "translate(-50%, -50%) scale(1.18)" },
        },
        spin: {
          to: { transform: "rotate(360deg)" },
        },
        "skel-shine": {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        "picker-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
        "pulse-dot": "pulse-dot 1s infinite",
        "edge-flow": "edge-flow 0.9s linear infinite",
        "port-pulse": "port-pulse 1.4s ease-in-out infinite",
        spin: "spin 0.7s linear infinite",
        "skel-shine": "skel-shine 1.4s ease-in-out infinite",
        "picker-in": "picker-in 0.13s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
