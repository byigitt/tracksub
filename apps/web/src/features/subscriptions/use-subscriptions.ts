import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Subscription, SubscriptionCreateBody, SubscriptionUpdateBody } from './types';

const BASE = '/api/subscriptions';
const LIST_KEY = ['subscriptions'] as const;

const detailKey = (id: string) => ['subscriptions', id] as const;

export const useSubscriptions = () =>
  useQuery({
    queryKey: LIST_KEY,
    queryFn: async () => {
      const res = await api<{ items: Subscription[] }>(BASE);
      return res.items;
    },
  });

export const useSubscription = (id: string | undefined) =>
  useQuery({
    queryKey: detailKey(id ?? ''),
    queryFn: () => api<Subscription>(`${BASE}/${id}`),
    enabled: Boolean(id),
  });

export const useCreateSubscription = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SubscriptionCreateBody) =>
      api<Subscription>(BASE, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
};

export const useUpdateSubscription = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SubscriptionUpdateBody) =>
      api<Subscription>(`${BASE}/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: LIST_KEY });
      qc.setQueryData(detailKey(id), data);
    },
  });
};

export const useDeleteSubscription = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // 204 No Content — `api` helper expects JSON; do a manual fetch here.
      const res = await fetch(`${BASE}/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new Error(`API ${res.status}: ${text}`);
      }
      return id;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: LIST_KEY });
      qc.removeQueries({ queryKey: detailKey(id) });
    },
  });
};
