// Wire types — must mirror what `apps/api` returns (see apps/api/src/db/schema.ts).
// `amount` is typed as string (PG numeric → Drizzle returns string) and dates
// as ISO strings (JSON serialization).

import type { Period, Source, Status } from './period.ts';

export type Subscription = {
  id: string;
  userId: string;
  name: string;
  vendor: string | null;
  amount: string; // numeric(12,2) → string
  currency: string;
  period: Period;
  customPeriodDays: number | null;
  status: Status;
  startedAt: string; // ISO
  nextBillingAt: string | null; // ISO | null
  notes: string | null;
  source: Source;
  createdAt: string;
  updatedAt: string;
};

export type SubscriptionCreateBody = {
  name: string;
  vendor?: string | null;
  amount: number | string;
  currency?: string;
  period: Period;
  customPeriodDays?: number | null;
  status?: Status;
  startedAt?: string; // ISO
  nextBillingAt?: string | null; // ISO | null
  notes?: string | null;
  source?: Source;
};

export type SubscriptionUpdateBody = Partial<SubscriptionCreateBody>;

export const CURRENCIES = ['TRY', 'USD', 'EUR', 'GBP'] as const;
export type Currency = (typeof CURRENCIES)[number];

// ---------------------------------------------------------------------------
// AI candidate (paste-parse / gmail-sync output)
// ---------------------------------------------------------------------------

export const CANDIDATE_KINDS = ['existing', 'upcoming', 'offer'] as const;
export type CandidateKind = (typeof CANDIDATE_KINDS)[number];

export type Candidate = {
  name: string;
  vendor?: string | null;
  amount: number;
  currency: string;
  period: Period;
  customPeriodDays?: number | null;
  /** ISO date — when the charge already happened (for kind=existing). */
  lastChargedDate?: string | null;
  /** ISO date — when the next charge will happen. */
  nextBillingDate?: string | null;
  confidence: number;
  evidence?: string | null;
  kind?: CandidateKind;
  /** How many distinct mails this same logical sub appeared in (post-dedupe). */
  occurrenceCount?: number;
};

export type ParseResponse = { jobId: string; candidates: Candidate[] };

// ---------------------------------------------------------------------------
// Gmail integration
// ---------------------------------------------------------------------------

export type GmailStatus = {
  configured: boolean;
  linked: boolean;
  canRead: boolean;
  canSend: boolean;
  scope?: string | null;
  lastSyncedAt?: string | null;
};

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
