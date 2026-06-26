import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { ReferenceOption, PageResult } from '../types';
import type { Endpoints } from '../api/endpoints';

export function useReferenceLookup(
  endpoints: Endpoints,
  targetFormId: number,
  keyword: string,
  open: boolean,
  debounceMs: number = 300,
): { results: UseQueryResult<PageResult<ReferenceOption>>; debouncedKeyword: string } {
  const [debouncedKeyword, setDebounced] = useState(keyword);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(keyword), debounceMs);
    return () => clearTimeout(t);
  }, [keyword, debounceMs]);

  const results = useQuery({
    queryKey: ['ref-lookup', targetFormId, debouncedKeyword],
    queryFn: () => endpoints.lookupReference(targetFormId, debouncedKeyword, { pageSize: 20 }),
    enabled: open && debouncedKeyword.length > 0,
    staleTime: 30 * 1000,
  });

  return { results, debouncedKeyword };
}

export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}