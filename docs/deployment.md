# Deployment

Target: **Vercel** (Next.js) + **Supabase** (hosted project).

## 1. Supabase project

1. Apply migrations (from a machine with the Supabase CLI linked to the project):
   ```bash
   npx supabase link --project-ref <ref>
   npx supabase db push
   ```
   (The development project *ProfJero Digital Studio* already has these migrations applied.)
2. **Do not run `seed.sql` in production.** For a staging/demo project you may load it, then purge it before launch
   with `supabase/scripts/remove_demo_data.sql`.
3. Authentication settings:
   - URL configuration → Site URL: `https://<your-domain>`; Redirect URLs: `https://<your-domain>/auth/callback`,
     `https://<your-domain>/auth/confirm` (plus preview URLs if used).
   - Email: keep **Confirm email** enabled; set minimum password length to **10** and require lower/upper/digits
     (matches the app's validation).
   - Enable leaked-password protection and CAPTCHA (hCaptcha/Turnstile) for sign-up if abuse appears.
   - Configure a custom SMTP provider for production email deliverability.
4. Storage buckets and policies are created by migrations — verify `public-media`, `verification-documents`
   and `job-applications` exist.
5. Bootstrap the first owner: sign up in the app, then run `supabase/scripts/grant_platform_owner.sql` (edit the
   email) in the SQL editor. Grant every other role from **/admin/users**.
6. Review **Advisors → Security / Performance** in the dashboard after each migration.

## 2. Vercel

1. Import the repository; framework preset **Next.js** (build `next build`, Node 20.9+).
2. Environment variables (Production and Preview): see [environment.md](environment.md).
3. Deploy. The app is fully dynamic (per-user rendering), so no special caching configuration is required.

## 3. Go-live checklist

- [ ] `npm run check`, `npm run test:db`, `npm run test:integration`, `npm run test:e2e` green on the release commit
- [ ] Migrations applied; `supabase migration list` matches the repo
- [ ] No demo accounts: `select count(*) from profiles where is_demo` returns 0
- [ ] First platform owner granted; demo/test roles revoked
- [ ] Auth URLs, password policy, email confirmation and SMTP configured
- [ ] Supabase Security Advisor shows no errors
- [ ] `NEXT_PUBLIC_SENTRY_DSN` set (recommended) and an error test event received
- [ ] Locations for the launch area created/activated in **/admin/locations**
- [ ] Platform settings reviewed in **/admin/settings** (e.g. post approval, rate limits)
- [ ] Custom domain with HTTPS; HSTS header present

## Rollbacks

Migrations are forward-only. To undo a change, write a new migration that reverses it. Never edit an applied
migration or modify production tables by hand.
