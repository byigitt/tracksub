import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Candidate } from './use-parse-text';

export type GmailStatus = {
  configured: boolean;
  linked: boolean;
  canRead: boolean;
  canSend: boolean;
  scope?: string | null;
  lastSyncedAt?: string | null;
};

const STATUS_KEY = ['gmail', 'status'] as const;

export const useGmailStatus = () =>
  useQuery({
    queryKey: STATUS_KEY,
    queryFn: () => api<GmailStatus>('/api/gmail/status'),
    staleTime: 30_000,
  });

export type SyncSubject = { subject: string; from: string; date: string };

export type SyncResponse = {
  jobId: string | null;
  candidates: Candidate[];
  messageCount: number;
  subjects?: SyncSubject[];
  batchStats?: {
    batches: number;
    successful: number;
    failed: number;
    durationMs: number;
    gmailFetchMs?: number;
  };
};

export const useGmailSync = () =>
  useMutation({
    mutationFn: ({ days = 90, limit = 200 }: { days?: number; limit?: number } = {}) =>
      api<SyncResponse>('/api/gmail/sync', {
        method: 'POST',
        body: JSON.stringify({ days, limit }),
      }),
  });

export const useGmailDisconnect = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<{ ok: true }>('/api/gmail/disconnect', { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: STATUS_KEY }),
  });
};
