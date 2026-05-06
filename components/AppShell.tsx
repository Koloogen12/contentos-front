"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  LogOut,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Settings,
  LayoutGrid,
  Trash2,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { deleteProject, listProjects } from "@/lib/projects";
import type { ProjectOut } from "@/lib/types";
import { t } from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ProjectDialog } from "@/components/projects/ProjectDialog";
import { SearchDialog } from "@/components/SearchDialog";

import type { LucideIcon } from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const NAV: NavItem[] = [
  { label: t.shell.home, href: "/dashboard", icon: LayoutGrid },
  { label: t.shell.knowledge, href: "/knowledge", icon: BookOpen },
  { label: t.plan.nav, href: "/plan", icon: CalendarDays },
  { label: t.shell.settings, href: "/settings", icon: Settings },
];

const FILTERABLE_PATHS = ["/dashboard", "/knowledge"] as const;

const SIDEBAR_KEY = "contentos.sidebar.collapsed";

/**
 * Pages that render their own immersive chrome (e.g. the canvas detail page
 * has a fixed 52px topbar and full-bleed canvas). For these we skip the
 * AppShell's sidebar + content padding entirely.
 */
function isImmersive(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname.startsWith("/canvas/");
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const [collapsed, setCollapsed] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(SIDEBAR_KEY);
    if (stored === "1") setCollapsed(true);
  }, []);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SIDEBAR_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  // Cmd/Ctrl+K opens the global search dialog from anywhere, including
  // immersive (canvas) pages.
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (isImmersive(pathname)) {
    return (
      <>
        {children}
        <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      </>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside
        className={cn(
          "hidden flex-col border-r border-[color:var(--border-subtle)] bg-[color:var(--node-bg)]/40 lg:flex transition-[width] duration-150 ease-out",
          collapsed ? "w-[56px]" : "w-60",
        )}
      >
        <div className="flex h-14 items-center justify-between gap-2 border-b border-[color:var(--border-subtle)] px-3">
          {!collapsed && (
            <span className="text-[12px] font-bold tracking-[0.04em] text-foreground">
              THE CONTENT
            </span>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-white/5 hover:text-foreground"
            aria-label={collapsed ? "Развернуть" : "Свернуть"}
            title={collapsed ? "Развернуть" : "Свернуть"}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname?.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  collapsed && "justify-center px-2",
                  active
                    ? "bg-white/10 text-foreground"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={16} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}

          {!collapsed && <ProjectsSection />}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <TopBar onOpenSearch={() => setSearchOpen(true)} />
        <main className="flex-1">{children}</main>
      </div>
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}

// ----- Projects sidebar section ----------------------------------------

function ProjectsSection() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedProjectId = searchParams.get("project");

  const isFilterablePath = React.useMemo(() => {
    return FILTERABLE_PATHS.some(
      (p) => pathname === p || pathname?.startsWith(`${p}/`),
    );
  }, [pathname]);

  const query = useQuery({
    queryKey: ["projects"],
    queryFn: listProjects,
  });

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ProjectOut | null>(null);
  const [deleting, setDeleting] = React.useState<ProjectOut | null>(null);

  const navigateWithProject = React.useCallback(
    (projectId: string | null) => {
      const targetPath = isFilterablePath
        ? pathname ?? "/dashboard"
        : "/dashboard";
      const params = new URLSearchParams(searchParams.toString());
      if (projectId) params.set("project", projectId);
      else params.delete("project");
      const qs = params.toString();
      router.push(`${targetPath}${qs ? `?${qs}` : ""}`);
    },
    [isFilterablePath, pathname, router, searchParams],
  );

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between px-3 pb-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t.shell.projects}
        </span>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="rounded-md p-1 text-muted-foreground hover:bg-white/5 hover:text-foreground"
          title={t.shell.newProject}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      <ul className="space-y-0.5">
        <li>
          <button
            type="button"
            onClick={() => navigateWithProject(null)}
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-3 py-1.5 text-sm transition-colors",
              !selectedProjectId
                ? "bg-white/10 text-foreground"
                : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
            )}
          >
            <FolderKanban className="h-3.5 w-3.5" />
            <span>{t.shell.all}</span>
          </button>
        </li>

        {query.isPending ? (
          <ProjectsSkeleton />
        ) : query.isError ? (
          <li className="px-3 py-1 text-[11px] text-destructive">
            {query.error instanceof ApiError
              ? query.error.detail
              : "Не удалось загрузить проекты"}
          </li>
        ) : (
          (query.data ?? []).map((p) => (
            <ProjectRow
              key={p.id}
              project={p}
              active={selectedProjectId === p.id}
              onSelect={() => navigateWithProject(p.id)}
              onEdit={() => setEditing(p)}
              onDelete={() => setDeleting(p)}
            />
          ))
        )}
      </ul>

      <ProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ProjectDialog
        open={!!editing}
        onOpenChange={(next) => !next && setEditing(null)}
        project={editing}
      />
      <DeleteProjectDialog
        project={deleting}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}

