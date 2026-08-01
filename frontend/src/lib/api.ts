import axios, { type AxiosInstance } from 'axios';

export const API_BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

/**
 * Axios instance that attaches the in-memory JWT to every request and hands
 * 401s back to the caller (which drops the session and shows the login screen).
 */
export function createApiClient(
  token: string | null,
  onUnauthorized: () => void
): AxiosInstance {
  const client = axios.create({ baseURL: API_BASE_URL || undefined });

  client.interceptors.request.use(config => {
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    response => response,
    error => {
      if (error.response?.status === 401) {
        onUnauthorized();
      }
      return Promise.reject(error);
    }
  );

  return client;
}

/** Flatten DRF error payloads ({field: [msg]}, {detail: msg}) into one string. */
export function extractApiError(err: unknown, fallback: string): string {
  const error = err as { response?: { data?: unknown }; message?: string };
  const data = error.response?.data;

  if (typeof data === 'string' && data.trim()) return data;

  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    const detail = record.detail ?? record.message;
    if (typeof detail === 'string') return detail;

    const messages = Object.entries(record).flatMap(([field, value]) => {
      const parts = Array.isArray(value) ? value : [value];
      return parts
        .filter(part => typeof part === 'string')
        .map(part => (field === 'non_field_errors' ? String(part) : `${part}`));
    });
    if (messages.length) return messages.join(' ');
  }

  return error.message || fallback;
}
