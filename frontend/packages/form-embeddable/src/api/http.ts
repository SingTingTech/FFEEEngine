export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export interface HttpOptions {
  apiBase: string;
  token?: string;
}

export function createHttp(opts: HttpOptions) {
  const { apiBase, token } = opts;

  async function request<T>(method: string, path: string, body?: any): Promise<T> {
    const url = `${apiBase.replace(/\/$/, '')}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      let data: any = null;
      try { data = await res.json(); } catch { /* ignore */ }
      const message = data?.message ?? `HTTP ${res.status}`;
      throw new ApiError(message, res.status, data);
    }

    const json = await res.json();
    // Unwrap Result<T> envelope: { code, message, data }
    if (json && typeof json === 'object' && 'code' in json) {
      if (json.code !== 0) {
        throw new ApiError(json.message ?? `Error code ${json.code}`, res.status, json);
      }
      return json.data as T;
    }
    return json as T;
  }

  return {
    get: <T>(path: string) => request<T>('GET', path),
    post: <T>(path: string, body?: any) => request<T>('POST', path, body),
    put: <T>(path: string, body?: any) => request<T>('PUT', path, body),
    delete: <T>(path: string) => request<T>('DELETE', path),
  };
}

export type Http = ReturnType<typeof createHttp>;