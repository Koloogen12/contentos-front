"use client";

import * as React from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
  type Connection,
  type Edge as RfEdge,
  type EdgeChange,
  type Node as RfNode,
  type NodeChange,
  type NodeTypes,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BookOpen, Loader2, Zap } from "lucide-react";

import { ApiError } from "@/lib/api";
import { getCanvas, runAllOnCanvas } from "@/lib/canvases";
import { createNode, deleteNode, updateNode } from "@/lib/nodes";
import { createEdge, deleteEdge } from "@/lib/edges";
import {
  getSkillRun,
  runNode as runNodeApi,
  subscribeSkillRun,
} from "@/lib/skill-runs";
import type {
  CanvasDetail,
  EdgeOut,
  NodeOut,
  NodeStatus,
  NodeType,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CanvasNodeContext } from "./canvasContext";
import { CanvasToolbar } from "./CanvasToolbar";
import { ExtractNode } from "./nodes/ExtractNode";
import { FormatNode } from "./nodes/FormatNode";
import { SourceNode } from "./nodes/SourceNode";
import { KnowledgeSidebar } from "./KnowledgeSidebar";

interface CanvasEditorProps {
  canvas: CanvasDetail;
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

const VALID_EDGE_TYPES: Record<NodeType, NodeType[]> = {
  source: ["extract", "format"],
  extract: ["format"],
  format: [],
};

function isValidConnectionTypes(source: NodeType, target: NodeType): boolean {
  return VALID_EDGE_TYPES[source].includes(target);
}

export function CanvasEditor(props: CanvasEditorProps) {
  return (
    <ReactFlowProvider>
      <CanvasEditorInner {...props} />
    </ReactFlowProvider>
  );
}

function CanvasEditorInner({ canvas }: CanvasEditorProps) {
  const qc = useQueryClient();
  const canvasId = canvas.id;
  const reactFlow = useReactFlow();

  // ----- Local state mirrors of remote nodes/edges -----
  const [expandedSet, setExpandedSet] = React.useState<Set<string>>(
    () => new Set(),
  );
  const [runningRuns, setRunningRuns] = React.useState<
    Record<string, string /* skillRunId */>
  >({});
  const [pendingDelete, setPendingDelete] = React.useState<NodeOut | null>(
    null,
  );
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(
    null,
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
      // We render handles in the custom node, not the default
      sourcePosition: undefined,
      targetPosition: undefined,
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
      style: { stroke: "#6366f1", strokeWidth: 2 },
    }),
    [],
  );

  const [rfNodes, setRfNodes] = React.useState<RfNode<RfNodeData>[]>(() =>
    canvas.nodes.map(buildRfNode),
  );
  const [rfEdges, setRfEdges] = React.useState<RfEdge[]>(() =>
    canvas.edges.map(buildRfEdge),
  );

  // Re-sync from server data when the underlying canvas object changes (refetch
  // after a skill run, on hard reload, etc.). We preserve in-flight expanded state.
  const lastCanvasRef = React.useRef(canvas);
  React.useEffect(() => {
    if (canvas === lastCanvasRef.current) return;
    lastCanvasRef.current = canvas;
    setRfNodes(canvas.nodes.map(buildRfNode));
    setRfEdges(canvas.edges.map(buildRfEdge));
  }, [canvas, buildRfNode, buildRfEdge]);

  // When expanded set changes, propagate to existing rf nodes without
  // rebuilding from scratch.
  React.useEffect(() => {
    setRfNodes((prev) =>
      prev.map((n) => ({
        ...n,
        data: {
          ...n.data,
          expanded: expandedSet.has(n.id),
        },
      })),
    );
  }, [expandedSet]);

  // ----- Helpers to mutate rf nodes' embedded NodeOut snapshot -----
  const patchRfNodeSnapshot = React.useCallback(
    (nodeId: string, patcher: (prev: NodeOut) => NodeOut) => {
      setRfNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                data: {
                  ...n.data,
                  node: patcher(n.data.node),
                },
              }
            : n,
        ),
      );
    },
    [],
  );

  const getNodeSnapshot = React.useCallback(
    (nodeId: string): NodeOut | undefined => {
      return rfNodes.find((n) => n.id === nodeId)?.data.node;
    },
    [rfNodes],
  );

  // ----- Position autosave (debounced per-node) -----
  const positionDebouncesRef = React.useRef<
    Map<string, ReturnType<typeof setTimeout>>
  >(new Map());

  const flushPosition = React.useCallback(
    (nodeId: string, x: number, y: number) => {
      const existing = positionDebouncesRef.current.get(nodeId);
      if (existing) clearTimeout(existing);
      const t = setTimeout(() => {
        positionDebouncesRef.current.delete(nodeId);
        void updateNode(nodeId, { position_x: x, position_y: y }).catch(
          (err) => {
            toast.error(
              err instanceof ApiError
                ? err.detail
                : "Could not save node position",
            );
          },
        );
      }, 300);
      positionDebouncesRef.current.set(nodeId, t);
    },
    [],
  );

  React.useEffect(() => {
    return () => {
      // Flush all pending position saves on unmount.
      positionDebouncesRef.current.forEach((t) => clearTimeout(t));
      positionDebouncesRef.current.clear();
    };
  }, []);

  // ----- React Flow event handlers -----
  const onNodesChange: OnNodesChange = React.useCallback((changes) => {
    setRfNodes((prev) => {
      const next = applyNodeChanges(changes, prev) as RfNode<RfNodeData>[];
      return next;
    });
    // Track selection changes
    for (const ch of changes) {
      if (ch.type === "select") {
        if (ch.selected) setSelectedNodeId(ch.id);
        else
          setSelectedNodeId((cur) => (cur === ch.id ? null : cur));
      }
    }
  }, []);

  const onEdgesChange: OnEdgesChange = React.useCallback((changes) => {
    setRfEdges((prev) => applyEdgeChanges(changes, prev));
  }, []);

  const onNodeDragStop = React.useCallback(
    (_event: unknown, node: RfNode) => {
      flushPosition(node.id, node.position.x, node.position.y);
    },
    [flushPosition],
  );

  // ----- Edge create -----
  const createEdgeMutation = useMutation({
    mutationFn: (input: { source: string; target: string }) =>
      createEdge(canvasId, {
        source_node_id: input.source,
        target_node_id: input.target,
      }),
    onSuccess: (created) => {
      setRfEdges((prev) => {
        // Replace the optimistic edge (which has a different id) with the real one.
        const filtered = prev.filter(
          (e) =>
            !(
              e.source === created.source_node_id &&
              e.target === created.target_node_id &&
              e.id.startsWith("optimistic-")
            ),
        );
        return [...filtered, buildRfEdge(created)];
      });
    },
    onError: (err, vars) => {
      // Roll back the optimistic edge.
      setRfEdges((prev) =>
        prev.filter(
          (e) =>
            !(
              e.source === vars.source &&
              e.target === vars.target &&
              e.id.startsWith("optimistic-")
            ),
        ),
      );
      toast.error(
        err instanceof ApiError ? err.detail : "Could not create connection",
      );
    },
  });

  const onConnect: OnConnect = React.useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      if (connection.source === connection.target) return;
      const sourceNode = getNodeSnapshot(connection.source);
      const targetNode = getNodeSnapshot(connection.target);
      if (!sourceNode || !targetNode) return;

      if (!isValidConnectionTypes(sourceNode.type, targetNode.type)) {
        toast.error(
          `Invalid connection: ${sourceNode.type} → ${targetNode.type}`,
        );
        return;
      }

      // Optimistic add.
      const optimisticId = `optimistic-${connection.source}-${connection.target}-${Date.now()}`;
      setRfEdges((prev) =>
        addEdge(
          {
            ...connection,
            id: optimisticId,
            type: "default",
            style: { stroke: "#6366f1", strokeWidth: 2, opacity: 0.6 },
          },
          prev,
        ),
      );

      createEdgeMutation.mutate({
        source: connection.source,
        target: connection.target,
      });
    },
    [createEdgeMutation, getNodeSnapshot],
  );

  // ----- Edge delete (immediate, no confirm) -----
  const onEdgesDelete = React.useCallback(
    (edges: RfEdge[]) => {
      for (const e of edges) {
        if (e.id.startsWith("optimistic-")) continue;
        void deleteEdge(e.id).catch((err) => {
          toast.error(
            err instanceof ApiError ? err.detail : "Could not delete edge",
          );
        });
      }
    },
    [],
  );

  // ----- Node delete (with confirm dialog) -----
  // React Flow fires onNodesDelete after applyNodeChanges removes them locally.
  // We block that path by *not* allowing the change in onNodesChange when we
  // want to confirm. Simpler: listen for delete-key on selection ourselves.
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Backspace" && e.key !== "Delete") return;
      const target = e.target as HTMLElement | null;
      // Don't intercept when typing in inputs
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (!selectedNodeId) return;
      const snap = getNodeSnapshot(selectedNodeId);
      if (!snap) return;
      e.preventDefault();
      setPendingDelete(snap);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedNodeId, getNodeSnapshot]);

  const deleteNodeMutation = useMutation({
    mutationFn: (nodeId: string) => deleteNode(nodeId),
    onSuccess: (_data, nodeId) => {
      setRfNodes((prev) => prev.filter((n) => n.id !== nodeId));
      setRfEdges((prev) =>
        prev.filter((e) => e.source !== nodeId && e.target !== nodeId),
      );
      setPendingDelete(null);
      setSelectedNodeId((cur) => (cur === nodeId ? null : cur));
      qc.invalidateQueries({ queryKey: ["canvas", canvasId] });
    },
    onError: (err) => {
      toast.error(
        err instanceof ApiError ? err.detail : "Could not delete node",
      );
      setPendingDelete(null);
    },
  });

  // ----- Add node from toolbar -----
  const createNodeMutation = useMutation({
    mutationFn: (input: { type: NodeType; x: number; y: number }) =>
      createNode(canvasId, {
        type: input.type,
        position_x: input.x,
        position_y: input.y,
        data: defaultDataForType(input.type),
      }),
    onSuccess: (created) => {
      setRfNodes((prev) => [...prev, buildRfNode(created)]);
      qc.invalidateQueries({ queryKey: ["canvas", canvasId] });
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : "Could not create node",
      ),
  });

  const handleAddNode = React.useCallback(
    (type: NodeType) => {
      // Use the React Flow viewport to drop new nodes near the user's view,
      // staggered so they don't stack.
      const viewport = reactFlow.getViewport();
      // The screen-center in flow coordinates:
      const flowEl = document.querySelector(".react-flow") as HTMLElement | null;
      const rect = flowEl?.getBoundingClientRect();
      const centerScreen = rect
        ? { x: rect.width / 2, y: rect.height / 2 }
        : { x: 200, y: 200 };
      // Inverse zoom transform.
      const baseX = (centerScreen.x - viewport.x) / viewport.zoom;
      const baseY = (centerScreen.y - viewport.y) / viewport.zoom;
      const offset = (rfNodes.length % 6) * 32;
      createNodeMutation.mutate({
        type,
        x: baseX - 160 + offset,
        y: baseY - 60 + offset,
      });
    },
    [createNodeMutation, reactFlow, rfNodes.length],
  );

  // ----- Update node data (used by node components on blur, hook selection, etc.) -----
  const updateDataMutation = useMutation({
    mutationFn: (input: { nodeId: string; data: Record<string, unknown> }) =>
      updateNode(input.nodeId, { data: input.data }),
    onError: (err) => {
      toast.error(
        err instanceof ApiError ? err.detail : "Could not save changes",
      );
    },
  });

  const updateNodeData = React.useCallback(
    async (nodeId: string, patch: Record<string, unknown>) => {
      const snap = getNodeSnapshot(nodeId);
      if (!snap) return;
      const merged: Record<string, unknown> = {
        ...(snap.data as Record<string, unknown>),
        ...patch,
      };
      // Optimistic UI update.
      patchRfNodeSnapshot(nodeId, (prev) => ({ ...prev, data: merged }));
      try {
        const updated = await updateDataMutation.mutateAsync({
          nodeId,
          data: merged,
        });
        patchRfNodeSnapshot(nodeId, () => updated);
      } catch {
        // Rollback to original on failure.
        patchRfNodeSnapshot(nodeId, () => snap);
      }
    },
    [getNodeSnapshot, patchRfNodeSnapshot, updateDataMutation],
  );

  // ----- Skill runs -----
  const setLocalStatus = React.useCallback(
    (nodeId: string, status: NodeStatus) => {
      patchRfNodeSnapshot(nodeId, (prev) => ({ ...prev, status }));
    },
    [patchRfNodeSnapshot],
  );

  const subscriptionsRef = React.useRef<Map<string, () => void>>(new Map());

  // Cleanup all in-flight subscriptions on unmount.
  React.useEffect(() => {
    return () => {
      subscriptionsRef.current.forEach((unsub) => unsub());
      subscriptionsRef.current.clear();
    };
  }, []);

  /**
   * Wire a skill-run id (whether from a /run or a transcription endpoint) into
   * the canvas's polling lifecycle: tracks running state, refetches on
   * complete, surfaces failures via toast.
   */
  const attachSubscription = React.useCallback(
    (nodeId: string, skillRunId: string, successMessage: string) => {
      // Already wired?
      if (subscriptionsRef.current.has(nodeId)) return;
      setLocalStatus(nodeId, "running");
      setRunningRuns((prev) => ({ ...prev, [nodeId]: skillRunId }));

      const unsub = subscribeSkillRun(skillRunId, {
        onComplete: async () => {
          try {
            const fresh = await getCanvas(canvasId);
            qc.setQueryData<CanvasDetail | undefined>(
              ["canvas", canvasId],
              fresh,
            );
            toast.success(successMessage);
          } catch (err) {
            toast.error(
              err instanceof ApiError
                ? err.detail
                : "Run completed but refresh failed",
            );
          } finally {
            subscriptionsRef.current.delete(nodeId);
            setRunningRuns((prev) => {
              const next = { ...prev };
              delete next[nodeId];
              return next;
            });
          }
        },
        onError: (msg) => {
          setLocalStatus(nodeId, "error");
          subscriptionsRef.current.delete(nodeId);
          setRunningRuns((prev) => {
            const next = { ...prev };
            delete next[nodeId];
            return next;
          });
          toast.error(msg);
        },
      });

      subscriptionsRef.current.set(nodeId, unsub);
    },
    [canvasId, qc, setLocalStatus],
  );

  const startRun = React.useCallback(
    async (nodeId: string) => {
      const snap = getNodeSnapshot(nodeId);
      if (!snap) return;
      if (snap.type === "source") {
        toast.error("Source nodes don't run skills");
        return;
      }
      if (subscriptionsRef.current.has(nodeId)) return;

      try {
        setLocalStatus(nodeId, "running");
        const { skill_run_id } = await runNodeApi(nodeId);
        attachSubscription(nodeId, skill_run_id, "Skill run completed");
      } catch (err) {
        setLocalStatus(nodeId, "error");
        toast.error(
          err instanceof ApiError ? err.detail : "Could not start skill run",
        );
      }
    },
    [attachSubscription, getNodeSnapshot, setLocalStatus],
  );

  const attachSkillRun = React.useCallback(
    (nodeId: string, skillRunId: string) => {
      attachSubscription(nodeId, skillRunId, "Transcription complete");
    },
    [attachSubscription],
  );

  // ----- Bulk run-all -----
  const runnableCount = React.useMemo(() => {
    return rfNodes.filter(
      (n) => n.data.node.type === "extract" || n.data.node.type === "format",
    ).length;
  }, [rfNodes]);

  const runAllMutation = useMutation({
    mutationFn: () => runAllOnCanvas(canvasId),
    onSuccess: async (result) => {
      const started = result.skill_runs.length;
      toast.success(
        `Started ${started} ${started === 1 ? "run" : "runs"} · Skipped ${
          result.skipped
        }`,
      );
      // Wire each started run to the per-node subscription pipeline. The
      // backend response carries `skill_run_id` only — resolve `node_id`
      // lazily via GET /skill-runs/{id} when missing.
      await Promise.all(
        result.skill_runs.map(async (s) => {
          let nodeId = s.node_id;
          if (!nodeId) {
            try {
              const run = await getSkillRun(s.skill_run_id);
              nodeId = run.node_id;
            } catch {
              return;
            }
          }
          attachSubscription(
            nodeId,
            s.skill_run_id,
            "Skill run completed",
          );
        }),
      );
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : "Could not start bulk run",
      ),
  });

  const isRunning = React.useCallback(
    (nodeId: string) => !!runningRuns[nodeId],
    [runningRuns],
  );

  // ----- Sidebar toggle -----
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const selectedNode = React.useMemo(
    () => (selectedNodeId ? getNodeSnapshot(selectedNodeId) ?? null : null),
    [selectedNodeId, getNodeSnapshot],
  );

  // ----- Render -----
  const ctxValue = React.useMemo(
    () => ({
      updateNodeData,
      runNode: (id: string) => {
        void startRun(id);
      },
      attachSkillRun,
      setRunningStatus: setLocalStatus,
      getNode: getNodeSnapshot,
      isRunning,
    }),
    [
      updateNodeData,
      startRun,
      attachSkillRun,
      setLocalStatus,
      getNodeSnapshot,
      isRunning,
    ],
  );

  return (
    <CanvasNodeContext.Provider value={ctxValue}>
      <div className="flex flex-1 overflow-hidden">
        <div className="relative flex-1 bg-[#000]">
          <CanvasToolbar
            onAddNode={handleAddNode}
            busy={createNodeMutation.isPending}
          />
          <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
            <button
              type="button"
              onClick={() => runAllMutation.mutate()}
              disabled={runAllMutation.isPending || runnableCount === 0}
              title={
                runnableCount === 0
                  ? "No extract or format nodes on this canvas"
                  : "Run every runnable extract/format node"
              }
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#11140E]/95 px-3 py-1.5 text-xs font-medium text-zinc-300 shadow-xl backdrop-blur hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {runAllMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Zap className="h-3.5 w-3.5" />
              )}
              Run all
            </button>
            {!sidebarOpen && (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#11140E]/95 px-3 py-1.5 text-xs font-medium text-zinc-300 shadow-xl backdrop-blur hover:bg-white/5"
              >
                <BookOpen className="h-3.5 w-3.5" />
                Knowledge
              </button>
            )}
          </div>
          <ReactFlow<RfNode<RfNodeData>, RfEdge>
            nodes={rfNodes}
            edges={rfEdges}
            nodeTypes={NODE_TYPES}
            onNodesChange={onNodesChange as (changes: NodeChange[]) => void}
            onEdgesChange={onEdgesChange as (changes: EdgeChange[]) => void}
            onConnect={onConnect}
            onNodeDragStop={onNodeDragStop}
            onEdgesDelete={onEdgesDelete}
            // Disable React Flow's default Backspace delete — we handle it.
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
              className="!bg-[#11140E] !border-white/10 [&_button]:!bg-[#11140E] [&_button]:!border-white/10 [&_button]:!text-zinc-300 [&_button:hover]:!bg-white/5"
            />
            <MiniMap
              position="bottom-right"
              pannable
              zoomable
              className="!bg-[#11140E] !border-white/10"
              nodeColor={(n) => {
                if (n.type === "source") return "#3b82f6";
                if (n.type === "extract") return "#8b5cf6";
                if (n.type === "format") return "#10b981";
                return "#6366f1";
              }}
              maskColor="rgba(0,0,0,0.6)"
            />
          </ReactFlow>
        </div>
        {sidebarOpen && (
          <KnowledgeSidebar
            selectedNode={selectedNode}
            onClose={() => setSidebarOpen(false)}
            canvasProjectId={canvas.project_id}
          />
        )}
      </div>

      <Dialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete node?</DialogTitle>
            <DialogDescription>
              This removes the {pendingDelete?.type} node and all of its
              connections. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setPendingDelete(null)}
              disabled={deleteNodeMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                pendingDelete && deleteNodeMutation.mutate(pendingDelete.id)
              }
              disabled={deleteNodeMutation.isPending}
            >
              {deleteNodeMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CanvasNodeContext.Provider>
  );
}

function defaultDataForType(type: NodeType): Record<string, unknown> {
  if (type === "source") {
    return { input_type: "text", content: "" };
  }
  if (type === "extract") {
    return { talking_points: [], selected_index: null };
  }
  if (type === "format") {
    return {
      platform: "telegram",
      hooks: [],
      selected_hook_index: 0,
      body: "",
      cta: "",
      full_text: "",
      talking_point_text: "",
    };
  }
  return {};
}
