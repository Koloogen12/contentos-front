"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  type Edge as RfEdge,
  type Node as RfNode,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  AlertTriangle,
  ArrowLeft,
  Copy as CopyIcon,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { cloneFromShare, getPublicCanvas } from "@/lib/share";
import { listProjects } from "@/lib/projects";
import type {
  EdgeOut,
  NodeOut,
  PublicCanvasOut,
  ProjectOut,
  SourceNodeData,
} from "@/lib/types";
import { useAuthStore } from "@/stores/auth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { CanvasNodeContext } from "./canvasContext";
import { ExtractNode } from "./nodes/ExtractNode";
import { FormatNode } from "./nodes/FormatNode";
import { SourceNode } from "./nodes/SourceNode";
import { t } from "@/lib/i18n";

interface PublicCanvasViewProps {
  token: string;
}

const NODE_TYPES: NodeTypes = {
  source: SourceNode,
  extract: ExtractNode,
  format: FormatNode,
};

interface RfNodeData extends Record<string, unknown> {
  node: NodeOut;
  expanded: boolean;
  onToggleExpanded: () => void;
}

/**
 * Strip fields the public viewer should never show: youtube_url, file_name,
 * file_size_bytes, transcript_method metadata. The visible text content
 * (`content`, `talking_points`, `body`, etc.) is intentionally public.
 */
function scrubNode(node: NodeOut): NodeOut {
  if (node.type !== "source") return node;
  const data = (node.data ?? {}) as SourceNodeData;
  const scrubbed: SourceNodeData = {
    ...data,
    youtube_url: null,
    youtube_video_id: null,
    file_name: null,
    file_size_bytes: null,
    file_type: null,
    transcript_method: null,
  };
  return { ...node, data: scrubbed as Record<string, unknown> };
}

export function PublicCanvasView({ token }: PublicCanvasViewProps) {
  const query = useQuery({
    queryKey: ["public-canvas", token],
    queryFn: () => getPublicCanvas(token),
  });

  if (query.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner size={24} label={t.publicView.loading} />
      </div>
    );
  }

  if (query.isError) {
    const status =
      query.error instanceof ApiError ? query.error.status : 0;
    if (status === 404) {
      return <NotFoundState />;
    }
    return (
      <NetworkErrorState
        detail={
          query.error instanceof ApiError
            ? query.error.detail
            : t.publicView.networkErrFallback
        }
        onRetry={() => query.refetch()}
      />
    );
  }

  return <PublicCanvasReady token={token} canvas={query.data} />;
}

function PublicCanvasReady({
  token,
  canvas,
}: {
  token: string;
  canvas: PublicCanvasOut;
}) {
  // Stable per-mount snapshot of nodes (with sensitive fields scrubbed).
  const scrubbedNodes = React.useMemo(
    () => canvas.nodes.map(scrubNode),
    [canvas.nodes],
  );

  return (
    <ReactFlowProvider>
      <PublicCanvasInner
        token={token}
        canvas={canvas}
        scrubbedNodes={scrubbedNodes}
      />
    </ReactFlowProvider>
  );
}

