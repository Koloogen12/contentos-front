import * as React from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    // Разметка по прототипу (prime2: .empty). Отступы, ширина текста и
    // кружок иконки заданы там же — здесь только структура.
    <div className={cn("empty", className)}>
      {icon && <span className="empty-ic">{icon}</span>}
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
