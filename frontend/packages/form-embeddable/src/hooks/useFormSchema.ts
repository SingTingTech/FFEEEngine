import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { SchemaDetailVO } from '../types';
import type { Endpoints } from '../api/endpoints';

export function useFormSchema(
  endpoints: Endpoints,
  formId: number,
  options?: { enabled?: boolean },
): UseQueryResult<SchemaDetailVO> {
  return useQuery({
    queryKey: ['form-schema', formId],
    queryFn: () => endpoints.getSchema(formId),
    enabled: options?.enabled ?? !!formId,
    staleTime: 5 * 60 * 1000,
  });
}