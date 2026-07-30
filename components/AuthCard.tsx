import * as React from "react";
import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";

interface AuthCardProps {
  title: string;
  subtitle?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export function AuthCard({
  title,
  subtitle,
  footer,
  children,
}: AuthCardProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-10 flex items-center justify-center gap-2 text-foreground"
        >
          <Wordmark size="lg" />
        </Link>
        <div className="rounded-2xl border border-border bg-card p-8 shadow-2xl">
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
          <div className="mt-7">{children}</div>
        </div>
        {footer && (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {footer}
          </p>
        )}
      </div>
    </div>
  );
}
