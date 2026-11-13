import { tr } from '@/i18n/client';

/**
 * Browser client for the Next.js API. Unwraps the `{ ok, data | error }`
 * envelope and throws `ApiError` with a message in the page language, ready for a toast.
 * Session cookies are HttpOnly and sent automatically (same origin).
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

async function request<T>(method: Method, path: string, body?: unknown, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
      ...init,
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', tr('common').networkError);
  }
  const json = (await res.json().catch(() => null)) as { ok: boolean; data?: T; error?: { code: string; message: string; details?: unknown } } | null;
  if (!res.ok || !json?.ok) {
    const error = json?.error;
    throw new ApiError(res.status, error?.code ?? 'HTTP_ERROR', error?.message ?? tr('common').genericError, error?.details);
  }
  return json.data as T;
}

export const api = {
  get: <T>(path: string, init?: RequestInit) => request<T>('GET', path, undefined, init),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string, body?: unknown) => request<T>('DELETE', path, body),
};

/** Builds a query string from defined values. */
export const qs = (params: Record<string, string | number | boolean | undefined | null>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') search.set(k, String(v));
  });
  const s = search.toString();
  return s ? `?${s}` : '';
};
