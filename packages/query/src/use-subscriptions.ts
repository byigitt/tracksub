import type { SubscriptionCreateBody, SubscriptionUpdateBody } from '@tracksub/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './keys.ts';
import { useApiClient } from './provider.ts';

export const useSubscriptions = () => {
  const api = useApiClient();
  return useQuery({
    queryKey: queryKeys.subscriptions.all,
    queryFn: () => api.subscriptions.list(),
  });
};

export const useSubscription = (id: string | undefined) => {
  const api = useApiClient();
  return useQuery({
    queryKey: queryKeys.subscriptions.detail(id ?? ''),
    queryFn: () => api.subscriptions.get(id!),
    enabled: Boolean(id),
  });
};

export const useSubscriptionEvents = (id: string | undefined) => {
  const api = useApiClient();
  return useQuery({
    queryKey: queryKeys.subscriptions.events(id ?? ''),
    queryFn: () => api.subscriptions.events(id!),
    enabled: Boolean(id),
  });
};

export const useCreateSubscription = () => {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SubscriptionCreateBody) => api.subscriptions.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.subscriptions.all });
    },
  });
};

export const useUpdateSubscription = (id: string) => {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SubscriptionUpdateBody) => api.subscriptions.update(id, body),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.subscriptions.all });
      qc.setQueryData(queryKeys.subscriptions.detail(id), data);
    },
  });
};

export const useDeleteSubscription = () => {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.subscriptions.remove(id);
      return id;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: queryKeys.subscriptions.all });
      qc.removeQueries({ queryKey: queryKeys.subscriptions.detail(id) });
    },
  });
};