function PublicCanvasInner({
  token,
  canvas,
  scrubbedNodes,
}: {
  token: string;
  canvas: PublicCanvasOut;
  scrubbedNodes: NodeOut[];
}) {
  const [expandedSet, setExpandedSet] = React.useState<Set<string>>(
    () => new Set(),
  );

  const toggleExpanded = React.useCallback((nodeId: string) => {
    setExpandedSet((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  const buildRfNode = React.useCallback(
    (n: NodeOut): RfNode<RfNodeData> => ({
      id: n.id,
      type: n.type,
      position: { x: n.position_x, y: n.position_y },
      data: {
        node: n,
        expanded: expandedSet.has(n.id),
        onToggleExpanded: () => toggleExpanded(n.id),
      },
    }),
    [expandedSet, toggleExpanded],
  );

  const buildRfEdge = React.useCallback(
    (e: EdgeOut): RfEdge => ({
      id: e.id,
      source: e.source_node_id,
      target: e.target_node_id,
      type: "default",
      animated: false,
      style: { stroke: "var(--p-violet)", strokeWidth: 2 },
    }),
    [],
  );

  const rfNodes = React.useMemo(
    () => scrubbedNodes.map(buildRfNode),
    [scrubbedNodes, buildRfNode],
  );
  const rfEdges = React.useMemo(
    () => canvas.edges.map(buildRfEdge),
    [canvas.edges, buildRfEdge],
  );

  // ---- read-only canvas context: noop mutations + readOnly flag ----
  const getNodeSnapshot = React.useCallback(
    (nodeId: string): NodeOut | undefined =>
      scrubbedNodes.find((n) => n.id === nodeId),
    [scrubbedNodes],
  );

  const ctxValue = React.useMemo(
    () => ({
      updateNodeData: async () => {
        /* read-only */
      },
      runNode: () => {
        /* read-only */
      },
      attachSkillRun: () => {
        /* read-only */
      },
      setRunningStatus: () => {
        /* read-only */
      },
      getNode: getNodeSnapshot,
      // Public viewer doesn't need full-canvas traversal for the
      // FormatNode idea-picker (read-only), so this is intentionally
      // a stable `undefined` getter.
      getCanvas: () => undefined,
      isRunning: () => false,
      requestDeleteNode: () => {
        /* read-only */
      },
      spawnFormatFromTezis: async () => {
        /* read-only */
      },
      spawnReviewFromExtract: async () => {
        /* read-only */
      },
      readOnly: true,
    }),
    [getNodeSnapshot],
  );

  const createdAtLabel = React.useMemo(() => {
    try {
      return new Date(canvas.created_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return canvas.created_at;
    }
  }, [canvas.created_at]);

  return (
    <CanvasNodeContext.Provider value={ctxValue}>
      <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
        <PublicTopBar
          name={canvas.name}
          organizationName={canvas.organization_name}
          createdAtLabel={createdAtLabel}
        />
        <div className="relative flex-1 bg-[#000]">
          <ReactFlow<RfNode<RfNodeData>, RfEdge>
            nodes={rfNodes}
            edges={rfEdges}
            nodeTypes={NODE_TYPES}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={true}
            edgesReconnectable={false}
            edgesFocusable={false}
            panOnDrag
            panOnScroll={false}
            zoomOnPinch
            zoomOnScroll
            deleteKeyCode={null}
            fitView
            fitViewOptions={{ padding: 0.2, maxZoom: 1.2 }}
            proOptions={{ hideAttribution: true }}
            colorMode="dark"
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={24}
              size={1}
              color="#1f2228"
            />
            <Controls
              position="bottom-left"
              showInteractive={false}
              className="!bg-[color:var(--p-card-2)] !border-border [&_button]:!bg-[color:var(--p-card-2)] [&_button]:!border-border [&_button]:!text-foreground/80 [&_button:hover]:!bg-foreground/5"
            />
          </ReactFlow>
          <CloneCta token={token} canvasName={canvas.name} />
        </div>
      </div>
    </CanvasNodeContext.Provider>
  );
}

function PublicTopBar({
  name,
  organizationName,
  createdAtLabel,
}: {
  name: string;
  organizationName: string;
  createdAtLabel: string;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-card/40 px-6">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground"
      >
        <Sparkles className="h-4 w-4 text-primary" />
        {t.brandName}
      </Link>
      <div className="min-w-0 flex-1 text-right">
        <div className="line-clamp-1 text-sm font-medium text-foreground">
          {name}
        </div>
        <div className="line-clamp-1 text-[11px] text-muted-foreground">
          {t.publicView.title} · {t.publicView.publishedBy(organizationName)} ·{" "}
          {createdAtLabel}
        </div>
      </div>
    </header>
  );
}

// ----- Clone CTA + dialog -------------------------------------------

function CloneCta({ token, canvasName }: { token: string; canvasName: string }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const isHydrating = useAuthStore((s) => s.isHydrating);
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const handleClick = () => {
    if (isHydrating) return;
    if (!accessToken) {
      // Defensive: only allow same-origin path-only `next` (avoid open redirects).
      const next = `/p/${encodeURIComponent(token)}`;
      router.push(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    setDialogOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isHydrating}
        className="absolute bottom-6 right-6 z-10 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-2xl shadow-primary/30 transition-colors hover:bg-primary/90 disabled:opacity-60"
      >
        <CopyIcon className="h-4 w-4" />
        {accessToken ? t.publicView.cloneCta : t.publicView.loginToClone}
      </button>
      {accessToken && (
        <CloneDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          token={token}
          defaultName={`${canvasName} ${t.publicView.copySuffix}`}
        />
      )}
    </>
  );
}

function CloneDialog({
  open,
  onOpenChange,
  token,
  defaultName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  defaultName: string;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const [name, setName] = React.useState(defaultName);
  const [projectId, setProjectId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setName(defaultName);
      setProjectId(null);
    }
  }, [open, defaultName]);

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: listProjects,
    enabled: open,
  });

  const cloneMutation = useMutation({
    mutationFn: () =>
      cloneFromShare(token, {
        name: name.trim() || defaultName,
        project_id: projectId,
      }),
    onSuccess: (cloned) => {
      qc.invalidateQueries({ queryKey: ["canvases"] });
      toast.success(t.publicView.cloneSuccess);
      onOpenChange(false);
      router.push(`/canvas/${cloned.id}`);
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : t.publicView.cloneError,
      ),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.publicView.cloneDialogTitle}</DialogTitle>
          <DialogDescription>{t.publicView.cloneDialogSub}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clone-name">{t.publicView.cloneNameLabel}</Label>
            <Input
              id="clone-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.publicView.cloneNamePlaceholder}
              autoFocus
              disabled={cloneMutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label>{t.publicView.cloneProjectLabel}</Label>
            {projectsQuery.isPending ? (
              <p className="text-xs text-muted-foreground">
                {t.publicView.cloneProjectsLoading}
              </p>
            ) : projectsQuery.isError ? (
              <p className="text-xs text-destructive">
                {t.publicView.cloneProjectsError}
              </p>
            ) : (
              <ProjectPicker
                projects={projectsQuery.data ?? []}
                selectedId={projectId}
                onSelect={setProjectId}
                disabled={cloneMutation.isPending}
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={cloneMutation.isPending}
          >
            {t.common.cancel}
          </Button>
          <Button
            onClick={() => cloneMutation.mutate()}
            disabled={cloneMutation.isPending}
          >
            {cloneMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />{" "}
                {t.publicView.cloning}
              </>
            ) : (
              <>
                <CopyIcon className="h-4 w-4" /> {t.publicView.cloneSubmit}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProjectPicker({
  projects,
  selectedId,
  onSelect,
  disabled,
}: {
  projects: ProjectOut[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        onClick={() => onSelect(null)}
        disabled={disabled}
        className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
          selectedId === null
            ? "border-primary/60 bg-primary/10 text-foreground"
            : "border-border bg-card/40 text-muted-foreground hover:bg-accent"
        } disabled:opacity-50`}
      >
        {t.publicView.cloneNoProject}
      </button>
      {projects.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onSelect(p.id)}
          disabled={disabled}
          className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
            selectedId === p.id
              ? "border-primary/60 bg-primary/10 text-foreground"
              : "border-border bg-card/40 text-muted-foreground hover:bg-accent"
          } disabled:opacity-50`}
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: p.color }}
            aria-hidden
          />
          {p.name}
        </button>
      ))}
    </div>
  );
}

// ----- Error states --------------------------------------------------

function NotFoundState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card/40 p-8 text-center shadow-xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <AlertTriangle className="h-6 w-6 text-muted-foreground" />
        </div>
        <h1 className="mt-5 text-lg font-semibold text-foreground">
          {t.publicView.notFoundTitle}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t.publicView.notFoundSub}
        </p>
        <div className="mt-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.publicView.backHome}
          </Link>
        </div>
      </div>
    </div>
  );
}

function NetworkErrorState({
  detail,
  onRetry,
}: {
  detail: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md rounded-2xl border border-destructive/30 bg-destructive/5 p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/15 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-medium text-foreground">
              {t.publicView.networkErrTitle}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
          </div>
        </div>
        <div className="mt-5">
          <Button onClick={onRetry} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" /> {t.publicView.retry}
          </Button>
        </div>
      </div>
    </div>
  );
}
