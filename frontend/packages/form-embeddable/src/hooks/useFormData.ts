import { useQuery, useMutation, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import type { FormRecord, FormSubmitPayload } from '../types';
import type { Endpoints } from '../api/endpoints';

export function useFormData(
  endpoints: Endpoints,
  formId: string | number,
  recordId: string | number | undefined,
): UseQueryResult<FormRecord> {
  return useQuery({
    queryKey: ['form-record', formId, recordId],
    queryFn: () => endpoints.getRecord(formId, recordId!),
    enabled: !!recordId,
  });
}

export interface SubmitVariables {
  formId: string | number;
  payload: Omit<FormSubmitPayload, 'formId'>;
}

export function useSubmitForm(endpoints: Endpoints) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ formId, payload }: SubmitVariables) =>
      endpoints.submitForm(formId, payload),
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({ queryKey: ['form-record', variables.formId] });
      qc.invalidateQueries({ queryKey: ['form-records', variables.formId] });
    },
  });
}