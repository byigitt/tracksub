// Shared formatting + escaping helpers for the reminder mail templates.
// Pure JS \u2014 Intl + string ops only.

export const fmtMoney = (amount: string | number, currency: string): string => {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(n)) return `${amount} ${currency}`;
  try {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
};

export const fmtDate = (iso: string | Date | null): string => {
  if (iso === null) return 'belirsiz';
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return 'belirsiz';
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
};

export const escapeHtml = (s: string): string =>
  s.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;');

/**
 * Turkish day phrase: 0 \u2192 "bug\u00fcn", 1 \u2192 "yar\u0131n", N>1 \u2192 "N g\u00fcn sonra",
 * negative \u2192 "N g\u00fcn \u00f6nce" (so the templates never show e.g. "-3 g\u00fcn sonra").
 */
export const dayPhrase = (daysLeft: number): string => {
  if (daysLeft === 0) return 'bug\u00fcn';
  if (daysLeft === 1) return 'yar\u0131n';
  if (daysLeft < 0) return `${Math.abs(daysLeft)} g\u00fcn \u00f6nce`;
  return `${daysLeft} g\u00fcn sonra`;
};
