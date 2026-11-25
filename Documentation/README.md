# GridSight

GridSight is a community outage reporting and monitoring system for Surigao City. It combines a public-facing outage map with authenticated reporting, administrator review, notification workflows, and spatial validation against the city's barangay boundaries.

## Current system overview

The application is built with:

- Next.js 15 and TypeScript
- Tailwind CSS for the UI
- Supabase Auth + PostgreSQL/PostGIS for identity, data storage, RLS, and database functions
- Leaflet / React Leaflet for the map experience
- PWA service worker support for browser installability and push handling
- IndexedDB for queued offline reports

## System Documentation Suite

GridSight is documented across comprehensive operational, architectural, and legal guides:

| Document | Purpose |
| :--- | :--- |
| [**`API.md`**](API.md) | Endpoint specifications, schemas, rate limits, and error codes. |
| [**`ARCHITECTURE.md`**](ARCHITECTURE.md) | C4 Context/Container models, Mermaid ERDs, state machines, and threat models. |
| [**`USER_MANUAL.md`**](USER_MANUAL.md) | Citizen reporting guide, mobile PWA installation, and admin dispatch manual. |
| [**`DEPLOYMENT_AND_OPERATIONS.md`**](DEPLOYMENT_AND_OPERATIONS.md) | Production setup, 21-part SQL migrations, Edge Functions, cron, and runbook. |
| [**`CODE_DOCUMENTATION.md`**](CODE_DOCUMENTATION.md) | TSDoc/JSDoc standards, API routes reference, core libraries, and PostgreSQL RPCs. |
| [**`CHANGELOG.md`**](CHANGELOG.md) | SemVer release progression and version history. |
| [**`LICENSE_AND_NOTICE.md`**](LICENSE_AND_NOTICE.md) | Software licensing terms, emergency disclaimer, and open-source attributions. |

The current implementation supports:

- A responsive home and map experience with protected sections for authenticated users
- Barangay-based outage reporting with GPS validation inside the selected barangay
- User report history and status tracking
- Admin review and moderation of incoming reports
- Role-based administration with MFA enforcement for sensitive operations
- Notification storage and push delivery via Supabase Edge functions
- Offline report queue retry after connectivity returns
- Session refresh logic via middleware and server-side Supabase cookie handling

The first pilot geography is Surigao City and its 54 barangays. Coordinates are validated against stored barangay polygons; reports that place the GPS pin outside the selected barangay are rejected. Boundary data is intended for local operational use and should be reviewed with the city before being used for official decisions.

## Local development setup

Prerequisites:

- Node.js 20+
- npm
- A Supabase project with PostgreSQL/PostGIS enabled

1. Copy `.env.example` to `.env.local` and set the public Supabase values.
2. Install dependencies and start the app:

   ```powershell
   npm install
   npm run dev
   ```

3. Open `http://localhost:3000`.
4. Apply the SQL migrations in order using the Supabase SQL editor:

   `0001_gridsight.sql`
   `0002_surigaocity_barangays.sql`
   the 15 `0003`–`0017` `surigaocity_barangay_data_part_XX.sql` files
   `0018_push_delivery_queue.sql`
   `0019_admin_account_management.sql`
   `0020_authenticated_outage_access.sql`

   Run each migration separately and wait for it to finish before moving to the next one.

5. Enable Realtime for `public.outages` in the Supabase dashboard.
6. Configure Supabase Auth redirect URLs for `/login` and `/auth/callback` on each app origin.

Without the required Supabase values, the public homepage still loads in local mode, but authenticated flows, the map APIs, notifications, report submission, report history, and admin tools require a valid project configuration and the database migrations above.

## Project scripts

```powershell
npm run dev
npm run build
npm run start
npm run lint
npm test
npm run test:auth-api
npm run admin:bootstrap -- "staff@example.com" "Operator name"
```

The test commands are focused checks for auth-return flow and protected API behavior. The admin bootstrap script creates the first admin from an existing confirmed profile and should only be run with the service-role key exposed in the current shell.

## Authentication and access model

Supabase Auth handles sign-up, sign-in, email confirmation, and password reset.

