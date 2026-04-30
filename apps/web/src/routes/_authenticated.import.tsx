import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import {
  CheckCircle2Icon,
  ChevronDownIcon,
  Loader2Icon,
  MailIcon,
  SparklesIcon,
  UnlinkIcon,
} from 'lucide-react';
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
  type SyncSubject,
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
  const [scannedSubjects, setScannedSubjects] = useState<SyncSubject[] | null>(null);
  const [scannedCount, setScannedCount] = useState<number | null>(null);
  const [showScanned, setShowScanned] = useState(false);
  const parse = useParseText();
  const gmailStatus = useGmailStatus();
  const gmailSync = useGmailSync();
  const gmailDisconnect = useGmailDisconnect();
  const [days, setDays] = useState(90);

  const onAnalyze = async () => {
    if (text.trim().length < 10) return;
    setScannedSubjects(null);
    setScannedCount(null);
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
    setScannedSubjects(null);
    setScannedCount(null);
    setCandidates(null);
    setJobId(null);
    try {
      const res = await gmailSync.mutateAsync(days);
      setJobId(res.jobId);
      setCandidates(res.candidates);
      setScannedCount(res.messageCount);
      setScannedSubjects(res.subjects ?? null);
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
                  {gmailSync.isPending ? (
                    <Loader2Icon className="animate-spin" />
                  ) : (
                    <SparklesIcon />
                  )}{' '}
                  {gmailSync.isPending ? 'Maillere bakılıyor…' : 'Maillerden tara'}
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
            {gmailSync.isPending && (
              <div className="mt-4 flex flex-col gap-2 rounded-md border bg-muted/30 p-3 text-xs">
                <div className="flex items-center gap-2">
                  <Loader2Icon className="size-3 animate-spin" />
                  <span>Gmail'den son {days} günün maillerini alıyorum…</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2Icon className="size-3 animate-spin" />
                  <span>AI buldukları tek tek inceleyecek—birkaç saniye sürebilir</span>
                </div>
              </div>
            )}
            {gmailSync.error && (
              <p className="mt-2 text-sm text-destructive">{(gmailSync.error as Error).message}</p>
            )}
          </CardContent>
        </Card>
      )}

      {scannedCount !== null && (
        <Card className="mb-4 gap-2">
          <CardHeader className="[.border-b]:pb-0">
            <CardTitle className="text-sm">
              Tarama özeti: {scannedCount} mail incelendi, {candidates?.length ?? 0} aday bulundu
            </CardTitle>
            {(candidates?.length ?? 0) === 0 && scannedCount > 0 && (
              <CardDescription className="text-xs">
                AI bu maillerden abonelik çıkaramadı. Aşağıda hangi mailleri taramış, ona bak —
                gerçekten abonelik maili var mı?
              </CardDescription>
            )}
          </CardHeader>
          {scannedSubjects && scannedSubjects.length > 0 && (
            <CardContent>
              <button
                type="button"
                onClick={() => setShowScanned((s) => !s)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <ChevronDownIcon
                  className={`size-3 transition-transform ${showScanned ? 'rotate-180' : ''}`}
                />
                {showScanned ? 'Maili gizle' : 'Taranan mailleri gör'} ({scannedSubjects.length})
              </button>
              {showScanned && (
                <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto rounded-md border bg-background p-2 text-[11px]">
                  {scannedSubjects.map((s, i) => (
                    <li key={i} className="flex flex-col gap-0.5 border-b py-1 last:border-b-0">
                      <span className="truncate font-medium">{s.subject}</span>
                      <span className="truncate text-muted-foreground">
                        {s.from} · {s.date}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          )}
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
