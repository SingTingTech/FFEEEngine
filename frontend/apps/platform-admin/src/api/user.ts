import { http, request } from './http';
import { PageQuery, PageResult } from '@safe-validator/shared-types';

export interface UserVO {
  id: string;
  username: string;
  realName: string | null;
  email: string | null;
  phone: string | null;
  status: number;
  lastLoginAt: string | null;
  createTime: string;
  roles: string[];
}

export interface UserCreateRequest {
  username: string;
  password: string;
  realName?: string;
  email?: string;
  phone?: string;
  status?: number;
  roleIds?: string[];
}

export type UserUpdateRequest = Partial<UserCreateRequest>;

export const userApi = {
  page: (query: PageQuery) =>
    request<PageResult<UserVO>>(
      http.get('/admin/users', {
        params: {
          pageNum: query.pageNum ?? 1,
          pageSize: query.pageSize ?? 20,
          keyword: query.keyword,
        },
      }),
    ),
  get: (id: string) => request<UserVO>(http.get(`/admin/users/${id}`)),
  create: (data: UserCreateRequest) =>
    request<string>(http.post('/admin/users', data)),
  update: (id: string, data: UserUpdateRequest) =>
    request<void>(http.put(`/admin/users/${id}`, data)),
  delete: (id: string) => request<void>(http.delete(`/admin/users/${id}`)),
};