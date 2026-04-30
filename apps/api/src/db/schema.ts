// Bu dosya `pnpm auth:generate` ile better-auth CLI tarafından üretilir/güncellenir.
// İlk kurulum için minimal placeholder; gerçek kullanımda CLI çalıştırılınca yenilenir.
//
// ⚠️ better-auth tabloları (user/session/account/verification) bu dosyanın üstünde.
// Uygulama tabloları (subscription/*) AYNI dosyada en altta. better-auth CLI bunları
// silmez çünkü onun ürettiği tabloların dışında kalanlar korunur.

import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Application tables
// ---------------------------------------------------------------------------

// Period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'one_time' | 'custom'
// Status: 'active' | 'paused' | 'cancelled' | 'expired'
// Source: 'manual' | 'paste' | 'gmail'

export const subscription = pgTable(
  'subscription',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    vendor: text('vendor'),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    currency: text('currency').notNull().default('TRY'),
    period: text('period').notNull(),
    customPeriodDays: integer('custom_period_days'),
    status: text('status').notNull().default('active'),
    startedAt: timestamp('started_at').notNull().defaultNow(),
    nextBillingAt: timestamp('next_billing_at'),
    isTrial: boolean('is_trial').notNull().default(false),
    trialEndsAt: timestamp('trial_ends_at'),
    notes: text('notes'),
    source: text('source').notNull().default('manual'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('subscription_user_idx').on(t.userId),
    nextBillingIdx: index('subscription_next_billing_idx').on(t.nextBillingAt),
    userStatusIdx: index('subscription_user_status_idx').on(t.userId, t.status),
    trialEndsIdx: index('subscription_trial_ends_idx').on(t.trialEndsAt),
  }),
);

export const subscriptionEvent = pgTable(
  'subscription_event',
  {
    id: text('id').primaryKey(),
    subscriptionId: text('subscription_id')
      .notNull()
      .references(() => subscription.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(), // renewed | paused | resumed | cancelled | reminder_sent
    occurredAt: timestamp('occurred_at').notNull().defaultNow(),
    meta: jsonb('meta'),
  },
  (t) => ({
    subIdx: index('subscription_event_sub_idx').on(t.subscriptionId),
    kindIdx: index('subscription_event_kind_idx').on(t.kind),
  }),
);

export const pasteParseJob = pgTable(
  'paste_parse_job',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    inputText: text('input_text').notNull(),
    status: text('status').notNull().default('pending'), // pending | done | error
    candidatesJson: jsonb('candidates_json'),
    error: text('error'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('paste_parse_job_user_idx').on(t.userId),
  }),
);

export const gmailLink = pgTable('gmail_link', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  lastSyncedAt: timestamp('last_synced_at'),
  lastHistoryId: text('last_history_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const reminderJob = pgTable(
  'reminder_job',
  {
    id: text('id').primaryKey(),
    subscriptionId: text('subscription_id')
      .notNull()
      .references(() => subscription.id, { onDelete: 'cascade' }),
    dueOffsetDays: integer('due_offset_days').notNull(), // 7 | 3 | 1 | 0
    scheduledFor: timestamp('scheduled_for').notNull(),
    sentAt: timestamp('sent_at'),
    status: text('status').notNull().default('pending'), // pending | sent | failed
    error: text('error'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    subIdx: index('reminder_job_sub_idx').on(t.subscriptionId),
    statusIdx: index('reminder_job_status_idx').on(t.status),
    // Idempotency: per (subscription, offset, scheduled-day) at most one row.
    uniqDay: uniqueIndex('reminder_job_uniq_day_idx').on(
      t.subscriptionId,
      t.dueOffsetDays,
      sql`(date_trunc('day', ${t.scheduledFor}))`,
    ),
  }),
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const userRelations = relations(user, ({ many, one }) => ({
  subscriptions: many(subscription),
  pasteParseJobs: many(pasteParseJob),
  gmailLink: one(gmailLink, {
    fields: [user.id],
    references: [gmailLink.userId],
  }),
}));

export const subscriptionRelations = relations(subscription, ({ one, many }) => ({
  user: one(user, { fields: [subscription.userId], references: [user.id] }),
  events: many(subscriptionEvent),
  reminders: many(reminderJob),
}));

export const subscriptionEventRelations = relations(subscriptionEvent, ({ one }) => ({
  subscription: one(subscription, {
    fields: [subscriptionEvent.subscriptionId],
    references: [subscription.id],
  }),
}));

export const reminderJobRelations = relations(reminderJob, ({ one }) => ({
  subscription: one(subscription, {
    fields: [reminderJob.subscriptionId],
    references: [subscription.id],
  }),
}));

export const pasteParseJobRelations = relations(pasteParseJob, ({ one }) => ({
  user: one(user, { fields: [pasteParseJob.userId], references: [user.id] }),
}));

export const gmailLinkRelations = relations(gmailLink, ({ one }) => ({
  user: one(user, { fields: [gmailLink.userId], references: [user.id] }),
}));

export type Subscription = typeof subscription.$inferSelect;
export type NewSubscription = typeof subscription.$inferInsert;
export type SubscriptionEvent = typeof subscriptionEvent.$inferSelect;
export type ReminderJob = typeof reminderJob.$inferSelect;
export type PasteParseJob = typeof pasteParseJob.$inferSelect;
export type GmailLink = typeof gmailLink.$inferSelect;
