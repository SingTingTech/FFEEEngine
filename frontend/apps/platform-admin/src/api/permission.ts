import { http, request } from './http';

export interface PermissionNode {
  id: number;
  parentId: number;
  code: string;
  name: string;
  type: string;
  path: string | null;
  icon: string | null;
  sortOrder: number;
  children: PermissionNode[];
}

export const permissionApi = {
  tree: () => request<PermissionNode[]>(http.get('/admin/permissions/tree')),
};