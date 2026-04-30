import type {
  Candidate,
  ParseResponse,
  Subscription,
  SubscriptionCreateBody,
  SubscriptionUpdateBody,
} from '@tracksub/shared';
import type { RequestFn } from './request.ts';

const BASE = '/api/subscriptions';

export type SubscriptionEvent = {
  id: string;
  subscriptionId: string;
  kind: string;
  occurredAt: string;
  meta: unknown;
};

export const createSubscriptionsClient = (request: RequestFn) => ({
  list: async (): Promise<Subscription[]> => {
    const res = await request<{ items: Subscription[] }>(BASE);
    return res.items;
  },

  get: (id: string): Promise<Subscription> => request<Subscription>(`${BASE}/${id}`),

  create: (body: SubscriptionCreateBody): Promise<Subscription> =>
    request<Subscription>(BASE, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  update: (id: string, body: SubscriptionUpdateBody): Promise<Subscription> =>
    request<Subscription>(`${BASE}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  remove: (id: string): Promise<void> =>
    request<void>(`${BASE}/${id}`, {
      method: 'DELETE',
    }),

  events: async (id: string): Promise<SubscriptionEvent[]> => {
    const res = await request<{ items: SubscriptionEvent[] }>(`${BASE}/${id}/events`);
    return res.items;
  },

  parse: (text: string): Promise<ParseResponse> =>
    request<ParseResponse>(`${BASE}/parse`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

  fromCandidate: (params: { jobId: string; candidateIndex: number }): Promise<Subscription> =>
    request<Subscription>(`${BASE}/from-candidate`, {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  fromCandidates: async (params: { jobId: string; indices: number[] }): Promise<Subscription[]> => {
    const res = await request<{ items: Subscription[] }>(`${BASE}/from-candidates`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return res.items;
  },
});

export type SubscriptionsClient = ReturnType<typeof createSubscriptionsClient>;
export type { Candidate };
