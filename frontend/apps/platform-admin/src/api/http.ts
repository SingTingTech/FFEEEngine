import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { Result } from '@safe-validator/shared-types';
import { useAuthStore } from '@/stores/auth';
import { getRefreshPromise } from './refresh';

const RETRY_FLAG = '_svAuthRetried';

function hardRedirectToLogin() {
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE ?? '/api',
  timeout: 10000,
});

http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError<Result<unknown>>) => {
    const status = error.response?.status;
    const config = error.config as
      | (InternalAxiosRequestConfig & { [RETRY_FLAG]?: boolean })
      | undefined;

    // Retry once with a refreshed access token on 401 / 403. Skip:
    //   - the refresh endpoint itself (would loop forever)
    //   - requests we've already retried (avoid the second-attempt loop
    //     if the new token is *also* rejected)
    const url = typeof config?.url === 'string' ? config.url : '';
    const isRefreshUrl = url.includes('/auth/refresh');
    const alreadyRetried = config?.[RETRY_FLAG];
    const shouldRetry =
      (status === 401 || status === 403) &&
      !isRefreshUrl &&
      !alreadyRetried &&
      !!config;

    if (shouldRetry && config) {
      config[RETRY_FLAG] = true;
      try {
        await getRefreshPromise();
      } catch {
        // Refresh itself failed (refresh token expired / revoked /
        // network). At this point nothing can recover — hard logout.
        useAuthStore.getState().logout();
        hardRedirectToLogin();
        return Promise.reject(error);
      }

      // Got a fresh access token; retry the original request once.
      const newToken = useAuthStore.getState().token;
      if (newToken) {
        config.headers = config.headers ?? ({} as typeof config.headers);
        (config.headers as Record<string, string>).Authorization = `Bearer ${newToken}`;
        return axios.request(config);
      }
    }

    // Not retriable (or refresh already failed above): the auth path is
    // closed. Clear the store and bounce to /login.
    if (status === 401 || status === 403) {
      useAuthStore.getState().logout();
      hardRedirectToLogin();
    }
    return Promise.reject(error);
  },
);

export async function request<T>(promise: Promise<AxiosResponse<Result<T>>>): Promise<T> {
  const response = await promise;
  const body = response.data;
  if (body.code !== 0) {
    throw new Error(body.message || `Request failed with code ${body.code}`);
  }
  return body.data as T;
}
