import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { CheckCircle2Icon, MailIcon, SparklesIcon, UnlinkIcon } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { signIn } from '@/lib/auth-client';
import { CandidatesList } from '@/features/subscriptions/candidates-list';
import {
  useGmailDisconnect,
  useGmailStatus,
  useGmailSync,
} from '@/features/subscriptions/use-gmail';
import { useParseText, type Candidate } from '@/features/subscriptions/use-parse-text';

export const Route = createFileRoute('/_authenticated/import')({
  component: ImportPage,
});

function ImportPage() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const parse = useParseText();
  const gmailStatus = useGmailStatus();
  const gmailSync = useGmailSync();
  const gmailDisconnect = useGmailDisconnect();
  const [days, setDays] = useState(90);

  const onAnalyze = async () => {
    if (text.trim().length < 10) return;
    try {
      const res = await parse.mutateAsync(text);
      setJobId(res.jobId);
      setCandidates(res.candidates);
    } catch {
      // error surfaced via parse.error below
    }
  };

  const onConnectGoogle = async () => {
    await signIn.social({
      provider: 'google',
      callbackURL: window.location.href,
    });
  };

  const onGmailSync = async () => {
    try {
      const res = await gmailSync.mutateAsync(days);
      setJobId(res.jobId);
      setCandidates(res.candidates);
    } catch {
      // error surfaced via gmailSync.error
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link to="/subscriptions" className="text-xs text-muted-foreground hover:text-foreground">
        ← Abonelikler
      </Link>

      <header className="mt-3 mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Mailden içe aktar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bir abonelik mailini yapıştır ya da Gmail'i bağlayıp son maillerden tarat. AI çıkarsın,
          sen onayla.
        </p>
      </header>

      {gmailStatus.data?.configured && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MailIcon className="size-4" /> Gmail
              {gmailStatus.data.linked && (
                <Badge variant="muted" className="gap-1">
                  <CheckCircle2Icon className="size-3" /> Bağlı
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Son {days} gündeki abonelik benzeri mailleri alıp AI ile tarayalım. Hiçbir mail
              kaydedilmez — sadece adaylar listelenir.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!gmailStatus.data.linked && <Button onClick={onConnectGoogle}>Gmail'i bağla</Button>}
            {gmailStatus.data.linked && !gmailStatus.data.canRead && (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-destructive">
                  Gmail okuma izni eksik. Bağlantıyı yenilemen gerekiyor.
                </p>
                <Button onClick={onConnectGoogle}>Gmail iznini yenile</Button>
              </div>
            )}
            {gmailStatus.data.linked && gmailStatus.data.canRead && (
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="days" className="text-xs text-muted-foreground">
                    Geçmiş gün sayısı
                  </label>
                  <input
                    id="days"
                    type="number"
                    min={7}
                    max={365}
                    value={days}
                    onChange={(e) => setDays(Math.max(1, Number(e.target.value) || 1))}
                    className="h-9 w-24 rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  />
                </div>
                <Button onClick={onGmailSync} disabled={gmailSync.isPending}>
                  <SparklesIcon /> {gmailSync.isPending ? 'Maillere bakılıyor…' : 'Maillerden tara'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => gmailDisconnect.mutateAsync()}
                  disabled={gmailDisconnect.isPending}
                >
                  <UnlinkIcon /> Bağlantıyı kaldır
                </Button>
                {gmailStatus.data.lastSyncedAt && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    Son tarama: {new Date(gmailStatus.data.lastSyncedAt).toLocaleString('tr-TR')}
                  </span>
                )}
              </div>
            )}
            {gmailSync.error && (
              <p className="mt-2 text-sm text-destructive">{(gmailSync.error as Error).message}</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Mail metni</CardTitle>
          <CardDescription>
            Mailin tamamını yapıştır — başlık, gövde, tutar, tarih dahil. Birden çok mail de olur.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={12}
            placeholder={`From: noreply@netflix.com\nSubject: Üyeliğin yenilendi\n\nMerhaba, 229,99 TL'lik aylık ödemen 15 Mayıs 2026'da yapılacak…`}
            className="font-mono text-xs"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{text.length} karakter</span>
            <Button onClick={onAnalyze} disabled={text.trim().length < 10 || parse.isPending}>
              <SparklesIcon /> {parse.isPending ? 'Analiz ediliyor…' : 'Analiz et'}
            </Button>
          </div>
          {parse.error && (
            <p className="text-sm text-destructive">{(parse.error as Error).message}</p>
          )}
        </CardContent>
      </Card>

      {jobId && candidates && (
        <div className="mt-6">
          <CandidatesList
            jobId={jobId}
            candidates={candidates}
            onAdded={() => router.invalidate()}
          />
        </div>
      )}
    </div>
  );
}
