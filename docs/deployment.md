# Deployment

```
Visitor ──► https://dbibridgeconnect.pages.dev  (Cloudflare Pages project "dbibridgeconnect")
                 │  cloudflare-pages/public/_worker.js forwards every request
                 │  through the service binding APP (inside Cloudflare, not over the internet)
                 ▼
            Worker "bridgeconnect"  (https://bridgeconnect.digitalbridgeinitiative-org.workers.dev)
                 │  Next.js app built with the OpenNext Cloudflare adapter (SSR, Server Actions, middleware,
                 │  static assets)
                 ├──► Supabase (database, auth, private documents)
                 └──► Cloudinary (public images)
```

Two Cloudflare projects are built from the same GitHub repository: the **Worker** (the app) and the **Pages**
project (the short public address). Deploy the Worker first — the Pages project binds to it by name.

## 1. Supabase project (done for `mptavpfiweavlhmmasii`)

Status: all migrations applied (history matches `supabase/migrations/`), 42 tables all with RLS, storage buckets
and policies in place, launch locations loaded (`supabase/production/initial_locations.sql`), Security Advisor
shows only the expected warnings listed in [security.md](security.md#supabase-advisor-baseline). No demo data.

For future migrations: `npx supabase link --project-ref mptavpfiweavlhmmasii && npx supabase db push`.

**Dashboard settings to check before launch** (Supabase → your project):

1. **Authentication → URL Configuration**
   - Site URL: `https://dbibridgeconnect.pages.dev`
   - Redirect URLs: `https://dbibridgeconnect.pages.dev/auth/callback`,
     `https://dbibridgeconnect.pages.dev/auth/confirm` (and the same for a custom domain later).
2. **Authentication → Providers → Email**: keep *Confirm email* on.
   **Authentication → Policies / Passwords**: minimum length **10**, require lower + upper case + digits, enable
   *leaked password protection*.
3. **Authentication → Emails → SMTP**: configure a real SMTP provider (Resend, Brevo, Postmark, …). Supabase's
   built-in mailer is limited to a few emails per hour — not enough for launch.
4. **Authentication → Attack protection**: enable CAPTCHA (Cloudflare Turnstile) if sign-up abuse appears.
5. Bootstrap the first owner: sign up on the live site, confirm the email, then run
   `supabase/scripts/grant_platform_owner.sql` (edit the email) in the SQL editor. Grant all other roles from
   **/admin/users**.

**Never run `supabase/seed.sql` in production** (demo data). `supabase/scripts/remove_demo_data.sql` purges it
from a staging project.

## 2. Cloudflare

### 2a. Worker `bridgeconnect` (the app)

Dashboard → **Workers & Pages → Create → Workers → Import a repository** → `ProfJero/BridgeConnect`.

| Setting | Value |
| --- | --- |
| Project / Worker name | `bridgeconnect` (must match `name` in `wrangler.jsonc`) |
| Production branch | `main` |
| Root directory | `/` |
| Build command | `npx opennextjs-cloudflare build` |
| Deploy command | `npx opennextjs-cloudflare deploy` |
| Non-production branch deploy command | `npx wrangler versions upload` |

**Build variables:** none are required. The public Supabase URL, publishable key and site URL are committed in
`.env.production` (they are public by design and end up in the browser bundle anyway). Add a build variable only
to override one, plus:

| Build variable | Value |
| --- | --- |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | your Cloudinary cloud name (or add it to `.env.production`) |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Search Console HTML-tag `content` value (optional) |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN (optional) |

**Runtime secrets** (Worker → Settings → *Variables and Secrets* → Add → type **Secret**):

| Secret | Value |
| --- | --- |
| `CLOUDINARY_API_KEY` | Cloudinary → Settings → API Keys |
| `CLOUDINARY_API_SECRET` | Cloudinary → Settings → API Keys (never commit or share this) |

Or from a terminal: `npx wrangler secret put CLOUDINARY_API_SECRET`. Until these are set, uploads fall back to
Supabase Storage only if `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` is empty; with the cloud name set but no secret,
uploads show "Image uploads are not configured yet".

### 2b. Pages project `dbibridgeconnect` (the public address)

Dashboard → **Workers & Pages → Create → Pages → Connect to Git** → `ProfJero/BridgeConnect`
(or open the existing `dbibridgeconnect` project → *Settings → Build*).

| Setting | Value |
| --- | --- |
| Project name | `dbibridgeconnect` |
| Production branch | `main` |
| Framework preset | **None** |
| Build command | *(leave empty)* |
| Build output directory | `public` |
| Root directory (advanced) | `cloudflare-pages` |
| Environment variables | none |

The service binding is declared in `cloudflare-pages/wrangler.jsonc` (`APP` → `bridgeconnect`). After the first
deploy open *Settings → Bindings*: it should list **APP → bridgeconnect**. If it doesn't, add it there
(*Add → Service binding*, variable name `APP`, service `bridgeconnect`) and redeploy. If the binding is missing the
site answers "BridgeConnect is being configured" (HTTP 503) instead of failing silently.

Any push to `main` rebuilds both projects. The Pages build takes seconds (no `npm install`); a Worker deploy is
picked up by the Pages site immediately.

**Custom domain later:** add it to the Pages project (*Custom domains*), then update `NEXT_PUBLIC_SITE_URL` in
`.env.production` and the Supabase URL settings.

### Why the earlier build failed

`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` was undefined during the build. Cloudflare builds non-`main` branches with
the *Preview* environment, whose variables were empty — and a Pages project pointed at the repository root with
the OpenNext build command builds the whole app instead of the small forwarder. Both are fixed by the layout above.

**Manual deploy from a laptop** (alternative to Git integration):

```bash
npm ci && npx wrangler login
npm run deploy                                                     # the Worker
npx wrangler pages deploy cloudflare-pages/public --project-name dbibridgeconnect   # the Pages forwarder
```

**Local production preview:** `npm run preview` (Worker on http://localhost:8787).

### How it is wired

- `open-next.config.ts` — adapter config (no incremental cache: every page is per-user and dynamic).
- `wrangler.jsonc` — Worker name, `nodejs_compat`, static assets binding, self-reference service binding, and
  `global_fetch_strictly_public` (blocks server-side fetches to private IPs — SSRF hardening).
- `src/middleware.ts` — Supabase session refresh. Kept on the Edge `middleware` convention because OpenNext does not
  yet officially support Next 16's Node `proxy.ts`.
- `public/_headers` — cache and service-worker headers for files served straight from Cloudflare's asset store.
- `cloudflare-pages/` — the Pages forwarder (`public/_worker.js` + `wrangler.jsonc` with the service binding).
- `.env.production` — public build values (no secrets).
- Public images: Cloudinary (`f_auto,q_auto`, width-capped) when `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` is set; the
  browser uploads directly with a one-time signature from `signMediaUploadAction`, and the server confirms size
  and format with Cloudinary before recording the image. Private files (verification documents, CVs) stay in
  Supabase Storage behind RLS and short-lived signed URLs.

## 3. Google Search Console

1. Search Console → *Add property* → **Domain** (verify with a DNS TXT record in Cloudflare DNS — easiest), or
   **URL prefix** with the *HTML tag* method: copy the `content="…"` value into
   `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` and redeploy.
2. *Sitemaps* → submit `https://dbibridgeconnect.pages.dev/sitemap.xml` (lists hubs plus every public business, product,
   service, open job and upcoming event; regenerated on each request).
3. Use *URL Inspection* on the home page and one job page; the Rich Results Test should detect **JobPosting**,
   **Event**, **Product**, **LocalBusiness/Organization**, **BreadcrumbList** and the **WebSite** search box.
4. `robots.txt` blocks admin, workspaces, auth and personal pages; those pages also send `noindex`.

## 4. Go-live checklist

- [ ] `npm run check`, `npm run test:db`, `npm run test:integration`, `npm run test:e2e` green on the release commit
- [ ] Worker `bridgeconnect` build green; Pages `dbibridgeconnect` deployed with binding APP → bridgeconnect
- [ ] https://dbibridgeconnect.pages.dev loads, sign-in works; Supabase Site URL + redirect URLs set to it
- [ ] Cloudinary: cloud name set, `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` Worker secrets added, a test
      photo upload works
- [ ] Custom SMTP configured; sign-up confirmation and password-reset emails arrive and links work
- [ ] First platform owner granted (`grant_platform_owner.sql`); no demo accounts
      (`select count(*) from profiles where is_demo` = 0)
- [ ] Launch locations active in **/admin/locations**; platform settings reviewed in **/admin/settings**
- [ ] Supabase Security Advisor: only the expected warnings
- [ ] Sentry DSN set and a test error received (optional)
- [ ] Search Console verified, sitemap submitted
- [ ] PWA: Chrome DevTools → Application → Manifest shows no errors; "Install app" works on Android
- [ ] Supabase project on a paid plan (free projects pause after a week of inactivity)

## Rollbacks

- **App:** Cloudflare dashboard → Worker → *Deployments* → roll back to a previous version (instant).
- **Database:** migrations are forward-only. Write a new migration that reverses the change; never edit an
  applied migration or modify production tables by hand.
