// Mail önizleme sayfası — `/emails`. Shared `EMAIL_TEMPLATES`'tan render eder,
// API'ye gitmez. Aynı kodun GMail send akışında ürettiği HTML burada birebir
// görünür (single source of truth).

import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import {
  type EmailSubscriptionView,
  EMAIL_TEMPLATES,
} from '@tracksub/shared';
import {
  type EmailFixture,
  FixtureEditor,
} from '@/features/emails/fixture-editor';
import { EmailPreview } from '@/features/emails/email-preview';

export const Route = createFileRoute('/_authenticated/emails')({
  component: EmailsPage,
});

const DEFAULT_FIXTURE: EmailFixture = {
  template: 'renewal',
  daysLeft: 3,
  name: 'Spotify',
  vendor: 'Spotify AB',
  amount: '59.99',
  currency: 'TRY',
};

const buildSubscriptionView = (f: EmailFixture): EmailSubscriptionView => {
  // Anchor a fake target date `daysLeft` from now so `fmtDate` shows a meaningful date.
  const target = new Date(Date.now() + f.daysLeft * 86_400_000);
  const isTrial = f.template === 'trial_ending';
  return {
    name: f.name || 'Adsız abonelik',
    vendor: f.vendor.trim() ? f.vendor.trim() : null,
    amount: f.amount || '0',
    currency: f.currency || 'TRY',
    nextBillingAt: isTrial ? null : target,
    trialEndsAt: isTrial ? target : null,
    isTrial,
  };
};

function EmailsPage() {
  const [fixture, setFixture] = useState<EmailFixture>(DEFAULT_FIXTURE);

  const { subject, html } = useMemo(() => {
    const subscription = buildSubscriptionView(fixture);
    const tpl = EMAIL_TEMPLATES[fixture.template];
    const args = { subscription, daysLeft: fixture.daysLeft };
    return { subject: tpl.subject(args), html: tpl.html(args) };
  }, [fixture]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <header className="mb-5 flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Mail önizleme</h1>
        <p className="text-sm text-muted-foreground">
          Hatırlatıcı maillerinin canlı önizlemesi. Sol panelden fixture'ı değiştir, sağda
          gönderilecek HTML/Subject anlık güncellenir.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="md:sticky md:top-20 md:self-start">
          <FixtureEditor value={fixture} onChange={setFixture} />
        </aside>
        <section className="min-w-0">
          <EmailPreview subject={subject} html={html} />
        </section>
      </div>
    </div>
  );
}
