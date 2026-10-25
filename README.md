# GridSight

GridSight is a community-powered outage map built with Next.js 14, TypeScript, Tailwind CSS, Supabase/PostgreSQL + PostGIS, and a small PWA service worker.

## Run locally

Prerequisites: Node.js 20+, npm, and a Supabase project with PostgreSQL/PostGIS.

1. Copy `.env.example` to `.env.local` and set the Supabase project URL and anon key.
2. Install and start the app:

   ```powershell
   npm install
   npm run dev
   ```

3. Open `http://localhost:3000`.
4. Apply the migrations in numeric order: `0001_gridsight.sql`, `0002_surigaocity_barangays.sql`, then the 15 `0003`–`0017` `surigaocity_barangay_data_part_XX.sql` files. Run each file separately in the SQL Editor and wait for success before continuing.
5. Enable Realtime for `public.outages` in the Supabase dashboard. The map reads the public-safe `outage_map` view; reports remain private to their author and admins.
6. Configure email confirmation and password recovery URLs in Supabase Auth. Add `/login` to the allowed redirect URLs.

The first reporting pilot is Surigao City and its 54 barangays. GPS lookup uses the stored barangay polygons and only resolves coordinates covered by a Surigao City barangay; reports with a GPS pin outside the selected barangay are rejected. Barangay boundaries were filtered from the HDX Philippines Subnational Administrative Boundaries dataset (COD-AB-PHL), sourced from NAMRIA and PSA. Review boundary provenance and updates with the city before relying on it for official decisions.

Without Supabase environment values the homepage runs in local mode. Report submission, accounts, persisted data, map updates, and admin review require the migrations above to be applied to a configured Supabase project.

## Supabase functions

Deploy the functions with the Supabase CLI, then set function secrets:

- `cluster-reports`: `CLUSTER_CRON_SECRET`
- `send-notifications`: `PUSH_CRON_SECRET`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
- Both functions also require Supabase's `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` secrets.
- Set the matching public key as `NEXT_PUBLIC_VAPID_PUBLIC_KEY` for the browser's push subscription flow.

Schedule `cluster-reports` to run every minute (or invoke it from a database webhook on new report inserts for lower latency). Schedule `send-notifications` every minute. Both endpoints require a POST request with the matching `x-cron-secret` header. Generate VAPID keys before enabling web push.

The browser service worker caches the app shell and receives push events. Offline reports are kept in IndexedDB and retried after connectivity returns; users must be signed in for the API to accept the queued reports. The route handler enforces file type/size, authentication, and optional Upstash rate limiting. The database RPC applies the five-minute user/area cooldown and idempotency check.

## Accounts and roles

Supabase Auth handles email/password registration, login, and password reset. A database trigger creates each `profiles` row with the standard `user` role. Promote a trusted staff account to admin from the Supabase SQL editor, for example:

```sql
update public.profiles
set role = 'admin'
where email = 'staff@example.com';
```

Do not expose the service-role key in browser code. Row Level Security remains the authorization boundary; the admin route and SQL moderation function also check the user's role.

## Environment

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are public client settings. Keep `SUPABASE_SERVICE_ROLE_KEY`, Upstash tokens, cron secrets, and VAPID private keys server-side only. The report endpoint enables Upstash sliding-window rate limiting when both Upstash REST values are configured; the database cooldown remains active without Upstash.

## Current scope

The repo includes the responsive map/reporting UI, Supabase Auth screens, report and moderation APIs, a spatial schema and clustering RPC, notification storage/push worker, and offline report queue. Before production, add automated tests, complete area-follow and notification-preference screens, implement outage-status override and historical analytics/export workflows, validate the migration against the target Supabase project, and test push/offline behavior on the actual mobile browsers you support.
