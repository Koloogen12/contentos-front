"use client";

import * as React from "react";
import {
  Background,
  BackgroundVariant,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
  useStore,
  type Connection,
  type Edge as RfEdge,
  type EdgeChange,
  type MiniMapNodeProps,
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
import { getCanvas as fetchCanvas, runAllOnCanvas } from "@/lib/canvases";
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
  ExtractNodeData,
  FormatNodeData,
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
import { CanvasZoomControls } from "./CanvasZoomControls";
import { NodePicker, type NodePickerItem, type NodePickerMode } from "./NodePicker";
import { ExtractNode } from "./nodes/ExtractNode";
import { FormatNode } from "./nodes/FormatNode";
import { SourceNode } from "./nodes/SourceNode";
import { TweaksPanel } from "./TweaksPanel";
import {
  type AnyClientObject,
  type ArrowObject,
  type ClientObject,
  type ClientObjectKind,
  ArrowOverlay,
  CommentNode,
  NoteNode,
  TextNode,
  loadClientObjects,
  makeId,
  makeRfNodeForClientObject,
  saveClientObjects,
} from "./ClientObjects";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface CanvasEditorProps {
  canvas: CanvasDetail;
}

const NODE_TYPES: NodeTypes = {
  source: SourceNode,
  extract: ExtractNode,
  format: FormatNode,
  "co-note": NoteNode,
  "co-comment": CommentNode,
  "co-text": TextNode,
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

const TWEAKS_COLLAPSED_KEY = "contentos.tweaks-panel.collapsed";

const MINI_TYPE_ABBR: Record<string, string> = {
  source: "SRC",
  extract: "EXT",
  format: "FMT",
};

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
  const transform = useStore((s) => s.transform);

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
  const [picker, setPicker] = React.useState<{
    mode: NodePickerMode;
    flowPosition?: { x: number; y: number };
  } | null>(null);

  // ---- Tweaks panel collapse state ----
  const [tweaksCollapsed, setTweaksCollapsed] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    setTweaksCollapsed(
      window.localStorage.getItem(TWEAKS_COLLAPSED_KEY) === "1",
    );
  }, []);

  const closeTweaks = React.useCallback(() => {
    setTweaksCollapsed(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(TWEAKS_COLLAPSED_KEY, "1");
    }
  }, []);

  // ---- Client-side objects (note/comment/text/arrow) ----
  const [clientObjects, setClientObjects] = React.useState<AnyClientObject[]>(
    () => loadClientObjects(canvasId),
  );
  const [arrowDraft, setArrowDraft] = React.useState<{
    from: { x: number; y: number };
  } | null>(null);
  const [selectedClientId, setSelectedClientId] = React.useState<string | null>(
    null,
  );
  const [hasShownLocalToast, setHasShownLocalToast] = React.useState(false);

  React.useEffect(() => {
    saveClientObjects(canvasId, clientObjects);
  }, [canvasId, clientObjects]);

  const updateClientText = React.useCallback(
    (id: string, text: string) => {
      setClientObjects((prev) =>
        prev.map((o) =>
          o.id === id && o.kind !== "arrow" ? { ...o, text } : o,
        ),
      );
    },
    [],
  );

  const deleteClientObject = React.useCallback((id: string) => {
    setClientObjects((prev) => prev.filter((o) => o.id !== id));
    setSelectedClientId((cur) => (cur === id ? null : cur));
  }, []);

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
    rfNodes.forEach((n) => {
      if (n.data?.node?.status === "running") runningSet.add(n.id);
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

  // ----- Combine server + client RF nodes -----
  const allRfNodes = React.useMemo<RfNode<Record<string, unknown>>[]>(() => {
    const clientRfNodes = clientObjects
      .filter((o): o is ClientObject => o.kind !== "arrow")
      .map((o) =>
        makeRfNodeForClientObject(o, {
          onTextChange: updateClientText,
          onDelete: deleteClientObject,
        }),
      );
    return [...rfNodes, ...clientRfNodes] as RfNode<Record<string, unknown>>[];
  }, [rfNodes, clientObjects, updateClientText, deleteClientObject]);

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
    // Split changes between server nodes (rfNodes) and client objects.
    const clientIds = new Set<string>();
    setClientObjects((prev) => {
      prev.forEach((o) => {
        if (o.kind !== "arrow") clientIds.add(o.id);
      });
      return prev;
    });
    const serverChanges: NodeChange[] = [];
    const clientChanges: NodeChange[] = [];
    for (const ch of changes) {
      const id = "id" in ch ? (ch as { id?: string }).id : undefined;
      if (id && clientIds.has(id)) clientChanges.push(ch);
      else serverChanges.push(ch);
    }
    if (serverChanges.length > 0) {
      setRfNodes(
        (prev) =>
          applyNodeChanges(serverChanges, prev) as RfNode<RfNodeData>[],
      );
    }
    // Apply position/select changes to client objects.
    if (clientChanges.length > 0) {
      setClientObjects((prev) =>
        prev.map((o) => {
          if (o.kind === "arrow") return o;
          const ch = clientChanges.find(
            (c) => "id" in c && (c as { id?: string }).id === o.id,
          );
          if (!ch) return o;
          if (ch.type === "position" && ch.position) {
            return { ...o, x: ch.position.x, y: ch.position.y };
          }
          return o;
        }),
      );
    }
    for (const ch of changes) {
      if (ch.type === "select") {
        const id = ch.id;
        if (clientIds.has(id)) {
          if (ch.selected) setSelectedClientId(id);
          else
            setSelectedClientId((cur) => (cur === id ? null : cur));
        } else {
          if (ch.selected) setSelectedNodeId(id);
          else setSelectedNodeId((cur) => (cur === id ? null : cur));
        }
      }
    }
  }, []);

  const onEdgesChange: OnEdgesChange = React.useCallback((changes) => {
    setRfEdges((prev) => applyEdgeChanges(changes, prev));
  }, []);

  const onNodeDragStop = React.useCallback(
    (_event: unknown, node: RfNode) => {
      // Only persist server nodes' positions; client positions are saved via state.
      const isClient = clientObjects.some(
        (o) => o.kind !== "arrow" && o.id === node.id,
      );
      if (isClient) return;
      flushPosition(node.id, node.position.x, node.position.y);
    },
    [flushPosition, clientObjects],
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
      if (e.key === "Escape") {
        if (tool !== "select") setTool("select");
        if (arrowDraft) setArrowDraft(null);
        return;
      }
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
      // Prefer client object selection.
      if (selectedClientId) {
        e.preventDefault();
        deleteClientObject(selectedClientId);
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
  }, [
    selectedNodeId,
    selectedClientId,
    deleteClientObject,
    getNodeSnapshot,
    tool,
    arrowDraft,
  ]);

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
      const flowPos = picker?.flowPosition;
      let x: number;
      let y: number;
      if (flowPos) {
        // Spawned at click position from double-click.
        x = flowPos.x - 160;
        y = flowPos.y - 60;
      } else {
        // Centered above viewport.
        const viewport = reactFlow.getViewport();
        const flowEl = document.querySelector(".react-flow") as HTMLElement | null;
        const rect = flowEl?.getBoundingClientRect();
        const centerScreen = rect
          ? { x: rect.width / 2, y: rect.height / 2 }
          : { x: 200, y: 200 };
        const baseX = (centerScreen.x - viewport.x) / viewport.zoom;
        const baseY = (centerScreen.y - viewport.y) / viewport.zoom;
        const offset = (rfNodes.length % 6) * 32;
        x = baseX - 160 + offset;
        y = baseY - 60 + offset;
      }
      createNodeMutation.mutate({
        type: item.type,
        x,
        y,
        presetType: item.presetType,
      });
      setPicker(null);
    },
    [createNodeMutation, picker, reactFlow, rfNodes.length],
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
            const fresh = await fetchCanvas(canvasId);
            qc.setQueryData<CanvasDetail | undefined>(
              ["canvas", canvasId],
              fresh,
            );
            toast.success(successMessage);
          } catch (err) {
            toast.error(
              err instanceof ApiError
                ? err.detail
                : "Скилл завершён, но обновить канвас не удалось",
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

  /**
   * Detect whether the canvas has any extract with 2+ format children
   * attached. When true, the per-format `source_talking_point_index`
   * trick (patch parent → run) becomes racy under the server-side
   * parallel run-all, so we fall back to a sequential client-driven
   * coordinator.
   */
  const hasMultiFormatExtract = React.useCallback((): boolean => {
    const counts = new Map<string, number>();
    for (const e of canvas.edges) {
      const src = canvas.nodes.find((n) => n.id === e.source_node_id);
      const tgt = canvas.nodes.find((n) => n.id === e.target_node_id);
      if (!src || !tgt) continue;
      if (src.type !== "extract" || tgt.type !== "format") continue;
      counts.set(src.id, (counts.get(src.id) ?? 0) + 1);
    }
    for (const c of counts.values()) {
      if (c >= 2) return true;
    }
    return false;
  }, [canvas.edges, canvas.nodes]);

  const [sequentialRunning, setSequentialRunning] = React.useState(false);

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

  /**
   * Sequential client-side run-all (Requirement A / D2).
   *
   * Used only when at least one extract has 2+ attached format nodes —
   * those formats need different parent.selected_index values, so we
   * cannot rely on the server-side parallel run-all. The flow:
   *
   *   1. Run every extract via the single-node /run endpoint and await
   *      completion, so format runs see fresh talking_points.
   *   2. For each format (in document order), PATCH its parent extract's
   *      `selected_index` to the format's `source_talking_point_index`,
   *      wait 250ms for cache propagation, then start /run and await
   *      completion before moving on.
   *   3. Show a single toast that updates as each format completes.
   *
   * Limitation: a format with no upstream extract is just /run'd as-is.
   * If a parent extract /run fails, downstream formats still try to run
   * against whatever (possibly stale) talking_points are present.
   */
  const runAllSequentially = React.useCallback(async () => {
    setSequentialRunning(true);
    try {
      const snapshot = canvasSnapshotRef.current;
      const nodes = snapshot.nodes;
      const edges = snapshot.edges;
      const extracts = nodes.filter((n) => n.type === "extract");
      const formats = nodes.filter((n) => n.type === "format");

      // 1. Run extracts (which have an upstream source). Skip extracts
      // that already have talking_points from a previous run — re-running
      // unnecessarily would lose user edits and is the user's call.
      const extractRunPromises: Promise<void>[] = [];
      for (const ex of extracts) {
        const data = ex.data as ExtractNodeData;
        if ((data.talking_points ?? []).length > 0 && ex.status === "done") {
          continue;
        }
        // Only auto-run extracts that have an upstream source attached.
        const hasSource = edges.some((e) => e.target_node_id === ex.id);
        if (!hasSource) continue;
        extractRunPromises.push(
          new Promise<void>((resolve) => {
            void (async () => {
              try {
                setLocalStatus(ex.id, "running");
                const { skill_run_id } = await runNodeApi(ex.id);
                attachSubscription(
                  ex.id,
                  skill_run_id,
                  t.canvas.skillCompleted,
                );
                // Wait for extract to leave "running" via subscription.
                await waitUntilNotRunning(ex.id);
              } catch (err) {
                toast.error(
                  err instanceof ApiError
                    ? err.detail
                    : t.canvas.couldNotStartRun,
                );
                setLocalStatus(ex.id, "error");
              } finally {
                resolve();
              }
            })();
          }),
        );
      }
      await Promise.all(extractRunPromises);

      // 2. Sequentially run each format with its own parent-selected idx.
      const total = formats.length;
      if (total === 0) return;
      const toastId = `run-all-${canvasId}`;
      toast.info(`Запускаю ${total} ${pluralPosts(total)}: 0/${total}`, {
        id: toastId,
        duration: Infinity,
      });
      let done = 0;
      for (const fmt of formats) {
        const fmtData = fmt.data as FormatNodeData;
        // Find parent extract by re-reading the snapshot — it may have
        // been updated by a previous format run's parent-PATCH.
        const live = canvasSnapshotRef.current;
        const parentEdge = live.edges.find(
          (e) => e.target_node_id === fmt.id,
        );
        const parent =
          parentEdge &&
          live.nodes.find(
            (n) => n.id === parentEdge.source_node_id && n.type === "extract",
          );
        if (parent) {
          const parentData = parent.data as ExtractNodeData;
          const desired =
            typeof fmtData.source_talking_point_index === "number"
              ? fmtData.source_talking_point_index
              : (parentData.selected_index ?? 0);
          if ((parentData.selected_index ?? null) !== desired) {
            try {
              await updateNodeData(parent.id, { selected_index: desired });
            } catch {
              // updateNodeData toasts; carry on with the run anyway.
            }
            await new Promise((r) => setTimeout(r, 250));
          }
        }
        try {
          setLocalStatus(fmt.id, "running");
          const { skill_run_id } = await runNodeApi(fmt.id);
          attachSubscription(fmt.id, skill_run_id, t.canvas.skillCompleted);
          await waitUntilNotRunning(fmt.id);
        } catch (err) {
          toast.error(
            err instanceof ApiError
              ? err.detail
              : t.canvas.couldNotStartRun,
          );
          setLocalStatus(fmt.id, "error");
        } finally {
          done += 1;
          toast.info(
            `Запускаю ${total} ${pluralPosts(total)}: ${done}/${total}`,
            { id: toastId, duration: Infinity },
          );
        }
      }
      toast.success(`Готово: ${done}/${total}`, { id: toastId, duration: 3000 });
    } finally {
      setSequentialRunning(false);
    }
  }, [canvasId, attachSubscription, setLocalStatus, updateNodeData]);

  // Helper: poll local "running set" until the node leaves running. The
  // `attachSubscription` subscribes to the SSE stream and clears the run
  // entry on completion, so we can simply await that.
  const runningRunsRef = React.useRef(runningRuns);
  React.useEffect(() => {
    runningRunsRef.current = runningRuns;
  }, [runningRuns]);

  const waitUntilNotRunning = React.useCallback(
    (nodeId: string, timeoutMs = 120_000) =>
      new Promise<void>((resolve) => {
        const start = Date.now();
        const check = () => {
          if (!runningRunsRef.current[nodeId]) {
            resolve();
            return;
          }
          if (Date.now() - start > timeoutMs) {
            resolve(); // bail out — the run can keep running in background
            return;
          }
          setTimeout(check, 200);
        };
        // Give the subscription one tick to register the entry first.
        setTimeout(check, 50);
      }),
    [],
  );

  const onRunAll = React.useCallback(() => {
    toast.info(t.canvas.pipelineStarted, { duration: 2400 });
    if (hasMultiFormatExtract()) {
      void runAllSequentially();
    } else {
      runAllMutation.mutate();
    }
  }, [hasMultiFormatExtract, runAllSequentially, runAllMutation]);

  const isRunning = React.useCallback(
    (nodeId: string) => !!runningRuns[nodeId],
    [runningRuns],
  );

  const pipelineRunning =
    Object.keys(runningRuns).length > 0 ||
    runAllMutation.isPending ||
    sequentialRunning;

  // Live canvas snapshot — kept in a ref so a stable `getCanvas` closure
  // returns the latest server-side nodes/edges without forcing every
  // FormatNode subtree to re-memoize on each canvas refetch. The shape
  // mirrors the source-of-truth React-Flow snapshot for nodes (so optimistic
  // local PATCHes show up) and uses the prop's edges array.
  const canvasSnapshotRef = React.useRef<CanvasDetail>(canvas);
  React.useEffect(() => {
    canvasSnapshotRef.current = {
      ...canvas,
      nodes: rfNodes.map((n) => n.data.node),
      edges: canvas.edges,
    };
  }, [canvas, rfNodes]);

  const getCanvas = React.useCallback(
    (): CanvasDetail | undefined => canvasSnapshotRef.current,
    [],
  );

  const ctxValue = React.useMemo(
    () => ({
      updateNodeData,
      runNode: (id: string) => {
        void startRun(id);
      },
      attachSkillRun,
      setRunningStatus: setLocalStatus,
      getNode: getNodeSnapshot,
      getCanvas,
      isRunning,
    }),
    [
      updateNodeData,
      startRun,
      attachSkillRun,
      setLocalStatus,
      getNodeSnapshot,
      getCanvas,
      isRunning,
    ],
  );

  // ----- Pane click / double-click handling for B2 + B3 -----
  const lastPaneClickRef = React.useRef<{ t: number; x: number; y: number } | null>(
    null,
  );

  const showLocalToastOnce = React.useCallback(() => {
    if (hasShownLocalToast) return;
    setHasShownLocalToast(true);
    toast.info("Заметка сохранена локально в твоём браузере", {
      description:
        "Эти объекты живут только в этом браузере (не на сервере).",
      duration: 4500,
    });
  }, [hasShownLocalToast]);

  const spawnClientObject = React.useCallback(
    (kind: ClientObjectKind, hint: { x: number; y: number }) => {
      const id = makeId();
      // Center the new object on the click position (subtract half-size).
      const halfW = kind === "note" ? 100 : kind === "comment" ? 120 : 40;
      const halfH = kind === "note" ? 80 : kind === "comment" ? 40 : 12;
      const defaultText =
        kind === "note" ? "Заметка..." : kind === "text" ? "Текст" : "";

      // The click's flow-space position can land outside the visible
      // viewport (esp. after fitView with one source node — the surface
      // toolbar/sidebar areas correspond to negative flow coords). To
      // guarantee the new object lands somewhere the user can see, fall
      // back to viewport center if the click hint is far from origin.
      const pane = document.querySelector(".react-flow__pane");
      let spawnAt = hint;
      if (pane) {
        const paneRect = pane.getBoundingClientRect();
        const center = reactFlow.screenToFlowPosition({
          x: paneRect.left + paneRect.width / 2,
          y: paneRect.top + paneRect.height / 2,
        });
        const dx = Math.abs(hint.x - center.x);
        const dy = Math.abs(hint.y - center.y);
        // If the click is more than half-viewport away from center in flow
        // space (i.e. user clicked the chrome area, not visible pane),
        // spawn at center instead so the object is on-screen.
        const vp = reactFlow.getViewport();
        const halfFlowW = paneRect.width / 2 / vp.zoom;
        const halfFlowH = paneRect.height / 2 / vp.zoom;
        if (dx > halfFlowW || dy > halfFlowH) {
          spawnAt = center;
        }
      }

      const obj: ClientObject = {
        id,
        kind,
        x: spawnAt.x - halfW,
        y: spawnAt.y - halfH,
        text: defaultText,
        ...(kind === "note"
          ? { w: 200, h: 160, color: "#FFE082" }
          : kind === "comment"
            ? { w: 240 }
            : {}),
      };
      setClientObjects((prev) => [...prev, obj]);
      setSelectedClientId(id);
      setTool("select");
      showLocalToastOnce();
      // Re-fit the viewport so the new object is guaranteed visible
      // (it may overlap existing server nodes; zooming out reveals it).
      window.setTimeout(() => {
        try {
          reactFlow.fitView({ padding: 0.25, duration: 280 });
        } catch {
          /* viewport not ready — ignore */
        }
      }, 60);
    },
    [reactFlow, showLocalToastOnce],
  );

  // De-dup ref: both RF's onPaneClick and the wrapper's onPointerUp can
  // fire from the same physical click. Whichever runs first marks this
  // ref so the other one no-ops.
  const lastActivationTsRef = React.useRef<number>(0);

  // Single click handler shared between RF's onPaneClick and our wrapper
  // div's mouse-up. RF v12 sometimes swallows left-clicks when panOnDrag
  // changes mid-render, so the wrapper is a defense-in-depth path.
  const handlePaneActivation = React.useCallback(
    (clientX: number, clientY: number) => {
      const now = Date.now();
      if (now - lastActivationTsRef.current < 200) {
        return; // dedup — same physical click reaching us twice
      }
      lastActivationTsRef.current = now;
      let flowPos: { x: number; y: number };
      try {
        flowPos = reactFlow.screenToFlowPosition({ x: clientX, y: clientY });
      } catch {
        return;
      }

      // Tool-driven creation.
      if (tool === "note" || tool === "comment" || tool === "text") {
        spawnClientObject(tool, flowPos);
        return;
      }

      if (tool === "arrow") {
        if (!arrowDraft) {
          setArrowDraft({ from: flowPos });
          return;
        }
        const newArrow: ArrowObject = {
          id: makeId(),
          kind: "arrow",
          from: arrowDraft.from,
          to: flowPos,
        };
        setClientObjects((prev) => [...prev, newArrow]);
        setArrowDraft(null);
        setTool("select");
        showLocalToastOnce();
        return;
      }

      // Double-click detection on empty pane (B2).
      if (tool === "select") {
        const now = Date.now();
        const last = lastPaneClickRef.current;
        if (
          last &&
          now - last.t < 280 &&
          Math.abs(last.x - clientX) < 6 &&
          Math.abs(last.y - clientY) < 6
        ) {
          lastPaneClickRef.current = null;
          setPicker({
            mode: { kind: "at-point", x: clientX, y: clientY },
            flowPosition: flowPos,
          });
          return;
        }
        lastPaneClickRef.current = {
          t: now,
          x: clientX,
          y: clientY,
        };
      }
    },
    [tool, arrowDraft, reactFlow, spawnClientObject, showLocalToastOnce],
  );

  const onPaneClick = React.useCallback(
    (event: React.MouseEvent) => {
      handlePaneActivation(event.clientX, event.clientY);
    },
    [handlePaneActivation],
  );

  // Wrapper-level fallback: when an active creation tool is set, listen
  // on the wrapper and spawn an object as long as the click did NOT land
  // on a real node, toolbar, minimap, dialog, picker, or any other UI
  // element. RF v12 fires its onPaneClick only when the actual `.pane`
  // div was the event target, but in practice physical clicks often land
  // on the `.react-flow__edges` SVG that overlays the pane — so we use
  // an inverted filter (NOT inside known UI), independent of `.pane`.
  const onWrapperPointerUp = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return; // left mouse only
      if (tool === "select" || tool === "pan") return;
      const target = event.target as Element | null;
      if (!target || !(target as HTMLElement).closest) return;
      const t2 = target as HTMLElement;
      const insideUi =
        t2.closest(".react-flow__node") !== null ||
        t2.closest(".co-canvas-toolbar") !== null ||
        t2.closest(".react-flow__minimap") !== null ||
        t2.closest(".react-flow__minimap-svg") !== null ||
        t2.closest(".co-zoom-controls") !== null ||
        t2.closest(".co-node-picker") !== null ||
        t2.closest(".co-tweaks-panel") !== null ||
        t2.closest(".co-versions-panel") !== null ||
        t2.closest("[role='dialog']") !== null ||
        // SVG className check fallback for minimap/edges
        (t2 as unknown as { className?: { baseVal?: string } })?.className?.baseVal?.includes("minimap") === true;
      if (insideUi) return;
      handlePaneActivation(event.clientX, event.clientY);
    },
    [tool, handlePaneActivation],
  );

  // ----- Cursor for active tool -----
  const surfaceCursor =
    tool === "select"
      ? "default"
      : tool === "pan"
        ? "grab"
        : "crosshair";

  // ----- Selected node for tweaks -----
  const selectedNodeForTweaks = React.useMemo(() => {
    if (!selectedNodeId) return null;
    const snap = getNodeSnapshot(selectedNodeId);
    if (!snap) return null;
    if (snap.type !== "extract" && snap.type !== "format") return null;
    return snap;
  }, [selectedNodeId, getNodeSnapshot]);

  // When selection changes to a tweakable node, allow re-opening if user
  // had collapsed previously. We don't auto-open if the user collapsed
  // (per spec) — but when there's no selection we keep state as-is.
  // Tweaks visibility = node selected + not collapsed.
  const showTweaks = !!selectedNodeForTweaks && !tweaksCollapsed;

  // Reopen panel when user explicitly clicks the bumper to reopen tweaks.
  const reopenTweaks = React.useCallback(() => {
    setTweaksCollapsed(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(TWEAKS_COLLAPSED_KEY, "0");
    }
  }, []);

  // ----- Arrow flow→screen mapper -----
  const flowToScreen = React.useCallback(
    (x: number, y: number) => {
      const [tx, ty, scale] = transform;
      return { x: x * scale + tx, y: y * scale + ty };
    },
    [transform],
  );

  const arrows = React.useMemo(
    () => clientObjects.filter((o): o is ArrowObject => o.kind === "arrow"),
    [clientObjects],
  );

  // ----- MiniMap: render mini node-shaped rects with type label -----
  // We use the `nodeComponent` slot of MiniMap (RF v12). MiniMapNodeProps
  // only carries {id, x, y, width, height, ...}, NOT the original node
  // type or data. We resolve type via a ref keyed by id so the closure
  // doesn't go stale on re-render.
  const miniNodeMetaRef = React.useRef<
    Map<string, { type: string; label: string }>
  >(new Map());
  React.useEffect(() => {
    const map = new Map<string, { type: string; label: string }>();
    for (const n of rfNodes) {
      const node = n.data.node;
      const platform = (node.data as { platform?: string }).platform;
      let label = MINI_TYPE_ABBR[node.type];
      if (typeof platform === "string" && platform.length > 0) {
        label = platform.slice(0, 6);
      }
      map.set(n.id, { type: node.type, label });
    }
    for (const o of clientObjects) {
      if (o.kind === "arrow") continue;
      map.set(o.id, {
        type: `co-${o.kind}`,
        label: o.kind === "note" ? "note" : o.kind === "comment" ? "comm" : "txt",
      });
    }
    miniNodeMetaRef.current = map;
  }, [rfNodes, clientObjects]);

  const MiniMapNode = React.useCallback(
    (props: MiniMapNodeProps) => {
      const meta = miniNodeMetaRef.current.get(props.id);
      const type = meta?.type ?? "default";
      const stroke =
        type === "source"
          ? "#60a5fa"
          : type === "extract"
            ? "#facc15"
            : type === "format"
              ? "#c084fc"
              : type === "co-note"
                ? "#FFE082"
                : "rgba(255,255,255,0.45)";
      const minW = 28;
      const minH = 18;
      const w = Math.max(props.width, minW);
      const h = Math.max(props.height, minH);
      // Font size: keep readable but proportional to the node box.
      const fontSize = Math.max(7, Math.min(14, h * 0.45));
      return (
        <g>
          <rect
            x={props.x}
            y={props.y}
            width={w}
            height={h}
            rx={6}
            fill="rgba(20,22,24,0.92)"
            stroke={stroke}
            strokeWidth={1.4}
            shapeRendering={props.shapeRendering}
          />
          {meta && (
            <text
              x={props.x + w / 2}
              y={props.y + h / 2 + fontSize / 3}
              textAnchor="middle"
              fontSize={fontSize}
              fontWeight={600}
              fill={stroke}
              style={{
                fontFamily: "system-ui, sans-serif",
                pointerEvents: "none",
                userSelect: "none",
              }}
            >
              {meta.label}
            </text>
          )}
        </g>
      );
    },
    [],
  );

  return (
    <CanvasNodeContext.Provider value={ctxValue}>
      <div
        className="relative flex-1 co-canvas-surface"
        style={{ cursor: surfaceCursor }}
        onPointerUp={onWrapperPointerUp}
      >
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
          disabled={
            runAllMutation.isPending ||
            sequentialRunning ||
            runnableCount === 0
          }
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
          {runAllMutation.isPending || sequentialRunning ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Zap className="h-3.5 w-3.5" />
          )}
          {t.canvas.runAll}
        </button>

        <ReactFlow<RfNode<Record<string, unknown>>, RfEdge>
          nodes={allRfNodes}
          edges={rfEdges}
          nodeTypes={NODE_TYPES}
          onNodesChange={onNodesChange as (changes: NodeChange[]) => void}
          onEdgesChange={onEdgesChange as (changes: EdgeChange[]) => void}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          onEdgesDelete={onEdgesDelete}
          onPaneClick={onPaneClick}
          deleteKeyCode={null}
          fitView
          fitViewOptions={{ padding: 0.2, maxZoom: 1.2 }}
          proOptions={{ hideAttribution: true }}
          colorMode="dark"
          panOnDrag={
            // While placing client objects we MUST disable left-click pan so
            // onPaneClick fires. For "pan" and "select" tools, default
            // left-button pan; for creation tools, fully off (false).
            tool === "pan" || tool === "select" ? true : false
          }
          panOnScroll
          selectionOnDrag={tool === "select"}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={11}
            size={0.75}
            color="rgba(255,255,255,0.1)"
          />
          {/* B2: MiniMap with custom nodeComponent — each minimap node
              looks like a miniature of the real card (rounded outline,
              type colour, text label). nodeComponent is supported by
              @xyflow/react v12 (see MiniMap/types.d.ts → MiniMapNodeProps).
              We resolve type → label via miniNodeMetaRef updated from
              rfNodes/clientObjects above. */}
          <MiniMap
            pannable
            zoomable
            position="bottom-right"
            maskColor="rgba(0,0,0,0.6)"
            nodeBorderRadius={6}
            nodeComponent={MiniMapNode}
            style={{
              background: "rgba(20,22,24,0.92)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
            }}
          />
        </ReactFlow>

        {/* Arrow overlay — sits above ReactFlow, below toolbar/picker */}
        <ArrowOverlay
          arrows={arrows}
          flowToScreen={flowToScreen}
          selectedId={selectedClientId}
        />

        {/* Bottom-center toolbar */}
        <CanvasToolbar
          tool={tool}
          setTool={(next) => {
            setTool(next);
            setArrowDraft(null);
          }}
          onAddNode={() =>
            setPicker({ mode: { kind: "centered" } })
          }
        />

        {/* Bottom-left zoom */}
        <CanvasZoomControls />

        {/* Tweaks panel (B7) */}
        {showTweaks && selectedNodeForTweaks && (
          <TweaksPanel
            node={selectedNodeForTweaks}
            onClose={closeTweaks}
          />
        )}

        {/* Re-open tweaks affordance when collapsed but a tweakable node
            is selected (small unobtrusive bumper). */}
        {!showTweaks && selectedNodeForTweaks && (
          <button
            type="button"
            onClick={reopenTweaks}
            className="absolute bottom-[200px] right-4 z-20 rounded-full border border-white/10 bg-black/60 px-3 py-1.5 text-[11px] font-medium text-zinc-200 backdrop-blur hover:bg-black/80"
            title="Открыть Tweaks"
          >
            Tweaks
          </button>
        )}

        {picker && (
          <NodePicker
            mode={picker.mode}
            onPick={handlePickerPick}
            onClose={() => setPicker(null)}
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

function pluralPosts(n: number): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return "постов";
  if (last === 1) return "пост";
  if (last >= 2 && last <= 4) return "поста";
  return "постов";
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
