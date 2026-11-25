# GridSight — Code Comments, Docblocks & Interface Documentation

> **System Version:** 1.0.0  
> **Documentation Standard:** TSDoc / JSDoc / OpenSource TypeScript Conventions  
> **Related Documentation:** [README.md](README.md) | [API.md](API.md) | [ARCHITECTURE.md](ARCHITECTURE.md) | [USER_MANUAL.md](USER_MANUAL.md) | [DEPLOYMENT_AND_OPERATIONS.md](DEPLOYMENT_AND_OPERATIONS.md)

---

## 1. Documentation Philosophy & Annotation Standards

GridSight enforces comprehensive **TSDoc** and **JSDoc** standards across all TypeScript and JavaScript files. The goal is to provide complete type safety, self-documenting APIs, and audit clarity for municipal and security audits.

### Standard TSDoc Tags Enforced:
* `@remarks` — In-depth architectural context, algorithm specifics, and operational workflows.
* `@security` — Explicit security level, authentication constraints, and role requirements:
  * `Anonymous / Public` — Accessible without credentials.
  * `Authenticated Citizen` — Requires active Supabase user session cookie.
  * `Admin (Standard / AAL1)` — Requires confirmed email and `profiles.role = 'admin'`.
  * `Admin (Elevated / AAL2 TOTP)` — Requires active Authenticator Assurance Level 2 TOTP verification.
* `@param` — Explicit typing, constraints, and descriptions for all function parameters.
* `@returns` — Expected return types, HTTP response status codes, and JSON payload contracts.
* `@throws` — Explanations of thrown errors, network aborts, or bounds exceptions.

---

## 2. API Route Handlers Reference (`src/app/api/`)

GridSight routes are organized into public citizen endpoints and protected administrative endpoints.

### 2.1 Public & Citizen API Routes

