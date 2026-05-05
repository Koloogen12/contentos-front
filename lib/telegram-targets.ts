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
