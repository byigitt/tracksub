import type { RequestFn } from './request.ts';

export type ReminderItem = {
  id: string;
  subscriptionId: string;
  dueOffsetDays: number;
  scheduledFor: string;
  sentAt: string | null;
  status: 'pending' | 'sent' | 'failed';
  error: string | null;
  createdAt: string;
};

export const createRemindersClient = (request: RequestFn) => ({
  list: async (): Promise<ReminderItem[]> => {
    const res = await request<{ items: ReminderItem[] }>('/api/reminders');
    return res.items;
  },
  test: (): Promise<{ ok: true; sent: number }> =>
    request<{ ok: true; sent: number }>('/api/reminders/test', { method: 'POST' }),
});

export type RemindersClient = ReturnType<typeof createRemindersClient>;
