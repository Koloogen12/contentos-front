import { apiFetch } from "@/lib/api";
import type {
  TelegramTargetCreate,
  TelegramTargetOut,
  TelegramTargetUpdate,
} from "@/lib/types";

export async function listTargets(): Promise<TelegramTargetOut[]> {
  return apiFetch<TelegramTargetOut[]>("/api/v1/telegram-targets");
}

export async function createTarget(
  input: TelegramTargetCreate,
): Promise<TelegramTargetOut> {
  return apiFetch<TelegramTargetOut>("/api/v1/telegram-targets", {
    method: "POST",
    body: input,
  });
}

export async function updateTarget(
  id: string,
  input: TelegramTargetUpdate,
): Promise<TelegramTargetOut> {
  return apiFetch<TelegramTargetOut>(`/api/v1/telegram-targets/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export async function deleteTarget(id: string): Promise<void> {
  await apiFetch<void>(`/api/v1/telegram-targets/${id}`, {
    method: "DELETE",
  });
}

// ---- Bot setup + chat verification ----------------------------------------

export interface TelegramBotInfo {
  username: string | null;
  first_name: string | null;
  add_admin_instructions: string;
}

export interface TelegramVerifyResult {
  ok: boolean;
  chat_title?: string | null;
  chat_type?: string | null;
  member_count?: number | null;
  can_post?: boolean | null;
  detail?: string | null;
}

/** Get the shared ContentOS bot's @username for the "add as admin" CTA. */
export async function getBotInfo(): Promise<TelegramBotInfo> {
  return apiFetch<TelegramBotInfo>("/api/v1/telegram-targets/bot-info");
}

/**
 * Pre-flight check: does the bot actually have access to the channel the
 * user typed in? Runs `getChat` + `getChatMember` on the server — same
 * permission model as the real send, so a green tick here means the
 * publish will succeed.
 */
export async function verifyChat(
  chat_id: string,
): Promise<TelegramVerifyResult> {
  return apiFetch<TelegramVerifyResult>("/api/v1/telegram-targets/verify", {
    method: "POST",
    body: { chat_id },
  });
}
