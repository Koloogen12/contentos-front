"use client";

import * as React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useMutation } from "@tanstack/react-query";
import {
  FileAudio,
  Loader2,
  Pencil,
  Type,
  UploadCloud,
  Youtube,
} from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import {
  getYoutubeMeta,
  transcribeYoutube,
  uploadAudio,
} from "@/lib/transcription";
import type { NodeOut, SourceInputType, SourceNodeData } from "@/lib/types";
import { useCanvasNodeContext } from "@/components/canvas/canvasContext";
import { cn } from "@/lib/utils";
import { NODE_HANDLE_STYLE, NodeShell } from "./NodeShell";

interface SourceNodeRfData {
  node: NodeOut;
  expanded: boolean;
  onToggleExpanded: () => void;
}

type Mode = Extract<SourceInputType, "text" | "youtube" | "file_upload">;

const MODE_OPTIONS: { value: Mode; label: string; icon: typeof Type }[] = [
  { value: "text", label: "Text", icon: Type },
  { value: "youtube", label: "YouTube", icon: Youtube },
  { value: "file_upload", label: "Audio", icon: FileAudio },
];

function inferInitialMode(d: SourceNodeData): Mode {
  if (d.input_type === "youtube" || d.youtube_url) return "youtube";
  if (d.input_type === "file_upload" || d.file_name) return "file_upload";
  return "text";
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m < 60) return `${m}:${String(s).padStart(2, "0")}`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}:${String(mm).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export function SourceNode({ data, selected }: NodeProps) {
  const typed = data as unknown as SourceNodeRfData;
  const node = typed.node;
  const expanded = typed.expanded;
  const { updateNodeData, attachSkillRun, isRunning } =
    useCanvasNodeContext();
  const sourceData = (node.data ?? {}) as SourceNodeData;
  const running = isRunning(node.id);
  const hasTranscript = Boolean(
    sourceData.transcript_method && sourceData.content,
  );

  // Mode toggle (local; persisted via PATCH on change so the node remembers).
  const [mode, setMode] = React.useState<Mode>(() => inferInitialMode(sourceData));
  React.useEffect(() => {
    setMode(inferInitialMode(sourceData));
  }, [sourceData.input_type, sourceData.youtube_url, sourceData.file_name]);

  // Text-mode draft mirrors the existing autosave-on-blur pattern.
  const [draft, setDraft] = React.useState<string>(sourceData.content ?? "");
  React.useEffect(() => {
    setDraft(sourceData.content ?? "");
  }, [sourceData.content]);

  // YouTube mode local state.
  const [youtubeUrl, setYoutubeUrl] = React.useState<string>(
    sourceData.youtube_url ?? "",
  );
  React.useEffect(() => {
    if (sourceData.youtube_url && sourceData.youtube_url !== youtubeUrl) {
      setYoutubeUrl(sourceData.youtube_url);
    }
    // we intentionally don't depend on youtubeUrl — only sync when remote changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceData.youtube_url]);

  const [meta, setMeta] = React.useState<{
    title: string | null;
    duration_seconds: number | null;
    channel: string | null;
  } | null>(null);

  // Audio upload local state.
  const [pendingFile, setPendingFile] = React.useState<File | null>(null);
  const [uploadPct, setUploadPct] = React.useState<number | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Status text shown when a skill-run is in flight (transcription).
  const [transcribeStatus, setTranscribeStatus] = React.useState<string | null>(
    null,
  );
  React.useEffect(() => {
    if (!running) setTranscribeStatus(null);
  }, [running]);

  const handleModeChange = async (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    if (sourceData.input_type !== next) {
      await updateNodeData(node.id, { input_type: next });
    }
  };

  const handleTextBlur = async () => {
    const next = draft;
    if ((sourceData.content ?? "") === next) return;
    await updateNodeData(node.id, { content: next });
  };

  // ----- YouTube actions -----
  const metaMutation = useMutation({
    mutationFn: (url: string) => getYoutubeMeta(node.id, url),
    onSuccess: (data) => {
      setMeta({
        title: data.title,
        duration_seconds: data.duration_seconds,
        channel: data.channel,
      });
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : "Could not fetch metadata",
      ),
  });

  const transcribeMutation = useMutation({
    mutationFn: (url: string) => transcribeYoutube(node.id, url),
    onSuccess: ({ skill_run_id }) => {
      setTranscribeStatus("Pulling captions…");
      // After ~6s with no completion, hint that we may have fallen back to whisper.
      window.setTimeout(() => {
        setTranscribeStatus((prev) =>
          prev === "Pulling captions…"
            ? "Captions not found, transcribing audio…"
            : prev,
        );
      }, 6000);
      attachSkillRun(node.id, skill_run_id);
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : "Could not start transcription",
      ),
  });

  // ----- Audio upload actions -----
  const uploadMutation = useMutation({
    mutationFn: (file: File) =>
      uploadAudio(node.id, file, (pct) => setUploadPct(pct)),
    onSuccess: ({ skill_run_id }) => {
      setUploadPct(null);
      setTranscribeStatus("Transcribing audio…");
      attachSkillRun(node.id, skill_run_id);
    },
    onError: (err) => {
      setUploadPct(null);
      toast.error(
        err instanceof ApiError ? err.detail : "Could not upload audio",
      );
    },
  });

  const subhead = React.useMemo(() => {
    if (sourceData.youtube_url)
      return `YouTube · ${sourceData.youtube_title ?? sourceData.youtube_url}`;
    if (sourceData.file_name)
      return `Audio · ${sourceData.file_name}`;
    if (sourceData.transcript_method)
      return `Transcribed via ${sourceData.transcript_method}`;
    return null;
  }, [
    sourceData.youtube_url,
    sourceData.youtube_title,
    sourceData.file_name,
    sourceData.transcript_method,
  ]);

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
        <div className="space-y-2.5">
          {/* Mode toggle */}
          <div className="nodrag flex items-center gap-1 rounded-md border border-white/5 bg-black/30 p-0.5">
            {MODE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = mode === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors",
                    active
                      ? "bg-white/10 text-foreground"
                      : "text-zinc-400 hover:text-zinc-200",
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleModeChange(opt.value);
                  }}
                  disabled={running || transcribeMutation.isPending}
                >
                  <Icon className="h-3 w-3" />
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* While transcribing, surface a spinner + status message */}
          {running && transcribeStatus ? (
            <div className="flex items-center gap-2 rounded-md border border-white/5 bg-black/30 px-3 py-3 text-xs text-zinc-300">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />
              <span>{transcribeStatus}</span>
            </div>
          ) : hasTranscript ? (
            <TranscriptView
              content={sourceData.content ?? ""}
              method={sourceData.transcript_method ?? null}
              expanded={expanded}
              onConvert={async () => {
                // Switch back to manual text editing — keep the content but
                // clear the transcript-method marker so subhead/badge updates.
                await updateNodeData(node.id, {
                  input_type: "text",
                  transcript_method: null,
                });
                setMode("text");
              }}
            />
          ) : mode === "text" ? (
            expanded ? (
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={handleTextBlur}
                placeholder="Paste a transcript, link, or rough notes…"
                rows={6}
                className="nodrag scrollbar-thin resize-none border-white/10 bg-black/40 text-xs leading-relaxed"
              />
            ) : (
              <p className="line-clamp-3 min-h-[3rem] text-xs leading-relaxed text-zinc-300/90">
                {sourceData.content?.trim() || (
                  <span className="text-zinc-500">
                    Paste a transcript, link, or rough notes…
                  </span>
                )}
              </p>
            )
          ) : mode === "youtube" ? (
            <div className="space-y-2">
              <Input
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=…"
                className="nodrag h-8 border-white/10 bg-black/40 text-xs"
                onClick={(e) => e.stopPropagation()}
                disabled={
                  metaMutation.isPending || transcribeMutation.isPending
                }
              />
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="nodrag inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-white/10 bg-black/40 px-2 py-1 text-[11px] font-medium text-zinc-200 hover:bg-black/60 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={
                    !youtubeUrl.trim() ||
                    metaMutation.isPending ||
                    transcribeMutation.isPending
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    metaMutation.mutate(youtubeUrl.trim());
                  }}
                >
                  {metaMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : null}
                  Fetch meta
                </button>
                <button
                  type="button"
                  className="nodrag inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={
                    !youtubeUrl.trim() ||
                    transcribeMutation.isPending ||
                    running
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    transcribeMutation.mutate(youtubeUrl.trim());
                  }}
                >
                  {transcribeMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : null}
                  Transcribe
                </button>
              </div>
              {meta && (
                <div className="space-y-0.5 rounded-md border border-white/5 bg-black/30 px-2.5 py-2 text-[11px] text-zinc-300">
                  {meta.title && (
                    <div className="line-clamp-2 font-medium text-zinc-100">
                      {meta.title}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-x-2 text-zinc-500">
                    {meta.channel && <span>{meta.channel}</span>}
                    {meta.duration_seconds ? (
                      <span>{formatDuration(meta.duration_seconds)}</span>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Audio upload mode
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,video/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setPendingFile(file);
                }}
              />
              {pendingFile ? (
                <div className="flex items-center gap-2 rounded-md border border-white/5 bg-black/30 px-2.5 py-2 text-[11px] text-zinc-300">
                  <FileAudio className="h-3.5 w-3.5 text-zinc-400" />
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-1">{pendingFile.name}</div>
                    <div className="text-zinc-500">
                      {formatBytes(pendingFile.size)}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="nodrag rounded p-1 text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPendingFile(null);
                      if (fileInputRef.current)
                        fileInputRef.current.value = "";
                    }}
                    disabled={uploadMutation.isPending}
                  >
                    Clear
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="nodrag flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-white/10 bg-black/30 px-3 py-3 text-[11px] text-zinc-400 hover:bg-black/40"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  <UploadCloud className="h-3.5 w-3.5" />
                  Choose audio or video file
                </button>
              )}

              {uploadPct !== null && (
                <div className="space-y-1">
                  <div className="h-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full bg-indigo-500 transition-all"
                      style={{ width: `${uploadPct}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    Uploading… {uploadPct}%
                  </div>
                </div>
              )}

              <button
                type="button"
                className="nodrag inline-flex w-full items-center justify-center gap-1 rounded-md bg-primary px-2 py-1.5 text-[11px] font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={
                  !pendingFile || uploadMutation.isPending || running
                }
                onClick={(e) => {
                  e.stopPropagation();
                  if (pendingFile) uploadMutation.mutate(pendingFile);
                }}
              >
                {uploadMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <UploadCloud className="h-3 w-3" />
                )}
                {uploadMutation.isPending ? "Uploading…" : "Upload & transcribe"}
              </button>
            </div>
          )}
        </div>
      </NodeShell>
      <Handle
        type="source"
        position={Position.Right}
        style={NODE_HANDLE_STYLE}
      />
    </>
  );
}

function TranscriptView({
  content,
  method,
  expanded,
  onConvert,
}: {
  content: string;
  method: string | null;
  expanded: boolean;
  onConvert: () => Promise<void>;
}) {
  const charCount = content.length;
  const methodLabel =
    method === "youtube_captions"
      ? "captions"
      : method === "whisper"
        ? "whisper"
        : "transcript";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
          {charCount.toLocaleString()} chars · {methodLabel}
        </span>
      </div>
      {expanded ? (
        <Textarea
          value={content}
          readOnly
          rows={8}
          className="nodrag scrollbar-thin resize-none border-white/10 bg-black/40 text-xs leading-relaxed"
        />
      ) : (
        <p className="line-clamp-3 min-h-[3rem] text-xs leading-relaxed text-zinc-300/90">
          {content.length > 150 ? `${content.slice(0, 150)}…` : content}
        </p>
      )}
      {expanded && (
        <button
          type="button"
          className="nodrag inline-flex items-center gap-1 rounded-md border border-white/10 bg-black/40 px-2 py-1 text-[11px] font-medium text-zinc-200 hover:bg-black/60"
          onClick={(e) => {
            e.stopPropagation();
            void onConvert();
          }}
        >
          <Pencil className="h-3 w-3" />
          Convert to text
        </button>
      )}
    </div>
  );
}
