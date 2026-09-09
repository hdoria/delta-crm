# @crm/auth

Base CRM uses Supabase Auth with Google identity only. The CRM retains its Prisma user profiles, workspace and role model in Supabase Postgres.

`auth.api.getSession({ headers })` verifies the presented Supabase access token with `auth.getUser()`, checks Google identity, verified email and `ALLOWED_SIGN_IN`, and returns the internal CRM session shape. Missing or empty allowlists deny access. The first authorized human becomes the workspace owner, even when demo profiles already exist.

The Next.js callback, proxy and browser client own session refresh and cookie writes. The API reads unchunked or chunked Supabase SSR cookies and verifies only their access token. It never refreshes tokens without a cookie writer.

```ts
import { createBrowserSupabaseClient } from "@crm/auth/client";

await createBrowserSupabaseClient().auth.signInWithOAuth({
  provider: "google",
  options: { redirectTo: `${window.location.origin}/auth/callback` },
});
```

The server helper `createServerSupabaseClient({ getAll, setAll })` is exported by `@crm/auth/supabase`. Server settings are `SUPABASE_URL` and `SUPABASE_ANON_KEY`; browser settings are `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Publishable-key variants are also accepted by the helpers. Google credentials are configured in Supabase, not in an application OAuth handler.

Microsoft, enterprise SSO, mailbox and Slack connections are disabled in this version. API keys are also disabled: the API rejects `x-api-key` credentials and key-management writes return an explicit error. Legacy Better Auth routes, session cookies and development sessions grant no access.

Local Supabase can be prepared before Google OAuth credentials are supplied. The application starts in that state and no user can enter until Google and the allowlist are configured. Tests use an isolated `TEST_DATABASE_URL` ending in `_test`; the integration fixtures mock the Supabase HTTP response while exercising real Prisma profile and membership writes.
