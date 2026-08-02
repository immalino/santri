/**
 * Tiny fetch wrapper for client components.
 *
 * Sets JSON headers, throws an Error with the server's Bahasa Indonesia
 * message on non-2xx responses, and returns the parsed JSON body on success.
 * Client-safe: imports nothing from the server bundle.
 */
export class ApiError extends Error {}

export async function api<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(body?.error ?? "Terjadi kesalahan. Silakan coba lagi.");
  }

  return res.json() as Promise<T>;
}
