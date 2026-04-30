// Marka adı / sağlayıcı bilgisinden simple-icons slug'ı çıkarır.
// Saf fonksiyon — UI'dan bağımsız test edilebilir.
//
// Strateji:
//   1) Manuel override map ile yaygın takma adları çöz (örn. "youtube premium" → "youtube").
//   2) Normalize edilmiş ad simple-icons registry'sinde slug olarak varsa onu kullan.
//   3) Hiçbiri olmadıysa null dön → çağıran taraf lettermark fallback'i çizer.

import { BRAND_REGISTRY } from './brand-icon-registry';

// Normalize: lowercase + sadece [a-z0-9] (boşluk, tire, '+', '.', vs. silinir).
const normalize = (input: string): string => input.toLowerCase().replace(/[^a-z0-9]/g, '');

// Yaygın takma adlar / brand bundle'ları için manuel eşlemeler.
// Anahtar: normalize edilmiş kullanıcı girdisi. Değer: simple-icons slug.
const ALIASES: Record<string, string> = {
  // Streaming
  youtubepremium: 'youtube',
  youtubepro: 'youtube',
  youtubered: 'youtube',
  ytpremium: 'youtube',
  ytmusic: 'youtubemusic',
  appletvplus: 'appletv',
  appletv4k: 'appletv',
  applemusiclossless: 'applemusic',
  itunes: 'applemusic',
  itunesmatch: 'applemusic',
  spotifypremium: 'spotify',
  spotifyfamily: 'spotify',
  spotifyduo: 'spotify',
  netflixstandard: 'netflix',
  netflixpremium: 'netflix',
  netflixbasic: 'netflix',
  hbogo: 'hbomax',
  hbonow: 'hbomax',
  maxhbo: 'max',
  warnerbrosdiscovery: 'max',
  paramountplusessential: 'paramountplus',
  paramount: 'paramountplus',

  // Productivity / dev
  notionai: 'notion',
  notionplus: 'notion',
  figmaprofessional: 'figma',
  figmaorg: 'figma',
  figjam: 'figma',
  githubpro: 'github',
  githubteam: 'github',
  githubcopilot: 'github',
  copilot: 'github',
  vercelpro: 'vercel',
  cloudflarepro: 'cloudflare',
  cloudflareworkers: 'cloudflare',

  // AI — Not: simple-icons OpenAI/ChatGPT ikonlarını v15+ ile kaldırdı (cease & desist).
  // Bunları lettermark fallback'e bırakıyoruz; "yanlış marka" göstermekten dürüst.
  claudepro: 'claude',
  claudeteam: 'claude',
  anthropicapi: 'anthropic',
  perplexitypro: 'perplexity',
  cursorpro: 'cursor',

  // VPN / security
  '1passwordfamily': '1password',
  onepassword: '1password',
  protonmailplus: 'protonmail',
  protonmailpro: 'protonmail',
  protonunlimited: 'proton',

  // Cloud storage
  googleone: 'googledrive',
  googleworkspace: 'googledrive',
  gsuite: 'googledrive',
  icloudplus: 'icloud',
  dropboxplus: 'dropbox',
  dropboxpro: 'dropbox',

  // Education
  duolingoplus: 'duolingo',
  duolingosuper: 'duolingo',
  udemypro: 'udemy',
  udemybusiness: 'udemy',

  // Gaming
  playstationplus: 'playstation',
  psplus: 'playstation',
  steamfamily: 'steam',
  epicgamesstore: 'epicgames',
};

/**
 * Subscription'ın `name` ve opsiyonel `vendor` alanından bir simple-icons slug'ı çıkarır.
 * Önce vendor, sonra name denenir. Match yoksa null döner.
 */
export const resolveBrandSlug = (name: string, vendor?: string | null): string | null => {
  const candidates = [vendor ?? '', name].map(normalize).filter((s) => s.length > 0);
  for (const c of candidates) {
    if (ALIASES[c]) return ALIASES[c];
    if (BRAND_REGISTRY[c]) return c;
  }
  // Adın ilk kelimesi de dene ("Netflix Standard" → "netflix").
  for (const raw of [vendor ?? '', name]) {
    const first = normalize(raw.split(/\s+/)[0] ?? '');
    if (!first) continue;
    if (ALIASES[first]) return ALIASES[first];
    if (BRAND_REGISTRY[first]) return first;
  }
  return null;
};

/** Lettermark için ilk anlamlı harfi döner (büyük). Boşsa "?" döner. */
export const brandLetter = (name: string, vendor?: string | null): string => {
  const source = (vendor && vendor.trim()) || name.trim() || '?';
  const ch = source.replace(/[^A-Za-z0-9]/g, '').charAt(0);
  return (ch || '?').toUpperCase();
};
