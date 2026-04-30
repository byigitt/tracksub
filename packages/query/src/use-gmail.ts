import type { GmailSyncParams } from '@tracksub/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './keys.ts';
import { useApiClient } from './provider.ts';

export const useGmailStatus = () => {
  const api = useApiClient();
  return useQuery({
    queryKey: queryKeys.gmail.status,
    queryFn: () => api.gmail.status(),
    staleTime: 30_000,
  });
};

export const useGmailSync = () => {
  const api = useApiClient();
  return useMutation({
    mutationFn: (params: GmailSyncParams = {}) => api.gmail.sync(params),
  });
};

export const useGmailDisconnect = () => {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.gmail.disconnect(),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.gmail.status }),
  });
};
