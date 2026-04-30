import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { BRAND_REGISTRY } from './brand-icon-registry';
import { brandLetter, resolveBrandSlug } from './brand-slug';

type Props = {
  name: string;
  vendor?: string | null;
  /** Kare boyut (px). Varsayılan 40. */
  size?: number;
  className?: string;
};

// Hex (#RRGGBB veya RRGGBB) → relative luminance (WCAG). 0..1.
const luminance = (hex: string): number => {
  const h = hex.replace('#', '');
  if (h.length !== 6) return 0;
  const channel = (n: number): number => {
    const c = n / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const r = Number.parseInt(h.slice(0, 2), 16);
  const g = Number.parseInt(h.slice(2, 4), 16);
  const b = Number.parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return 0;
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

// Kontrast: açık brand color → siyah ikon, koyu brand color → beyaz ikon.
const fgFor = (hex: string): string => (luminance(hex) > 0.6 ? '#111111' : '#ffffff');

/**
 * Subscription markası için kare ikon. Bilinen markalar için brand-color zemin +
 * simple-icons SVG path'i. Bilinmeyen markalar için neutral lettermark.
 */
export const BrandIcon = ({ name, vendor, size = 40, className }: Props) => {
  const data = useMemo(() => {
    const slug = resolveBrandSlug(name, vendor);
    return slug ? BRAND_REGISTRY[slug] : undefined;
  }, [name, vendor]);

  const sizeStyle = { width: size, height: size };
  const iconSize = Math.round(size * 0.55);

  if (!data) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-md border bg-muted font-medium text-muted-foreground',
          className,
        )}
        style={{ ...sizeStyle, fontSize: Math.round(size * 0.42) }}
      >
        {brandLetter(name, vendor)}
      </span>
    );
  }

  const bg = `#${data.hex}`;
  const fg = fgFor(data.hex);

  return (
    <span
      aria-hidden="true"
      title={data.title}
      className={cn('inline-flex shrink-0 items-center justify-center rounded-md', className)}
      style={{ ...sizeStyle, backgroundColor: bg, color: fg }}
    >
      <svg
        viewBox="0 0 24 24"
        width={iconSize}
        height={iconSize}
        fill="currentColor"
        aria-hidden="true"
        focusable="false"
      >
        <path d={data.path} />
      </svg>
    </span>
  );
};
