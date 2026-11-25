# GridSight — Production Deployment & Operational Runbook

> **Applicable Pilot Area:** City of Surigao, Surigao del Norte, Philippines (54 Barangays)  
> **System Version:** 1.0.0  
> **Target Environments:** Production, Staging, Local Development  
> **Related Documentation:** [README.md](README.md) | [API.md](API.md) | [ARCHITECTURE.md](ARCHITECTURE.md) | [USER_MANUAL.md](USER_MANUAL.md)

---

## 1. System Topology & Architecture

GridSight operates on a high-availability, low-latency distributed topology designed to remain accessible during severe regional grid disturbances:

```
[ Citizen / Admin Browsers ] ── (HTTPS) ──▶ [ Next.js 15 Frontend / API Gateway ]
                                                 │
                                                 ├──▶ [ Upstash Redis (Sliding Rate Limits) ]
                                                 │
                                                 ├──▶ [ Supabase Auth (Session Cookies) ]
                                                 │
                                                 ├──▶ [ Supabase Storage (report-photos Bucket) ]
                                                 │
                                                 └──▶ [ Supabase PostgreSQL 15 + PostGIS ]
                                                                 ▲
                                                                 │ (Service Role)
                                                 [ Supabase Edge Functions (Deno Cron) ]
                                                       ├── cluster-reports
                                                       └── send-notifications ──▶ [ Web Push Services ]
```

---

## 2. Infrastructure & Account Prerequisites

Before initiating deployment, ensure the following infrastructure accounts and CLI tools are configured:

1. **Node.js Environment:** Node.js version `20.x` or `22.x` LTS, and `npm 10+`.
2. **Supabase Project:** A Supabase project instance with PostgreSQL 15+ and PostGIS enabled.
3. **Upstash Redis:** A serverless Redis database with REST API credentials (`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`).
4. **Hosting Platform:** Vercel, AWS Amplify, or a custom Docker/Kubernetes container host running Next.js.
5. **Supabase CLI:** Installed locally via `npm install -g supabase` or Homebrew/Scoop.
6. **Deno CLI:** Required for local testing or manual compilation of Edge Functions (`deno 1.40+`).

---

## 3. Environment Variable Configuration

Create `.env.local` for local development or configure Environment Secrets in your hosting dashboard (e.g., Vercel Project Settings):

