import { getAuthSnapshot, useAuthStore } from "@/stores/auth";
import type { MeResponse, TokenPair } from "@/lib/types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail || `Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  /** JSON-serializable body, BodyInit, or undefined. */
  body?: unknown;
  /** When true, skip Authorization injection and refresh handling. */
  skipAuth?: boolean;
  /** Internal — used by the refresh path to prevent infinite recursion. */
  _retried?: boolean;
}

let refreshInFlight: Promise<string | null> | null = null;

/**
 * Attempt to refresh the access token. Concurrent calls share a single
 * in-flight promise so we don't fire multiple refreshes.
 */
async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  const { refreshToken } = getAuthSnapshot();
  if (!refreshToken) return null;

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as TokenPair;
      useAuthStore
        .getState()
        .setTokens({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
        });
      return data.access_token;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

function handleHardLogout() {
  if (typeof window === "undefined") return;
  useAuthStore.getState().logout();
  // Avoid an infinite redirect loop on the auth pages themselves.
  const path = window.location.pathname;
  if (path !== "/login" && path !== "/register") {
    window.location.href = "/login";
  }
}

async function parseError(res: Response): Promise<ApiError> {
  let detail = res.statusText;
  try {
    const data = await res.json();
    if (data && typeof data === "object") {
      if (typeof data.detail === "string") detail = data.detail;
      else if (Array.isArray(data.detail))
        detail = data.detail
          .map((d: { msg?: string; loc?: unknown[] }) => d?.msg ?? "")
          .filter(Boolean)
          .join("; ");
    }
  } catch {
    // ignore parse errors — fall back to statusText
  }
  return new ApiError(res.status, detail);
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { body, skipAuth, _retried, headers, ...rest } = options;
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;

  const requestHeaders = new Headers(headers as HeadersInit | undefined);
  if (body !== undefined && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }
  if (!skipAuth) {
    const { accessToken } = getAuthSnapshot();
    if (accessToken) {
      requestHeaders.set("Authorization", `Bearer ${accessToken}`);
    }
  }

  const init: RequestInit = {
    ...rest,
    headers: requestHeaders,
    body:
      body === undefined
        ? undefined
        : typeof body === "string" || body instanceof FormData
          ? (body as BodyInit)
          : JSON.stringify(body),
  };

  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (err) {
    throw new ApiError(
      0,
      err instanceof Error ? err.message : "Network request failed",
    );
  }

  if (res.status === 401 && !skipAuth && !_retried) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return apiFetch<T>(path, { ...options, _retried: true });
    }
    handleHardLogout();
    throw await parseError(res);
  }

  if (!res.ok) {
    throw await parseError(res);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await res.json()) as T;
  }
  // Fall back to text for non-JSON success responses.
  return (await res.text()) as unknown as T;
}

// ----- Auth API helpers -----

export async function loginRequest(input: { email: string; password: string }) {
  return apiFetch<TokenPair>("/api/v1/auth/login", {
    method: "POST",
    body: input,
    skipAuth: true,
  });
}

export async function registerRequest(input: {
  email: string;
  password: string;
  display_name?: string;
  organization_name?: string;
}) {
  return apiFetch<TokenPair>("/api/v1/auth/register", {
    method: "POST",
    body: input,
    skipAuth: true,
  });
}

export async function fetchMe() {
  return apiFetch<MeResponse>("/api/v1/auth/me");
}

/**
 * One-shot refresh helper used by the rehydration flow. Unlike `refreshAccessToken`
 * above, this returns the full token pair so the caller can update both tokens.
 */
export async function refreshOnce(refreshToken: string): Promise<TokenPair> {
  return apiFetch<TokenPair>("/api/v1/auth/refresh", {
    method: "POST",
    body: { refresh_token: refreshToken },
    skipAuth: true,
  });
}
