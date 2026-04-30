// Email preview pane: subject line + sandboxed iframe rendering raw mail HTML.
// The iframe uses `srcDoc` so we ship the exact HTML the user will receive
// (no SSR, no React tree pollution). `sandbox="allow-same-origin"` keeps it
// non-scripting; we never let the template execute JS.

import { CheckIcon, CopyIcon, MoonIcon, SunIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
  subject: string;
  html: string;
};

type CopyState = 'idle' | 'subject' | 'html';

export const EmailPreview = ({ subject, html }: Props) => {
  const [copied, setCopied] = useState<CopyState>('idle');
  const [isDark, setIsDark] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const flashCopied = (which: 'subject' | 'html'): void => {
    setCopied(which);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied('idle'), 1500);
  };

  const copy = async (text: string, which: 'subject' | 'html'): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      flashCopied(which);
    } catch {
      // Fallback for older browsers / non-secure contexts.
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        flashCopied(which);
      } catch {
        // give up silently
      } finally {
        document.body.removeChild(ta);
      }
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Subject
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void copy(subject, 'subject')}
            className="h-7 gap-1 px-2 text-xs"
          >
            {copied === 'subject' ? (
              <>
                <CheckIcon className="size-3.5" /> kopyalandı
              </>
            ) : (
              <>
                <CopyIcon className="size-3.5" /> kopyala
              </>
            )}
          </Button>
        </div>
        <div className="rounded-md border bg-muted/30 px-3 py-2 font-mono text-sm">{subject}</div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            HTML
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsDark((v) => !v)}
              className="h-7 gap-1 px-2 text-xs"
              aria-pressed={isDark}
            >
              {isDark ? <SunIcon className="size-3.5" /> : <MoonIcon className="size-3.5" />}
              {isDark ? 'aydınlık' : 'karanlık'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void copy(html, 'html')}
              className="h-7 gap-1 px-2 text-xs"
            >
              {copied === 'html' ? (
                <>
                  <CheckIcon className="size-3.5" /> kopyalandı
                </>
              ) : (
                <>
                  <CopyIcon className="size-3.5" /> kopyala
                </>
              )}
            </Button>
          </div>
        </div>
        <div
          className={cn(
            'overflow-hidden rounded-md border transition-colors',
            isDark ? 'bg-zinc-900' : 'bg-white',
          )}
        >
          <iframe
            title="Mail önizleme"
            srcDoc={html}
            sandbox="allow-same-origin"
            className="block min-h-[600px] w-full border-0 bg-transparent"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Iframe sandbox modunda — script çalıştırılmaz. Mail istemcileri kendi varsayılan
          temalarında bu HTML'i render eder.
        </p>
      </div>
    </div>
  );
};
