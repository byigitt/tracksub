// Centralized query keys. Hooks below import these so callers can invalidate by
// importing the same constants (e.g. `qc.invalidateQueries({ queryKey: queryKeys.subscriptions.all })`).

export const queryKeys = {
  me: ['me'] as const,
  subscriptions: {
    all: ['subscriptions'] as const,
    detail: (id: string) => ['subscriptions', id] as const,
    events: (id: string) => ['subscriptions', id, 'events'] as const,
  },
  gmail: {
    status: ['gmail', 'status'] as const,
  },
  reminders: {
    all: ['reminders'] as const,
  },
} as const;
