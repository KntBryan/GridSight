# GridSight

GridSight is a community-powered outage map built with Next.js 15, TypeScript, Tailwind CSS, Supabase/PostgreSQL + PostGIS, and a small PWA service worker.

## Run locally

Prerequisites: Node.js 20+, npm, and a Supabase project with PostgreSQL/PostGIS.

1. Copy `.env.example` to `.env.local` and set the Supabase project URL and anon key.
2. Install and start the app:

   ```powershell
   npm install
   npm run dev
   ```

3. Open `http://localhost:3000`.
4. Apply the migrations in numeric order: `0001_gridsight.sql`, `0002_surigaocity_barangays.sql`, the 15 `0003`–`0017` `surigaocity_barangay_data_part_XX.sql` files, `0018_push_delivery_queue.sql`, `0019_admin_account_management.sql`, then `0020_authenticated_outage_access.sql`. Run each file separately in the SQL Editor and wait for success before continuing.
5. Enable Realtime for `public.outages` in the Supabase dashboard. The outage map is available to signed-in users through `outage_map`; anonymous access is revoked by migration 0020. Reports remain private to their author and admins.
6. Configure email confirmation and password recovery URLs in Supabase Auth. Add `/login` and `/auth/callback` on each app origin to the allowed redirect URLs.

The first reporting pilot is Surigao City and its 54 barangays. GPS lookup uses the stored barangay polygons and only resolves coordinates covered by a Surigao City barangay; reports with a GPS pin outside the selected barangay are rejected. Barangay boundaries were filtered from the HDX Philippines Subnational Administrative Boundaries dataset (COD-AB-PHL), sourced from NAMRIA and PSA. Review boundary provenance and updates with the city before relying on it for official decisions.

Without Supabase environment values the public homepage runs in local mode. Accounts, outage-map data, notifications, report history, report submission, and admin review require a configured Supabase project and the migrations above. The map, notification, and report APIs require an authenticated user.

## Focused auth tests

Run `npm test` for safe return-navigation checks. After `npm run build`, run `npm run test:auth-api` to start the production server and verify anonymous outage, location, report-history, and report-submission requests are rejected.

## Supabase functions

Deploy the functions with the Supabase CLI, then set function secrets:

- `cluster-reports`: `CLUSTER_CRON_SECRET`
- `send-notifications`: `PUSH_CRON_SECRET`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
- Both functions also require Supabase's `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` secrets.
- Set the matching public key as `NEXT_PUBLIC_VAPID_PUBLIC_KEY` for the browser's push subscription flow.
- Migration `0018_push_delivery_queue.sql` adds atomic notification claims and retries failed push delivery up to five times with backoff; apply it before deploying the updated `send-notifications` function.

Schedule `cluster-reports` to run every minute (or invoke it from a database webhook on new report inserts for lower latency). Schedule `send-notifications` every minute. Both endpoints require a POST request with the matching `x-cron-secret` header. Generate VAPID keys before enabling web push.

The browser service worker caches the app shell and receives push events. Offline reports are kept in IndexedDB and retried after connectivity returns; users must be signed in for the API to accept the queued reports. The route handler enforces file type/size, authentication, and optional Upstash rate limiting. The database RPC applies the five-minute user/area cooldown and idempotency check.

## Accounts and roles

Supabase Auth handles email/password registration, login, and password reset. A database trigger creates each `profiles` row with the standard `user` role. Role changes are never available during signup or through editable profile fields.

### First administrator bootstrap

After applying migration `0019`, register the intended operator at `/register` and confirm their email. In PowerShell, set the project URL and service-role key only in the current shell, then run the first-admin-only script with the exact confirmed email and an operator label:

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL = "https://your-project.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "<service-role-key from the Supabase dashboard>"
npm run admin:bootstrap -- "staff@example.com" "Operator name"
Remove-Item Env:\SUPABASE_SERVICE_ROLE_KEY
Remove-Item Env:\NEXT_PUBLIC_SUPABASE_URL
```

The script requires an existing profile with confirmed email, writes an audit entry, refuses to create another first admin, and is safe to rerun for the already-bootstrapped account. Never place the service-role key in source control or a `NEXT_PUBLIC_` variable. If the operator target is wrong after bootstrap, use the normal admin-management screen after signing in rather than rerunning the bootstrap for a different account.

### Routine administrator management

Sign in as an administrator with a confirmed email, enroll and verify a time-based authenticator at `/admin/accounts`, then use that page to invite staff or promote/demote accounts. Invitations start with the regular `user` role; promote only after the invitee confirms their email. The database function re-checks the actor's current role and AAL2 session, audits role changes transactionally, and prevents demoting the last administrator. Invitation delivery uses Supabase Auth and is separate from the database transaction; if the API reports that an email may have been sent but its audit record failed, do not retry blindly—reconcile the account/audit with another administrator.

Enable TOTP MFA in Supabase Auth (Authentication → Multi-Factor Authentication) and require AAL2 for administrator operations. The account-management API enforces the JWT AAL2 claim; enrollments must be verified before an account action is accepted. Set `NEXT_PUBLIC_APP_URL` to the canonical HTTPS app URL and allow its `/login` URL in Supabase Auth redirect URLs for invitation acceptance. Upstash rate limiting is applied to account mutations when both Upstash REST settings are configured; configure them for hosted deployments.

The service-role key remains server-only. RLS limits audit visibility to administrators; role updates are performed by an authenticated, MFA-gated database function, while the first-admin function is executable only by Supabase's `service_role`.

## Environment

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are public client settings. Keep `SUPABASE_SERVICE_ROLE_KEY`, Upstash tokens, cron secrets, and VAPID private keys server-side only. The report endpoint enables Upstash sliding-window rate limiting when both Upstash REST values are configured; the database cooldown remains active without Upstash.

## Current scope

The repo includes the responsive map/reporting UI, Supabase Auth screens, report and moderation APIs, a spatial schema and clustering RPC, notification storage/push worker, and offline report queue. Before production, expand automated tests, complete area-follow and notification-preference screens, implement outage-status override and historical analytics/export workflows, validate the migration against the target Supabase project, and test push/offline behavior on the actual mobile browsers you support.
