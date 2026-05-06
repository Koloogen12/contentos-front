"use client";

/**
 * SourceNode — 1:1 port of `THE CONTENT-2/nodes.jsx#SourceNode`.
 * Width 296px, 4 tabs (Текст / URL / YouTube / Файл), platform+author
 * for text/url, port-circle on the right.
 */

import * as React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowRight,
  FileAudio,
  FileUp,
  Inbox,
  Link as LinkIcon,
  Mic,
  Type,
  Youtube,
} from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { transcribeYoutube, uploadAudio } from "@/lib/transcription";
import type { NodeOut, SourceInputType, SourceNodeData } from "@/lib/types";
import { useCanvasNodeContext } from "@/components/canvas/canvasContext";
import { cn } from "@/lib/utils";
import { t, formatDurationRu } from "@/lib/i18n";

interface SourceNodeRfData {
  node: NodeOut;
}

type Tab = "text" | "url" | "youtube" | "file_upload";

export function SourceNode({ data, selected }: NodeProps) {
  const typed = data as unknown as SourceNodeRfData;
  const node = typed.node;
  const { updateNodeData, isRunning, readOnly } = useCanvasNodeContext();
  const sourceData = (node.data ?? {}) as SourceNodeData;
  const status = node.status;
  const running = isRunning(node.id);
  const inputType: Tab = (sourceData.input_type ?? "text") as Tab;

  const setData = async (patch: Partial<SourceNodeData>) => {
    if (readOnly) return;
    await updateNodeData(node.id, patch);
  };

  return (
    <div className="relative" style={{ width: 296 }}>
      <Handle
        type="target"
        position={Position.Left}
        style={INVISIBLE_HANDLE}
      />
      <div className="co-node-label">
        <Inbox size={12} />
        <span>{t.source.label}</span>
      </div>
      <div
        className={cn(
          "co-node-shell",
          selected && "selected",
          status === "running" && "running",
          status === "done" && "done",
          status === "error" && "error",
        )}
      >
        <span className={`co-node-status-dot ${status ?? "idle"}`} />

        {/* Right output port — 26px circle */}
        <Handle
          type="source"
          position={Position.Right}
          className="co-port-handle"
          style={PORT_STYLE_RIGHT}
        >
          <ArrowRight size={12} />
        </Handle>

        <div className="co-node-content">
          <div className="flex flex-wrap gap-1">
            {(
              [
                { k: "text", label: t.source.tabs.text, Icon: Type },
                { k: "url", label: t.source.tabs.url, Icon: LinkIcon },
                { k: "youtube", label: t.source.tabs.youtube, Icon: Youtube },
                { k: "file_upload", label: t.source.tabs.file, Icon: FileAudio },
              ] as const
            ).map(({ k, label, Icon }) => (
              <button
                key={k}
                type="button"
                className={cn("co-tab-pill", inputType === k && "active")}
                onClick={(e) => {
                  e.stopPropagation();
                  void setData({ input_type: k as SourceInputType });
                }}
                onMouseDown={(e) => e.stopPropagation()}
                disabled={readOnly || running}
              >
                <Icon size={11} />
                {label}
              </button>
            ))}
          </div>

          {inputType === "text" && (
            <TextPanel
              value={sourceData.content ?? ""}
              onCommit={(v) => setData({ content: v })}
              readOnly={readOnly}
            />
          )}
          {inputType === "url" && (
            <UrlPanel
              value={sourceData.url ?? ""}
              onCommit={(v) => setData({ url: v })}
              readOnly={readOnly}
            />
          )}
          {inputType === "youtube" && (
            <YoutubePanel
              data={sourceData}
              setData={setData}
              status={status}
              nodeId={node.id}
              readOnly={readOnly}
            />
          )}
          {inputType === "file_upload" && (
            <FilePanel
              data={sourceData}
              setData={setData}
              status={status}
              nodeId={node.id}
              readOnly={readOnly}
            />
          )}

          {(inputType === "text" || inputType === "url") && (
            <>
              <div>
                <label className="co-field-label">{t.source.platformLabel}</label>
                <select
                  className="co-field-input"
                  value={sourceData.platform ?? ""}
                  onChange={(e) => void setData({ platform: e.target.value })}
                  onMouseDown={(e) => e.stopPropagation()}
                  disabled={readOnly}
                >
                  {t.source.platformOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="co-field-label">{t.source.authorLabel}</label>
                <input
                  className="co-field-input"
                  type="text"
                  placeholder={t.source.placeholders.handle}
                  defaultValue={sourceData.author ?? ""}
                  onBlur={(e) => {
                    const next = e.target.value;
                    if ((sourceData.author ?? "") !== next)
                      void setData({ author: next });
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  disabled={readOnly}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TextPanel({
  value,
  onCommit,
  readOnly,
}: {
  value: string;
  onCommit: (v: string) => void;
  readOnly?: boolean;
}) {
  const [draft, setDraft] = React.useState(value);
  React.useEffect(() => setDraft(value), [value]);
  return (
    <textarea
      className="co-field-textarea nodrag"
      placeholder={t.source.placeholders.text}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== value) onCommit(draft);
      }}
      onMouseDown={(e) => e.stopPropagation()}
      rows={4}
      disabled={readOnly}
    />
  );
}

function UrlPanel({
  value,
  onCommit,
  readOnly,
}: {
  value: string;
  onCommit: (v: string) => void;
  readOnly?: boolean;
}) {
  const [draft, setDraft] = React.useState(value);
  React.useEffect(() => setDraft(value), [value]);
  return (
    <input
      className="co-field-input nodrag"
      type="text"
      placeholder={t.source.placeholders.url}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== value) onCommit(draft);
      }}
      onMouseDown={(e) => e.stopPropagation()}
      disabled={readOnly}
    />
  );
}

function YoutubePanel({
  data,
  setData,
  status,
  nodeId,
  readOnly,
}: {
  data: SourceNodeData;
  setData: (p: Partial<SourceNodeData>) => Promise<void>;
  status: NodeOut["status"];
  nodeId: string;
  readOnly?: boolean;
}) {
  const { attachSkillRun, isRunning } = useCanvasNodeContext();
  const running = isRunning(nodeId) || status === "running";
  const [progress, setProgress] = React.useState(0);
  const [draftUrl, setDraftUrl] = React.useState(data.youtube_url ?? "");
  React.useEffect(() => setDraftUrl(data.youtube_url ?? ""), [data.youtube_url]);

  React.useEffect(() => {
    if (!running) {
      setProgress(0);
      return;
    }
    setProgress(0);
    const t = setInterval(() => {
      setProgress((p) => Math.min(98, p + 4 + Math.random() * 6));
    }, 220);
    return () => clearInterval(t);
  }, [running]);

  const transcribeMutation = useMutation({
    mutationFn: (url: string) => transcribeYoutube(nodeId, url),
    onSuccess: ({ skill_run_id }) => {
      attachSkillRun(nodeId, skill_run_id);
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : t.canvas.couldNotStartRun,
      ),
  });

  const start = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!draftUrl.trim()) return;
    if (draftUrl !== (data.youtube_url ?? "")) {
      void setData({ youtube_url: draftUrl });
    }
    transcribeMutation.mutate(draftUrl.trim());
  };

  const stage =
    progress < 30
      ? t.source.progress.captions
      : progress < 70
        ? t.source.progress.audio
        : t.source.progress.transcribing;

  const showDone =
    !running &&
    status === "done" &&
    !!(data.youtube_title || data.transcript_method || data.content);

  return (
    <>
      <input
        className="co-field-input nodrag"
        type="text"
        placeholder={t.source.placeholders.youtube}
        value={draftUrl}
        onChange={(e) => setDraftUrl(e.target.value)}
        onBlur={() => {
          if (draftUrl !== (data.youtube_url ?? ""))
            void setData({ youtube_url: draftUrl });
        }}
        onMouseDown={(e) => e.stopPropagation()}
        disabled={readOnly || running}
      />

      {!running && !showDone && (
        <button
          className="co-btn co-btn-primary nodrag"
          onClick={start}
          onMouseDown={(e) => e.stopPropagation()}
          disabled={readOnly || !draftUrl.trim() || transcribeMutation.isPending}
        >
          <Mic size={14} />
          {t.source.transcribe}
        </button>
      )}

      {running && (
        <>
          <div className="co-spin-row">
            <div className="co-spinner" />
            <span>{stage}</span>
          </div>
          <div className="co-progress">
            <div className="co-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </>
      )}

      {showDone && (
        <>
          <div className="flex flex-wrap gap-1.5">
            <span className="co-meta-chip">
              <Youtube size={11} />
              {data.transcript_method === "youtube_captions"
                ? t.source.captionsBadge
                : t.source.whisperBadge}
            </span>
            {data.youtube_duration_seconds ? (
              <span className="co-meta-chip">
                {formatDurationRu(data.youtube_duration_seconds)}
              </span>
            ) : null}
            {data.transcript_language && (
              <span className="co-meta-chip">
                {data.transcript_language.toUpperCase()}
              </span>
            )}
          </div>
          {data.youtube_title && (
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 500,
                color: "var(--text-primary)",
                lineHeight: 1.45,
              }}
            >
              {data.youtube_title}
            </div>
          )}
          {data.content && (
            <div className="co-transcript-preview">
              {data.content.slice(0, 200)}…
            </div>
          )}
        </>
      )}
    </>
  );
}

