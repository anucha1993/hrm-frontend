// Lightweight fetch wrapper for the Laravel API.
// Token is stored in localStorage + cookie (cookie used by Next middleware).

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:8100/api";

const TOKEN_KEY = "cyc_hrm_token";
const COOKIE_KEY = "cyc_hrm_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  // cookie ให้ Next middleware อ่านได้ฝั่ง server
  document.cookie = `${COOKIE_KEY}=${token}; path=/; max-age=${60 * 60 * 24 * 14}; SameSite=Lax`;
}

export function clearToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  document.cookie = `${COOKIE_KEY}=; path=/; max-age=0; SameSite=Lax`;
}

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

type Options = Omit<RequestInit, "body"> & { body?: unknown; auth?: boolean };

export async function apiFetch<T = unknown>(
  path: string,
  options: Options = {}
): Promise<T> {
  const { body, auth = true, headers, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    Accept: "application/json",
    ...(headers as Record<string, string> | undefined),
  };

  if (body !== undefined && !(body instanceof FormData)) {
    finalHeaders["Content-Type"] = "application/json";
  }

  if (auth) {
    const token = getToken();
    if (token) finalHeaders["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
    body:
      body === undefined
        ? undefined
        : body instanceof FormData
          ? body
          : JSON.stringify(body),
  });

  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const message =
      data && typeof data === "object" && "message" in data
        ? (data as { message?: string }).message
        : undefined;
    const msg = message || `HTTP ${res.status}`;
    throw new ApiError(res.status, msg, data);
  }

  return data as T;
}

/**
 * Download a file (Blob) from the API and trigger browser download.
 * Used for Excel/CSV exports.
 */
export async function apiDownload(
  path: string,
  filename: string,
  init: { params?: Record<string, string | number | undefined | null> } = {}
): Promise<void> {
  const headers: Record<string, string> = { Accept: "application/octet-stream" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let url = `${API_URL}${path}`;
  if (init.params) {
    const qs = new URLSearchParams();
    Object.entries(init.params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.append(k, String(v));
    });
    const s = qs.toString();
    if (s) url += (url.includes("?") ? "&" : "?") + s;
  }

  const res = await fetch(url, { headers });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data && typeof data === "object" && "message" in data) {
        message = String((data as { message?: string }).message ?? message);
      }
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, message);
  }

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objectUrl);
}
