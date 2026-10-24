# Environment variables

All data access runs as the signed-in user under RLS: there is **no service-role key** in the application, and
none should be added. The only server-side secret is the Cloudinary API secret, used solely to sign image uploads.

| Variable | Required | Exposed to browser | Description |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | yes | Supabase project URL, e.g. `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | yes | Supabase **publishable** key (`sb_publishable_…`). Safe to expose: it only identifies the project; RLS enforces access. |
| `NEXT_PUBLIC_SITE_URL` | yes (prod) | yes | Canonical site URL, used for auth email redirects and metadata. |
| `NEXT_PUBLIC_SENTRY_DSN` | no | yes | Enables Sentry error monitoring when set. |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | no | yes | Google Search Console HTML-tag token (`content` value only). |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | no | yes | Enables Cloudinary for public images. Empty → Supabase Storage. |
| `CLOUDINARY_API_KEY` | with Cloudinary | **no** | Worker secret. Identifies the Cloudinary account for signing. |
| `CLOUDINARY_API_SECRET` | with Cloudinary | **no** | Worker secret. Signs uploads; never commit, log or expose it. |
| `SENTRY_ENVIRONMENT` | no | no | Sentry environment name (defaults to `NODE_ENV`). |

`NEXT_PUBLIC_*` values are inlined into the bundle **at build time**. Production values live in the committed
`.env.production` (public values only); Cloudflare build variables override them. Secrets are set as Worker
secrets at runtime (locally: `.dev.vars`, gitignored). See [deployment.md](deployment.md#2-cloudflare).

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
