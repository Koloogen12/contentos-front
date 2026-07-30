"use client";

/**
 * LLMNode — a chat node on the canvas backed by Opus 4.8.
 *
 * The user wires other nodes (source / extract / format) INTO this node's
 * left handle; those become the conversation context on the backend. Then
 * they chat about that material right here. History is persisted server-side
 * in `node.data.messages` on every turn, so a canvas reload restores it.
 *
 * Persistence model: we keep a local `messages` state as the render source of
 * truth. It's seeded from `node.data.messages` whenever the server copy has
 * MORE messages than we hold locally (covers first mount + background refetch)
 * and never when it has fewer/equal (so an in-flight local update isn't
 * clobbered by stale RF data before the refetch catches up). The chat endpoint
 * is the single writer — we never PATCH messages ourselves.
 */

import * as React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowRight,
  Bot,
  CornerDownLeft,
  Link2,
  Loader2,
  Settings2,
  Sparkles,
  Swords,
} from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import {
  llmChat,
  setLlmMode,
  setLlmSystemPrompt,
  type LlmNodeMode,
} from "@/lib/llm-node";
import type { LlmChatMessage, NodeOut, LlmNodeData } from "@/lib/types";
import { useCanvasNodeContext } from "@/components/canvas/canvasContext";
import { cn } from "@/lib/utils";
import {
  PORT_STYLE_LEFT,
  PORT_STYLE_RIGHT,
} from "./NodeShell";
import { NodeLabel } from "@/components/canvas/nodes/NodeLabel";

interface LLMNodeRfData {
  node: NodeOut;
}

