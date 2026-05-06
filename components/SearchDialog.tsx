"use client";

/**
 * SearchDialog — global Cmd-K-style search across knowledge, canvases and
 * planned posts. Results are grouped by kind, max 5 per group; each group
 * has a "Show more" affordance that expands inline.
 *
 * Hooks: opened via Cmd/Ctrl+K (registered in AppShell), or via the search
 * input chip in the top bar. Esc closes.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Loader2,
  BookOpen,
  LayoutGrid,
  CalendarDays,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { searchAll, type SearchHit, type SearchHitKind } from "@/lib/search";

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GROUP_ORDER: SearchHitKind[] = ["knowledge", "canvas", "planned_post"];

const GROUP_ICON: Record<SearchHitKind, LucideIcon> = {
  knowledge: BookOpen,
  canvas: LayoutGrid,
  planned_post: CalendarDays,
};

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [expanded, setExpanded] = React.useState<Set<SearchHitKind>>(new Set());

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebounced(query.trim()), 200);
    return () => window.clearTimeout(id);
  }, [query]);

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setDebounced("");
      setExpanded(new Set());
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  const searchQuery = useQuery({
    queryKey: ["search", debounced],
    queryFn: () => searchAll(debounced),
    enabled: open && debounced.length >= 2,
  });

  const grouped = React.useMemo(() => {
    const out: Record<SearchHitKind, SearchHit[]> = {
      knowledge: [],
      canvas: [],
      planned_post: [],
    };
    for (const hit of searchQuery.data?.hits ?? []) {
      out[hit.kind].push(hit);
    }
    return out;
  }, [searchQuery.data]);

  const navigate = (hit: SearchHit) => {
    onOpenChange(false);
    if (hit.kind === "knowledge") {
      router.push(`/knowledge?focus=${hit.id}`);
    } else if (hit.kind === "canvas") {
      router.push(`/canvas/${hit.id}`);
    } else {
      router.push("/plan");
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 px-4 pt-[10vh]"
      onClick={() => onOpenChange(false)}
      role="dialog"
      aria-modal
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-popover shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Search size={14} className="text-muted-foreground" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.search.dialogPlaceholder}
            className="flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-muted-foreground"
          />
          {searchQuery.isFetching && (
            <Loader2 size={12} className="animate-spin text-muted-foreground" />
          )}
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {debounced.length < 2 ? (
            <div className="px-2 py-6 text-center text-[12px] text-muted-foreground">
              {t.search.typeHint}
            </div>
          ) : searchQuery.isError ? (
            <div className="px-2 py-6 text-center text-[12px] text-destructive">
              {t.search.failed}
            </div>
          ) : (searchQuery.data?.hits.length ?? 0) === 0 &&
            !searchQuery.isFetching ? (
            <div className="px-2 py-6 text-center text-[12px] text-muted-foreground">
              {t.search.empty}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {GROUP_ORDER.map((kind) => {
                const hits = grouped[kind];
                if (hits.length === 0) return null;
                const isExpanded = expanded.has(kind);
                const visible = isExpanded ? hits : hits.slice(0, 5);
                const Icon = GROUP_ICON[kind];
                const hidden = hits.length - visible.length;
                return (
                  <div key={kind}>
                    <div className="flex items-center gap-1.5 px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <Icon size={10} />
                      {t.search.groups[kind]}
                      <span className="ml-auto tabular-nums opacity-70">
                        {hits.length}
                      </span>
                    </div>
                    <ul className="flex flex-col">
                      {visible.map((hit) => (
                        <li key={`${hit.kind}-${hit.id}`}>
                          <button
                            type="button"
                            onClick={() => navigate(hit)}
                            className={cn(
                              "flex w-full flex-col gap-0.5 rounded-md px-2 py-1.5 text-left transition-colors",
                              "hover:bg-accent",
                            )}
                          >
                            <span className="truncate text-[13px] text-foreground">
                              {hit.title}
                            </span>
                            {hit.snippet && (
                              <span className="line-clamp-1 text-[11px] text-muted-foreground">
                                {hit.snippet}
                              </span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                    {hidden > 0 && !isExpanded && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpanded((s) => new Set(s).add(kind))
                        }
                        className="mt-1 w-full rounded-md px-2 py-1 text-left text-[11px] text-muted-foreground hover:bg-accent"
                      >
                        {t.search.showMore(hidden)}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
