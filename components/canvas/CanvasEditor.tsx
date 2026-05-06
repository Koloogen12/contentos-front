"use client";

import * as React from "react";
import {
  Background,
  BackgroundVariant,
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
import { Loader2, Zap } from "lucide-react";

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
  SourceInputType,
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
import { CanvasToolbar, type CanvasTool } from "./CanvasToolbar";
import {
  CanvasSwatches,
  CanvasZoomControls,
} from "./CanvasZoomControls";
import { NodePicker, type NodePickerItem } from "./NodePicker";
import { ExtractNode } from "./nodes/ExtractNode";
import { FormatNode } from "./nodes/FormatNode";
import { SourceNode } from "./nodes/SourceNode";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

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

  const [runningRuns, setRunningRuns] = React.useState<
    Record<string, string /* skillRunId */>
  >({});
  const [pendingDelete, setPendingDelete] = React.useState<NodeOut | null>(
    null,
  );
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(
    null,
  );
  const [tool, setTool] = React.useState<CanvasTool>("select");
  const [pickerAt, setPickerAt] = React.useState<{
    x: number;
    y: number;
  } | null>(null);

  const buildRfNode = React.useCallback(
    (n: NodeOut): RfNode<RfNodeData> => ({
      id: n.id,
      type: n.type,
      position: { x: n.position_x, y: n.position_y },
      data: { node: n },
      sourcePosition: undefined,
      targetPosition: undefined,
    }),
    [],
  );

  const buildRfEdge = React.useCallback(
    (e: EdgeOut, runningSet: Set<string>): RfEdge => {
      const isRunning =
        runningSet.has(e.source_node_id) || runningSet.has(e.target_node_id);
      return {
        id: e.id,
        source: e.source_node_id,
        target: e.target_node_id,
        type: "default",
        animated: false,
        className: isRunning ? "co-edge-running" : undefined,
        style: {
          stroke: "var(--edge-stroke)",
          strokeWidth: 2,
        },
      };
    },
    [],
  );

  const [rfNodes, setRfNodes] = React.useState<RfNode<RfNodeData>[]>(() =>
    canvas.nodes.map(buildRfNode),
  );
  const [rfEdges, setRfEdges] = React.useState<RfEdge[]>(() =>
    canvas.edges.map((e) => buildRfEdge(e, new Set())),
  );

  // Re-sync from server data
  const lastCanvasRef = React.useRef(canvas);
  React.useEffect(() => {
    if (canvas === lastCanvasRef.current) return;
    lastCanvasRef.current = canvas;
    const runningSet = new Set(
      canvas.nodes.filter((n) => n.status === "running").map((n) => n.id),
    );
    setRfNodes(canvas.nodes.map(buildRfNode));
    setRfEdges(canvas.edges.map((e) => buildRfEdge(e, runningSet)));
  }, [canvas, buildRfNode, buildRfEdge]);

  // Restyle edges when running set changes
  React.useEffect(() => {
    const runningSet = new Set(Object.keys(runningRuns));
    // Augment with locally-known node statuses
    rfNodes.forEach((n) => {
      if (n.data.node.status === "running") runningSet.add(n.id);
    });
    setRfEdges((prev) =>
      prev.map((e) => {
        const isRun = runningSet.has(e.source) || runningSet.has(e.target);
        return {
          ...e,
          className: isRun ? "co-edge-running" : undefined,
        };
      }),
    );
  }, [runningRuns, rfNodes]);

  // ----- Node snapshot helpers -----
  const patchRfNodeSnapshot = React.useCallback(
    (nodeId: string, patcher: (prev: NodeOut) => NodeOut) => {
      setRfNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                data: { ...n.data, node: patcher(n.data.node) },
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

  // ----- Position autosave -----
  const positionDebouncesRef = React.useRef<
    Map<string, ReturnType<typeof setTimeout>>
  >(new Map());

  const flushPosition = React.useCallback(
    (nodeId: string, x: number, y: number) => {
      const existing = positionDebouncesRef.current.get(nodeId);
      if (existing) clearTimeout(existing);
      const tid = setTimeout(() => {
        positionDebouncesRef.current.delete(nodeId);
        void updateNode(nodeId, { position_x: x, position_y: y }).catch(
          (err) => {
            toast.error(
              err instanceof ApiError ? err.detail : "Не удалось сохранить позицию",
            );
          },
        );
      }, 300);
      positionDebouncesRef.current.set(nodeId, tid);
    },
    [],
  );

  React.useEffect(() => {
    return () => {
      positionDebouncesRef.current.forEach((tid) => clearTimeout(tid));
      positionDebouncesRef.current.clear();
    };
  }, []);

  // ----- React Flow handlers -----
  const onNodesChange: OnNodesChange = React.useCallback((changes) => {
    setRfNodes(
      (prev) => applyNodeChanges(changes, prev) as RfNode<RfNodeData>[],
    );
    for (const ch of changes) {
      if (ch.type === "select") {
        if (ch.selected) setSelectedNodeId(ch.id);
        else setSelectedNodeId((cur) => (cur === ch.id ? null : cur));
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
        const filtered = prev.filter(
          (e) =>
            !(
              e.source === created.source_node_id &&
              e.target === created.target_node_id &&
              e.id.startsWith("optimistic-")
            ),
        );
        return [...filtered, buildRfEdge(created, new Set())];
      });
    },
    onError: (err, vars) => {
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
        err instanceof ApiError ? err.detail : "Не удалось создать связь",
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
          `Недопустимое соединение: ${sourceNode.type} → ${targetNode.type}`,
        );
        return;
      }
      const optimisticId = `optimistic-${connection.source}-${connection.target}-${Date.now()}`;
      setRfEdges((prev) =>
        addEdge(
          {
            ...connection,
            id: optimisticId,
            type: "default",
            style: { stroke: "var(--edge-stroke)", strokeWidth: 2, opacity: 0.6 },
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

  const onEdgesDelete = React.useCallback((edges: RfEdge[]) => {
    for (const e of edges) {
      if (e.id.startsWith("optimistic-")) continue;
      void deleteEdge(e.id).catch((err) => {
        toast.error(
          err instanceof ApiError ? err.detail : "Не удалось удалить связь",
        );
      });
    }
  }, []);

  // ----- Node delete via Backspace -----
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Backspace" && e.key !== "Delete") return;
      const target = e.target as HTMLElement | null;
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
        err instanceof ApiError ? err.detail : "Не удалось удалить ноду",
      );
      setPendingDelete(null);
    },
  });

  // ----- Add node from picker -----
  const createNodeMutation = useMutation({
    mutationFn: (input: {
      type: NodeType;
      x: number;
      y: number;
      presetType?: SourceInputType;
    }) =>
      createNode(canvasId, {
        type: input.type,
        position_x: input.x,
        position_y: input.y,
        data: defaultDataForType(input.type, input.presetType),
      }),
    onSuccess: (created) => {
      setRfNodes((prev) => [...prev, buildRfNode(created)]);
      qc.invalidateQueries({ queryKey: ["canvas", canvasId] });
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : "Не удалось создать ноду",
      ),
  });

  const handlePickerPick = React.useCallback(
    (item: NodePickerItem) => {
      const viewport = reactFlow.getViewport();
      const flowEl = document.querySelector(".react-flow") as HTMLElement | null;
      const rect = flowEl?.getBoundingClientRect();
      const centerScreen = rect
        ? { x: rect.width / 2, y: rect.height / 2 }
        : { x: 200, y: 200 };
      const baseX = (centerScreen.x - viewport.x) / viewport.zoom;
      const baseY = (centerScreen.y - viewport.y) / viewport.zoom;
      const offset = (rfNodes.length % 6) * 32;
      createNodeMutation.mutate({
        type: item.type,
        x: baseX - 160 + offset,
        y: baseY - 60 + offset,
        presetType: item.presetType,
      });
      setPickerAt(null);
    },
    [createNodeMutation, reactFlow, rfNodes.length],
  );

  // ----- Update node data -----
  const updateDataMutation = useMutation({
    mutationFn: (input: { nodeId: string; data: Record<string, unknown> }) =>
      updateNode(input.nodeId, { data: input.data }),
    onError: (err) => {
      toast.error(
        err instanceof ApiError ? err.detail : "Не удалось сохранить изменения",
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
      patchRfNodeSnapshot(nodeId, (prev) => ({ ...prev, data: merged }));
      try {
        const updated = await updateDataMutation.mutateAsync({
          nodeId,
          data: merged,
        });
        patchRfNodeSnapshot(nodeId, () => updated);
      } catch {
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
  React.useEffect(() => {
    return () => {
      subscriptionsRef.current.forEach((unsub) => unsub());
      subscriptionsRef.current.clear();
    };
  }, []);

  const attachSubscription = React.useCallback(
    (nodeId: string, skillRunId: string, successMessage: string) => {
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
        toast.error("Source-ноды не запускают скиллы");
        return;
      }
      if (subscriptionsRef.current.has(nodeId)) return;
      try {
        setLocalStatus(nodeId, "running");
        const { skill_run_id } = await runNodeApi(nodeId);
        attachSubscription(nodeId, skill_run_id, t.canvas.skillCompleted);
      } catch (err) {
        setLocalStatus(nodeId, "error");
        toast.error(
          err instanceof ApiError ? err.detail : t.canvas.couldNotStartRun,
        );
      }
    },
    [attachSubscription, getNodeSnapshot, setLocalStatus],
  );

  const attachSkillRun = React.useCallback(
    (nodeId: string, skillRunId: string) => {
      attachSubscription(nodeId, skillRunId, t.canvas.transcriptionDone);
    },
    [attachSubscription],
  );

  // ----- Run all -----
  const runnableCount = React.useMemo(() => {
    return rfNodes.filter(
      (n) => n.data.node.type === "extract" || n.data.node.type === "format",
    ).length;
  }, [rfNodes]);

  const runAllMutation = useMutation({
    mutationFn: () => runAllOnCanvas(canvasId),
    onSuccess: async (result) => {
      const started = result.skill_runs.length;
      toast.success(`Запущено ${started}, пропущено ${result.skipped}`);
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
          attachSubscription(nodeId, s.skill_run_id, t.canvas.skillCompleted);
        }),
      );
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : "Не удалось запустить пайплайн",
      ),
  });

  const onRunAll = React.useCallback(() => {
    toast.info(t.canvas.pipelineStarted, { duration: 2400 });
    runAllMutation.mutate();
  }, [runAllMutation]);

  const isRunning = React.useCallback(
    (nodeId: string) => !!runningRuns[nodeId],
    [runningRuns],
  );

  const pipelineRunning =
    Object.keys(runningRuns).length > 0 || runAllMutation.isPending;

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
      <div className="relative flex-1 co-canvas-surface">
        {pipelineRunning && (
          <div className="co-run-badge">
            <Loader2 size={14} className="animate-spin" />
            {t.canvas.pipelineRunning}
          </div>
        )}

        {/* Run-all action — top-right */}
        <button
          type="button"
          onClick={onRunAll}
          disabled={runAllMutation.isPending || runnableCount === 0}
          title={
            runnableCount === 0
              ? "Нет нод для запуска"
              : t.canvas.runAll
          }
          className={cn(
            "absolute right-4 top-4 z-30 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/55 px-3 py-1.5 text-xs font-medium text-white backdrop-blur",
            "hover:bg-black/70 disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          {runAllMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Zap className="h-3.5 w-3.5" />
          )}
          {t.canvas.runAll}
        </button>

        <ReactFlow<RfNode<RfNodeData>, RfEdge>
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={NODE_TYPES}
          onNodesChange={onNodesChange as (changes: NodeChange[]) => void}
          onEdgesChange={onEdgesChange as (changes: EdgeChange[]) => void}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          onEdgesDelete={onEdgesDelete}
          deleteKeyCode={null}
          fitView
          fitViewOptions={{ padding: 0.2, maxZoom: 1.2 }}
          proOptions={{ hideAttribution: true }}
          colorMode="dark"
          panOnDrag={tool === "pan" || tool === "select"}
          panOnScroll
          selectionOnDrag={tool === "select"}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={11}
            size={0.75}
            color="rgba(255,255,255,0.1)"
          />
        </ReactFlow>

        {/* Bottom-center toolbar */}
        <CanvasToolbar
          tool={tool}
          setTool={setTool}
          onAddNode={() =>
            setPickerAt({
              x: window.innerWidth / 2 - 128,
              y: window.innerHeight - 380,
            })
          }
        />

        {/* Bottom-left zoom */}
        <CanvasZoomControls />

        {/* Bottom-right swatches */}
        <CanvasSwatches />

        {pickerAt && (
          <NodePicker
            x={pickerAt.x}
            y={pickerAt.y}
            onPick={handlePickerPick}
            onClose={() => setPickerAt(null)}
          />
        )}
      </div>

      <Dialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить ноду?</DialogTitle>
            <DialogDescription>
              Будет удалена нода и все её связи. Действие необратимо.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setPendingDelete(null)}
              disabled={deleteNodeMutation.isPending}
            >
              {t.common.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                pendingDelete && deleteNodeMutation.mutate(pendingDelete.id)
              }
              disabled={deleteNodeMutation.isPending}
            >
              {deleteNodeMutation.isPending ? "Удаление…" : t.common.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CanvasNodeContext.Provider>
  );
}

function defaultDataForType(
  type: NodeType,
  presetType?: SourceInputType,
): Record<string, unknown> {
  if (type === "source") {
    return { input_type: presetType ?? "text", content: "" };
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
