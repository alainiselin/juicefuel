---
title: Deployment
category: guide
status: stable
---

# Deployment

JuiceFuel's production deployment.

## Where things live

| Piece | Provider | Identifier |
|---|---|---|
| App (frontend + API) | Vercel | project `juicefuel` (team `alain-iselins-projects`) |
| Database | Supabase | project ref `kcgyqwqguzbmalbzzlrs` (region `eu-central-1`) |
| Domain | Porkbun | `juicecrew.vip` (CNAME `juicefuel` → `cname.vercel-dns.com`) |
| Live URL | — | https://juicefuel.juicecrew.vip |

## Required production env vars

All set in Vercel (Settings → Environment Variables → Production):

| Var | Purpose | Notes |
|---|---|---|
| `DATABASE_URL` | Postgres connection | Supabase **transaction pooler** URL (port 6543), with `?pgbouncer=true&sslmode=no-verify` |
| `AUTH_SECRET` | Session signing | `openssl rand -base64 32` |
| `AUTH_ORIGIN` | OAuth callback base | `https://juicefuel.juicecrew.vip` |
| `GOOGLE_CLIENT_ID` | Google OAuth | from https://console.cloud.google.com/auth/clients |
| `GOOGLE_CLIENT_SECRET` | Google OAuth | same |
| `APPLE_BUNDLE_ID` | Sign in with Apple JWT audience | must match the iOS app's Bundle ID (`vip.juicecrew.juicefuel`) |
| `OPENAI_API_KEY` | AI recipe generation and URL recipe import | Required for AI/URL recipe creation flows |
| `OPENAI_MODEL` | OpenAI model override | Optional; defaults to `gpt-4.1-mini-2025-04-14` |

`sslmode=no-verify` is intentional: the `pg` driver on Vercel's runtime doesn't trust Supabase's intermediate CA. TLS still encrypts; the chain isn't verified. To make verification proper, add `ssl: { ca, rejectUnauthorized: true }` to the `pg.Pool` in [`server/utils/prisma.ts`](../../server/utils/prisma.ts) with Supabase's root cert.

## Connection-string flavours

Three forms, used in different contexts:

```
# direct (port 5432) — only if you need IPv4 to the primary db host
postgresql://postgres:<pw>@db.<ref>.supabase.co:5432/postgres?sslmode=require

# session pooler (port 5432, IPv4) — use for migrations & seed scripts
postgresql://postgres.<ref>:<pw>@aws-1-<region>.pooler.supabase.com:5432/postgres?sslmode=require

# transaction pooler (port 6543) — use for serverless app runtime
postgresql://postgres.<ref>:<pw>@aws-1-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=no-verify
```

## Deploy flow

```bash
# from project root, with VERCEL_TOKEN exported:
vercel deploy --prod --yes
```

Vercel runs `npm install` (which triggers `postinstall` → `prisma generate && nuxt prepare`) then `nuxt build`. The build emits Nitro functions to `.vercel/output/`.

Latest known production deploy from this cleanup pass:

- Date: 2026-05-03
- Commit: `227cadc` (`fix(recipes): accept imported drafts on save`)
- Deployment ID: `dpl_HEvBLjSzTBe8v6CLFV3ERCpkSwXp`
- Alias verified: `https://juicefuel.juicecrew.vip`

## Pushing schema changes

Supabase's hosted Postgres is the source of truth in production. To apply new migrations:

```bash
DATABASE_URL="<session-pooler-url>" npx prisma migrate deploy
```

Use the session pooler (port 5432) for migrations — the transaction pooler (6543) doesn't support all Postgres features Prisma needs.

## Custom domain

The CNAME `juicefuel.juicecrew.vip` → `cname.vercel-dns.com` was created via Porkbun's API. Vercel auto-issues a Let's Encrypt cert once DNS resolves. SSO deployment-protection is set to `all_except_custom_domains`, so the `*.vercel.app` URLs are gated but the custom domain is public — that's intentional.

## Google OAuth

The OAuth flow is implemented in [`server/api/auth/google.get.ts`](../../server/api/auth/google.get.ts) and [`server/api/auth/callback/google.get.ts`](../../server/api/auth/callback/google.get.ts). Setup steps are gated behind Google's console UI (no CLI for "Web application" OAuth clients):

1. Create a project at https://console.cloud.google.com
2. Configure consent screen (https://console.cloud.google.com/auth/branding) with `juicecrew.vip` as an authorised domain
3. Create an OAuth 2.0 Client ID (Web application) at https://console.cloud.google.com/auth/clients with:
   - Authorised JS origin: `https://juicefuel.juicecrew.vip`
   - Authorised redirect URI: `https://juicefuel.juicecrew.vip/api/auth/callback/google`
4. Set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` env vars in Vercel
5. While the consent screen is in **Testing**, only listed test users can sign in. Click **Publish App** to open it.

## Gotchas worth keeping in mind

- **`postinstall` must run `prisma generate`.** Without it, the deployed Nitro bundle fails with `Cannot find module '.prisma/client/default'`. The `package.json` `postinstall` script is wired for this — don't remove it.
- **Default-import the Prisma client.** [`server/utils/prisma.ts`](../../server/utils/prisma.ts) does `import pkg from '@prisma/client'; const { PrismaClient } = pkg;` because the Nitro/Vercel bundle resolves `@prisma/client` as CJS at runtime; named ESM imports break.
- **Supabase free tier pauses after ~7 days idle.** First request after pause takes ~30s while it resumes.
- **Node 22+ for Prisma 7 CLI.** Prisma 7's CLI requires Node 22 (an older Node throws `ERR_REQUIRE_ESM` from `@prisma/dev`). `nvm use 22` before running `prisma migrate deploy` locally.
