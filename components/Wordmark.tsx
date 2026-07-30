import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/BrandMark";

/**
 * Марка продукта — фирменный завиток и слово THE DRAFT.
 *
 * Один источник правды для приложения: раньше логотип был продублирован в
 * AppShell и AuthCard, назывался «THE CONTENT» и рисовался иконкой Sparkles.
 * Сейчас знак настоящий (см. BrandMark), пропорции текста — из хендоффа:
 * 700, тайт -.03em.
 */

const SIZES = {
  sm: { mark: 16, text: "text-[12px]", gap: "gap-1.5" },
  md: { mark: 22, text: "text-[17px]", gap: "gap-2" },
  lg: { mark: 26, text: "text-[19px]", gap: "gap-2.5" },
} as const;

interface WordmarkProps {
  size?: keyof typeof SIZES;
  /** Показать только знак, без слова — для свёрнутого сайдбара. */
  markOnly?: boolean;
  className?: string;
}

export function Wordmark({
  size = "md",
  markOnly = false,
  className,
}: WordmarkProps) {
  const s = SIZES[size];
  return (
    <span className={cn("flex items-center", s.gap, className)}>
      <BrandMark height={s.mark} className="flex-none" />
      {!markOnly && (
        <span className={cn("font-bold tracking-[-0.03em] text-foreground", s.text)}>
          THE DRAFT
        </span>
      )}
    </span>
  );
}
