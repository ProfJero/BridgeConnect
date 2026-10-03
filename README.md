# BridgeConnect

**Connecting Communities. Empowering Lives.**

BridgeConnect is a community digital platform by **Digital Bridge Initiative (DBI)**. It connects residents with
trusted businesses, organisations, institutions, services, jobs, events, a local marketplace, community news and
emergency information — organised by **Region → District → Community**.

It has three experiences on one identity and authorization system:

| Experience | Who | Where |
| --- | --- | --- |
| **Public platform** (mobile-first) | Everyone; residents when signed in | `/`, `/explore`, `/community`, `/marketplace`, `/jobs`, … |
| **Entity workspaces** | Members of *verified* businesses and organisations | `/workspace/[entityId]` |
| **DBI administration** (desktop-first) | Staff with scoped roles | `/admin` |

## Trust model in one paragraph

Residents can post to their community (moderated and reportable), but **cannot create structured listings**.
Businesses, NGOs, schools, health facilities and other organisations go through
**Application → Review → Verification → Approval → Workspace**. Only a reviewer with `entities.verify` *in that
community's area* can approve, and approval atomically creates the entity, its owner membership and its workspace.
What a workspace can do depends on explicit **capabilities** per entity type (e.g. NGOs have no marketplace).
Every rule is enforced in PostgreSQL (RLS + `SECURITY DEFINER` functions) and re-checked server-side; the UI only
decides what to show.

## Stack

Next.js 16 (App Router, Server Components, Server Actions) · React 19 · TypeScript (strict) · Tailwind CSS 4 ·
shadcn/ui-style components on Radix · Lucide · Supabase (Postgres 17, Auth, Storage, Realtime) via `@supabase/ssr` ·
Zod · React Hook Form · TanStack Table · Recharts · Vitest + React Testing Library · Playwright · pgTAP ·
Sentry-ready · Vercel-compatible.

## Quick start (local)

Requirements: Node 20.9+ (22 recommended), Docker.

```bash
npm install
npm run db:start          # local Supabase (Postgres, Auth, Storage, Realtime)
npm run db:reset          # apply migrations + development seed
cp .env.example .env.local
# Put the local URL and publishable key printed by `npx supabase status` into .env.local
npm run dev               # http://localhost:3000
```

### Demo accounts (local development only)

All use the password **`BridgeDemo#2026`** and live on the reserved `.test` domain. They are flagged `is_demo` and
must never exist in production (see [docs/deployment.md](docs/deployment.md)).

| Email | Persona |
| --- | --- |
| `owner@demo.bridgeconnect.test` | Platform owner |
| `district.admin@demo.bridgeconnect.test` | District administrator (Abura-Asebu-Kwamankese) |
| `verifier@demo.bridgeconnect.test` | Verification officer (AAK) |
| `moderator@demo.bridgeconnect.test` | Community moderator (AAK) |
| `business@demo.bridgeconnect.test` | Owner of *Kwamankese Fresh Farms* |
| `ngo@demo.bridgeconnect.test` | Owner of *Bridge Youth Foundation*; editor at *Abakrampa Health Centre* |
| `resident@demo.bridgeconnect.test` | Resident of Kwamankese with a pending application |
| `capecoast@demo.bridgeconnect.test` | Resident in another district (cross-area tests) |

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run check` | Typecheck + lint + unit/component tests |
| `npm test` | Unit + component tests (Vitest) |
| `npm run test:integration` | API-level security tests against the local stack |
| `npm run test:db` | pgTAP database security suite |
| `npm run test:e2e` | Playwright end-to-end tests |
| `npm run db:reset` | Re-create the local database from migrations + seed |
| `npm run db:types` | Regenerate `src/types/database.ts` |

## Documentation

- [AGENTS.md](AGENTS.md) — rules for anyone (human or AI) changing this codebase
- [docs/architecture.md](docs/architecture.md) — structure, layers, request flow
- [docs/security.md](docs/security.md) — authentication & authorization model
- [docs/database.md](docs/database.md) — schema, migrations, RLS conventions
- [docs/environment.md](docs/environment.md) — environment variables
- [docs/deployment.md](docs/deployment.md) — Supabase + Vercel deployment and go-live checklist
- [docs/testing.md](docs/testing.md) — test strategy and how to run each suite

The original static HTML prototype is preserved for reference in [`legacy/prototype`](legacy/prototype); it is
not part of the application.
