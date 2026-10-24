# Deployment

Target: **Cloudflare Workers** (Next.js via the [OpenNext Cloudflare adapter](https://opennext.js.org/cloudflare))
+ **Supabase** (hosted project *ProfJero Digital Studio*, ref `mptavpfiweavlhmmasii`).

> **Pages or Workers?** Cloudflare now recommends Workers (with static assets) for full-stack Next.js. The old
> Pages adapter `@cloudflare/next-on-pages` is deprecated. Both live under **Workers & Pages** in the dashboard
> and both connect to GitHub the same way; choose **Workers → Import a repository**. Server rendering, Server
> Actions, middleware and the static files all run in that one Worker — there is nothing extra to wire up.

## 1. Supabase project (done for `mptavpfiweavlhmmasii`)

Status: all migrations applied (history matches `supabase/migrations/`), 42 tables all with RLS, storage buckets
and policies in place, launch locations loaded (`supabase/production/initial_locations.sql`), Security Advisor
shows only the expected warnings listed in [security.md](security.md#supabase-advisor-baseline). No demo data.

For future migrations: `npx supabase link --project-ref mptavpfiweavlhmmasii && npx supabase db push`.

**Dashboard settings to check before launch** (Supabase → your project):

1. **Authentication → URL Configuration**
   - Site URL: `https://<your-domain>`
   - Redirect URLs: `https://<your-domain>/auth/callback`, `https://<your-domain>/auth/confirm`, and
     `https://bridgeconnect.<your-subdomain>.workers.dev/**` while testing on the workers.dev URL.
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

## 2. Cloudflare (Workers Builds, connected to GitHub)

Dashboard → **Workers & Pages → Create → Workers → Import a repository** → pick `ProfJero/BridgeConnect`.

| Setting | Value |
| --- | --- |
| Project / Worker name | `bridgeconnect` (must match `name` in `wrangler.jsonc`) |
| Production branch | `main` (merge the release branch into it) |
| Root directory | `/` |
| Build command | `npx opennextjs-cloudflare build` |
| Deploy command | `npx opennextjs-cloudflare deploy` |
| Non-production branch deploy command | `npx wrangler versions upload` (preview URLs for other branches) |

**Build variables** (Settings → Build → *Variables and secrets*). `NEXT_PUBLIC_*` values are baked into the
bundle at build time, so they **must** be build variables:

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://mptavpfiweavlhmmasii.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_JmZZfIPo6bnPPYjn9Iayzg_DRm0_ue3` |
| `NEXT_PUBLIC_SITE_URL` | `https://<your-domain>` (no trailing slash) |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | the `content` value of Search Console's HTML tag (optional) |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN (optional, recommended) |
| `NODE_VERSION` | `22` |

Add the same `NEXT_PUBLIC_*` values under Settings → *Variables and secrets* (runtime) too — harmless, and keeps
server code consistent if a value is ever read at runtime. There are **no secrets** to add: the app has no
service-role key by design.

Then **Save and deploy**. Every push to `main` redeploys; pull requests get preview URLs.

**Custom domain:** Worker → Settings → *Domains & Routes* → Add → Custom domain (e.g. `bridgeconnect.org` and
`www.`). The domain's DNS must be on Cloudflare. Update `NEXT_PUBLIC_SITE_URL` and the Supabase URL settings, then
redeploy.

**Manual deploy from a laptop** (alternative to Git integration):

```bash
npm ci
npx wrangler login
npm run deploy        # = opennextjs-cloudflare build && opennextjs-cloudflare deploy
```

**Local production preview** in the Workers runtime: `npm run preview` (http://localhost:8787).

### How it is wired

- `open-next.config.ts` — adapter config (no incremental cache: every page is per-user and dynamic).
- `wrangler.jsonc` — Worker name, `nodejs_compat`, static assets binding, self-reference service binding, and
  `global_fetch_strictly_public` (blocks server-side fetches to private IPs — SSRF hardening).
- `src/middleware.ts` — Supabase session refresh. Kept on the Edge `middleware` convention because OpenNext does not
  yet officially support Next 16's Node `proxy.ts`.
- `public/_headers` — cache and service-worker headers for files served straight from Cloudflare's asset store.
- Images are served unoptimised from Supabase Storage's CDN (no paid Cloudflare Images binding needed).

## 3. Google Search Console

1. Search Console → *Add property* → **Domain** (verify with a DNS TXT record in Cloudflare DNS — easiest), or
   **URL prefix** with the *HTML tag* method: copy the `content="…"` value into
   `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` and redeploy.
2. *Sitemaps* → submit `https://<your-domain>/sitemap.xml` (lists hubs plus every public business, product,
   service, open job and upcoming event; regenerated on each request).
3. Use *URL Inspection* on the home page and one job page; the Rich Results Test should detect **JobPosting**,
   **Event**, **Product**, **LocalBusiness/Organization**, **BreadcrumbList** and the **WebSite** search box.
4. `robots.txt` blocks admin, workspaces, auth and personal pages; those pages also send `noindex`.

## 4. Go-live checklist

- [ ] `npm run check`, `npm run test:db`, `npm run test:integration`, `npm run test:e2e` green on the release commit
- [ ] Cloudflare build green; site loads on the workers.dev URL, then on the custom domain (HTTPS)
- [ ] `NEXT_PUBLIC_SITE_URL` = final domain; Supabase Site URL + redirect URLs updated
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
