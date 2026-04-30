import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { applyTheme, getTheme, setTheme, type Theme } from '@/lib/theme';

export const ThemeToggle = () => {
  const [theme, setLocal] = useState<Theme>('system');

  useEffect(() => {
    setLocal(getTheme());
  }, []);

  const toggle = () => {
    const isDark = document.documentElement.classList.contains('dark');
    const next: Theme = isDark ? 'light' : 'dark';
    setTheme(next);
    setLocal(next);
  };

  // System değişiklik dinle (kullanıcı OS-level değişirse, manuel set yoksa uygula)
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Tema değiştir">
      <Sun className="size-4 dark:hidden" />
      <Moon className="hidden size-4 dark:block" />
    </Button>
  );
};
