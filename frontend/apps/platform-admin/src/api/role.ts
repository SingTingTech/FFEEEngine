import { http, request } from './http';
import { PageResult } from '@safe-validator/shared-types';

export interface RoleVO {
  id: number;
  code: string;
  name: string;
  description: string | null;
  status: number;
  permissionIds: number[];
}

export interface RoleRequest {
  code: string;
  name: string;
  description?: string;
  status?: number;
  permissionIds?: number[];
}

export const roleApi = {
  page: (params: { pageNum?: number; pageSize?: number; keyword?: string }) =>
    request<PageResult<RoleVO>>(http.get('/admin/roles', { params })),
  listAll: () => request<RoleVO[]>(http.get('/admin/roles/all')),
  create: (data: RoleRequest) => request<number>(http.post('/admin/roles', data)),
  update: (id: number, data: RoleRequest) =>
    request<void>(http.put(`/admin/roles/${id}`, data)),
  delete: (id: number) => request<void>(http.delete(`/admin/roles/${id}`)),
};