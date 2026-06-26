import { http, request } from './http';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: number;
    username: string;
    realName: string | null;
    roles: string[];
  };
}

export const authApi = {
  login: (data: LoginRequest) =>
    request<LoginResponse>(http.post('/auth/login', data)),
  logout: () => request<void>(http.post('/auth/logout')),
  refresh: (refreshToken: string) =>
    request<LoginResponse>(http.post('/auth/refresh', { refreshToken })),
};