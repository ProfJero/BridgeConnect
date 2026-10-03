# Architecture

BridgeConnect is a **modular monolith**: one Next.js application and one Supabase project, organised by domain.

```
Browser ──► Next.js (Vercel)                     Supabase
            ├─ proxy.ts  (refresh session, coarse redirect)
            ├─ Server Components ──── supabase-js (as the user) ──► PostgREST ─► Postgres + RLS
            ├─ Server Actions ─────── Zod ─► supabase-js / RPC  ──►           ─► SECURITY DEFINER fns
            └─ Client Components ─── direct upload ─────────────► Storage (bucket RLS)
                                    └ realtime subscription ────► Realtime (RLS-filtered)
```

There is **no service-role key** in the application. Every read and write runs as the signed-in user (or anon),
so PostgreSQL decides what is visible and allowed. Privileged state changes are `SECURITY DEFINER` functions that
check permissions themselves.

## Repository layout

```
src/
  app/                      Routes (App Router)
    (public)/               Mobile-first public platform (shared PublicShell layout)
    (auth)/                 Sign in / up / password reset
    auth/callback|confirm   Email link handlers (PKCE / token_hash)
    workspace/[entityId]/   Entity workspaces (capability-driven modules)
    admin/                  DBI administration (permission-driven modules)
    go/ad/[id]              Ad click tracking + in-app redirect
  features/<domain>/        schemas.ts · queries.ts · actions.ts · components/
  components/ui/            Design-system primitives (shadcn-style, Radix)
  components/shared|forms|widgets|cards|charts|layout
  lib/
    auth/permissions.ts     Pure permission model (mirrors SQL; UX only)
    auth/session.ts         Data access layer for identity: getViewer, require*
    auth/action-guard.ts    First line of every mutating action
    supabase/               server / browser / proxy clients
    errors.ts               DB error → safe user message
  types/database.ts         Generated from the schema (npm run db:types)
supabase/
  migrations/               Ordered SQL migrations (schema, RLS, functions, reference data)
  seed.sql                  Development-only locations + demo accounts/content
  tests/database/           pgTAP security suite
  scripts/                  Operational SQL (bootstrap owner, purge demo data)
tests/                      unit · component · integration · e2e
legacy/prototype/           Original static HTML prototype (reference only)
```

## Domains

| Domain | Feature folder | Key tables / functions |
| --- | --- | --- |
| Identity & access | `auth`, `profile`, `admin` | `profiles`, `roles`, `permissions`, `user_role_assignments`, `my_access()` |
| Locations | `locations` | `regions` → `districts` → `communities`, `location_directory` view |
| Entities & verification | `directory`, `applications`, `workspace` | `entities`, `entity_memberships`, `entity_type_capabilities`, `entity_applications`, `review_entity_application()` |
| Community | `community`, `reports` | `posts`, `post_comments`, `post_reactions`, `reports`, `moderate_content()` |
| Marketplace | `marketplace`, `orders` | `products`, `services`, `orders`, `place_order()`, `update_order_status()` |
| Jobs & events | `jobs`, `events` | `jobs`, `job_applications`, `events`, `event_rsvps` |
| Engagement | `favourites`, `notifications`, `search` | `favourites`, `notifications` (realtime), `search_directory()` |
| Advertising | `ads`, `workspace` | `advertisements`, `review_advertisement()` |
| Emergency | `emergency` | `emergency_alerts` (realtime), `emergency_contacts`, `issue_emergency_alert()` |
| Platform | `admin` | `audit_logs`, `platform_settings`, analytics RPCs |

## Request flow

1. **`src/proxy.ts`** (Next 16's replacement for middleware) refreshes the Supabase session cookie on every request
   and redirects anonymous users away from obviously protected prefixes. UX only.
2. **Layouts/pages** call the DAL: `getViewer()` (cached per request; validates the session with
   `auth.getUser()`), then `requireViewer`, `requireAdminPermission(permission)`, `getWorkspace(entityId)` or
   `requireWorkspaceCapability(entityId, capability)`. These call `notFound()` / `forbidden()` / `redirect()`.
   Non-members of a workspace get **404** (existence is not revealed); members lacking a capability get **403**.
3. **Queries** (`features/*/queries.ts`, `server-only`) use the per-request server client. RLS filters rows.
4. **Mutations** are Server Actions: Zod-parse → `guardActiveViewer()` (+ feature guard) → insert/update or RPC
   → map errors with `dbFailure()` → `revalidatePath`. They return `ActionResult`, never throw raw errors.
5. **Client forms** use `useActionForm` (React Hook Form + the same Zod schema) for instant feedback; the server's
   answer is authoritative and its field errors are mapped back onto the form.

## Rendering & performance

- Server Components by default; client components only for forms, menus, uploads, realtime and charts.
- Lists are paginated server-side (`range()`), with indexes for every filter used.
- Images are served by Supabase Storage through `next/image` (`remotePatterns` limited to the project's public
  bucket path).
- `loading.tsx` skeletons per area; `error.tsx` with retry and an offline message; `not-found`, `forbidden`,
  `unauthorized` boundaries (`experimental.authInterrupts`).
- Note: when a page calls `forbidden()` after a `loading.tsx` boundary has started streaming, the 403 UI renders
  with an HTTP 200 status. No protected data is sent; layout-level checks (e.g. `/admin` for residents) return a
  real 403.

## Realtime

Used only where it adds product value: the notification badge (`notifications`) and emergency alerts
(`emergency_alerts`). Subscriptions are RLS-filtered, and the client refreshes server components rather than
trusting payloads.
