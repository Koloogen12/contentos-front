"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BookOpen,
  FolderKanban,
  LogOut,
  MoreHorizontal,
  Pencil,
  Plus,
  Settings,
  Sparkles,
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

import type { LucideIcon } from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
}

const NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutGrid },
  { label: "Knowledge", href: "/knowledge", icon: BookOpen },
  { label: "Settings", href: "/settings", icon: Settings },
];

/** Pages where the projects sidebar filter applies. */
const FILTERABLE_PATHS = ["/dashboard", "/knowledge"] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden w-60 flex-col border-r border-border bg-card/40 lg:flex">
        <div className="flex h-14 items-center gap-2 border-b border-border px-5">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold tracking-tight">
            ContentOS
          </span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {NAV.map((item) => {
            const active =
              !item.disabled &&
              (pathname === item.href || pathname?.startsWith(`${item.href}/`));
            const Icon = item.icon;
            const className = cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
              item.disabled && "pointer-events-none opacity-40",
            );
            if (item.disabled) {
              return (
                <span key={item.href} className={className}>
                  <Icon size={16} />
                  {item.label}
                  <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Soon
                  </span>
                </span>
              );
            }
            return (
              <Link key={item.href} href={item.href} className={className}>
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}

          <ProjectsSection />
        </nav>
        <div className="border-t border-border p-3 text-xs text-muted-foreground">
          <p className="px-2">Iter D · Templates</p>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <TopBar />
        <main className="flex-1">{children}</main>
      </div>
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

  /**
   * Selecting a project routes to a filterable page (dashboard if we're on
   * one of the listed paths, otherwise dashboard). Selecting "All" strips
   * the `?project` search param.
   */
  const navigateWithProject = React.useCallback(
    (projectId: string | null) => {
      const targetPath = isFilterablePath ? pathname ?? "/dashboard" : "/dashboard";
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
          Projects
        </span>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="rounded-md p-1 text-muted-foreground hover:bg-accent/40 hover:text-foreground"
          title="New project"
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
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
            )}
          >
            <FolderKanban className="h-3.5 w-3.5" />
            <span>All</span>
          </button>
        </li>

        {query.isPending ? (
          <ProjectsSkeleton />
        ) : query.isError ? (
          <li className="px-3 py-1 text-[11px] text-destructive">
            {query.error instanceof ApiError
              ? query.error.detail
              : "Could not load projects"}
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
            ? "bg-accent text-foreground"
            : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
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
              className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
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
              <Pencil className="h-3.5 w-3.5" /> Rename / Recolor
            </DropdownMenuItem>
            <DropdownMenuItem
              destructive
              onSelect={(e) => {
                e.preventDefault();
                onDelete();
              }}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
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
      toast.success("Project deleted");
      // If the deleted project was selected, drop it from the URL.
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
        err instanceof ApiError ? err.detail : "Could not delete project",
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
          <DialogTitle>Delete project?</DialogTitle>
          <DialogDescription>
            &ldquo;{project?.name}&rdquo; will be removed. Canvases and
            knowledge items keep their data, but lose the project link.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => project && mutation.mutate(project.id)}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TopBar() {
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
    <header className="flex h-14 items-center justify-between border-b border-border bg-background/60 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/40">
      <div className="text-xs text-muted-foreground">
        {organization ? organization.name : ""}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-3 rounded-md px-2 py-1 transition-colors hover:bg-accent">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
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
          <DropdownMenuLabel>Signed in</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              logout();
              if (typeof window !== "undefined") {
                window.location.href = "/login";
              }
            }}
          >
            <LogOut className="h-4 w-4" /> Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
