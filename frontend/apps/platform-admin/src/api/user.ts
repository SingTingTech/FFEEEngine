import { http, request } from './http';
import { PageQuery, PageResult } from '@safe-validator/shared-types';

export interface UserVO {
  id: number;
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
  roleIds?: number[];
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
  get: (id: number) => request<UserVO>(http.get(`/admin/users/${id}`)),
  create: (data: UserCreateRequest) =>
    request<number>(http.post('/admin/users', data)),
  update: (id: number, data: UserUpdateRequest) =>
    request<void>(http.put(`/admin/users/${id}`, data)),
  delete: (id: number) => request<void>(http.delete(`/admin/users/${id}`)),
};