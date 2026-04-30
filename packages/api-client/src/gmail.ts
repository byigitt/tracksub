import type { GmailStatus, SyncResponse } from '@tracksub/shared';
import type { RequestFn } from './request.ts';

export type GmailSyncParams = { days?: number; limit?: number };

export const createGmailClient = (request: RequestFn) => ({
  status: (): Promise<GmailStatus> => request<GmailStatus>('/api/gmail/status'),

  sync: ({ days = 90, limit = 200 }: GmailSyncParams = {}): Promise<SyncResponse> =>
    request<SyncResponse>('/api/gmail/sync', {
      method: 'POST',
      body: JSON.stringify({ days, limit }),
    }),

  disconnect: (): Promise<{ ok: true }> =>
    request<{ ok: true }>('/api/gmail/disconnect', { method: 'POST' }),
});

export type GmailClient = ReturnType<typeof createGmailClient>;
