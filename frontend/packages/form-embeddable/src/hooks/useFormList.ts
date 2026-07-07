import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { FormRecord, PageResult } from '../types';
import type { Endpoints, ListParams } from '../api/endpoints';

export function useFormList(
  endpoints: Endpoints,
  formId: string | number,
  params: ListParams = { pageNum: 1, pageSize: 20 },
): UseQueryResult<PageResult<FormRecord>> {
  return useQuery({
    queryKey: ['form-records', formId, params],
    queryFn: () => endpoints.listRecords(formId, params),
    enabled: !!formId,
  });
}