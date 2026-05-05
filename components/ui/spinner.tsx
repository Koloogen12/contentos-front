import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpinnerProps {
  className?: string;
  size?: number;
  label?: string;
}

export function Spinner({ className, size = 16, label }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label ?? "Loading"}
      className={cn("inline-flex items-center gap-2 text-muted-foreground", className)}
    >
      <Loader2 size={size} className="animate-spin" />
      {label ? <span className="text-sm">{label}</span> : null}
    </span>
  );
}
