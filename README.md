# tracksub

PNPM workspace monorepo. Modern stack, **maksimum DX**.

## Stack

| Katman  | Teknoloji                                                             |
| ------- | --------------------------------------------------------------------- |
| Manager | pnpm workspaces + catalog (versiyonlar tek yerde)                     |
| API     | Fastify 5, `@fastify/autoload`, `@fastify/cors`, `fastify-plugin`     |
| Web     | React 19, Rspack 1 (SWC + React Refresh)                              |
| Routing | **TanStack Router** (file-based, autoCodeSplitting, type-safe)        |
| Server  | **TanStack Query** (session + me cache, staleTime 60s)                |
| Forms   | **TanStack Form** (validators + Subscribe)                            |
| UI      | **Tailwind CSS v4** + **shadcn/ui** (new-york, neutral, dark mode)    |
| Icons   | lucide-react                                                          |
| Auth    | better-auth (email/password, 7g session, autoSignIn, drizzle adapter) |
| DB      | PostgreSQL + Drizzle ORM 0.45 + drizzle-kit migrations                |
| Tooling | oxlint, oxfmt, **tsgo** (`@typescript/native-preview`)                |

## Klasör yapısı

```
tracksub/
├── package.json                 # root scripts
├── pnpm-workspace.yaml          # packages + catalog
├── tsconfig.base.json
├── .oxlintrc.json / .oxfmtrc.json / .oxfmtignore
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
│           │   ├── auth-client.ts
│           │   ├── query-client.ts
│           │   ├── theme.ts     # light/dark/system
│           │   ├── api.ts       # fetch wrapper
│           │   └── utils.ts     # cn()
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

## Hızlı başlangıç

```bash
# 1. Bağımlılıklar
pnpm install

# 2. Env
cp .env.example .env
# .env içindeki DATABASE_URL ve BETTER_AUTH_SECRET'i doldur:
#   openssl rand -base64 32   →  BETTER_AUTH_SECRET

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

| Komut                | Açıklama                                         |
| -------------------- | ------------------------------------------------ |
| `pnpm dev`           | api + web paralel watch                          |
| `pnpm build`         | her iki app'i build et                           |
| `pnpm typecheck`     | tüm workspace tsgo ile typecheck                 |
| `pnpm lint`          | oxlint                                           |
| `pnpm format`        | oxfmt ile format (auto-fix)                      |
| `pnpm format:check`  | oxfmt --check (CI için)                          |
| `pnpm check`         | format:check + lint + typecheck                  |
| `pnpm fix`           | format + lint --fix                              |
| `pnpm db:generate`   | drizzle-kit migration üret                       |
| `pnpm db:migrate`    | migrationları uygula                             |
| `pnpm db:studio`     | drizzle-studio aç                                |
| `pnpm auth:generate` | better-auth → `apps/api/src/db/schema.ts` yenile |

## Yeni shadcn bileşeni ekleme

```bash
cd apps/web
pnpm dlx shadcn@latest add dialog dropdown-menu separator toast
# Yeni bileşenler `apps/web/src/components/ui/` altına gelir.
```

`components.json` zaten `new-york` style + `neutral` baseColor + lucide ikon kütüphanesi ile yapılandırıldı.

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
