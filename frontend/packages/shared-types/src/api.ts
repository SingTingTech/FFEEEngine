// Shared API response types — matches backend Result<T> contract

export interface Result<T> {
  code: number;
  message: string;
  data: T | null;
}

export const isSuccess = <T>(r: Result<T>): r is Result<T> & { data: T } =>
  r.code === 0 && r.data !== null;

export interface PageQuery {
  pageNum?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  keyword?: string;
}

export interface PageResult<T> {
  records: T[];
  total: number;
  pageNum: number;
  pageSize: number;
}