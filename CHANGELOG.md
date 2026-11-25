# Changelog

All notable changes to the **GridSight** platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-11-25

### Added
* **Official User Manual:** Comprehensive guide in [`USER_MANUAL.md`](USER_MANUAL.md) detailing citizen reporting, offline caching, PWA installation, and administrative dispatch workflows.
* **Architecture & Design Documentation:** Complete system architecture specification in [`ARCHITECTURE.md`](ARCHITECTURE.md) with C4 Context and Container diagrams, Mermaid ERDs, sequence flows, and threat models.
* **REST API Documentation:** Formal endpoint catalog in [`API.md`](API.md) specifying schemas, authentication levels, Upstash rate limits, and error codes.
* **Full Codebase Documentation:** 100% coverage of TSDoc and JSDoc docblocks across all 11 API route handlers, core libraries (`admin-auth.ts`, `server.ts`, `browser.ts`, `offline-queue.ts`), components, Supabase Edge Functions, and the PWA Service Worker.
* **Adaptive Mobile UI:** Mobile-specific ergonomic components (`MobileHeader`, `MobileBottomNav`, `MobileReportFab`) providing native-feel bottom navigation and 1-tap reporting while preserving the desktop layout.
* **Mobile Admin Workspace:** Segmented touch switcher (`Queue`, `Outages`, `Trends`), 2x2 metric cards, and 44px+ touch targets on `/admin`, `/admin/updates`, and `/admin/accounts`.

### Changed
* **Subpage Mobile Headers:** Decluttered and added generous spacing to mobile headers on `/reports`, `/notifications`, and `/account`, eliminating crowded wrapping and providing clean back-to-map navigation.
* **Report Filtering:** Switched report history tab counts and filtering to reactive client-side state for instantaneous tab switching without server latency.

### Fixed
* **Admin Header Theme Contrast:** Resolved theme desynchronization where the admin header remained dark regardless of the theme switcher state.
* **Duplicate Server Imports:** Cleaned up duplicate `NextResponse` import in `src/lib/supabase/admin-auth.ts`.

---

## [0.5.0] - 2026-11-15

### Added
* **Community Updates System:**
  * Citizen bulletin feed displaying official utility announcements, categories, estimated restoration times (ETR), and next update schedules.
  * Administrative publishing desk on `/admin/updates` for drafting city advisories.
  * Retraction workflow requiring transparent correction notes (`correction_note`) for withdrawn bulletins.
* **MFA Recovery & Reset Flow:** Dedicated service-role endpoint (`POST /api/admin/mfa/reset`) allowing administrators to wipe corrupt or duplicate TOTP factors and perform clean re-enrollment.
* **Web Push Unsubscription & iOS PWA Guidance:** Support for browser push unregistration (`DELETE /api/push-subscription`) and user guidance for iOS 16.4+ standalone Home Screen apps.

### Changed
* **Admin Operations Workspace:** Complete visual overhaul of the admin dashboard to match the Base44 Operations Workspace specification.
* **Persistent Sessions:** Configured 30-day durable `maxAge` on Supabase authentication cookies (`authCookieOptions`) to prevent mobile Safari and Chrome from dropping sessions on device power-offs.

### Fixed
* **MFA Factor Matching:** Improved challenge verification logic to correctly target enrolled TOTP factors.
* **Migration Idempotency:** Updated `0021_community_updates.sql` to cleanly drop stale table definitions prior to schema creation.

---

## [0.4.0] - 2026-11-13

### Security
* **Protected Section Authentication Gate:** Enforced mandatory authentication for `/api/outages`, the live interactive map view, and citizen report history via migration `0020_authenticated_outage_access.sql`.
* **MFA Enforcement for Administrative Actions:** Requiring Authenticator Assurance Level 2 (AAL2) TOTP verification before accepting any moderation actions, role modifications, or bulletin updates.

### Added
* **Dark/Light Mode Harmonization:** Synchronized theme toggle controls across the public landing page, interactive map, admin desk, and account management views.
* **Phone Authenticator Support:** Mobile-friendly TOTP QR code display and secret key copying in the MFA verification dialog.

### Fixed
* **Mobile MFA Layout:** Corrected modal viewport scaling and Leaflet map touch responsiveness on small screens.
* **Notification Contrast:** Fixed low-contrast text on unread notification badges in light mode.

---

## [0.3.0] - 2026-11-09

### Added
* **Administrative Account Management (`/admin/accounts`):**
  * Staff invitation flow using Supabase Auth Admin Service Role API.
  * Role promotion (`user` $\to$ `admin`) requiring confirmed email addresses.
  * Role demotion (`admin` $\to$ `user`) protected by PostgreSQL advisory transaction locks (`pg_advisory_xact_lock(77123, 1)`) to guarantee the last administrator cannot be demoted.
  * Tamper-evident administrative audit log (`admin_account_audit`) tracking all privilege mutations.

### Security
* **SSRF Push Origin Whitelisting:** Restricted push subscription endpoints to verified browser vendors (`fcm.googleapis.com`, `updates.push.services.mozilla.com`, `web.push.apple.com`, `notify.windows.com`).
* **CSV Formula Injection Sanitization:** Escaped formula injection characters (`=`, `+`, `-`, `@`) in administrative CSV export streams.

---

## [0.2.0] - 2026-11-08

### Added
* **Base44 Design System Migration:** Rebuilt all primary views (`/`, `/login`, `/register`, `/reports`, `/notifications`, `/account`) using the modern Base44 civic design aesthetic.
* **Offline-First Synchronization:**
  * Client IndexedDB storage (`gridsight-offline`) for saving outage reports and photo Blobs during network drops.
  * Automatic retry engine that drains the offline queue upon reconnection.
* **Distributed Rate Limiting:** Integrated Upstash Redis sliding-window limiters on report submissions (6/hr per user).
* **Progressive Web App (PWA):** Service worker (`public/sw.js`) enabling offline app shell caching and Web Push event handling.

### Fixed
* **Light Mode Contrast:** Resolved invisible text and low-contrast borders across reports cards and the landing footer in light mode.

---

## [0.1.0] - 2026-11-01

### Added
* **Surigao City Geographic Baseline:**
  * Complete 54-barangay geodatabase covering mainland urban, rural, coastal, and island territories (Nonoc, Hikdop, Hanigad, Sibale).
  * PostGIS spatial boundaries and centroids mapped to official Philippine Standard Geographic Codes (PSGC).
  * Boundary validation function (`extensions.st_covers`) rejecting GPS pins outside the selected barangay.
* **Core Interactive Map:** Leaflet / React Leaflet map with 3-tier status visualization (`unconfirmed`, `active`, `restored`).
* **Initial Backend Schema:** Supabase PostgreSQL database tables (`areas`, `outages`, `reports`, `profiles`, `user_areas`, `notifications`) with Row Level Security (RLS).
* **Automated Clustering:** Procedure (`cluster_recent_reports`) grouping nearby spatial reports into cohesive outage incidents.