function ProjectsSkeleton() {
  return (
    <>
      {Array.from({ length: 2 }).map((_, i) => (
        <li key={i} className="px-3 py-1" aria-hidden>
          <Skeleton className="h-4 w-3/4" />
        </li>
      ))}
    </>
  );
}

function ProjectRow({
  project,
  active,
  onSelect,
  onEdit,
  onDelete,
}: {
  project: ProjectOut;
  active: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="group relative">
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-3 py-1.5 pr-8 text-sm transition-colors",
          active
            ? "bg-white/10 text-foreground"
            : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
        )}
      >
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: project.color }}
          aria-hidden
        />
        <span className="line-clamp-1 text-left">{project.name}</span>
      </button>
      <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Project ${project.name} actions`}
              className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-white/10 hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                onEdit();
              }}
            >
              <Pencil className="h-3.5 w-3.5" /> Переименовать
            </DropdownMenuItem>
            <DropdownMenuItem
              destructive
              onSelect={(e) => {
                e.preventDefault();
                onDelete();
              }}
            >
              <Trash2 className="h-3.5 w-3.5" /> Удалить
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}

function DeleteProjectDialog({
  project,
  onClose,
}: {
  project: ProjectOut | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const mutation = useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["canvases"] });
      qc.invalidateQueries({ queryKey: ["knowledge"] });
      toast.success("Проект удалён");
      if (project && searchParams.get("project") === project.id) {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("project");
        const qs = params.toString();
        router.push(`${pathname}${qs ? `?${qs}` : ""}`);
      }
      onClose();
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : "Не удалось удалить",
      ),
  });

  return (
    <Dialog
      open={!!project}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Удалить проект?</DialogTitle>
          <DialogDescription>
            «{project?.name}» будет удалён. Канвасы и заметки сохранятся, но
            потеряют связь с проектом.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            {t.common.cancel}
          </Button>
          <Button
            variant="destructive"
            onClick={() => project && mutation.mutate(project.id)}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Удаление…" : t.common.delete}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TopBar({ onOpenSearch }: { onOpenSearch: () => void }) {
  const user = useAuthStore((s) => s.user);
  const organization = useAuthStore((s) => s.organization);
  const logout = useAuthStore((s) => s.logout);

  const initials = React.useMemo(() => {
    const source = user?.display_name || user?.email || "?";
    return source
      .split(/[\s@]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("");
  }, [user]);

  return (
    <header className="flex h-14 items-center justify-between border-b border-[color:var(--border-subtle)] bg-background/60 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/40">
      <div className="text-xs text-muted-foreground">
        {organization ? organization.name : ""}
      </div>
      <button
        type="button"
        onClick={onOpenSearch}
        className="ml-3 hidden flex-1 max-w-md items-center gap-2 rounded-lg border border-border bg-background/40 px-3 py-1.5 text-left text-[12.5px] text-muted-foreground transition-colors hover:bg-white/5 md:flex"
        aria-label={t.search.dialogTitle}
      >
        <Search size={13} />
        <span className="truncate">{t.search.placeholder}</span>
        <span className="ml-auto rounded border border-border px-1 py-0.5 text-[10px] font-medium tabular-nums">
          {t.search.triggerHint}
        </span>
      </button>
      <button
        type="button"
        onClick={onOpenSearch}
        className="ml-3 flex items-center gap-2 rounded-md p-2 text-muted-foreground hover:bg-white/5 md:hidden"
        aria-label={t.search.dialogTitle}
      >
        <Search size={14} />
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-3 rounded-md px-2 py-1 transition-colors hover:bg-white/5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-xs font-semibold">
            {initials || "?"}
          </div>
          <div className="hidden text-left text-sm md:block">
            <div className="font-medium leading-tight">
              {user?.display_name || user?.email?.split("@")[0]}
            </div>
            {user?.email && (
              <div className="text-xs text-muted-foreground">{user.email}</div>
            )}
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Аккаунт</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              logout();
              if (typeof window !== "undefined") {
                window.location.href = "/login";
              }
            }}
          >
            <LogOut className="h-4 w-4" /> {t.auth.signOut}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