| Endpoint File | HTTP Method | Security Level | Core Responsibilities & TSDoc Summary |
| :--- | :--- | :--- | :--- |
| [`src/app/api/outages/route.ts`](file:///c:/Users/kirby/Desktop/GridSight/src/app/api/outages/route.ts) | `GET` | Authenticated | Queries `outage_map` view for barangay incidents. Filters for `active`, `unconfirmed`, or outages `restored` within the last 24 hours. |
| [`src/app/api/areas/nearest/route.ts`](file:///c:/Users/kirby/Desktop/GridSight/src/app/api/areas/nearest/route.ts) | `GET` | Authenticated | Calculates haversine centroid distances against Surigao City barangays. Rejects coordinates beyond 15 km threshold. |
| [`src/app/api/updates/route.ts`](file:///c:/Users/kirby/Desktop/GridSight/src/app/api/updates/route.ts) | `GET` | Public / Anon | Returns published community bulletins (`state = 'published'`), supporting category and audience query filtering. |
| [`src/app/api/reports/route.ts`](file:///c:/Users/kirby/Desktop/GridSight/src/app/api/reports/route.ts) | `POST` | Authenticated | Ingests citizen reports with bounded streams (4.5 MB), binary magic-byte checks, Upstash rate limiting (6/hr), PostGIS boundary validation (`st_covers`), and photo uploads. |
| [`src/app/api/reports/route.ts`](file:///c:/Users/kirby/Desktop/GridSight/src/app/api/reports/route.ts) | `GET` | Authenticated | Retrieves the authenticated citizen's personal report history ordered by timestamp descending (limit 100). |
| [`src/app/api/push-subscription/route.ts`](file:///c:/Users/kirby/Desktop/GridSight/src/app/api/push-subscription/route.ts) | `POST` | Authenticated | Validates Web Push subscription payloads against whitelisted browser endpoints (`fcm`, `apple`, `mozilla`, `windows`) and upserts into `push_subscriptions`. |
| [`src/app/api/push-subscription/route.ts`](file:///c:/Users/kirby/Desktop/GridSight/src/app/api/push-subscription/route.ts) | `DELETE` | Authenticated | Deletes an active Web Push subscription matching the authenticated `user_id` and `endpoint`. |

---

### 2.2 Administrative API Routes (`src/app/api/admin/`)

| Endpoint File | HTTP Method | Security Level | Core Responsibilities & TSDoc Summary |
| :--- | :--- | :--- | :--- |
| [`src/app/api/admin/accounts/route.ts`](file:///c:/Users/kirby/Desktop/GridSight/src/app/api/admin/accounts/route.ts) | `GET` | Admin (AAL2) | Loads staff profiles and the 100 most recent account action audit events from `admin_account_audit`. |
| [`src/app/api/admin/accounts/route.ts`](file:///c:/Users/kirby/Desktop/GridSight/src/app/api/admin/accounts/route.ts) | `POST` | Admin (AAL2) | Executes `invite` (via Supabase Auth Admin API), `promote`, or `demote` actions with PostgreSQL advisory locks. |
| [`src/app/api/admin/export/route.ts`](file:///c:/Users/kirby/Desktop/GridSight/src/app/api/admin/export/route.ts) | `GET` | Admin (AAL2) | Streams UTF-8 CSV exports with Excel Byte Order Mark (`\uFEFF`) and neutralizes formula injection triggers (`=`, `+`, `-`, `@`). |
| [`src/app/api/admin/mfa/reset/route.ts`](file:///c:/Users/kirby/Desktop/GridSight/src/app/api/admin/mfa/reset/route.ts) | `POST` | Admin | Clears stale or duplicate TOTP factors via Supabase Auth Admin Service Role API to enable clean re-enrollment. |
| [`src/app/api/admin/outages/[outageId]/route.ts`](file:///c:/Users/kirby/Desktop/GridSight/src/app/api/admin/outages/[outageId]/route.ts) | `PATCH` | Admin (AAL2) | Manually updates incident status (`unconfirmed`, `active`, `restored`). Dispatches notifications to followers on restoration. |
| [`src/app/api/admin/reports/[reportId]/actions/route.ts`](file:///c:/Users/kirby/Desktop/GridSight/src/app/api/admin/reports/[reportId]/actions/route.ts) | `POST` | Admin (AAL2) | Calls PostgreSQL procedure `moderate_report` (`verified` or `dismissed`) with mandatory audit reason logging. |
| [`src/app/api/admin/updates/route.ts`](file:///c:/Users/kirby/Desktop/GridSight/src/app/api/admin/updates/route.ts) | `GET` | Admin (AAL2) | Retrieves all community bulletins including archived and withdrawn records. |
| [`src/app/api/admin/updates/route.ts`](file:///c:/Users/kirby/Desktop/GridSight/src/app/api/admin/updates/route.ts) | `POST` | Admin (AAL2) | Publishes official utility restoration advisories with category, audience, and estimated restoration times. |
| [`src/app/api/admin/updates/route.ts`](file:///c:/Users/kirby/Desktop/GridSight/src/app/api/admin/updates/route.ts) | `PATCH` | Admin (AAL2) | Retracts/withdraws a published advisory, appending an auditable correction note (`correction_note`). |

---

## 3. Core Libraries & Spatial Utilities Reference (`src/lib/`)

### 3.1 Authentication & Database Context
* **`src/lib/supabase/admin-auth.ts`:**
  * `requireAdmin(supabase)`: Enforces the 4-step security gate:
    1. Active session via `supabase.auth.getUser()`.
    2. Confirmed user email address (`email_confirmed_at`).
    3. Verified `admin` role in public `profiles`.
    4. Authenticator Assurance Level 2 (`aal2`) TOTP challenge completion.
* **`src/lib/supabase/server.ts`:**
  * `createSupabaseServerClient()`: Asynchronous server client reading Next.js request cookies with 30-day persistent max-age options.
* **`src/lib/supabase/browser.ts`:**
  * `createSupabaseBrowserClient()`: Singleton client for interactive React components.
* **`src/lib/supabase/cookie-options.ts`:**
  * `AUTH_COOKIE_MAX_AGE`: 30-day cookie lifespan preventing session drops on mobile browser restarts.

### 3.2 Offline Storage & Spatial Mapping
* **`src/lib/offline-queue.ts`:**
  * `QueuedReport`: Type definition representing an offline observation including raw image `Blob`.
  * `queueReport(report)`: Writes report into client IndexedDB (`gridsight-offline`).
  * `getQueuedReports()`: Reads pending reports for background retry synchronization.
  * `removeQueuedReport(requestId)`: Purges synchronized items.
* **`src/lib/surigao-city-barangays.ts`:**
  * `SURIGAO_CITY_BARANGAYS`: Registry of 54 official Surigao City barangays with WGS84 centroids and PSGC identifiers.
* **`src/lib/validation/report.ts`:**
  * `reportInputSchema`: Zod schema validating slug format, power status enum, coordinate bounds, and mutual lat/lng presence.
* **`src/lib/auth/return-path.mjs`:**
  * `safeReturnPath(value)`: Open-redirect sanitization rejecting scheme-relative URLs (`//`) and backslashes (`\`).

---

## 4. Component Interfaces & Navigation Architecture

### 4.1 Mobile-First Components (`src/components/preview/mobile/`)
* **`MobileHeader` (`mobile-header.tsx`):**
  * `MobileHeaderProps`: `{ user, unreadCount, onSignOut }`.
  * Sticky top bar with brand badge, pulse status dot, theme toggle, unread notification counter, and profile bottom sheet.
* **`MobileBottomNav` (`mobile-bottom-nav.tsx`):**
  * `MobileBottomNavProps`: `{ currentTab, onSelectTab, isAdmin }`.
  * Fixed bottom navigation bar with 44px+ touch targets and hardware home bar padding (`env(safe-area-inset-bottom)`).
* **`MobileReportFab` (`mobile-report-fab.tsx`):**
  * `MobileReportFabProps`: `{ onClick }`.
  * Dedicated 1-tap reporting floating action button anchored above the bottom navigation bar.

### 4.2 Desktop & Admin Components
* **`PreviewNav` (`src/components/preview/preview-nav.tsx`):**
  * Responsive navigation controller rendering full desktop header on `md:` screens and delegating to mobile components on small screens.
* **`AdminHeader` (`src/components/admin/admin-header.tsx`):**
  * Top navigation header for administrative desks (`desk`, `updates`, `accounts`).
* **`AdminMfaModal` (`src/components/admin/admin-mfa-modal.tsx`):**
  * Security modal managing TOTP QR code display, enrollment verification, and factor reset actions.

---

## 5. Edge Functions & Service Worker Reference

### 5.1 Supabase Edge Functions (`supabase/functions/`)
* **`cluster-reports/index.ts`:**
  * Edge cron daemon protected by `x-cron-secret`. Calls `cluster_recent_reports()` to aggregate unclustered reports within sliding spatial and temporal windows.
* **`send-notifications/index.ts`:**
  * Web Push delivery worker. Claims queued alerts with `claim_push_notifications`, signs payloads with VAPID crypto keys, dispatches to browser push servers, and deletes expired 404/410 subscriptions.

### 5.2 Progressive Web App Service Worker (`public/sw.js`)
* **`install` event:** Caches core application shell (`/`) and immediately activates with `skipWaiting()`.
* **`activate` event:** Cleans up deprecated cache generations and claims active clients.
* **`fetch` event:** Network-first for navigation requests with offline shell fallback; cache-first for static scripts, fonts, and stylesheets.
* **`push` & `notificationclick` events:** Parses incoming Web Push payloads, displays native system notifications, and focuses the target URL when clicked.

---

## 6. PostgreSQL Procedures & PostGIS Functions Reference

| Function / Procedure | Security Mode | Description |
| :--- | :--- | :--- |
| `submit_outage_report` | `SECURITY DEFINER` | Validates geographic containment with `st_covers`, enforces per-user hourly limits and barangay cooldowns, and inserts reports within an ACID transaction. |
| `cluster_recent_reports` | `SECURITY DEFINER` | Groups reports from the last 15 minutes into parent outage incidents using spatial distance thresholds. |
| `moderate_report` | `SECURITY DEFINER` | Atomically transitions report review status (`verified` or `dismissed`) and re-tallies outage incident metrics. |
| `admin_set_account_role` | `SECURITY DEFINER` | Manages promotions and demotions under `pg_advisory_xact_lock`, ensuring at least one confirmed administrator remains active. |
| `claim_push_notifications`| `SECURITY DEFINER` | Claims queued notifications in batches of up to 100 using `FOR UPDATE SKIP LOCKED`. |
| `finish_push_notification`| `SECURITY DEFINER` | Updates delivery timestamps, increments retry attempts, and logs delivery error reasons. |