- Each new `profiles` row is created with the default `user` role.
- Role changes are not exposed during signup or through editable profile fields.
- Administrators are required to verify MFA before sensitive admin actions are accepted.
- The app uses middleware to refresh Supabase sessions and keep auth cookies current across requests.
- Report and outage APIs are authentication-gated and return `401` when a user is not signed in.

## Administrator setup

### Initial admin bootstrap

After applying migration `0019`, register the intended operator at `/register` and confirm their email.

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL = "https://your-project.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "<service-role-key from the Supabase dashboard>"
npm run admin:bootstrap -- "staff@example.com" "Operator name"
Remove-Item Env:\SUPABASE_SERVICE_ROLE_KEY
Remove-Item Env:\NEXT_PUBLIC_SUPABASE_URL
```

The bootstrap script:

- requires an existing confirmed account
- writes an audit record
- refuses to create more than one first admin
- is safe to rerun for the already-bootstrapped account

Never store the service-role key in source control or in a `NEXT_PUBLIC_` environment variable.

### Routine admin management

Administrators can sign in and use `/admin/accounts` to:

- enroll and verify TOTP MFA
- invite staff users
- promote or demote accounts
- audit role changes transactionally

Role changes are gated by the actor's current role and AAL2 status. The system prevents demoting the final administrator and enforces MFA before account actions are accepted.

Set `NEXT_PUBLIC_APP_URL` to the canonical HTTPS app URL and allow the `/login` callback in Supabase Auth redirect URLs for invitation acceptance.

## Supabase Edge functions and notifications

Deploy the Supabase functions with the CLI, then set the required secrets:

- `cluster-reports`: `CLUSTER_CRON_SECRET`
- `send-notifications`: `PUSH_CRON_SECRET`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
- both functions require Supabase `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

Use one VAPID key pair everywhere:

- set `NEXT_PUBLIC_VAPID_PUBLIC_KEY` for the browser push subscription flow
- set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` as Supabase Edge Function secrets
- use a `mailto:` address for the VAPID subject
- never commit the private key

Suggested schedule:

- `cluster-reports`: every minute
- `send-notifications`: every minute

Both endpoints require a POST request with the matching `x-cron-secret` header. Migration `0018_push_delivery_queue.sql` adds atomic notification claims and retries failed push delivery up to five times with backoff. Apply it before deploying the updated notification function.

## Report pipeline and validation

The reporting flow includes:

- form validation and content-size checks
- photo validation for JPEG, PNG, and WebP uploads
- rate limiting when Upstash settings are configured
- database cooldown and idempotency checks for repeated report attempts
- barangay-level GPS validation through the selected area polygon
- security checks for signed-in users before submission is accepted

Offline reports are queued in IndexedDB and retried when connectivity is restored. Users remain required to be signed in before queued reports are accepted by the API.

## Data model and app behavior

Current app features in the repo include:

- outage map and community updates views
- authenticated report poster and report history view
- admin dashboard with reports, outages, analytics, and export actions
- ability to export admin data from the dashboard API
- area analytics and outage clustering support through database RPCs
- notification preference and push subscription work for end users

The app is designed around Surigao City barangay geography, but the structure is extensible to other localities with additional spatial data and migration updates.

## Environment and security notes

Keep these values server-side only:

- `SUPABASE_SERVICE_ROLE_KEY`
- Upstash REST tokens
- cron secrets
- VAPID private key

Public browser values are:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `NEXT_PUBLIC_APP_URL`

The service-role key is never meant to be exposed to the browser. RLS continues to protect data, while privileged actions are enforced through authenticated database functions and MFA-gated admin flows.

## Current status

This repository is a working, feature-focused outage reporting system rather than a placeholder scaffold. The current implementation includes the map, reporting flows, admin review tooling, notification push pipeline, offline queueing, and session-management safeguards required for the core Surigao City pilot.

The remaining work is mostly operational and product-level: expand automated coverage, complete any remaining user-facing preference flows, validate the migration set against target deployments, and test push/offline behavior on real mobile browsers before broader rollout.
