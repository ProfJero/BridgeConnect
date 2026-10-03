# Environment variables

BridgeConnect deliberately needs **no server-side secrets**: all data access runs as the signed-in user under RLS.
There is no service-role key in the application, and none should be added to app code.

| Variable | Required | Exposed to browser | Description |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | yes | Supabase project URL, e.g. `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | yes | Supabase **publishable** key (`sb_publishable_…`). Safe to expose: it only identifies the project; RLS enforces access. |
| `NEXT_PUBLIC_SITE_URL` | yes (prod) | yes | Canonical site URL, used for auth email redirects and metadata. |
| `NEXT_PUBLIC_SENTRY_DSN` | no | yes | Enables Sentry error monitoring when set. |
| `SENTRY_ENVIRONMENT` | no | no | Sentry environment name (defaults to `NODE_ENV`). |

Values are validated at startup by `src/lib/env.ts` (Zod); the app fails fast if they are missing or malformed.

Test-only variables:

| Variable | Used by | Description |
| --- | --- | --- |
| `DEMO_PASSWORD` | integration / e2e tests | Password of the seeded demo accounts (defaults to the local dev value). |
| `E2E_BASE_URL` | Playwright | Test an already-running deployment instead of starting `next dev`. |
| `PLAYWRIGHT_CHROMIUM_PATH` | Playwright | Use a preinstalled Chromium. |

## Local

```bash
cp .env.example .env.local
npx supabase status      # prints the local API URL and publishable key
```

## Supabase dashboard settings (not environment variables)

Configure in **Authentication → URL configuration**: Site URL = `NEXT_PUBLIC_SITE_URL`; redirect URLs include
`<site>/auth/callback` and `<site>/auth/confirm`. See [deployment.md](deployment.md).
