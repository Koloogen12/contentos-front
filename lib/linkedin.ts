import { apiFetch } from "@/lib/api";

export interface LinkedInAccountOut {
  id: string;
  organization_id: string;
  sub: string;
  display_name: string;
  email: string | null;
  avatar_url: string | null;
  scopes: string[];
  is_default: boolean;
  access_expires_at: string;
  refresh_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LinkedInStartResponse {
  authorize_url: string;
  /** State JWT TTL — the frontend uses this to time the popup out. */
  expires_in_seconds: number;
}

/** Kick off the OAuth flow.
 *
 * Backend returns the authorize URL; caller is responsible for opening it
 * (window.open or full-page redirect). The user lands back on
 * `redirect_after` (or the server's default) after granting consent.
 */
export async function startLinkedInOAuth(
  redirectAfter?: string,
): Promise<LinkedInStartResponse> {
  return apiFetch<LinkedInStartResponse>("/api/v1/linkedin/auth/start", {
    method: "POST",
    body: { redirect_after: redirectAfter ?? null },
  });
}

export async function listLinkedInAccounts(): Promise<LinkedInAccountOut[]> {
  return apiFetch<LinkedInAccountOut[]>("/api/v1/linkedin/accounts");
}

export async function deleteLinkedInAccount(id: string): Promise<void> {
  await apiFetch<void>(`/api/v1/linkedin/accounts/${id}`, {
    method: "DELETE",
  });
}

export async function setDefaultLinkedInAccount(
  id: string,
): Promise<LinkedInAccountOut> {
  return apiFetch<LinkedInAccountOut>(
    `/api/v1/linkedin/accounts/${id}/set-default`,
    { method: "POST" },
  );
}
