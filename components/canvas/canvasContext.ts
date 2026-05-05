"use client";

import * as React from "react";
import type {
  NodeOut,
  NodeStatus,
  ExtractNodeData,
  FormatNodeData,
  SourceNodeData,
} from "@/lib/types";

export interface CanvasNodeContextValue {
  /** PATCH a node's `data` field. Optimistic — UI updates immediately. */
  updateNodeData: (
    nodeId: string,
    patch:
      | Partial<SourceNodeData>
      | Partial<ExtractNodeData>
      | Partial<FormatNodeData>,
  ) => Promise<void>;
  /** Trigger POST /nodes/{id}/run and start the polling loop. */
  runNode: (nodeId: string) => void;
  /**
   * Attach an externally-started skill-run (e.g. transcribe-youtube,
   * upload-audio) to the canvas's subscription/refetch lifecycle. The node
   * gets `running` status locally; on completion the canvas refetches.
   */
  attachSkillRun: (nodeId: string, skillRunId: string) => void;
  /** Set local-only status (used while a run is in flight). */
  setRunningStatus: (nodeId: string, status: NodeStatus) => void;
  /** Look up the live React-Flow-managed node snapshot. */
  getNode: (nodeId: string) => NodeOut | undefined;
  /** Returns true while a skill-run for this node is in flight. */
  isRunning: (nodeId: string) => boolean;
  /**
   * When true, the node renders in a non-interactive read-only flavor:
   * no Run / Publish / autosave / mutating UI. Used by the public viewer.
   */
  readOnly?: boolean;
}

export const CanvasNodeContext =
  React.createContext<CanvasNodeContextValue | null>(null);

export function useCanvasNodeContext(): CanvasNodeContextValue {
  const ctx = React.useContext(CanvasNodeContext);
  if (!ctx)
    throw new Error("useCanvasNodeContext must be used inside a CanvasEditor");
  return ctx;
}
