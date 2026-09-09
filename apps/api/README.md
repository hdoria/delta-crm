# Base CRM API

NestJS API running on Bun, backed by Supabase Postgres through `@crm/db` and Prisma. Supabase Auth owns the Google identity and session lifecycle. The [Base CRM guide](../../docs/base-crm.md) is the setup reference for this fork.

## Run locally

From the repository root:

```sh
cp .env.example .env
bun install
bun run setup:local
bun run dev
```

For an existing `.env`, preserve its values instead of copying the example again.
The API listens on port 3001. The web app listens on port 3000.

The API requires `DATABASE_URL`, `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
An empty `ALLOWED_SIGN_IN` lets the service start, but denies every login.
Google credentials configure local Supabase. In a hosted project, configure Google in the Supabase dashboard.

Bun runs the TypeScript sources of workspace packages. TypeScript checks use `bun run check-types`; the production bundle uses `bun run build`.

## Authentication

`SupabaseAuthGuard` protects REST routes by default. `@AllowAnonymous()` exposes a route and `@OptionalAuth()` permits a missing session. tRPC protected procedures validate the same session through their context.

`@crm/auth` extracts the current access token from Supabase SSR cookies or an Authorization Bearer header, then calls Supabase `getUser`. It validates Google identity, confirmed email, expiry and the explicit allowlist before resolving a CRM profile and workspace membership. It never accepts legacy session cookies or API keys. Refresh tokens are handled by the browser and Next.js proxy, which can return updated cookies.

The first permitted Google user becomes the workspace owner. Seed representatives have no login or membership. SSO, API keys and mailbox connections are disabled for this version.

Next.js serves `/auth/callback`, exchanges the OAuth code and checks CRM access before redirecting. Nest does not mount a Better Auth handler. Standard JSON body parsing remains enabled.

CORS accepts the origins in `APP_URL` and credentials. Environment validation lives in `src/config/env.validation.ts`.

| Route | Access | Behavior |
| --- | --- | --- |
| `/auth/me` | Required | CRM profile of the signed-in user |
| `/auth/session` | Optional | Current validated session, or null |
| `/health` | Anonymous | Database round-trip; 200 when available |
| `/api/trpc/*` | Per procedure | CRM queries and mutations |
| `/internal/*` | Dedicated cron token | Operational routes reject missing authorization |

## Tests and cache

`bun run db:test` prepares the separate database named by `TEST_DATABASE_URL`, whose name must end in `_test`. `bun run test` exercises the workspaces sequentially. Auth integration tests mock the Supabase HTTP response and use real isolated Postgres tables for profiles and memberships. They do not replace the Google sign-in check with real credentials.

`AppCacheModule` uses Redis when `REDIS_URL` is set, otherwise an in-memory cache per API process. Auth identity validation is performed for authenticated requests; cached CRM profiles are a separate concern.
