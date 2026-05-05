"use client";

import * as React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Textarea } from "@/components/ui/textarea";
import type { NodeOut, SourceNodeData } from "@/lib/types";
import { useCanvasNodeContext } from "@/components/canvas/canvasContext";
import { NODE_HANDLE_STYLE, NodeShell } from "./NodeShell";

interface SourceNodeRfData {
  node: NodeOut;
  expanded: boolean;
  onToggleExpanded: () => void;
}

export function SourceNode({ data, selected }: NodeProps) {
  const typed = data as unknown as SourceNodeRfData;
  const node = typed.node;
  const expanded = typed.expanded;
  const { updateNodeData } = useCanvasNodeContext();
  const sourceData = (node.data ?? {}) as SourceNodeData;
  const [draft, setDraft] = React.useState<string>(sourceData.content ?? "");

  // Sync local draft when remote content changes (e.g. after canvas refetch).
  React.useEffect(() => {
    setDraft(sourceData.content ?? "");
  }, [sourceData.content]);

  const placeholder = "Paste a transcript, link, or rough notes…";

  const subhead = React.useMemo(() => {
    if (sourceData.youtube_url) return `YouTube · ${sourceData.youtube_title ?? sourceData.youtube_url}`;
    if (sourceData.url) return sourceData.url;
    if (sourceData.transcript_method)
      return `Transcribed via ${sourceData.transcript_method}`;
    return null;
  }, [sourceData.youtube_url, sourceData.youtube_title, sourceData.url, sourceData.transcript_method]);

  const handleBlur = async () => {
    const next = draft;
    if ((sourceData.content ?? "") === next) return;
    await updateNodeData(node.id, { content: next });
  };

  return (
    <>
      <NodeShell
        title="Source"
        status={node.status}
        selected={!!selected}
        expanded={expanded}
        onToggleExpanded={typed.onToggleExpanded}
        subhead={subhead}
      >
        {expanded ? (
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={handleBlur}
            placeholder={placeholder}
            rows={6}
            className="nodrag scrollbar-thin resize-none border-white/10 bg-black/40 text-xs leading-relaxed"
          />
        ) : (
          <p className="line-clamp-3 min-h-[3rem] text-xs leading-relaxed text-zinc-300/90">
            {sourceData.content?.trim() || (
              <span className="text-zinc-500">{placeholder}</span>
            )}
          </p>
        )}
      </NodeShell>
      <Handle
        type="source"
        position={Position.Right}
        style={NODE_HANDLE_STYLE}
      />
    </>
  );
}
