# Security model

## Principles

1. **Never trust the client.** The browser holds only the publishable key and the user's session.
2. **PostgreSQL is the authorization boundary.** RLS + column grants + `SECURITY DEFINER` functions.
3. **Defence in depth.** Server Actions validate with Zod and re-check identity; pages check permissions to render
   the right state; the UI hides what you cannot do. Removing any single layer must not open a hole.
4. **Least privilege.** No service-role key in the app. Default privileges on `public` are revoked; every table
   grants only the columns a role may write.
5. **Everything sensitive is audited.** `audit_logs` is append-only (no write grants to any API role).

## Identity

- Supabase Auth (email + password, min 10 chars with upper/lower/digit; enforce the same policy in the hosted
  project — see [deployment.md](deployment.md)). Passwords are never handled by app code beyond passing them to
  Supabase.
- `@supabase/ssr` stores the session in HTTP-only-capable cookies; the proxy refreshes it; the DAL validates it with
  `auth.getUser()`.
- A profile row is created by trigger. Only harmless preferences (display name, home community) are read from
  client-controlled `user_metadata`; privileged flags (`is_demo`) come from `app_metadata`.
- Sign-in, sign-up and password reset return identical messages whether or not an account exists (no enumeration).
  Post-auth redirects are restricted to same-origin paths (`safeRedirectPath`).

## Authorization: three orthogonal contexts

| Context | Source | Checked by |
| --- | --- | --- |
| **Resident** | Any active, signed-in account | `private.is_active_user()` |
| **Platform roles** | `user_role_assignments` → `roles` → `role_permissions` | `private.has_permission(perm, community, district, region)` |
| **Entity membership** | `entity_memberships` (owner › manager › editor › member) + capabilities | `private.entity_can(entity, capability, min_role)` |

### Scoped roles

A role assignment is scoped to the **platform**, a **region**, a **district** or a **community**. A grant covers a
target if it is platform-wide, or its region/district/community contains the target. Scoped grants never imply
platform-wide power. Examples (seeded system roles):

| Role | Broadest scope | Highlights |
| --- | --- | --- |
| `platform_owner` | platform | Everything, including `roles.manage` and `platform.owner` |
| `platform_admin` | platform | Everything except role definitions |
| `regional_admin` / `district_admin` | region / district | Users, verification, moderation, marketplace, emergency, analytics, audit in scope |
| `verification_officer` | district | Review applications |
| `moderator` | district | Posts, comments, reports, jobs/events moderation |
| `emergency_coordinator` | district | Alerts and emergency contacts |

**Escalation is impossible by construction:** `admin_assign_role` requires `roles.assign` at the target scope *and*
that the granter already holds every permission of the role at that scope; nobody can change their own roles;
custom roles cannot receive permissions their editor lacks; system roles are immutable; platform owners can only
be suspended by another owner.

### Entity capabilities

`entity_type_capabilities` defines which modules each type gets (e.g. businesses: products, orders, jobs, ads…;
NGOs: no products/orders; health facilities and government agencies: emergency alerts). Administrators can override
per entity (`entity_capability_overrides`, audited). Workspace writes require an **active** entity, the capability
and a sufficient membership role. Suspending an entity instantly removes it and all its listings from public view.

## Trust workflow

`entity_applications` → `review_entity_application(start_review | request_info | approve | reject | note)`:
- reviewer must hold `entities.verify` covering the application's community and cannot review their own;
- approval requires the `under_review` state and atomically creates the entity, its type profile and the owner
  membership, notifies the applicant and writes an audit entry;
- verification-only data (registration numbers, documents) never reaches the public entity row.

## Data protection highlights

- **Orders:** `place_order` prices every line from the database, checks stock with row locks, enforces rate limits
  and supports only legal status transitions. Clients cannot insert orders directly.
- **Content:** residents' posts/comments are rate-limited, may require approval (`community.posts_require_approval`)
  and auto-hide after N distinct reports. Announcements are reserved for verified entities.
- **Storage:** `public-media` (images only, 5 MB, writes limited to `users/{uid}/` or `entities/{id}/` for members
  with the media capability); `verification-documents` (private; applicant + in-scope reviewers via signed URLs);
  `job-applications` (private PDFs; applicant + the hiring entity's editors). Buckets enforce MIME/size; SVG and
  HTML are rejected.
- **Links:** notification links and ad destinations must be in-app paths (prevents phishing/open redirects).
- **Output:** all user content is rendered as text by React; no `dangerouslySetInnerHTML`.
- **Headers:** CSP (self + the Supabase project), `X-Frame-Options: DENY`, `nosniff`, strict referrer policy,
  HSTS in production.
- **Errors:** only deliberate, user-safe database messages are shown; everything else is replaced and reported.

## Verifying it

- `npm run test:db` — 53 pgTAP assertions: anonymous access, cross-user, cross-entity, cross-community, role
  escalation, manipulated inserts, suspended users.
- `npm run test:integration` — the same attacks through the public Supabase API, plus Storage access control.
- `npm run test:e2e` — direct-URL access, 403/404 behaviour, XSS rendering, open-redirect, full workflows.
