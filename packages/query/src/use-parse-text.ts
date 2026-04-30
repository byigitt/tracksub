import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './keys.ts';
import { useApiClient } from './provider.ts';

export const useParseText = () => {
  const api = useApiClient();
  return useMutation({
    mutationFn: (text: string) => api.subscriptions.parse(text),
  });
};

export const useConfirmCandidate = () => {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, index }: { jobId: string; index: number }) =>
      api.subscriptions.fromCandidate({ jobId, candidateIndex: index }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.subscriptions.all }),
  });
};

export const useConfirmCandidates = () => {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, indices }: { jobId: string; indices: number[] }) =>
      api.subscriptions.fromCandidates({ jobId, indices }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.subscriptions.all }),
  });
};
