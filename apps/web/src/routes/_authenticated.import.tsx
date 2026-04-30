import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { SparklesIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { CandidatesList } from '@/features/subscriptions/candidates-list';
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

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link to="/subscriptions" className="text-xs text-muted-foreground hover:text-foreground">
        ← Abonelikler
      </Link>

      <header className="mt-3 mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Mailden içe aktar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bir abonelik mailini (Netflix yenileme, Spotify makbuzu, vb.) yapıştır. AI çıkarsın, sen
          onayla.
        </p>
      </header>

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
