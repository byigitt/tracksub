import { Link } from '@tanstack/react-router';
import { ArrowRightIcon, ChevronDownIcon, Loader2Icon, MailIcon, SparklesIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import type { Candidate, SyncSubject } from '@tracksub/shared';
import { useGmailStatus, useGmailSync, useParseText } from '@tracksub/query';
import { CandidatesList } from './candidates-list';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded?: () => void;
};

export const ImportModal = ({ open, onOpenChange, onAdded }: Props) => {
  const [text, setText] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [scannedSubjects, setScannedSubjects] = useState<SyncSubject[] | null>(null);
  const [scannedCount, setScannedCount] = useState<number | null>(null);
  const [batchStats, setBatchStats] = useState<{
    batches: number;
    successful: number;
    failed: number;
    durationMs: number;
    gmailFetchMs?: number;
  } | null>(null);
  const [showScanned, setShowScanned] = useState(false);
  const [days, setDays] = useState(90);
  const [limit, setLimit] = useState(200);

  const parse = useParseText();
  const gmailStatus = useGmailStatus();
  const gmailSync = useGmailSync();

  // Reset on close
  useEffect(() => {
    if (!open) {
      setText('');
      setJobId(null);
      setCandidates(null);
      setScannedSubjects(null);
      setScannedCount(null);
      setBatchStats(null);
      setShowScanned(false);
    }
  }, [open]);

  const onAnalyze = async () => {
    if (text.trim().length < 10) return;
    setScannedSubjects(null);
    setScannedCount(null);
    try {
      const res = await parse.mutateAsync(text);
      setJobId(res.jobId);
      setCandidates(res.candidates);
    } catch {
      // surfaced via parse.error
    }
  };

  const onGmailSync = async () => {
    setScannedSubjects(null);
    setScannedCount(null);
    setBatchStats(null);
    setCandidates(null);
    setJobId(null);
    try {
      const res = await gmailSync.mutateAsync({ days, limit });
      setJobId(res.jobId);
      setCandidates(res.candidates);
      setScannedCount(res.messageCount);
      setScannedSubjects(res.subjects ?? null);
      setBatchStats(res.batchStats ?? null);
    } catch {
      // surfaced via gmailSync.error
    }
  };

  const gmailConfigured = Boolean(gmailStatus.data?.configured);
  const gmailReady = Boolean(gmailStatus.data?.linked && gmailStatus.data.canRead);
  const defaultTab = gmailConfigured ? 'gmail' : 'paste';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SparklesIcon className="size-4" /> İçe aktar
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={defaultTab} className="gap-4">
          <TabsList>
            {gmailConfigured && (
              <TabsTrigger value="gmail">
                <MailIcon className="size-3.5" /> Gmail
              </TabsTrigger>
            )}
            <TabsTrigger value="paste">Mail metni</TabsTrigger>
          </TabsList>

          {gmailConfigured && (
            <TabsContent value="gmail" className="flex flex-col gap-3">
              {!gmailReady ? (
                <ConnectionNotice canRead={Boolean(gmailStatus.data?.canRead)} />
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Son {days} gündeki abonelik benzeri mailleri AI ile tarayalım.
                  </p>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="days" className="text-xs text-muted-foreground">
                        Geçmiş gün
                      </label>
                      <input
                        id="days"
                        type="number"
                        min={7}
                        max={365}
                        value={days}
                        onChange={(e) => setDays(Math.max(1, Number(e.target.value) || 1))}
                        className="h-9 w-20 rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="limit" className="text-xs text-muted-foreground">
                        Maks. mail
                      </label>
                      <input
                        id="limit"
                        type="number"
                        min={10}
                        max={500}
                        step={50}
                        value={limit}
                        onChange={(e) =>
                          setLimit(Math.max(1, Math.min(500, Number(e.target.value) || 1)))
                        }
                        className="h-9 w-20 rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
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
                    {gmailStatus.data?.lastSyncedAt && (
                      <span className="text-xs text-muted-foreground sm:ml-auto">
                        Son tarama:{' '}
                        {new Date(gmailStatus.data.lastSyncedAt).toLocaleString('tr-TR')}
                      </span>
                    )}
                  </div>

                  {gmailSync.isPending && (
                    <div className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3 text-xs">
                      <div className="flex items-center gap-2">
                        <Loader2Icon className="size-3 animate-spin" />
                        <span>
                          Gmail'den son {days} günün (max {limit}) maillerini alıyorum…
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2Icon className="size-3 animate-spin" />
                        <span>
                          AI mailleri 8'erli paralel batch'ler halinde tarıyor (5 paralel)—~10-15 sn
                          sürer
                        </span>
                      </div>
                    </div>
                  )}

                  {gmailSync.error && (
                    <p className="text-sm text-destructive">{(gmailSync.error as Error).message}</p>
                  )}

                  {scannedCount !== null && (
                    <ScanSummary
                      scannedCount={scannedCount}
                      candidatesCount={candidates?.length ?? 0}
                      batchStats={batchStats}
                      scannedSubjects={scannedSubjects}
                      showScanned={showScanned}
                      onToggle={() => setShowScanned((s) => !s)}
                    />
                  )}
                </>
              )}
            </TabsContent>
          )}

          <TabsContent value="paste" className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Mailin tamamını yapıştır — başlık, gövde, tutar, tarih dahil. Birden çok mail de olur.
            </p>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
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
          </TabsContent>
        </Tabs>

        {jobId && candidates && (
          <div className="border-t pt-4">
            <CandidatesList jobId={jobId} candidates={candidates} onAdded={onAdded} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const ConnectionNotice = ({ canRead }: { canRead: boolean }) => (
  <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed bg-muted/20 p-4">
    <div className="flex items-center gap-3">
      <MailIcon className="size-4 text-muted-foreground" />
      <p className="text-sm font-medium">
        {canRead ? 'Gmail bağlantısı eksik' : 'Gmail bağlı değil'}
      </p>
    </div>
    <Button asChild variant="outline" size="sm">
      <Link to="/connections">
        Bağlantılar <ArrowRightIcon />
      </Link>
    </Button>
  </div>
);

type ScanSummaryProps = {
  scannedCount: number;
  candidatesCount: number;
  batchStats: {
    batches: number;
    successful: number;
    failed: number;
    durationMs: number;
    gmailFetchMs?: number;
  } | null;
  scannedSubjects: SyncSubject[] | null;
  showScanned: boolean;
  onToggle: () => void;
};

const ScanSummary = ({
  scannedCount,
  candidatesCount,
  batchStats,
  scannedSubjects,
  showScanned,
  onToggle,
}: ScanSummaryProps) => (
  <div className="rounded-lg border bg-muted/30 p-3">
    <p className="text-sm font-medium">
      Tarama özeti: {scannedCount} mail incelendi, {candidatesCount} aday bulundu
    </p>
    {batchStats && (
      <p className="mt-1 text-xs text-muted-foreground">
        Gmail fetch: {((batchStats.gmailFetchMs ?? 0) / 1000).toFixed(1)} sn · AI:{' '}
        {(batchStats.durationMs / 1000).toFixed(1)} sn ({batchStats.batches} batch,{' '}
        {batchStats.successful} başarılı
        {batchStats.failed > 0 ? `, ${batchStats.failed} başarısız` : ''})
      </p>
    )}
    {candidatesCount === 0 && scannedCount > 0 && (
      <p className="mt-1 text-xs text-muted-foreground">
        AI bu maillerden abonelik çıkaramadı. Aşağıda hangi mailleri taramış, ona bak — gerçekten
        abonelik maili var mı?
      </p>
    )}
    {scannedSubjects && scannedSubjects.length > 0 && (
      <>
        <button
          type="button"
          onClick={onToggle}
          className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronDownIcon
            className={`size-3 transition-transform ${showScanned ? 'rotate-180' : ''}`}
          />
          {showScanned ? 'Maili gizle' : 'Taranan mailleri gör'} ({scannedSubjects.length})
        </button>
        {showScanned && (
          <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-md border bg-background p-2 text-[11px]">
            {scannedSubjects.map((s, i) => (
              <li key={i} className="flex min-w-0 flex-col gap-0.5 border-b py-1 last:border-b-0">
                <span className="truncate font-medium">{s.subject}</span>
                <span className="truncate text-muted-foreground">
                  {s.from} · {s.date}
                </span>
              </li>
            ))}
          </ul>
        )}
      </>
    )}
  </div>
);
