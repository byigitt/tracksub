# tracksub

Abonelik takibi + AI destekli mailden içe aktarma + kendi Gmail'inden hatırlatıcı. PNPM workspace monorepo, **maksimum DX**.

**Web** (`apps/web`) ve **mobile** (`apps/mobile`, Expo SDK 55) aynı API'yi (`apps/api`) tüketir.

## Özellikler

- **Manuel CRUD**: ad, sağlayıcı, tutar, para birimi, periyot (günlük/haftalık/aylık/3 aylık/yıllık/tek seferlik/özel), durum, başlangıç + sonraki yenileme, not. `nextBillingAt` periyottan otomatik hesaplanır.
- **AI paste-parse**: Bir mail metni yapıştır → [`fal-ai/any-llm`](https://fal.ai/models/fal-ai/any-llm) (default `google/gemini-2.5-flash`) → aday subscription'lar JSON çıkarımı → çoklu seçimle topluca ekle.
- **Gmail OAuth (opsiyonel)**: `gmail.readonly` ile son N gün maili alıp aynı AI pipeline'a sok; `gmail.send` ile reminder mailini **kullanıcının kendi Gmail'inden** kendine gönder. SMTP/App Password yok — saf OAuth.
- **Reminder cron**: `0 9 * * *` Europe/Istanbul; `nextBillingAt`'e 7/3/1/0 gün kala mail. `reminder_job` tablosundaki `unique(subId, offset, day)` index sayesinde idempotent.
- **Dashboard**: aktif sub sayısı, aylık/yıllık toplam (currency-aware), yaklaşan 3 yenileme.
- **Abonelikler sayfası**: durum filtresi (Tümü / Aktif / Duraklatıldı / İptal / Süresi doldu) sayaçlarla.

## Stack

| Katman   | Teknoloji                                                                                                            |
| -------- | -------------------------------------------------------------------------------------------------------------------- |
| Manager  | pnpm workspaces + catalog (versiyonlar tek yerde)                                                                    |
| API      | Fastify 5, `@fastify/autoload`, `@fastify/cors`, `fastify-plugin`                                                    |
| Web      | React 19, Rspack 1 (SWC + React Refresh)                                                                             |
| Mobile   | **Expo SDK 55** + expo-router v5 + RN 0.85 + React 19.1                                                              |
| Routing  | **TanStack Router** (web) / **expo-router** (mobile, file-based)                                                     |
| Server   | **TanStack Query** (cache + invalidation)                                                                            |
| Forms    | **TanStack Form** (validators + Subscribe)                                                                           |
| UI (web) | **Tailwind CSS v4** + **shadcn/ui** (new-york, neutral, dark mode)                                                   |
| UI (rn)  | **NativeWind v4** + **Tailwind v3** + **react-native-reusables**                                                     |
| Icons    | lucide-react / lucide-react-native                                                                                   |
| Auth     | better-auth (email/password + Google OAuth, drizzle adapter, 7g session) + `@better-auth/expo` (mobile, SecureStore) |
| DB       | PostgreSQL + Drizzle ORM 0.45 + drizzle-kit migrations                                                               |
| AI       | `@fal-ai/client` → `fal-ai/any-llm` endpoint (model `AI_MODEL` env)                                                  |
| Mail     | Gmail API `users.messages.send` (`gmail.send` scope) — SMTP **yok**                                                  |
| Cron     | `node-cron` (sunucu boot'unda schedule)                                                                              |
| Validate | `zod` 4 (transform + refine)                                                                                         |
| Tooling  | oxlint, oxfmt, **tsgo** (`@typescript/native-preview`)                                                               |

## Klasör yapısı

```
tracksub/
├── package.json                 # root scripts
├── pnpm-workspace.yaml          # packages + catalog
├── tsconfig.base.json
├── .oxlintrc.json / .oxfmtrc.json / .oxfmtignore
├── packages/                    # api+web+mobile arasinda paylasilan katmanlar
│   ├── shared/                  # @tracksub/shared      — saf domain logic + wire types (sifir runtime dep)
│   │                            #   period.ts (Period/Status/Source enum + computeNextBilling/rollForward/reminderOffsetFor)
│   │                            #   types.ts (Subscription/Candidate/GmailStatus/SyncResponse wire DTOs)
│   │                            #   format.ts, summary.ts
│   ├── schemas/                 # @tracksub/schemas     — zod 4 validators (subscription/candidate/gmail) + ortak primitives
│   ├── api-client/              # @tracksub/api-client  — platform-bagimsiz typed REST client (createApiClient + ApiError)
│   └── query/                   # @tracksub/query       — TanStack Query hooks + ApiClientProvider + createQueryClient + cn
├── apps/
│   ├── api/                     # Fastify + better-auth + drizzle
│   │   ├── drizzle.config.ts
│   │   ├── scripts/migrate.ts
│   │   └── src/
│   │       ├── index.ts         # entry
│   │       ├── server.ts        # buildServer + autoload
│   │       ├── env.ts
│   │       ├── plugins/         # fastify-plugin sarmalı (encapsulation off)
│   │       │   ├── cors.ts
│   │       │   ├── db.ts        # app.db decorator
│   │       │   └── auth.ts      # /api/auth/* + request.session
│   │       ├── modules/         # route modülleri (autoload, /api prefix)
│   │       │   ├── health/routes.ts
│   │       │   └── me/routes.ts
│   │       ├── lib/auth.ts      # betterAuth() instance
│   │       └── db/
│   │           ├── client.ts
│   │           └── schema.ts    # better-auth tabloları
│   └── web/                     # React + Rspack + TanStack
│       ├── components.json      # shadcn config (new-york / neutral / lucide)
│       ├── postcss.config.mjs   # @tailwindcss/postcss
│       ├── rspack.config.ts     # SWC + tanstackRouter + alias @/*
│       ├── index.html           # FOUC-engelleyen theme bootstrap
│       └── src/
│           ├── main.tsx         # globals.css + QueryClientProvider + RouterProvider
│           ├── router.tsx       # createRouter(routeTree, context)
│           ├── routeTree.gen.ts # AUTO-GEN (commit edilir, format edilmez)
│           ├── styles/globals.css   # Tailwind v4 + @theme + CSS vars
│           ├── routes/          # file-based
│           │   ├── __root.tsx   # devtools + Outlet
│           │   ├── index.tsx    # / → redirect
│           │   ├── _auth.tsx    # signed-out layout
│           │   ├── _auth.signin.tsx / _auth.signup.tsx
│           │   ├── _authenticated.tsx        # guard
│           │   └── _authenticated.dashboard.tsx
│           ├── lib/
│           │   ├── auth-client.ts        # better-auth/react (platform-specific)
│           │   ├── query-client.ts       # createQueryClient @tracksub/query
│           │   ├── theme.ts              # light/dark/system
│           │   ├── api.ts                # createApiClient @tracksub/api-client
│           │   └── utils.ts              # cn() re-export from @tracksub/query
│           ├── components/
│           │   ├── ui/          # shadcn copy-paste atomları
│           │   │   ├── button.tsx
│           │   │   ├── card.tsx
│           │   │   ├── input.tsx
│           │   │   └── label.tsx
│           │   ├── field.tsx    # TanStack Form-uyumlu wrapper
│           │   └── theme-toggle.tsx
│           └── features/
│               ├── auth/
│               │   ├── sign-in-form.tsx
│               │   ├── sign-up-form.tsx
│               │   └── use-session.ts
│               └── me/use-me.ts
```

## Mobile uygulama (`apps/mobile`)

Expo SDK 55 tabanlı, web ile aynı API'yi tüketen iOS/Android uygulaması.

### Stack

- **Expo SDK 55** + **expo-router** (file-based, typed routes)
- **NativeWind v4** + Tailwind v3.4 (web tarafının TW v4'üyle paralel — birbirine bulaşmaz)
- **react-native-reusables** (shadcn/ui'in RN portu — `new-york`, `neutral`)
- **TanStack Query** + **TanStack Form**
- **`@better-auth/expo`** + `expo-secure-store` (cookie SecureStore'da; bearer plugin gerekmiyor)
- **react-native-reanimated v4** + **gesture-handler** (Reusables peer'ı)
- **lucide-react-native** ikonlar

### Çalıştırma

```bash
# Önce API'yi başlat (apps/api porta 4000)
pnpm --filter @tracksub/api dev

# Mobile dev server (Expo Go veya dev build için)
pnpm --filter @tracksub/mobile dev

# Sim platform kısayolları:
pnpm --filter @tracksub/mobile ios       # iOS Simulator
pnpm --filter @tracksub/mobile android   # Android Emulator
pnpm --filter @tracksub/mobile web       # Tarayıcı
```

#### API URL otomatik çözümü

`apps/mobile/src/lib/api-url.ts` aşağıdaki sırayla API base URL'ini bulur:

1. `EXPO_PUBLIC_API_URL` env var (production / EAS).
2. Expo dev server'ın LAN IP'si (Expo Go cihazda → `http://<lan-ip>:4000`).
3. iOS Simulator → `http://localhost:4000`, Android Emulator → `http://10.0.2.2:4000`.

Gerçek cihazda Expo Go ile çalışırken API'nin `0.0.0.0` üzerinden erişilebilir olduğundan emin ol (Fastify default'u zaten public).

### Mobile auth notu

`@better-auth/expo` cookie'leri `expo-secure-store`'da saklar; her API isteğine `authClient.getCookie()` ile elle ekler. Bu yüzden:

- API tarafında `apps/api/src/lib/auth.ts` içinde `expo()` plugin kayıtlı, `trustedOrigins` `tracksub://` ve dev'de `exp://**` içeriyor.
- `apps/api/src/plugins/cors.ts` web origin için credentials açık, `tracksub://` / `exp://` için izinli ama credentials kapalı (cookies header üzerinden gönderiliyor).

### Ekranlar

- `app/(auth)/sign-in.tsx`, `app/(auth)/sign-up.tsx` — email/şifre + Google OAuth (deep link)
- `app/(app)/index.tsx` — dashboard: greeting, summary strip, yaklaşan yenilemeler, filtre + arama, FlatList
- `app/(app)/new.tsx` — yeni abonelik (modal presentation)
- `app/(app)/sub/[id].tsx` — düzenle/sil (modal presentation)
- `app/(app)/import.tsx` — yapıştır + Gmail bağla/sync (modal)
- `app/(app)/settings.tsx` — tema (light/dark/system), çıkış

## Hızlı başlangıç

```bash
# 1. Bağımlılıklar
pnpm install

# 2. Env
cp .env.example .env
# Zorunlu:
#   DATABASE_URL              — Postgres bağlantısı
#   BETTER_AUTH_SECRET        — openssl rand -base64 32
# AI (zorunlu — paste-parse + gmail için):
#   FAL_KEY                   — https://fal.ai/dashboard/keys
#   AI_MODEL=google/gemini-2.5-flash   (veya openai/gpt-4o, anthropic/claude-3.5-sonnet, ...)
# Gmail OAuth (opsiyonel — mailden içe aktarma + reminder maili için):
#   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
#   Google Console'da Authorized redirect URI:  http://localhost:4000/api/auth/callback/google
#   Scopes: gmail.readonly + gmail.send (better-auth provider'ı isteyecek)
# Reminder timezone (default Europe/Istanbul):
#   REMINDER_TZ=Europe/Istanbul

# 3. Postgres ayağa kaldır
docker run -d --name tracksub-pg \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=tracksub -p 5432:5432 postgres:16

# 4. Auth tabloları + migration
pnpm auth:generate    # better-auth → apps/api/src/db/schema.ts
pnpm db:generate      # drizzle-kit migration üret
pnpm db:migrate       # uygula

# 5. Geliştirme
pnpm dev
# api:  http://localhost:4000  (health: /health)
# web:  http://localhost:3000  (proxy /api → :4000)
```

## Komutlar

| Komut                 | Açıklama                                         |
| --------------------- | ------------------------------------------------ |
| `pnpm dev`            | api + web + paket watch'ları paralel             |
| `pnpm build`          | once packages, sonra apps build (zincirli)       |
| `pnpm build:packages` | sadece `packages/*` build (paket dist'i üret)    |
| `pnpm clean`          | tüm workspace dist'leri temizle                  |
| `pnpm typecheck`      | tüm workspace tsgo ile typecheck                 |
| `pnpm lint`           | oxlint                                           |
| `pnpm format`         | oxfmt ile format (auto-fix)                      |
| `pnpm format:check`   | oxfmt --check (CI için)                          |
| `pnpm check`          | format:check + lint + typecheck                  |
| `pnpm fix`            | format + lint --fix                              |
| `pnpm db:generate`    | drizzle-kit migration üret                       |
| `pnpm db:migrate`     | migrationları uygula                             |
| `pnpm db:studio`      | drizzle-studio aç                                |
| `pnpm auth:generate`  | better-auth → `apps/api/src/db/schema.ts` yenile |

## Yeni shadcn bileşeni ekleme

```bash
cd apps/web
pnpm dlx shadcn@latest add dialog dropdown-menu separator toast
# Yeni bileşenler `apps/web/src/components/ui/` altına gelir.
```

`components.json` zaten `new-york` style + `neutral` baseColor + lucide ikon kütüphanesi ile yapılandırıldı.

## Subscription tracking akışları

### 1. Manuel ekleme

`Dashboard → Aboneliklerim → Yeni`. Form periyot/tutar/para birimi alır, `nextBillingAt` boşsa server hesaplar.

### 2. AI ile mailden çıkarma (paste)

`Dashboard → İçe aktar`. Bir mail metnini textarea'ya yapıştır → **Analiz et** → `fal-ai/any-llm` JSON aday döndürür (güven skoru rozetiyle) → çoklu seçim → **Seçilenleri ekle**. Birden çok mail tek seferde gidebilir.

### 3. Gmail bind + sync

Eğer `GOOGLE_CLIENT_ID/SECRET` env'de varsa, İçe aktar sayfasında **Gmail'i bağla** görünür. Tıklayınca better-auth Google provider OAuth akışı; izin verilen scope'lar:

- `gmail.readonly` (mail okumak)
- `gmail.send` (kendi kendine reminder mail atmak)

Sonra **Maillerden tara** → son N gün (default 90) abonelik-anahtarlı mailler çekilir, AI'ya verilir, aynı candidate UI ile onaylanır. Token expired olursa `oauth2.refreshAccessToken()` ile otomatik yenilenir, DB güncellenir.

### 4. Reminder cron

Gmail bağlı + `gmail.send` scope varsa, her gün 09:00 (`REMINDER_TZ`):

- Tüm aktif sub'lar için `daysUntil(nextBillingAt) ∈ {7, 3, 1, 0}` ise mail atılır.
- `reminder_job` tablosunda `unique(subId, offset, day)` index sayesinde idempotent (aynı gün tekrar tetiklense bile bir kez gider).
- Mail kullanıcının **kendi Gmail'inden kendine** gider — RFC 822 raw, base64url-encoded, `users.messages.send`. SMTP yok.
- `subscription_event kind=reminder_sent` olarak audit'lenir.

Dev test:

```bash
# manuel cron tetik (NODE_ENV !== production):
curl -b cookie.txt -X POST http://localhost:4000/api/reminders/test

# tek bir sub için ad-hoc reminder:
curl -b cookie.txt -X POST http://localhost:4000/api/reminders/send \
  -H 'Content-Type: application/json' \
  -d '{"subscriptionId":"<uuid>","daysLeft":3}'
```

## Tasarım kararları

- **TanStack Router context**: `{ auth, queryClient }` context'e enjekte edilir → `beforeLoad` guard'ları bunu kullanır. Session source-of-truth `useQuery(['session'])`.
- **Fastify autoload**: `plugins/` encapsulation **kapalı** (`fastify-plugin` sarmalı, decorator'lar app-wide). `modules/` encapsulation **açık** (kendi scope, `/api` prefix).
- **Form pattern**: shadcn'in resmi `form` bileşeni RHF için → biz `<Field>` wrapper'ımızı yazıyoruz, içinde shadcn `<Input>` + `<Label>` kullanıyor. TanStack Form'un render-prop'u doğrudan `<Field>`'e geçer.
- **Path alias**: `@/*` → `apps/web/src/*` (rspack.config + tsconfig).
- **Dark mode**: CSS variables, `class` strategy, FOUC-engelleyen blocking script `index.html`'de.
- **routeTree.gen.ts**: rspack-plugin tarafından üretilir, `.oxfmtignore`'da format'tan hariç.

## VS Code

`.vscode/settings.json`:

```json
{
  "typescript.tsdk": "node_modules/@typescript/native-preview/lib",
  "js/ts.experimental.useTsgo": true,
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cn\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

## Auth akışı

- `POST /api/auth/sign-up/email` — `{ name, email, password }`
- `POST /api/auth/sign-in/email` — `{ email, password }`
- `POST /api/auth/sign-out`
- `GET  /api/auth/get-session`
- `GET  /api/me` — örnek korumalı endpoint (preHandler hook'tan `request.session` gelir)

Frontend:

```ts
import { useSession, signIn, signUp, signOut } from '@/lib/auth-client';

const { data: session, isPending } = useSession();
await signIn.email({ email, password });
await signUp.email({ name, email, password });
await signOut();
```
