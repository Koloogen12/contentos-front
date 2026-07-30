import { apiFetch } from "@/lib/api";
import type { LlmChatResponse } from "@/lib/types";

/**
 * Send one chat turn to an LLM node. The backend assembles context from every
 * node wired INTO this node, runs the conversation through Opus 4.8, appends
 * both the user message and the reply to `node.data.messages`, and returns the
 * full updated history.
 */
export async function llmChat(
  nodeId: string,
  message: string,
): Promise<LlmChatResponse> {
  return apiFetch<LlmChatResponse>(`/api/v1/nodes/${nodeId}/llm-chat`, {
    method: "POST",
    body: { message },
  });
}

/**
 * Set the LLM node's system instruction (role/task). Goes through a dedicated
 * endpoint that merges server-side, so it never clobbers the chat history
 * (which the generic node PATCH would, since it replaces the whole data blob
 * and the freshest messages live in client chat state until a refetch).
 */
export async function setLlmSystemPrompt(
  nodeId: string,
  systemPrompt: string,
): Promise<void> {
  await apiFetch<void>(`/api/v1/nodes/${nodeId}/llm-config`, {
    method: "PATCH",
    body: { system_prompt: systemPrompt },
  });
}
