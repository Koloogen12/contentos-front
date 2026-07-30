import { apiFetch } from "@/lib/api";
import type { IntegrationOut } from "@/lib/types";

/**
 * Статус площадок считает сервер: только он знает, заданы ли ключи
 * приложения. Клиенту остаётся показать это человеческим языком.
 */
export async function listIntegrations(): Promise<IntegrationOut[]> {
  return apiFetch<IntegrationOut[]>("/api/v1/integrations");
}
