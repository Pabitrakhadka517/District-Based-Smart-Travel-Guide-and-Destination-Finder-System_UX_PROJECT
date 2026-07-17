const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

/** Exposed for callers that need to build their own request (e.g. XHR uploads with progress). */
export function getApiBase(): string {
  return BASE;
}

/** Backend validation errors include a field-level `errors` array — surface it instead
 *  of the generic "Validation failed" message so the UI can show what actually broke. */
function buildErrorMessage(json: { error?: string; errors?: { field: string; message: string }[] }): string {
  const base = json.error ?? "Unknown error";
  if (!json.errors?.length) return base;
  return `${base}: ${json.errors.map((e) => `${e.field} (${e.message})`).join(", ")}`;
}

const DEFAULT_TIMEOUT_MS = 15_000;
const UPLOAD_TIMEOUT_MS  = 60_000;

/**
 * fetch() with a timeout, and a friendly error message instead of the raw
 * "Failed to fetch" / "The operation was aborted" a caller would otherwise
 * see on a hung request, an offline connection, or a DNS failure.
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("The request timed out. Please check your connection and try again.");
    }
    throw new Error("Unable to reach the server. Please check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Tries to mint a fresh access token using the httpOnly refresh cookie. The
 * backend sets a fresh httpOnly access-token cookie as a side effect of this
 * call (via Set-Cookie) — the browser attaches it automatically to whatever
 * request is retried next, so there's nothing for this module to store.
 */
async function refreshAccessToken(): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(`${BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include"
    });
    if (!res.ok) return false;
    const json = await res.json();
    if (!json.success || !json.data?.user) return false;
    // Sync the refreshed user into the Zustand store without importing it here
    // (avoids a circular dependency) — the store's persist layer picks it up.
    window.dispatchEvent(new CustomEvent("nepayatra:token-refresh", { detail: { user: json.data.user } }));
    return true;
  } catch {
    return false;
  }
}

interface SuccessEnvelope<T> {
  success: true;
  data: T;
  total?: number;
  page?: number;
  limit?: number;
}

/**
 * Core fetch wrapper that handles 401 → refresh → retry once.
 * Dispatches "nepayatra:logout" if refresh also fails. Returns the full
 * response envelope (not just `.data`) so callers that need `total`/`page`
 * (paginated admin lists) don't have to re-implement the retry dance.
 *
 * Authentication itself needs no code here at all: the access token lives in
 * an httpOnly cookie (never touched by JS, so it can't be read by an XSS
 * bug), and `credentials: "include"` — set unconditionally below — is what
 * makes the browser attach it. `withAuth` only controls whether a 401 is
 * worth retrying after a refresh, not what headers get sent.
 */
async function requestRaw<T>(
  path: string,
  init: RequestInit,
  withAuth: boolean
): Promise<SuccessEnvelope<T>> {
  const headers: HeadersInit = { "Content-Type": "application/json", ...(init.headers as object) };

  const res = await fetchWithTimeout(`${BASE}${path}`, { ...init, headers, credentials: "include" });

  if (res.status === 401 && withAuth) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      // Retry the original request — the browser now has the fresh access cookie.
      const retryRes = await fetchWithTimeout(`${BASE}${path}`, { ...init, headers, credentials: "include" });
      const retryJson = await retryRes.json();
      if (!retryJson.success) throw new Error(buildErrorMessage(retryJson));
      return retryJson as SuccessEnvelope<T>;
    }
    // Refresh also failed — log the user out
    window.dispatchEvent(new Event("nepayatra:logout"));
    throw new Error("Session expired. Please log in again.");
  }

  const json = await res.json();
  if (!json.success) throw new Error(buildErrorMessage(json));
  return json as SuccessEnvelope<T>;
}

async function request<T>(
  path: string,
  init: RequestInit,
  withAuth: boolean
): Promise<T> {
  return (await requestRaw<T>(path, init, withAuth)).data;
}

export async function apiGet<T>(path: string, auth = false): Promise<T> {
  return request<T>(path, { method: "GET", cache: "no-store" }, auth);
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

/** Like apiGet, but preserves `total`/`page`/`limit` from a paginated list endpoint
 *  instead of discarding them — needed so callers can tell a full page apart
 *  from a truncated one. */
export async function apiGetPaginated<T>(path: string, auth = false): Promise<PaginatedResult<T>> {
  const envelope = await requestRaw<T[]>(path, { method: "GET", cache: "no-store" }, auth);
  return {
    data: envelope.data,
    total: envelope.total ?? envelope.data.length,
    page: envelope.page ?? 1,
    limit: envelope.limit ?? envelope.data.length
  };
}

export async function apiPost<T>(path: string, body: unknown, auth = false): Promise<T> {
  return request<T>(path, { method: "POST", body: JSON.stringify(body) }, auth);
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: "PUT", body: JSON.stringify(body) }, true);
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: "PATCH", body: JSON.stringify(body) }, true);
}

export async function apiDelete<T = void>(path: string): Promise<T> {
  return request<T>(path, { method: "DELETE" }, true);
}

/**
 * Multipart upload helper — unlike `request()`, this never sets a
 * `Content-Type` header so the browser can add its own multipart boundary,
 * and the FormData body is passed through unmodified (not JSON.stringify'd).
 * Auth is via the httpOnly cookie (`credentials: "include"`), same as every
 * other request here.
 */
export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetchWithTimeout(`${BASE}${path}`, {
    method: "POST",
    body: formData,
    credentials: "include"
  }, UPLOAD_TIMEOUT_MS);

  if (res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const retryRes = await fetchWithTimeout(`${BASE}${path}`, {
        method: "POST",
        body: formData,
        credentials: "include"
      }, UPLOAD_TIMEOUT_MS);
      const retryJson = await retryRes.json();
      if (!retryJson.success) throw new Error(buildErrorMessage(retryJson));
      return retryJson.data as T;
    }
    window.dispatchEvent(new Event("nepayatra:logout"));
    throw new Error("Session expired. Please log in again.");
  }

  const json = await res.json();
  if (!json.success) throw new Error(buildErrorMessage(json));
  return json.data as T;
}
