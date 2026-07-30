import { apiFetch } from "@/lib/api";
import type { IntegrationOut, SocialAccountOut } from "@/lib/types";

/**
 * Статус площадок считает сервер: только он знает, заданы ли ключи
 * приложения. Клиенту остаётся показать это человеческим языком.
 */
export async function listIntegrations(): Promise<IntegrationOut[]> {
  return apiFetch<IntegrationOut[]>("/api/v1/integrations");
}

// ---------------------------------------------------------------------------
// Аккаунты, подключённые через внешний шлюз
// ---------------------------------------------------------------------------

/**
 * Источник правды о подключениях — шлюз, а не наша база: пользователь может
 * отозвать доступ на стороне площадки. Поэтому список синхронизируется, а не
 * просто читается.
 */
export async function listSocialAccounts(): Promise<SocialAccountOut[]> {
  return apiFetch<SocialAccountOut[]>("/api/v1/social-accounts");
}

export async function syncSocialAccounts(): Promise<SocialAccountOut[]> {
  return apiFetch<SocialAccountOut[]>("/api/v1/social-accounts/sync", {
    method: "POST",
  });
}

export async function connectSocialAccount(
  platform: string,
): Promise<{ authorize_url: string }> {
  return apiFetch<{ authorize_url: string }>(
    `/api/v1/social-accounts/connect/${platform}`,
    { method: "POST" },
  );
}

export async function disconnectSocialAccount(id: string): Promise<void> {
  await apiFetch<void>(`/api/v1/social-accounts/${id}`, { method: "DELETE" });
}
