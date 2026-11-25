# GridSight API Documentation

This document provides a comprehensive reference for the GridSight REST APIs and Supabase Edge Functions. It covers authentication standards, rate limiting, request/response schemas, error handling, and example payloads.

---

## Table of Contents

1. [Architecture & Conventions](#1-architecture--conventions)
2. [Authentication & Authorization](#2-authentication--authorization)
3. [Rate Limiting & Input Protection](#3-rate-limiting--input-protection)
4. [Public & Community Endpoints](#4-public--community-endpoints)
   - [GET /api/outages](#get-apioutages)
   - [GET /api/areas/nearest](#get-apiareasnearest)
   - [GET /api/updates](#get-apiupdates)
   - [POST /api/reports](#post-apireports)
   - [GET /api/reports](#get-apireports)
   - [POST /api/push-subscription](#post-apipush-subscription)
   - [DELETE /api/push-subscription](#delete-apipush-subscription)
5. [Administrator Operations Endpoints](#5-administrator-operations-endpoints)
   - [GET /api/admin/accounts](#get-apiadminaccounts)
   - [POST /api/admin/accounts](#post-apiadminaccounts)
   - [POST /api/admin/mfa/reset](#post-apiadminmfareset)
   - [PATCH /api/admin/outages/[outageId]](#patch-apiadminoutagesoutageid)
   - [POST /api/admin/reports/[reportId]/actions](#post-apiadminreportsreportidactions)
   - [GET /api/admin/updates](#get-apiadminupdates)
   - [POST /api/admin/updates](#post-apiadminupdates)
   - [PATCH /api/admin/updates](#patch-apiadminupdates)
   - [GET /api/admin/export](#get-apiadminexport)
6. [Scheduled Supabase Edge Functions](#6-scheduled-supabase-edge-functions)
   - [POST /functions/v1/cluster-reports](#post-functionsv1cluster-reports)
   - [POST /functions/v1/send-notifications](#post-functionsv1send-notifications)
7. [Error Handling & Status Codes](#7-error-handling--status-codes)

---

## 1. Architecture & Conventions

- **Base URL (Next.js Application Routes)**: `https://<your-domain>/api` (or `http://localhost:3000/api` locally)
- **Base URL (Supabase Edge Functions)**: `https://<supabase-project-id>.supabase.co/functions/v1`
- **Default Payload Encoding**: `application/json` (UTF-8)
- **Form/File Uploads**: `multipart/form-data`
- **Export Data**: `text/csv; charset=utf-8` (with UTF-8 BOM `\uFEFF` for Excel compatibility)

---

## 2. Authentication & Authorization

GridSight relies on **Supabase Auth** session tokens managed via HTTP cookies (`createSupabaseServerClient` & Next.js `middleware.ts`).

### Roles & Access Levels

| Level | Role / Requirement | Description |
| :--- | :--- | :--- |
| **Public** | None | Read-only public broadcasts and system health checks. |
| **Authenticated** | `user` or `admin` | Requires an active Supabase user session with confirmed email. |
| **Administrator** | `admin` + `AAL2` MFA | Requires `profiles.role = 'admin'` **and** an active Authenticator Assurance Level 2 (`aal2`) TOTP session. |
| **Cron / Internal** | `x-cron-secret` | High-entropy shared secret header for scheduled background functions. |

---

## 3. Rate Limiting & Input Protection

1. **Upstash Sliding Window Rate Limiting**:
   - `POST /api/reports`: Limited to 6 submissions per hour per user ID.
   - `POST /api/admin/accounts`: Limited to 5 requests per minute per administrator ID.
2. **Database Cooldown & Validation**:
   - 5-minute cooldown per user per barangay to prevent duplicate incident spam.
   - PostGIS spatial validation (`find_barangay_at_location`): Reports with GPS pins outside the selected barangay polygon are rejected.
3. **File Upload Caps**:
   - Maximum request payload size: 4.5 MB.
   - Maximum photo size: 4.0 MB.
   - Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`. Magic byte signatures are inspected before persistence to prevent MIME spoofing.
4. **CSV Injection Mitigation**:
   - Exported spreadsheet cells beginning with `=`, `+`, `-`, or `@` are prefixed with `'` to mitigate formula injection in Excel/Calc.

---

## 4. Public & Community Endpoints

### `GET /api/outages`
Retrieves clustered outage incidents across Surigao City's 54 barangays for the live outage map.

- **Access Level**: Authenticated User
- **Cache**: `private, no-store`

#### Response (`200 OK`)
```json
{
  "outages": [
    {
      "id": "b3e944b2-29ec-4581-81f1-0da765e929f0",
      "area_id": "76ba18eb-d7cf-4530-9b4e-d67b2ff92453",
      "area_name": "Luna",
      "city": "Surigao City",
      "province": "Surigao del Norte",
      "area_type": "barangay",
      "psgc_code": "166724028",
      "status": "active",
      "report_count": 4,
      "latitude": 9.7781,
      "longitude": 125.4912,
      "first_reported_at": "2026-11-25T07:15:00.000Z",
      "restored_at": null
    }
  ]
}
```

---

### `GET /api/areas/nearest`
Performs reverse geocoding against Surigao City's stored PostGIS barangay polygons.

- **Access Level**: Authenticated User
- **Query Parameters**:
  - `latitude` (required, float between `-90` and `90`)
  - `longitude` (required, float between `-180` and `180`)

#### Example Request
```http
GET /api/areas/nearest?latitude=9.7892&longitude=125.4921 HTTP/1.1
```

#### Response (`200 OK`)
```json
{
  "area": {
    "id": "97e68fa7-9a60-449e-bc43-2df7bbd8caef",
    "name": "Washington",
    "slug": "washington",
    "city": "Surigao City",
    "province": "Surigao del Norte",
    "psgc_code": "166724052"
  }
}
```

---

### `GET /api/updates`
Returns published community power advisories, maintenance schedules, and restoration notices.

- **Access Level**: Public
- **Cache**: Dynamic (`force-dynamic`)

#### Response (`200 OK`)
```json
{
  "updates": [
    {
      "id": "f5c2e174-da48-4389-9832-68252277bbfa",
      "title": "Substation 2 Maintenance Complete",
      "message": "Power restored across San Juan following preventive switchgear replacement.",
      "category": "power_restored",
      "audience": "San Juan",
      "outage_id": "b3e944b2-29ec-4581-81f1-0da765e929f0",
      "estimated_time": null,
      "next_update_time": null,
      "state": "published",
      "correction_note": null,
      "author_name": "City Operations Desk",
      "author_role": "City Staff",
      "published_at": "2026-11-25T06:30:00.000Z"
    }
  ]
}
```

---

### `POST /api/reports`
Submits an outage observation. Supports offline idempotency keys and photo attachments.

- **Access Level**: Authenticated User
- **Content-Type**: `multipart/form-data`
- **Fields**:
  - `areaSlug` (string, required): Slug of the Surigao City barangay.
  - `status` (string, required): `"no_power"` | `"flickering"` | `"restored"`.
  - `notes` (string, optional): Resident notes (max 500 characters).
  - `latitude` (float, optional): User GPS latitude.
  - `longitude` (float, optional): User GPS longitude.
  - `requestId` (UUID/string, optional): Idempotency key from offline IndexedDB queue.
  - `photo` (binary file, optional): JPEG/PNG/WebP image $\le 4\text{ MB}$.

#### Response (`201 Created`)
```json
{
  "reportId": "d38a3297-cbf6-4ec8-a14a-7bc9bdf9e28e",
  "message": "Report received."
}
```

---

### `GET /api/reports`
Lists all outage submissions created by the currently authenticated user.

- **Access Level**: Authenticated User
- **Cache**: `private, no-store`

#### Response (`200 OK`)
```json
{
  "reports": [
    {
      "id": "d38a3297-cbf6-4ec8-a14a-7bc9bdf9e28e",
      "area_id": "76ba18eb-d7cf-4530-9b4e-d67b2ff92453",
      "outage_id": "b3e944b2-29ec-4581-81f1-0da765e929f0",
      "status": "no_power",
      "verification_status": "pending",
      "notes": "Transformer buzz followed by total outage in Purok 3.",
      "photo_path": "usr-123/d38a3297-cbf6-4ec8-a14a-7bc9bdf9e28e.jpg",
      "created_at": "2026-11-25T07:10:00.000Z",
      "areas": {
        "name": "Luna",
        "city": "Surigao City"
      }
    }
  ]
}
```

---

### `POST /api/push-subscription`
Registers or updates a browser Web Push subscription for outage alerts.

- **Access Level**: Authenticated User
- **Body**:
  ```json
  {
    "endpoint": "https://fcm.googleapis.com/fcm/send/...",
    "keys": {
      "p256dh": "BNcRdreALRFXTkOOUHK1TGE...",
      "auth": "tBHItDaQL..."
    }
  }
  ```

#### Response (`200 OK`)
```json
{ "ok": true }
```

---

### `DELETE /api/push-subscription`
Removes a Web Push subscription endpoint.

- **Access Level**: Authenticated User
- **Query Parameter**: `endpoint` (URL-encoded push subscription URL)

#### Response (`200 OK`)
```json
{ "ok": true }
```

---

## 5. Administrator Operations Endpoints

> [!IMPORTANT]
> All `/api/admin/*` endpoints strictly enforce:
> 1. Valid user profile with `role = 'admin'`
> 2. Confirmed user email address
> 3. Multi-Factor Authentication session with Authenticator Assurance Level 2 (`AAL2`)

---

### `GET /api/admin/accounts`
Returns registered accounts and the immutable role-management audit history.

- **Access Level**: Administrator (AAL2)
- **Response (`200 OK`)**:
  ```json
  {
    "profiles": [
      {
        "id": "a9887ec7-c208-417f-a0e2-63b7d158d609",
        "name": "City Dispatch Lead",
        "email": "dispatch@surigaocity.gov.ph",
        "role": "admin",
        "created_at": "2026-10-15T08:00:00.000Z"
      }
    ],
    "audit": [
      {
        "id": 14,
        "actor_id": "a9887ec7-c208-417f-a0e2-63b7d158d609",
        "actor_label": "City Dispatch Lead",
        "target_id": "893c5d6e-99e2-4113-bd77-22f3603c405a",
        "action": "promoted_to_admin",
        "created_at": "2026-11-20T14:22:00.000Z"
      }
    ]
  }
  ```

---

### `POST /api/admin/accounts`
Invites staff or updates user roles transactionally.

- **Access Level**: Administrator (AAL2)
- **Actions Supported**:
  1. **Invite Staff**:
     ```json
     {
       "action": "invite",
       "email": "staff@surigaocity.gov.ph"
     }
     ```
  2. **Promote Account**:
     ```json
     {
       "action": "promote",
       "userId": "893c5d6e-99e2-4113-bd77-22f3603c405a"
     }
     ```
  3. **Demote Account** (Guards against demoting the last administrator):
     ```json
     {
       "action": "demote",
       "userId": "893c5d6e-99e2-4113-bd77-22f3603c405a"
     }
     ```

#### Response (`200 OK`)
```json
{
  "ok": true,
  "message": "Account role updated."
}
```

---

### `POST /api/admin/mfa/reset`
Removes existing or duplicate TOTP factors using the server service role, allowing an administrator to enroll a fresh authenticator app.

- **Access Level**: Administrator (Requires confirmed admin email)
- **Response (`200 OK`)**:
  ```json
  {
    "ok": true,
    "deletedCount": 1,
    "message": "All existing MFA factors cleared. You can now enroll a fresh authenticator."
  }
  ```

---

### `PATCH /api/admin/outages/[outageId]`
Overrides the status of an outage cluster. Setting status to `"restored"` automatically notifies followed residents.

- **Access Level**: Administrator (AAL2)
- **URL Parameter**: `outageId` (UUID)
- **Body**:
  ```json
  {
    "status": "active"
  }
  ```
  *(Allowed values: `"unconfirmed"`, `"active"`, `"restored"`)*

#### Response (`200 OK`)
```json
{ "ok": true }
```

---

### `POST /api/admin/reports/[reportId]/actions`
Moderates and triages an incoming community observation report.

- **Access Level**: Administrator (AAL2)
- **URL Parameter**: `reportId` (UUID)
- **Body**:
  ```json
  {
    "action": "verified",
    "reason": "Confirmed with Surigao City line patrol crew."
  }
  ```
  *(Allowed actions: `"verified"`, `"dismissed"`)*

#### Response (`200 OK`)
```json
{ "ok": true }
```

---

### `GET /api/admin/updates`
Returns all community updates, including drafts, active notices, and withdrawn broadcasts.

- **Access Level**: Administrator (AAL2)

---

### `POST /api/admin/updates`
Publishes an official city advisory to the community feed.

- **Access Level**: Administrator (AAL2)
- **Body**:
  ```json
  {
    "title": "Emergency line inspection along Rizal St.",
    "message": "Field crews are isolating a fallen branch near transformer #14.",
    "category": "investigation",
    "audience": "Washington",
    "outageId": "b3e944b2-29ec-4581-81f1-0da765e929f0",
    "estimatedTime": "18:30",
    "nextUpdateTime": "17:45"
  }
  ```

#### Response (`201 Created`)
```json
{
  "ok": true,
  "update": { "id": "...", "state": "published", "title": "..." }
}
```

---

### `PATCH /api/admin/updates`
Withdraws an advisory from the public feed with an audited correction note.

- **Access Level**: Administrator (AAL2)
- **Body**:
  ```json
  {
    "updateId": "f5c2e174-da48-4389-9832-68252277bbfa",
    "reason": "Duplicate notice superseded by feeder advisory #41."
  }
  ```

#### Response (`200 OK`)
```json
{ "ok": true, "update": { "state": "withdrawn", "correction_note": "..." } }
```

---

### `GET /api/admin/export`
Exports community reports and outage cluster details in CSV format.

- **Access Level**: Administrator (AAL2)
- **Query Parameters**:
  - `from` (optional, `YYYY-MM-DD`, defaults to 30 days ago)
  - `to` (optional, `YYYY-MM-DD`, defaults to current timestamp)
- **Response**: CSV file download (`Content-Type: text/csv; charset=utf-8`)

---

## 6. Scheduled Supabase Edge Functions

These functions run in Deno on Supabase Edge and are invoked by cron workers or database webhooks.

### `POST /functions/v1/cluster-reports`
Triggers the spatial DBSCAN clustering algorithm (`cluster_recent_reports`) to evaluate unclustered reports and form or update outage incidents.

- **Headers**: `x-cron-secret: <CLUSTER_CRON_SECRET>`
- **Response (`200 OK`)**:
  ```json
  {
    "reportsClustered": 8
  }
  ```

---

### `POST /functions/v1/send-notifications`
Claims pending notifications from `public.notifications` using row-level locking and dispatches VAPID Web Push payloads with retry backoff.

- **Headers**: `x-cron-secret: <PUSH_CRON_SECRET>`
- **Response (`200 OK`)**:
  ```json
  {
    "notificationsDelivered": 12
  }
  ```

---

## 7. Error Handling & Status Codes

All GridSight JSON endpoints emit standardized error payloads:

```json
{
  "error": "Human-readable explanation of failure",
  "details": {}
}
```

### Standard Status Codes

| HTTP Status | Meaning | Common Cause |
| :--- | :--- | :--- |
| `200 OK` | Success | Request succeeded. |
| `201 Created` | Created | Resource successfully created (report submitted, update published). |
| `400 Bad Request` | Validation Error | Missing parameters, coordinates outside boundary, invalid UUID. |
| `401 Unauthorized` | Not Signed In | User session cookie missing or expired. |
| `403 Forbidden` | Access Denied | Requires unverified admin role or missing AAL2 MFA claim. |
| `404 Not Found` | Not Found | Coordinate outside Surigao City or invalid entity ID. |
| `413 Payload Too Large` | Limit Exceeded | Photo exceeds 4 MB or request body exceeds 4.5 MB. |
| `429 Too Many Requests`| Rate Limited | Upstash threshold reached or area cooldown active. |
| `500 Server Error` | Database/Internal | Unexpected query or storage failure. |
| `503 Unavailable` | Config Missing | Missing Supabase or service environment variables. |
