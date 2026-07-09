import axios, { AxiosError, AxiosResponse } from 'axios';
import { Result } from '@safe-validator/shared-types';
import { useAuthStore } from '@/stores/auth';
import { isTokenExpired } from '@/utils/jwt';

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE ?? '/api',
  timeout: 10000,
});

function hardRedirectToLogin() {
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

http.interceptors.request.use((config) => {
  const { token } = useAuthStore.getState();
  if (token) {
    // Catch expiration before sending — the backend may not return a
    // distinguishable status on expired tokens (the filter just clears
    // the context and lets the request reach an endpoint that responds
    // 403), so reading `exp` here is the most reliable trigger.
    if (isTokenExpired(token)) {
      useAuthStore.getState().logout();
      hardRedirectToLogin();
      return Promise.reject(new axios.CanceledError('Token expired'));
    }
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<Result<unknown>>) => {
    // Treat 401 (token blacklisted) AND 403 (token expired/missing)
    // as an auth failure. The backend doesn't distinguish them; for
    // the user's purposes both mean "log in again".
    const status = error.response?.status;
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