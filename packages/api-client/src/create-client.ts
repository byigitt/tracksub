import { createGmailClient, type GmailClient } from './gmail.ts';
import { createMeClient, type MeClient } from './me.ts';
import { createRemindersClient, type RemindersClient } from './reminders.ts';
import { createRequest, type RequestFn } from './request.ts';
import { createSubscriptionsClient, type SubscriptionsClient } from './subscriptions.ts';
import type { ApiClientOptions } from './types.ts';

export type ApiClient = {
  /** Low-level typed request — for one-off calls not yet covered by domain methods. */
  request: RequestFn;
  subscriptions: SubscriptionsClient;
  gmail: GmailClient;
  me: MeClient;
  reminders: RemindersClient;
};

export const createApiClient = (opts: ApiClientOptions = {}): ApiClient => {
  const request = createRequest(opts);
  return {
    request,
    subscriptions: createSubscriptionsClient(request),
    gmail: createGmailClient(request),
    me: createMeClient(request),
    reminders: createRemindersClient(request),
  };
};
