ALTER TABLE "subscription" ADD COLUMN "is_trial" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "trial_ends_at" timestamp;--> statement-breakpoint
CREATE INDEX "subscription_trial_ends_idx" ON "subscription" USING btree ("trial_ends_at");