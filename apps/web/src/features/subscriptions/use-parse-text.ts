import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Subscription } from './types';

export type CandidateKind = 'existing' | 'upcoming' | 'offer';

export type Candidate = {
  name: string;
  vendor?: string | null;
  amount: number;
  currency: string;
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'one_time' | 'custom';
  customPeriodDays?: number | null;
  nextBillingDate?: string | null;
  confidence: number;
  evidence?: string | null;
  kind?: CandidateKind;
};

export type ParseResponse = { jobId: string; candidates: Candidate[] };

export const useParseText = () =>
  useMutation({
    mutationFn: (text: string) =>
      api<ParseResponse>('/api/subscriptions/parse', {
        method: 'POST',
        body: JSON.stringify({ text }),
      }),
  });

export const useConfirmCandidate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, index }: { jobId: string; index: number }) =>
      api<Subscription>('/api/subscriptions/from-candidate', {
        method: 'POST',
        body: JSON.stringify({ jobId, candidateIndex: index }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }),
  });
};

export const useConfirmCandidates = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, indices }: { jobId: string; indices: number[] }) =>
      api<{ items: Subscription[] }>('/api/subscriptions/from-candidates', {
        method: 'POST',
        body: JSON.stringify({ jobId, indices }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }),
  });
};
