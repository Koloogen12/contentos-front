"use client";

import * as React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface State {
  error: Error | null;
}

/**
 * Top-level error boundary used inside the providers tree. App-router has its
 * own `error.tsx` segment files; this catches anything thrown above them
 * (e.g. provider initialization).
 */
export class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error("AppErrorBoundary caught:", error, info);
    }
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-2xl">
            <div className="flex items-center gap-3 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <h1 className="text-base font-semibold text-foreground">
                Something went wrong
              </h1>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {this.state.error.message ||
                "An unexpected error occurred while rendering."}
            </p>
            <div className="mt-6 flex justify-end">
              <Button onClick={this.reset} variant="default">
                <RefreshCw className="h-4 w-4" /> Try again
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