| Variable Name | Exposure | Required In | Description & Example Value |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public (Client & Server) | All | Base HTTPS URL of your Supabase project (`https://<project-ref>.supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (Client & Server) | All | Anonymous public API key governed by PostgreSQL Row Level Security (RLS). |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret (Server Only) | Server & Edge | Elevated key with full database bypass privileges. Used for admin bootstrap and Edge daemons. |
| `UPSTASH_REDIS_REST_URL` | Secret (Server Only) | Production & Staging | REST URL endpoint for Upstash Redis rate limiting cluster. |
| `UPSTASH_REDIS_REST_TOKEN` | Secret (Server Only) | Production & Staging | Authentication bearer token for Upstash Redis REST calls. |
| `CLUSTER_CRON_SECRET` | Secret (Server & Edge) | Production & Staging | Cryptographically random secret protecting the `/functions/v1/cluster-reports` endpoint. |
| `PUSH_CRON_SECRET` | Secret (Server & Edge) | Production & Staging | Cryptographically random secret protecting the `/functions/v1/send-notifications` endpoint. |
| `VAPID_PUBLIC_KEY` | Public (Client & Server) | Production & Staging | NIST P-256 public key for Web Push protocol handshake. |
| `VAPID_PRIVATE_KEY` | Secret (Server & Edge) | Production & Staging | Private key for signing Web Push JWT tokens. |
| `VAPID_SUBJECT` | Public (Server & Edge) | Production & Staging | Contact mailto URI for push service identification (`mailto:admin@gridsight.ph`). |
| `NEXT_PUBLIC_APP_URL` | Public (Server Only) | Production & Staging | Canonical HTTPS URL of the application (`https://gridsight.ph`) used for auth redirects. |

---

## 4. Step-by-Step Deployment Procedure

### Phase 1: Database Provisioning & Migrations

Execute the 21 database migrations sequentially in the Supabase SQL Editor or via `supabase db push`.

1. **Verify PostGIS Extension:**
   Ensure PostGIS is activated in your Supabase database:
   ```sql
   create extension if not exists postgis with schema extensions;
   select postgis_full_version();
   ```

2. **Execute Core Migrations in Exact Order:**
   * `0001_gridsight.sql` — Base schemas, types, RLS policies, indexes, and storage buckets.
   * `0002_surigaocity_barangays.sql` — Schema alterations adding `area_type`, `psgc_code`, and `boundary` geometry to `public.areas`.
   * `0003_surigaocity_barangay_data_part_01.sql` through `0017_surigaocity_barangay_data_part_15.sql` — Official boundary polygons and centroids for all 54 Surigao City barangays.
   * `0018_push_delivery_queue.sql` — Web Push delivery queue table alterations and `claim_push_notifications` procedure.
   * `0019_admin_account_management.sql` — Administrator management functions, advisory locking, and `admin_account_audit` logging.
   * `0020_authenticated_outage_access.sql` — Enforces authentication checks on the `outages` table and `outage_map` view.
   * `0021_community_updates.sql` — Community bulletin table, category constraints, and staff correction notes.

3. **Verify Boundary Spatial Indexing:**
   ```sql
   select count(*) as total_barangays, 
          count(boundary) as polygons_loaded 
   from public.areas 
   where area_type = 'barangay';
   -- Expected output: total_barangays = 54, polygons_loaded = 54
   ```

---

### Phase 2: Storage Bucket Configuration

1. In the Supabase Dashboard, navigate to **Storage** $\to$ **Buckets**.
2. Verify that the bucket `report-photos` exists. If not, create it with the following configuration:
   * **Name:** `report-photos`
   * **Public:** `false` (Private bucket; downloads require signed URLs or authenticated RLS).
   * **File size limit:** `4194304` (4 MB).
   * **Allowed MIME types:** `image/jpeg, image/png, image/webp`.
3. Confirm that the storage RLS policies defined in migration `0001_gridsight.sql` are active:
   * `Users upload their own report photos` (`INSERT` scoped to folder `auth.uid()`).
   * `Users view their own report photos` (`SELECT` scoped to owner or verified `admin`).
   * `Users remove their own report photos` (`DELETE` scoped to owner or verified `admin`).

---

### Phase 3: Web Push (VAPID) Key Generation

Generate a cryptographically secure VAPID keypair for the Web Push protocol:

```bash
npx web-push generate-vapid-keys
```

Copy the generated keys into your environment settings:
* Public Key $\to$ `VAPID_PUBLIC_KEY`
* Private Key $\to$ `VAPID_PRIVATE_KEY`
* Subject $\to$ `VAPID_SUBJECT="mailto:admin@gridsight.ph"`

---

### Phase 4: Supabase Edge Functions Deployment

Deploy the two asynchronous Deno Edge Functions using the Supabase CLI:

1. **Authenticate Supabase CLI:**
   ```bash
   supabase login
   supabase link --project-ref <your-project-ref>
   ```

2. **Set Function Secrets:**
   ```bash
   supabase secrets set CLUSTER_CRON_SECRET="<random-uuid-or-secret>"
   supabase secrets set PUSH_CRON_SECRET="<random-uuid-or-secret>"
   supabase secrets set VAPID_PUBLIC_KEY="<your-vapid-public-key>"
   supabase secrets set VAPID_PRIVATE_KEY="<your-vapid-private-key>"
   supabase secrets set VAPID_SUBJECT="mailto:admin@gridsight.ph"
   ```

3. **Deploy Functions:**
   ```bash
   supabase functions deploy cluster-reports
   supabase functions deploy send-notifications
   ```

---

### Phase 5: Automated Cron Triggers Setup

The background clustering and push delivery daemons require periodic invocation. You can schedule them using **Supabase `pg_cron`** or an external scheduler (e.g., GitHub Actions, Vercel Cron, or Cloudflare Workers).

#### Option A: Supabase `pg_cron` (Recommended)
Execute the following SQL in your Supabase SQL Editor:

```sql
-- Enable pg_cron and pg_net extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Schedule report clustering every 2 minutes
select cron.schedule(
  'cluster-reports-job',
  '*/2 * * * *',
  $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/cluster-reports',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '<CLUSTER_CRON_SECRET>'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Schedule notification dispatch every 1 minute
select cron.schedule(
  'send-notifications-job',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/send-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '<PUSH_CRON_SECRET>'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

---

### Phase 6: Next.js Frontend Deployment

1. **Deploy to Vercel or Custom Node.js Server:**
   * Connect your GitHub repository to Vercel.
   * Add all environment variables listed in Section 3.
   * Set the build command to `npm run build` and output directory to `.next`.
2. **Configure Supabase Auth URL Configuration:**
   In the Supabase Dashboard under **Authentication** $\to$ **URL Configuration**:
   * **Site URL:** Set to your production canonical domain (e.g., `https://gridsight.ph`).
   * **Redirect URLs:** Add `https://gridsight.ph/auth/callback` and `https://gridsight.ph/login`.

---

### Phase 7: Initial Administrator Bootstrapping

Once the platform is deployed:

1. Visit `/register` on the production site, sign up with the designated municipal administrator email, and confirm the email address via the inbox verification link.
2. In a secure administrative shell, execute the bootstrap script:
   ```bash
   $env:NEXT_PUBLIC_SUPABASE_URL = "https://<project-ref>.supabase.co"
   $env:SUPABASE_SERVICE_ROLE_KEY = "<service-role-key>"
   npm run admin:bootstrap -- "admin@gridsight.ph" "City Dispatch Lead"
   Remove-Item Env:\SUPABASE_SERVICE_ROLE_KEY
   Remove-Item Env:\NEXT_PUBLIC_SUPABASE_URL
   ```
3. Sign in to `/admin` and scan the TOTP QR code with an authenticator app (e.g., Google Authenticator) to enable AAL2 Multi-Factor Authentication.

---

## 5. Routine Operations & Maintenance Runbook

### 5.1 PostGIS Spatial Index Tuning
Over time, as citizen reports accumulate, optimize spatial query performance:

```sql
-- Analyze query planner statistics
vacuum analyze public.reports;
vacuum analyze public.outages;
vacuum analyze public.areas;

-- Reindex spatial GIST trees
reindex index public.reports_location_gix;
reindex index public.areas_boundary_gix;
reindex index public.outages_center_gix;
```

### 5.2 Dead-Letter Push Notification Resolution
Notifications that fail delivery after 5 attempts are quarantined (`push_attempts >= 5`). To inspect stuck notifications:

```sql
select id, user_id, push_attempts, push_last_error, created_at 
from public.notifications 
where delivered_at is null and push_attempts >= 5
order by created_at desc;
```

### 5.3 Secret Rotation Procedure
* **Rotating `SUPABASE_SERVICE_ROLE_KEY`:** Generate a new key in the Supabase Dashboard, update Vercel environment variables, redeploy Edge Function secrets (`supabase secrets set`), and trigger a zero-downtime frontend redeploy.
* **Rotating VAPID Keys:** Generate new VAPID keys. Existing browser push subscriptions will require re-enrollment, so trigger a user prompt in `/notifications` following rotation.
