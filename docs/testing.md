# Testing

| Layer | Tool | Location | Command | Needs local stack |
| --- | --- | --- | --- | --- |
| Unit | Vitest (node) | `tests/unit` | `npm run test:unit` | no |
| Component | Vitest + React Testing Library (jsdom) | `tests/component` | `npm run test:component` | no |
| Database security | pgTAP | `supabase/tests/database` | `npm run test:db` | yes |
| Integration (API) | Vitest + supabase-js | `tests/integration` | `npm run test:integration` | yes |
| End-to-end | Playwright | `tests/e2e` | `npm run test:e2e` | yes (+ dev server, auto-started) |

`npm run check` runs typecheck, lint, unit and component tests.

## Running everything locally

```bash
npm run db:start
npm run db:reset              # fresh schema + seed (tests mutate data)
npm run check
npm run test:db
npm run test:integration
npm run test:e2e
```

Reset the database again before re-running the integration/e2e suites if you want a pristine state; the suites
are written to tolerate re-runs.

## What is covered

**Unit** — the permission model (scope coverage, escalation rules, capability + role + active-entity gates), open
redirect protection, Zod schemas (weak passwords, manipulated order payloads, malicious and oversized input,
in-app-only links), error sanitisation (no internal messages leak), file validation (SVG/HTML rejected).

**Component** — accessible form wiring (labels, descriptions, `role="alert"` errors), status badges with icon +
text, pagination preserving filters, chart data tables and empty states, sign-in form client validation and
generic server errors.

**pgTAP (53 assertions)** — anonymous access; residents cannot create entities, change protected profile columns,
edit other profiles, self-approve, assign roles, publish announcements, post as an entity, list products,
create notifications or audit logs, or issue alerts; entity owners are isolated from other entities and cannot set
moderator-only statuses or rename verified entities; NGOs lack product capability; editors cannot manage members;
orders are priced server-side and reject invalid quantities/ids and illegal transitions; reviewers are
district-scoped and the approval flow creates the owner membership and an audit entry; moderators are
community-scoped; district admins cannot escalate, act outside their district or change their own roles; suspended
users lose write access.

**Integration** — the same guarantees through the public Supabase API, plus Storage: uploads confined to the
caller's folder, disallowed MIME types rejected, verification documents readable only by the applicant and
in-scope reviewers, CVs readable only by the hiring entity.

**E2E** — sign-in redirect round-trip, generic credential errors, open-redirect neutralisation, 403 on admin direct
URLs, scoped admin navigation, workspace 404/403 behaviour, invalid ids, XSS payload rendered as text, the full
order flow (buyer → seller → buyer) and the full trust workflow (application → review → approval → workspace →
public listing), and the mobile tab bar.

## CI

`.github/workflows/ci.yml` runs typecheck, lint, unit/component tests, starts a local Supabase stack, runs pgTAP,
integration and Playwright suites, and builds the app.
