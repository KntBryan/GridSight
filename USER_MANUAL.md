# GridSight — Official User Manual & Operational Guide

> **Applicable Pilot Area:** City of Surigao, Surigao del Norte, Philippines (54 Barangays)  
> **System Release:** 1.0.0  
> **Target Audience:** Surigao City Residents, Utility Field Coordinators, City Dispatchers, and Municipal Administrators.  
> **Related Documentation:** [README.md](README.md) | [API.md](API.md) | [ARCHITECTURE.md](ARCHITECTURE.md)

---

## Table of Contents

1. [Introduction to GridSight](#1-introduction-to-gridsight)
2. [Citizen Guide: Monitoring & Reporting Outages](#2-citizen-guide-monitoring--reporting-outages)
   - [2.1 Accessing GridSight & Installing the Mobile App (PWA)](#21-accessing-gridsight--installing-the-mobile-app-pwa)
   - [2.2 Account Creation & Sign-In](#22-account-creation--sign-in)
   - [2.3 Navigating the Live Outage Map](#23-navigating-the-live-outage-map)
   - [2.4 Submitting an Outage Report](#24-submitting-an-outage-report)
   - [2.5 Offline Reporting & Automatic Synchronization](#25-offline-reporting--automatic-synchronization)
   - [2.6 Tracking Your Report History](#26-tracking-your-report-history)
   - [2.7 Managing Notifications & Followed Barangays](#27-managing-notifications--followed-barangays)
   - [2.8 Reading Official Community Bulletins](#28-reading-official-community-bulletins)
3. [Administrator & Dispatcher Manual](#3-administrator--dispatcher-manual)
   - [3.1 Accessing the Admin Workspace](#31-accessing-the-admin-workspace)
   - [3.2 Multi-Factor Authentication (MFA) Setup & Verification](#32-multi-factor-authentication-mfa-setup--verification)
   - [3.3 Incident Moderation Desk (Verifying & Dismissing Reports)](#33-incident-moderation-desk-verifying--dismissing-reports)
   - [3.4 Overriding Outage Incident Status](#34-overriding-outage-incident-status)
   - [3.5 Publishing & Retracting Official Community Advisories](#35-publishing--retracting-official-community-advisories)
   - [3.6 Exporting Outage Data (CSV Reports)](#36-exporting-outage-data-csv-reports)
   - [3.7 Staff & Account Management (Invites, Promotions, Demotions)](#37-staff--account-management-invites-promotions-demotions)
   - [3.8 Inspecting the Administrative Audit Log](#38-inspecting-the-administrative-audit-log)
4. [Troubleshooting & Frequently Asked Questions (FAQ)](#4-troubleshooting--frequently-asked-questions-faq)

---

## 1. Introduction to GridSight

GridSight is a civic telemetry and outage intelligence system designed specifically for the **City of Surigao**. When severe weather, grid disturbances, or scheduled maintenance cause power failures, GridSight enables citizens to submit real-time observations and empowers municipal dispatchers to coordinate restoration efforts with spatial precision.

### Key Capabilities
* **Interactive Live Map:** Real-time visibility into blackouts and brownouts across all 54 mainland and island barangays.
* **Geofenced Validation:** GPS coordinates are verified against official Surigao City barangay boundaries to guarantee accuracy and prevent false reports.
* **Offline Resilience:** Submit reports even during severe cellular disruption; GridSight stores them safely on your device and uploads them when your signal returns.
* **Community Alerts:** Instant Web Push and in-app notifications whenever power status changes in your home or workplace barangay.

---

## 2. Citizen Guide: Monitoring & Reporting Outages

### 2.1 Accessing GridSight & Installing the Mobile App (PWA)

GridSight runs directly in modern web browsers (Chrome, Safari, Edge, Firefox) on smartphones, tablets, and desktop computers.

#### Installing on Android (Google Chrome)
1. Navigate to the GridSight portal URL in Chrome.
2. A prompt banner will appear at the bottom: **"Add GridSight to Home screen"**. Tap it.
3. If no prompt appears, tap the **three dots menu (⋮)** in the top-right corner of Chrome.
4. Select **"Install app"** or **"Add to Home screen"**.
5. The GridSight icon will appear on your device's home screen and app launcher, running in standalone full-screen mode without browser address bars.

#### Installing on iOS / iPhone (Safari)
1. Open the GridSight URL in **Safari** (Apple requires Safari for PWA installation).
2. Tap the **Share icon** (square with an upward arrow) in the bottom toolbar.
3. Scroll down and tap **"Add to Home Screen"**.
4. Confirm the name "GridSight" and tap **"Add"** in the top-right corner.
5. Tap the new GridSight icon on your home screen to launch the app.

---

### 2.2 Account Creation & Sign-In

Viewing the live outage map and submitting reports requires an authenticated citizen account to prevent spam and ensure situational integrity.

1. **Sign Up:**
   - Tap **"Sign in"** in the top header, then click **"Create an account"** (or visit `/register`).
   - Enter your **Full Name**, **Email Address**, and a secure **Password** (minimum 8 characters).
   - Check your inbox for the verification email and click the confirmation link.
2. **Sign In:**
   - Go to `/login`, enter your email and password, and tap **"Sign in"**.
   - Your session remains active for 30 days across browser restarts.
3. **Switch Theme:**
   - Tap the **Sun / Moon icon** in the navigation header to toggle between **Dark Mode** and **Light Mode** at any time.

---

### 2.3 Navigating the Live Outage Map

Tap the **"Live Map"** tab in the bottom bar (mobile) or top navigation (desktop) to explore real-time power conditions across Surigao City.

```
       Map Legend & Incident Status Indicators:
       🔴 RED      - Active Outage (Multiple confirmed blackout reports)
       🟡 AMBER    - Unconfirmed Incident (Initial citizen report pending verification)
       🟢 GREEN    - Recently Restored (Power restored within the last 24 hours)
```

* **Interactive Barangay Polygons:** Tap any barangay boundary on the map to view:
  * Official Barangay Name and PSGC Code.
  * Current Outage Status (`Active`, `Unconfirmed`, or `Restored`).
  * Total number of citizen reports received.
  * Timestamp of the first report and restoration time (if resolved).
* **Centering the Map:** Tap the **Target / Crosshair button** on the map to center the view on your device's current location.
* **Map Layers:** Use standard pinch-to-zoom or the `+` / `-` buttons to inspect specific streets and sitios.

---

### 2.4 Submitting an Outage Report

You can submit an observation whenever your power fails, flickers, or returns.

```
                  Step-by-Step Reporting Flow:
  [ + Report FAB ] ──▶ [ Select Barangay ] ──▶ [ Power Status ] ──▶ [ Submit ]
                              │                       │
                       (Optional GPS)          (Optional Photo)
```

1. **Open the Report Dialog:**
   - **Mobile:** Tap the blue floating **`+ Report`** button in the bottom-right corner.
   - **Desktop:** Click the **`+ Report an outage`** button in the top navigation bar.
2. **Select Your Barangay:**
   - Choose your barangay from the dropdown list of Surigao City's 54 barangays (e.g., *Taft (Pob.)*, *Washington (Pob.)*, *San Juan*, *Lipata*, *Ipil*, *Nonoc Island*).
3. **Capture GPS Location (Recommended):**
   - Tap **"Use my current location"**.
   - Your browser will ask for location permission; select **"Allow"**.
   - *Spatial Safety Guard:* GridSight uses PostGIS spatial containment. If your GPS pin falls outside your selected barangay polygon, the app will advise you to adjust the selection to match your true physical location.
4. **Choose Current Power Status:**
   - **No Power (Blackout):** Complete loss of electrical grid service.
   - **Flickering / Brownout:** Erratic power, voltage drops, or intermittent surges.
   - **Power Restored:** Power has just returned following an outage.
5. **Add Notes (Optional):**
   - Provide helpful context for repair crews (e.g., *"Sparking transformer near the covered court"*, *"Fallen tree branch on powerline along Borromeo St."*). Maximum 500 characters.
6. **Attach a Photo (Optional):**
   - Tap **"Attach Photo"** to take a live picture or upload an image from your gallery.
   - Supported formats: **JPEG, PNG, WebP** (maximum size: **4 MB**).
7. **Submit:**
   - Tap **"Submit Report"**. You will receive an immediate confirmation badge with your tracking reference.

---

### 2.5 Offline Reporting & Automatic Synchronization

GridSight is engineered to operate during complete cellular network collapse or power grid shutdowns.

* **What happens when you are offline:**
  * When you tap "Submit Report" without an internet connection, GridSight automatically diverts your report—including your GPS coordinates and photo—into a secure, local **IndexedDB** database on your device.
  * You will see a banner: **"Saved offline. Report will automatically send when connection returns."**
* **Automatic Background Sync:**
  * As soon as your phone reconnects to cellular data or Wi-Fi, GridSight detects the network state and transmits all queued reports in the background.
  * Unique idempotency client UUIDs guarantee that a report is never duplicated, even if the connection drops midway through uploading.

---

### 2.6 Tracking Your Report History

To review every observation you have shared with the city:

1. Tap **"My Reports"** in the mobile navigation bar (or visit `/reports`).
2. Filter your submissions using the top pills:
   - **All:** Complete log of your submissions.
   - **Pending:** Reports currently queued or being analyzed by automated clustering.
   - **Verified:** Observations verified by city dispatch staff or corroborated by neighboring sensors.
   - **Dismissed:** Reports marked as duplicate, test submissions, or resolved.
3. Tap any report card to inspect submission timestamps, attached photos, and review notes from city administrators.

---

### 2.7 Managing Notifications & Followed Barangays

Stay alerted when power disruptions occur near your home, workplace, or family members.

1. **Follow a Barangay:**
   - Navigate to `/account` or open the live map.
   - Under **"Monitored Areas"**, toggle the bell switch next to any barangay you wish to follow.
2. **Enable Web Push Notifications:**
   - When prompted by your browser, tap **"Allow"** to receive system notifications.
   - You can toggle push notifications on or off at any time in `/notifications`.
   - GridSight will alert you in the background when:
     - An outage cluster is detected in your followed barangay.
     - City staff publishes an official restoration advisory.
     - Power is restored to your followed area.

---

### 2.8 Reading Official Community Bulletins

Tap the **"Updates"** tab in the navigation bar to read verified announcements issued directly by Surigao City disaster and utility staff.

* **Category Badges:**
  * 🔍 **Investigation:** Crews are currently identifying the fault or assessing line damage.
  * 🛠️ **Restoration Work:** Linemen are actively repairing transformers, lines, or poles.
  * ⚡ **Power Restored:** Service has been successfully re-energized.
  * 📅 **Scheduled Maintenance:** Planned maintenance shutdowns announced in advance.
  * 📢 **Advisory:** Weather bulletins, typhoon alerts, or grid load-shedding advisories.
* **Estimated Restoration Times (ETR):** Advisories often include expected restoration windows (e.g., *"Expected restoration: 5:00 PM today"*).
* **Withdrawn Updates:** If an advisory is amended or retracted, it displays a clear correction note detailing why the update was revised.

---

## 3. Administrator & Dispatcher Manual

> [!IMPORTANT]
> Administrative features are restricted to authorized city personnel with confirmed accounts holding the `admin` role and active Multi-Factor Authentication.

---

### 3.1 Accessing the Admin Workspace

1. Sign in to your account with administrator credentials.
2. If you hold the `admin` role, an **"Admin desk"** pill will appear in the desktop navigation, or an **"Admin Desk"** tab will replace "My Reports" in the mobile bottom bar.
3. Alternatively, navigate directly to **`/admin`**.
4. The admin workspace is divided into three core desks:
   - **Admin Desk (`/admin`):** Moderation queue, active incidents, and system metrics.
   - **Community Updates (`/admin/updates`):** Publishing and withdrawing official city bulletins.
   - **Account Management (`/admin/accounts`):** Staff invitations, role promotions, and audit inspection.

---

### 3.2 Multi-Factor Authentication (MFA) Setup & Verification

To satisfy municipal security compliance, all sensitive administrative operations enforce **Authenticator Assurance Level 2 (AAL2)** via Time-Based One-Time Passwords (TOTP).

```
          Admin Security Gate:
  [ Email & Password ] ──▶ [ Confirmed Email ] ──▶ [ Admin Role ] ──▶ [ 6-Digit TOTP ]
```

#### First-Time TOTP Enrollment
1. When accessing `/admin`, the **Admin Security Verification** modal will open automatically.
2. If no authenticator app is configured, select **"Enroll Authenticator"**.
3. Open an authenticator app on your smartphone (such as **Google Authenticator**, **Microsoft Authenticator**, **1Password**, or **Authy**).
4. Scan the presented **QR code**, or manually copy and paste the 32-character secret key.
5. Enter the 6-digit code displayed in your authenticator app and tap **"Verify and Enable"**.

#### Subsequent Sign-Ins
1. When prompted by the modal, open your authenticator app.
2. Enter the current 6-digit TOTP code and tap **"Verify"**.
3. Once verified, your administrative session is unlocked for that browser.

#### Clearing / Resetting Lost Factors
* If an administrator switches phones or loses their authenticator configuration, tap **"Reset authenticator factors"** in the modal.
* The system invokes `/api/admin/mfa/reset`, safely clearing stale factors so you can immediately scan a fresh QR code without needing a database engineer.

---

### 3.3 Incident Moderation Desk (Verifying & Dismissing Reports)

The primary moderation workspace (`/admin`) allows dispatchers to review citizen telemetry in real time.

```
       Moderation Action Matrix:
       Action     Outcome                                  Cluster Impact
       ───────────────────────────────────────────────────────────────────────────
       VERIFY     Confirms report as valid field data      Escalates incident to Active
       DISMISS    Rejects report (spam, duplicate, test)   Removes report from cluster
```

1. **Inspect Incoming Queue:**
   - Under the **"Incoming Reports Queue"**, review each report card showing:
     - Reporting Citizen Name & Email.
     - Selected Barangay & Recorded GPS Coordinates.
     - Power State (`no_power`, `flickering`, `restored`).
     - Citizen notes and attached photographic evidence.
2. **Verify a Report:**
   - Click the green **"Verify"** button.
   - The database executes `moderate_report(report_id, 'verified')`.
   - The report status transitions to `verified`, and the parent outage incident's report counter updates immediately.
3. **Dismiss a Report:**
   - Click the red **"Dismiss"** button.
   - Enter a brief reason (e.g., *"Duplicate submission"*, *"User confirmed internal circuit breaker tripped"*, *"Test submission"*). Maximum 300 characters.
   - The report is excluded from live cluster calculations, ensuring public maps remain accurate.

---

### 3.4 Overriding Outage Incident Status

While GridSight automatically aggregates reports into clusters, administrators possess full override authority to reflect official utility dispatch reports.

1. In the **"Active Outages"** section of `/admin`, find the target outage incident.
2. Click the **Status Dropdown**:
   - **`unconfirmed`:** Initial cluster threshold not yet reached.
   - **`active`:** Confirmed ongoing power failure in that barangay.
   - **`restored`:** Power has been re-energized.
3. **Automated Notification Trigger on Restoration:**
   - Selecting **`restored`** automatically records the `restored_at` timestamp.
   - The system immediately dispatches an alert to all citizens who have enabled notifications for that barangay:  
     *“Power appears to be restored in [Barangay Name].”*

---

### 3.5 Publishing & Retracting Official Community Advisories

To inform the public during major grid disturbances, navigate to **`/admin/updates`**.

#### Publishing a New Advisory
1. In the **"Publish Community Advisory"** form, fill out the required details:
   - **Title:** Concise summary (e.g., *"Feeder 2 Trip Affecting Lipata and Ipil"*). 3–120 characters.
   - **Category:** Select the operational status (`investigation`, `restoration_work`, `power_restored`, `scheduled_maintenance`, `advisory`).
   - **Target Audience:** Specify target areas (e.g., *"All communities"*, *"Island Barangays"*, *"Barangay San Juan"*).
   - **Message:** Detailed situation report, safety warnings, and utility restoration actions. 3–1200 characters.
   - **Estimated Restoration Time (Optional):** Expected fix time (e.g., *"Today by 6:00 PM"*).
   - **Next Update Expected (Optional):** When the next bulletin will be published (e.g., *"Update at 4:30 PM"*).
2. Click **"Publish Bulletin"**.
3. The bulletin goes live immediately across the citizen portal and is visible on both desktop and mobile feeds.

#### Withdrawing / Amending an Advisory
If an advisory contained an error or has been superseded:
1. Locate the bulletin card under **"Published Updates"**.
2. Click **"Withdraw bulletin"**.
3. A modal will prompt: *"Enter the reason for withdrawing this bulletin."*
4. Type an explanation (e.g., *"Restoration completed earlier than expected at 3:15 PM; see subsequent advisory."*).
5. Click **"Confirm Withdrawal"**.
6. The bulletin state switches to `withdrawn`. Citizens viewing the archive will see the transparent correction note, preventing public confusion.

---

### 3.6 Exporting Outage Data (CSV Reports)

For municipal reporting, utility audit reviews, and post-incident analysis:

1. In the administrative workspace header, locate the **"Export Data"** controls.
2. Select the **From** and **To** dates (format: `YYYY-MM-DD`). Default range is the last 30 days.
3. Click **"Download CSV"**.
4. GridSight streams a sanitized CSV file named:  
   `gridsight-reports-YYYY-MM-DD-to-YYYY-MM-DD.csv`

#### Export File Field Dictionary:
* `report_id`: Unique database UUID of the citizen observation.
* `area`: Official barangay name.
* `city`: City name (*Surigao City*).
* `report_status`: Power condition reported by citizen (`no_power`, `flickering`, `restored`).
* `review_status`: Moderation outcome (`pending`, `verified`, `dismissed`).
* `notes`: Text notes submitted by the citizen.
* `reported_at`: ISO 8601 submission timestamp.
* `outage_status`: Status of parent incident cluster (`unconfirmed`, `active`, `restored`).
* `outage_first_reported_at`: Timestamp when the incident first started.
* `outage_restored_at`: Timestamp when power was re-energized.

> [!NOTE]
> All exported CSV cells starting with formula triggers (`=`, `+`, `-`, `@`) are automatically escaped with a leading single quote (`'`) to protect spreadsheet users against CSV formula injection (DDE attacks).

---

### 3.7 Staff & Account Management (Invites, Promotions, Demotions)

Navigate to **`/admin/accounts`** to manage municipal staff accounts.

```
       Role Management Hierarchy:
       User (Citizen) ──[Admin Promotes]──▶ Admin (AAL1) ──[Enrolls TOTP]──▶ Verified Dispatcher (AAL2)
```

1. **Inviting a New Staff Member:**
   - Under **"Invite Dispatch Staff"**, enter the employee's official email address.
   - Click **"Send Invitation"**.
   - An invitation email with a confirmation link is sent via Supabase Auth.
   - Newly invited accounts join as standard users until confirmed.
2. **Promoting a User to Admin:**
   - In the account directory table, locate the confirmed user.
   - Click **"Promote to Admin"**.
   - The user's role in the `profiles` table is escalated to `admin`. Upon their next sign-in, they will be prompted to set up TOTP MFA.
3. **Demoting an Admin:**
   - Click **"Demote to User"** next to the target account.
   - *Safety Guard:* GridSight uses PostgreSQL transaction locking (`pg_advisory_xact_lock`) to verify the total number of remaining administrators. If an attempt is made to demote the **last remaining administrator**, the system rejects the operation to prevent lockout.

---

### 3.8 Inspecting the Administrative Audit Log

GridSight maintains an immutable, tamper-evident audit log of all account operations located at the bottom of `/admin/accounts`.

The audit log records:
* **Timestamp:** Exact UTC and local time of the action.
* **Actor:** Name and ID of the administrator who performed the operation.
* **Target:** Account ID of the affected user.
* **Action:** Type of action (`invite`, `promote`, `demote`, `bootstrap`).

---

## 4. Troubleshooting & Frequently Asked Questions (FAQ)

### For Citizens

#### Q1: Why do I receive the error "Your GPS pin is outside the selected barangay"?
**A:** GridSight enforces strict PostGIS boundary fences for all 54 barangays in Surigao City. If your phone's GPS detects you are located in *Barangay San Juan*, but you selected *Barangay Washington* from the dropdown, the system flags the spatial mismatch.  
*Resolution:* Either select the barangay that matches your physical location, or clear the GPS location and choose your barangay manually from the dropdown.

#### Q2: Why is the app telling me "You recently reported this barangay. Please wait a few minutes"?
**A:** To prevent accidental spam and duplicate flooding, each user is subject to a brief cooldown after submitting a report for a specific barangay, as well as a maximum limit of 6 reports per hour. If your power situation changed, wait 3 to 5 minutes before submitting an update.

#### Q3: Why am I not receiving Web Push notifications on my iPhone?
**A:** On Apple iOS, Web Push requires:
1. iOS version 16.4 or later.
2. GridSight must be installed to your **Home Screen** via Safari's **"Add to Home Screen"** button. (Web Push is disabled in standard iOS browser tabs).
3. Open GridSight from your Home Screen, go to `/notifications`, and tap **"Enable notifications"**.

#### Q4: What happens if I submit a report while my phone has "No Service"?
**A:** GridSight will save your complete report (including photos) in your phone's internal storage (`gridsight-offline`). As soon as your phone reconnects to a cellular tower or Wi-Fi, the app will automatically upload your queued reports without any further action required.

---

### For Administrators

#### Q5: I entered my TOTP code from Google Authenticator, but the system says "Invalid code"?
**A:** TOTP algorithms rely on strict clock synchronization. If your smartphone's system clock is off by even 30 seconds, generated codes will be rejected.  
*Resolution:* Go to your phone's Settings $\to$ Date & Time $\to$ Enable **"Set Automatically"**. If codes continue to fail, tap **"Reset authenticator factors"** in the modal to perform a clean re-enrollment.

#### Q6: I tried to invite a staff member, but the system returned "Invitations are not configured"?
**A:** The server requires `NEXT_PUBLIC_APP_URL` and `SUPABASE_SERVICE_ROLE_KEY` to construct invite links. Ensure both environment variables are set in your production environment settings (Vercel / Supabase Dashboard).

#### Q7: Can I demote my own administrator account?
**A:** Yes, provided there is at least one other active, email-confirmed administrator remaining in the system. The platform will block any demotion that would leave the city with zero administrators.

---

### Emergency Contacts & Pilot Support
* **City Disaster Risk Reduction & Management Office (CDRRMO):** Surigao City Hall Complex
* **Technical Portal Support:** `admin@gridsight.ph`
* **Source Code & Documentation Repository:** [GitHub Repository](https://github.com/KntBryan/GridSight)