export function LLMNode({ data, selected }: NodeProps) {
  const typed = data as unknown as LLMNodeRfData;
  const node = typed.node;
  const { readOnly, getCanvas } = useCanvasNodeContext();
  const nodeData = (node.data ?? {}) as LlmNodeData;

  const serverMessages = React.useMemo(
    () => nodeData.messages ?? [],
    [nodeData.messages],
  );

  const [messages, setMessages] = React.useState<LlmChatMessage[]>(
    () => serverMessages,
  );
  const [draft, setDraft] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  // ----- System instruction (role/task) -----
  const [instrOpen, setInstrOpen] = React.useState(false);
  const [instruction, setInstruction] = React.useState(
    nodeData.system_prompt ?? "",
  );
  const savedInstrRef = React.useRef(nodeData.system_prompt ?? "");

  // ----- Режим ноды -----
  // Оппонент — не пресет роли, а другой системный промпт на сервере: у него
  // фиксированный порядок атак и порог уступки, которые в свободном поле
  // «роль» не удержать. Роль при этом остаётся: она сужает предмет спора.
  //
  // Держим локально и синхронизируем с сервером через тот же llm-config, что
  // и роль: общий PATCH ноды заменяет весь data и снёс бы историю чата.
  const [mode, setMode] = React.useState<LlmNodeMode>(
    nodeData.mode === "red_team" ? "red_team" : "assistant",
  );
  React.useEffect(() => {
    setMode(nodeData.mode === "red_team" ? "red_team" : "assistant");
  }, [nodeData.mode]);
  const isRedTeam = mode === "red_team";

  const toggleMode = React.useCallback(() => {
    if (readOnly) return;
    const next: LlmNodeMode = isRedTeam ? "assistant" : "red_team";
    setMode(next);
    setLlmMode(node.id, next, instruction.trim()).catch((err) => {
      setMode(isRedTeam ? "red_team" : "assistant");
      toast.error(
        err instanceof ApiError ? err.detail : "Не удалось сменить режим",
      );
    });
  }, [isRedTeam, instruction, node.id, readOnly]);
  // Re-seed from server on refetch when we haven't got a pending local edit.
  React.useEffect(() => {
    const incoming = nodeData.system_prompt ?? "";
    if (incoming !== savedInstrRef.current) {
      savedInstrRef.current = incoming;
      setInstruction(incoming);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeData.system_prompt]);

  const saveInstruction = React.useCallback(() => {
    const next = instruction.trim();
    if (next === savedInstrRef.current.trim() || readOnly) return;
    savedInstrRef.current = next;
    setLlmSystemPrompt(node.id, next).catch((err) =>
      toast.error(
        err instanceof ApiError ? err.detail : "Не удалось сохранить инструкцию",
      ),
    );
  }, [instruction, node.id, readOnly]);

  // Seed from the server copy only when it's strictly ahead of us (mount +
  // refetch), never when equal/behind (don't clobber a fresh local turn).
  React.useEffect(() => {
    if (serverMessages.length > messages.length) {
      setMessages(serverMessages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverMessages]);

  // Count nodes wired into this one — shown as a "context" badge so the user
  // knows what the assistant can see.
  const contextCount = React.useMemo(() => {
    const canvas = getCanvas();
    if (!canvas) return 0;
    return canvas.edges.filter((e) => e.target_node_id === node.id).length;
  }, [getCanvas, node.id]);

  const chat = useMutation({
    mutationFn: (message: string) => llmChat(node.id, message),
    onSuccess: (resp) => {
      setMessages(resp.messages);
    },
    onError: (err) => {
      // Roll back the optimistic user bubble on failure.
      setMessages((prev) =>
        prev.length && prev[prev.length - 1].role === "user"
          ? prev.slice(0, -1)
          : prev,
      );
      toast.error(
        err instanceof ApiError ? err.detail : "LLM не ответил",
      );
    },
  });

  React.useEffect(() => {
    // Auto-scroll to the newest message.
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, chat.isPending]);

  const send = () => {
    const text = draft.trim();
    if (!text || chat.isPending || readOnly) return;
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setDraft("");
    chat.mutate(text);
  };

  return (
    <div className="relative" style={{ width: 360 }}>
      {/* Target handle — any node can be wired in as context. */}
      <Handle
        type="target"
        position={Position.Left}
        className="port"
        style={PORT_STYLE_LEFT}
      >
        <Link2 size={12} />
      </Handle>

      {/* Source handle — the node's OUTPUT is its last assistant reply, which
          can feed extract / format / another llm. Labeled so the "moving
          target" (changes every turn) is not a surprise. */}
      <Handle
        type="source"
        position={Position.Right}
        className="port"
        style={PORT_STYLE_RIGHT}
        title="Выход: последний ответ ассистента"
      >
        <ArrowRight size={12} />
      </Handle>

      <NodeLabel nodeId={node.id} icon={<Bot size={12} />}>
        LLM · Opus 4.8
      </NodeLabel>

      <div
        className={cn(
          "nbox",
          selected && "sel",
          chat.isPending && "running",
        )}
        style={{ padding: 0, overflow: "hidden" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-border/80 px-3 py-2">
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-foreground">
            {isRedTeam ? (
              <Swords size={12} className="text-[color:var(--p-red)]" />
            ) : (
              <Sparkles size={12} className="text-content" />
            )}
            {isRedTeam ? "Оппонент" : "Ассистент"}
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]",
                contextCount > 0
                  ? "bg-content/15 text-content"
                  : "bg-foreground/5 text-muted-foreground",
              )}
              title="Сколько нод подключено как контекст"
            >
              <Link2 size={9} />
              {contextCount > 0
                ? `${contextCount} в контексте`
                : "нет контекста"}
            </span>
            {!readOnly && (
              <button
                type="button"
                className={cn(
                  "inline-flex h-6 w-6 items-center justify-center rounded-md transition",
                  isRedTeam
                    ? "bg-[color:var(--p-red)]/15 text-[color:var(--p-red)]"
                    : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMode();
                }}
                onMouseDown={(e) => e.stopPropagation()}
                title={
                  isRedTeam
                    ? "Режим оппонента включён. Вернуть помощника"
                    : "Поспорить с тезисом: сначала усилит формулировку, потом будет её ломать"
                }
                aria-pressed={isRedTeam}
              >
                <Swords size={12} />
              </button>
            )}
            {!readOnly && (
              <button
                type="button"
                className={cn(
                  "inline-flex h-6 w-6 items-center justify-center rounded-md transition",
                  instrOpen || instruction.trim()
                    ? "bg-content/15 text-content"
                    : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setInstrOpen((v) => !v);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                title="Инструкция для ассистента (роль и задача)"
              >
                <Settings2 size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Collapsible role/task instruction — steers WHAT the assistant does
            with the attached nodes, per-node. */}
        {instrOpen && !readOnly && (
          <div className="border-b border-border/80 bg-foreground/[0.02] px-3 py-2">
            <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              Инструкция ассистенту
            </div>
            <textarea
              className="co-field-textarea nodrag w-full"
              style={{ minHeight: 60, maxHeight: 160, resize: "vertical" }}
              placeholder="Напр.: ты редактор-критик. Разбери подключённые тезисы, укажи слабые и предложи, как усилить хук."
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              onBlur={saveInstruction}
              onMouseDown={(e) => e.stopPropagation()}
              rows={3}
            />
          </div>
        )}

        {/* Messages */}
        <div
          ref={scrollRef}
          className="nodrag flex flex-col gap-2 overflow-y-auto px-3 py-3"
          style={{ maxHeight: 320, minHeight: 120 }}
          onWheelCapture={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {messages.length === 0 && !chat.isPending && (
            <div className="py-6 text-center text-[12px] leading-snug text-muted-foreground">
              {isRedTeam
                ? "Напиши тезис, который собираешься публиковать. Сначала я сформулирую его сильнее, чем ты, — и только потом начну ломать."
                : "Подключи ноды-источники слева и спроси что угодно про их содержимое — обсудим и доработаем вместе."}
            </div>
          )}
          {messages.map((m, i) => (
            <ChatBubble key={i} message={m} />
          ))}
          {chat.isPending && (
            <div className="flex items-center gap-2 self-start rounded-lg bg-foreground/[0.04] px-3 py-2 text-[12px] text-muted-foreground">
              <Loader2 size={12} className="animate-spin" />
              Думаю…
            </div>
          )}
        </div>

        {/* Input */}
        {!readOnly && (
          <div className="border-t border-border/80 p-2">
            <div className="flex items-end gap-1.5">
              <textarea
                className="co-field-textarea nodrag flex-1"
                style={{ minHeight: 38, maxHeight: 120, resize: "none" }}
                placeholder={isRedTeam ? "Тезис, который надо проверить на прочность…" : "Спроси или попроси доработать…"}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                disabled={chat.isPending}
              />
              <button
                type="button"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={(e) => {
                  e.stopPropagation();
                  send();
                }}
                onMouseDown={(e) => e.stopPropagation()}
                disabled={!draft.trim() || chat.isPending}
                title="Отправить (Enter)"
              >
                {chat.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CornerDownLeft size={14} />
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ChatBubble({ message }: { message: LlmChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div
      className={cn(
        "max-w-[88%] whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-[12.5px] leading-[1.5]",
        isUser
          ? "self-end bg-content/20 text-foreground"
          : "self-start bg-foreground/[0.05] text-foreground",
      )}
    >
      {message.content}
    </div>
  );
}


