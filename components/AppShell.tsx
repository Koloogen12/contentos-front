"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  LayoutGrid,
  LogOut,
  Mic,
  MoreHorizontal,
  Pencil,
  Plug,
  Plus,
  Rocket,
  Search,
  Settings,
  Sparkles,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth";
import { TrialBadge } from "@/components/TrialBadge";
import { Wordmark } from "@/components/Wordmark";
import { ThemeToggle } from "@/components/ThemeToggle";
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

interface NavItemWithFlags extends NavItem {
  /** Подсказка при наведении — из прототипа. */
  hint?: string;
  // Hidden when org.kind === "preview" (anonymous visitor). Trial /
  // regular users see everything. Surfaces that need server-side data
  // (Voice samples, Performance metrics, Settings/brand-context) are
  // hidden in preview because they're either empty or pre-seeded in a
  // way that confuses first-time visitors. Plan + Ideas + Knowledge
  // are KEPT in preview as feature-discovery touch-points.
  hideInPreview?: boolean;
}

const NAV: NavItemWithFlags[] = [
  // Пять пунктов и подсказки — из прототипа (prime2-shell.jsx#Sidebar2).
  // Performance и Settings в сайдбаре хендоффа нет: аналитика живёт режимом
  // внутри «Плана», настройки — в меню аккаунта. Пока «Плана» в новой
  // раскладке нет, обе страницы доступны из меню аккаунта в топбаре, чтобы
  // ничего не стало недостижимым.
  { label: "Канвасы", href: "/dashboard", icon: LayoutGrid, hint: "Материалы в работе" },
  { label: "Идеи", href: "/ideas", icon: Sparkles, hint: "Банк тезисов и заметок" },
  // Пункт «База знаний» из прототипа — это отдельная сущность (факты, цифры,
  // кейсы, разобранные файлы), которой в бэкенде пока нет: типы записей —
  // тезис, ссылка, аудитория, голос, тема — все относятся к Идеям. Вернём
  // пункт, когда появится, чем его наполнять; пустой раздел хуже, чем его
  // отсутствие.
  { label: "План", href: "/plan", icon: CalendarDays, hint: "Очередь, календарь, аналитика" },
  { label: "Запуски", href: "/launches", icon: Rocket, hint: "Прогрев к дате продаж" },
  { label: "Голос", href: "/voice", icon: Mic, hideInPreview: true, hint: "Как ты пишешь" },
  {
    label: "Подключения",
    href: "/connections",
    icon: Plug,
    hideInPreview: true,
    hint: "Куда публикуем: Telegram, LinkedIn и остальные",
  },
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
  const shellOrg = useAuthStore((s) => s.organization);
  const isPreviewShell = shellOrg?.kind === "preview";
  // Filter nav based on org kind. We don't move this into NAV at module
  // scope because the org becomes known only after auth hydrates — a
  // single re-render is cheap.
  const visibleNav = React.useMemo(
    () => NAV.filter((item) => !(isPreviewShell && item.hideInPreview)),
    [isPreviewShell],
  );

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
    <div className="pw" data-collapsed={collapsed ? "1" : "0"}>
      <div className="sb">
        <div className="sb-top">
          <Wordmark size="sm" markOnly={collapsed} />
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="sb-collapse tt dn"
            data-tt={collapsed ? "Развернуть панель" : "Свернуть панель"}
            aria-label={collapsed ? "Развернуть панель" : "Свернуть панель"}
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>

        <div className="sb-nav">
          {visibleNav.map((item) => {
            const active =
              pathname === item.href ||
              pathname?.startsWith(`${item.href}/`) ||
              // На экране канваса активным остаётся «Канвасы» — так в прототипе.
              (item.href === "/dashboard" && pathname?.startsWith("/canvas/"));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="sb-item"
                data-on={active ? "1" : "0"}
                aria-current={active ? "page" : undefined}
                title={item.hint}
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {!collapsed && <ProjectsSection />}
      </div>

      <div className="main">
        <TopBar onOpenSearch={() => setSearchOpen(true)} />
        <div className="body">{children}</div>
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
    <>
      <div className="sb-lbl">
        {t.shell.projects}
        <span
          className="add tt dn"
          role="button"
          tabIndex={0}
          data-tt={t.shell.newProject}
          aria-label={t.shell.newProject}
          onClick={() => setCreateOpen(true)}
          onKeyDown={(e) => e.key === "Enter" && setCreateOpen(true)}
        >
          <Plus size={13} />
        </span>
      </div>
      <div className="sb-nav">
        <div
          className="sb-proj"
          data-on={!selectedProjectId ? "1" : "0"}
          onClick={() => navigateWithProject(null)}
        >
          <LayoutGrid size={14} />
          <span>{t.shell.all}</span>
        </div>

        {query.isPending ? (
          <ProjectsSkeleton />
        ) : query.isError ? (
          <div className="sb-proj" style={{ color: "var(--p-red)" }}>
            <span>
              {query.error instanceof ApiError
                ? query.error.detail
                : "Не удалось загрузить проекты"}
            </span>
          </div>
        ) : (
          (query.data ?? []).map((pr) => (
            <ProjectRow
              key={pr.id}
              project={pr}
              active={selectedProjectId === pr.id}
              onSelect={() => navigateWithProject(pr.id)}
              onEdit={() => setEditing(pr)}
              onDelete={() => setDeleting(pr)}
            />
          ))
        )}
      </div>

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
    </>
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
    // .sb-proj из прототипа: цветная точка + название. Меню действий — наше,
    // в прототипе его нет; появляется по наведению, чтобы не шуметь в списке.
    <div className="sb-proj group relative" data-on={active ? "1" : "0"}>
      <i style={{ background: project.color }} aria-hidden />
      <span
        className="line-clamp-1 flex-1 text-left"
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => e.key === "Enter" && onSelect()}
      >
        {project.name}
      </span>
      <span className="opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Проект ${project.name}: действия`}
              className="grid h-5 w-5 place-items-center rounded-md text-[color:var(--p-ink-3)] hover:bg-[color:var(--p-line)] hover:text-[color:var(--p-ink)]"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal size={13} />
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
      </span>
    </div>
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
    // .top из прототипа: имя воркспейса, чип тарифа, поиск по центру,
    // тумблер темы, аккаунт. Высота 64px задана в CSS.
    <div className="top" style={{ position: "relative" }}>
      <span className="top-ws">{organization?.name ?? ""}</span>
      {/* Для триала и превью показываем живой счётчик квоты, для обычного
          аккаунта — статичный чип, как в прототипе. */}
      {organization?.kind === "regular" ? (
        <span className="chip">Автор</span>
      ) : (
        <TrialBadge />
      )}

      <button
        type="button"
        className="top-search"
        onClick={onOpenSearch}
        style={{ cursor: "text", textAlign: "left", fontFamily: "inherit" }}
        aria-label={t.search.dialogTitle}
      >
        <Search size={15} />
        <span style={{ flex: 1 }}>{t.search.placeholder}</span>
        <kbd>{t.search.triggerHint}</kbd>
      </button>

      <ThemeToggle />

      {organization?.kind === "preview" ? (
        // Превью: синтетический адрес (preview-…@preview.contentos.local)
        // наружу не показываем — он выдаёт внутренний идентификатор и
        // сбивает посетителя. Вместо него простой вход.
        <Link href="/login" className="btn btn-w btn-sm">
          Войти
        </Link>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger
            className="top-me"
            style={{ border: 0, background: "none", cursor: "pointer", fontFamily: "inherit" }}
          >
            <span className="av">{initials || "?"}</span>
            <div style={{ textAlign: "left" }}>
              <b>{user?.display_name || user?.email?.split("@")[0]}</b>
              {user?.email && <span>{user.email}</span>}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>{user?.display_name || "Аккаунт"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {/* Настройки и Performance живут здесь: в сайдбаре хендоффа их нет,
                но страницы существуют и не должны стать недостижимыми. */}
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings className="h-4 w-4" /> Настройки
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/performance">
                <TrendingUp className="h-4 w-4" /> Метрики постов
              </Link>
            </DropdownMenuItem>
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
      )}
    </div>
  );
}
