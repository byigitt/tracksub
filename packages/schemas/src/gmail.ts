import { z } from 'zod';

export const gmailSyncSchema = z.object({
  days: z.number().int().min(1).max(365).default(90),
  limit: z.number().int().min(1).max(500).default(200),
});
export type GmailSyncInput = z.infer<typeof gmailSyncSchema>;
