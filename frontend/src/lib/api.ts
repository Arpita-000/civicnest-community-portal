import axios from "axios";
import { auth } from "./firebase";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const http = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});

// Always attach a fresh token: Firebase refreshes it automatically, so it never expires mid-session.
http.interceptors.request.use(async (config) => {
  const current = auth.currentUser;
  if (current) {
    try {
      config.headers.Authorization = `Bearer ${await current.getIdToken()}`;
    } catch {
      /* fall through as a guest request */
    }
  }
  return config;
});

// ── Tiny GET cache ────────────────────────────────────────────────────────────
// Public lists are re-opened constantly while browsing; a short TTL makes navigation instant
// without ever showing data that is stale after a write (every mutation clears the cache).
const TTL_MS = 20_000;
const cache = new Map<string, { at: number; data: any }>();
const inflight = new Map<string, Promise<any>>();

export const clearApiCache = () => {
  cache.clear();
  inflight.clear();
};

const keyOf = (url: string, params?: unknown) =>
  `${auth.currentUser?.uid ?? "guest"}|${url}|${params ? JSON.stringify(params) : ""}`;

type Opts = { params?: Record<string, any>; fresh?: boolean; signal?: AbortSignal };

const api = {
  async get<T = any>(url: string, opts: Opts = {}): Promise<{ data: T }> {
    const key = keyOf(url, opts.params);
    const hit = cache.get(key);
    if (!opts.fresh && hit && Date.now() - hit.at < TTL_MS) return { data: hit.data };

    let pending = inflight.get(key);
    if (!pending || opts.fresh) {
      pending = http
        .get(url, { params: opts.params, signal: opts.signal })
        .then((res) => {
          cache.set(key, { at: Date.now(), data: res.data });
          return res.data;
        })
        .finally(() => inflight.delete(key));
      inflight.set(key, pending);
    }
    return { data: await pending };
  },

  async post<T = any>(url: string, body?: unknown, headers?: Record<string, string>) {
    const res = await http.post<T>(url, body, { headers });
    clearApiCache();
    return res;
  },
  async put<T = any>(url: string, body?: unknown) {
    const res = await http.put<T>(url, body);
    clearApiCache();
    return res;
  },
  async patch<T = any>(url: string, body?: unknown) {
    const res = await http.patch<T>(url, body);
    clearApiCache();
    return res;
  },
  async delete<T = any>(url: string) {
    const res = await http.delete<T>(url);
    clearApiCache();
    return res;
  },
};

/** Upload one image through the API (`/upload`, base64 body) and return its public URL. */
export async function uploadImage(file: File, onProgress?: (percent: number) => void): Promise<string> {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.readAsDataURL(file);
  });
  const { data } = await http.post(
    "/upload",
    { name: file.name, base64 },
    { timeout: 60000, onUploadProgress: (e) => onProgress?.(Math.round((e.loaded / (e.total || e.loaded || 1)) * 100)) }
  );
  return data.url as string;
}

/** Readable message from an axios/Firebase/unknown error. */
export function errMsg(err: any, fallback = "Something went wrong. Please try again."): string {
  const d = err?.response?.data;
  if (d?.error || d?.message) return d.error || d.message;
  if (typeof d?.detail === "string") return d.detail;
  if (err?.code === "ECONNABORTED") return "The server took too long to respond. Please try again.";
  if (err?.code === "ERR_NETWORK" || err?.message === "Network Error") return "Cannot reach the server. Check your connection.";
  return fallback;
}

export default api;