function FilePanel({
  data,
  setData,
  status,
  nodeId,
  readOnly,
}: {
  data: SourceNodeData;
  setData: (p: Partial<SourceNodeData>) => Promise<void>;
  status: NodeOut["status"];
  nodeId: string;
  readOnly?: boolean;
}) {
  const { attachSkillRun, isRunning } = useCanvasNodeContext();
  const running = isRunning(nodeId) || status === "running";
  const [progress, setProgress] = React.useState(0);
  const [pendingFile, setPendingFile] = React.useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (!running) {
      setProgress(0);
      return;
    }
    setProgress(0);
    const id = setInterval(() => {
      setProgress((p) => Math.min(96, p + 5 + Math.random() * 5));
    }, 200);
    return () => clearInterval(id);
  }, [running]);

  const uploadMutation = useMutation({
    mutationFn: (file: File) =>
      uploadAudio(nodeId, file, (pct) => setProgress(pct)),
    onSuccess: ({ skill_run_id }) => {
      attachSkillRun(nodeId, skill_run_id);
    },
    onError: (err) => {
      toast.error(
        err instanceof ApiError ? err.detail : t.canvas.couldNotStartRun,
      );
      setPendingFile(null);
      void setData({ file_name: null, file_size_bytes: null });
    },
  });

  const onPick = (file: File) => {
    setPendingFile(file);
    void setData({
      file_name: file.name,
      file_size_bytes: file.size,
      file_type: file.type,
    });
    uploadMutation.mutate(file);
  };

  const sizeMb =
    data.file_size_bytes != null
      ? (data.file_size_bytes / 1e6).toFixed(1)
      : null;

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,video/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
        }}
      />

      {!data.file_name && !running && (
        <button
          type="button"
          className="co-dropzone nodrag"
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          disabled={readOnly}
        >
          <FileUp size={20} />
          <div>{t.source.dropzone.title}</div>
          <div className="text-[11px] text-[color:var(--text-muted)]">
            {t.source.dropzone.hint}
          </div>
        </button>
      )}

      {data.file_name && running && (
        <>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            {data.file_name}
            {sizeMb ? (
              <span style={{ color: "var(--text-muted)" }}> · {sizeMb} MB</span>
            ) : null}
          </div>
          <div className="co-spin-row">
            <div className="co-spinner" />
            <span>{t.source.progress.whisper(Math.round(progress))}</span>
          </div>
          <div className="co-progress">
            <div className="co-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </>
      )}

      {data.file_name && status === "done" && (
        <>
          <span className="co-meta-chip">
            <FileAudio size={11} />
            {data.file_name}
          </span>
          {data.content && (
            <div className="co-transcript-preview">
              {data.content.slice(0, 200)}…
            </div>
          )}
        </>
      )}
    </>
  );
}

// React Flow handles need to remain in the DOM so the connection logic works,
// but we want the prototype's port circle to be the visible affordance. The
// visible right-side port is rendered via `Handle` + a pseudo-element style.
const PORT_STYLE_RIGHT: React.CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: 999,
  background: "var(--port-bg)",
  border: "1px solid rgba(0, 0, 0, 0.06)",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.4)",
  right: -13,
  color: "rgba(255,255,255,0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 3,
};

const INVISIBLE_HANDLE: React.CSSProperties = {
  width: 1,
  height: 1,
  background: "transparent",
  border: "none",
  opacity: 0,
};
