<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# BridgeConnect — rules for contributors and coding agents

BridgeConnect is a production community platform. Read `README.md`, `docs/architecture.md` and
`docs/security.md` before changing behaviour. These rules are not optional.

## Security (non-negotiable)

- **The database is the security boundary.** Every exposed table has RLS and explicit column-level grants.
  Never disable RLS, never add `grant all`, never use a service-role key in app code (there is none).
- **Never trust the client.** Re-validate all input on the server with the feature's Zod schema. Prices,
  statuses, ownership, author ids and slugs are set by the database, never taken from the request.
- **UI checks are UX only.** `lib/auth/permissions.ts` mirrors the SQL helpers so the UI can hide things; it is
  not an authorization boundary. A page that needs a permission must call `requireAdminPermission`,
  `requireWorkspaceCapability`, etc., and the query/RPC behind it must be protected by RLS or a
  `SECURITY DEFINER` function that checks `private.has_permission` / `private.entity_can`.
- Sensitive transitions (verification, moderation, role changes, suspensions, orders, alerts) go through
  `SECURITY DEFINER` functions with `set search_path = ''` that check permission + scope and write an audit log.
- Never log or return passwords, tokens or raw database errors. Use `dbFailure()` / `toUserMessage()`.
- Redirect targets from user input must go through `safeRedirectPath()`.
- Uploads: validate type/size with `validateFile()`, upload into the caller's own folder, and rely on Storage RLS.
  Private files are served only through short-lived signed URLs.
- Render user content as text (React escaping). `dangerouslySetInnerHTML` is forbidden.

## Database

- All schema changes are new files in `supabase/migrations/` (timestamped). Never edit a migration that has been
  applied to a shared environment; add a new one. Reference data required in production goes in migrations;
  demo data goes in `supabase/seed.sql` only.
- Helper functions live in the `private` schema (not exposed via the Data API). Public RPCs live in `public` and
  must `revoke ... from public, anon` unless intentionally public.
- After schema changes: `npm run db:reset && npm run db:types && npm run test:db`.
- Add pgTAP assertions in `supabase/tests/database/` for every new policy or privileged function, including the
  negative cases (cross-user, cross-entity, cross-community, escalation).

## Code organisation

- `src/app` — routes only (thin pages composing feature components).
- `src/features/<domain>/` — `schemas.ts` (Zod), `queries.ts` (server-only reads), `actions.ts`
  (`"use server"` mutations returning `ActionResult`), `components/`.
- `src/components/ui` — design-system primitives; `src/components/shared` — cross-feature presentational parts.
- `src/lib` — auth/session (DAL), Supabase clients, errors, formatting, storage helpers.
- Prefer Server Components. Add `"use client"` only for interactivity. No global client state.
- Strict TypeScript; avoid `any`. Use generated types from `src/types/database.ts`.

## UI

- Use semantic tokens (`bg-primary`, `text-muted-foreground`, …) from `src/app/globals.css`; no raw hex in
  components (charts excepted — see `components/charts/chart-colors.ts`).
- Every feature handles loading, empty, error, unauthorized/forbidden and not-found states.
- Accessibility: labelled controls (`Field` + `controlProps`), keyboard operable, status never by colour alone
  (`StatusBadge`), charts ship a data table.

## Before you push

`npm run check` (typecheck, lint, unit + component tests). For data/authorization changes also run
`npm run test:db`, `npm run test:integration` and `npm run test:e2e` against a reset local stack.
