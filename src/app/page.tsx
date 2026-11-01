"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Bell,
  Bolt,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Crosshair,
  FileClock,
  Filter,
  MapPin,
  Menu,
  Plus,
  Radio,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  X,
  Zap,
} from "lucide-react";
import type { MapOutage } from "@/components/outage-map";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getQueuedReports, queueReport, removeQueuedReport } from "@/lib/offline-queue";
import { SURIGAO_CITY_BARANGAYS } from "@/lib/surigao-city-barangays";

const OutageMap = dynamic(() => import("@/components/outage-map"), { ssr: false });

type Status = MapOutage["status"];
type ReportStatus = "no_power" | "flickering" | "restored";

const initialOutages: MapOutage[] = [];

const areaOptions = ["All barangays", ...SURIGAO_CITY_BARANGAYS.map((barangay) => barangay.name)];

const statusLabel: Record<Status, string> = {
  active: "Active",
  unconfirmed: "Checking",
  restored: "Restored",
};

function ReportDialog({
  initialCoordinates,
  initialAreaSlug,
  onClose,
  onSubmit,
}: {
  initialCoordinates?: [number, number];
  initialAreaSlug?: string;
  onClose: () => void;
  onSubmit: (report: { area: string; areaSlug: string; status: ReportStatus; notes: string; coordinates?: [number, number]; photo?: File }) => Promise<boolean>;
}) {
  const [areaSlug, setAreaSlug] = useState(initialAreaSlug ?? SURIGAO_CITY_BARANGAYS[0].slug);
  const [status, setStatus] = useState<ReportStatus>("no_power");
  const [notes, setNotes] = useState("");
  const [coordinates, setCoordinates] = useState<[number, number] | undefined>(initialCoordinates);
  const [selectedPhoto, setSelectedPhoto] = useState<File | undefined>();
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !submitting) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, submitting]);

  // If map click or GPS coordinates were passed, resolve the nearest Surigao City barangay automatically
  useEffect(() => {
    if (initialAreaSlug) {
      setAreaSlug(initialAreaSlug);
    }
    if (initialCoordinates) {
      setCoordinates(initialCoordinates);
      if (!initialAreaSlug && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        fetch(`/api/areas/nearest?latitude=${initialCoordinates[0]}&longitude=${initialCoordinates[1]}`)
          .then((res) => res.json())
          .then((result) => {
            if (result.area?.slug) {
              setAreaSlug(result.area.slug);
            }
          })
          .catch(() => undefined);
      }
    }
  }, [initialCoordinates, initialAreaSlug]);

  function detectLocation() {
    if (!navigator.geolocation) {
      setError("Location is not available in this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        setError("");
        if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
          try {
            const response = await fetch(`/api/areas/nearest?latitude=${coords.latitude}&longitude=${coords.longitude}`);
            const result = await response.json();
            if (response.ok && result.area?.slug) {
              setAreaSlug(result.area.slug);
              setCoordinates([coords.latitude, coords.longitude]);
            } else {
              setCoordinates(undefined);
              setError(result.error || "Your location is outside the Surigao City pilot area. Choose a barangay manually.");
            }
          } catch {
            setCoordinates(undefined);
            setError("Location could not be matched to a Surigao City barangay. Choose one manually.");
          }
        } else {
          setCoordinates([coords.latitude, coords.longitude]);
        }
        setLocating(false);
      },
      () => {
        setError("Location permission was not granted. Choose your area instead.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setError("");

    if (selectedPhoto && (!selectedPhoto.type.startsWith("image/") || selectedPhoto.size > 4 * 1024 * 1024)) {
      setError("Choose a JPEG, PNG, or WebP image under 4 MB.");
      return;
    }
    const selectedBarangay = SURIGAO_CITY_BARANGAYS.find((barangay) => barangay.slug === areaSlug);
    if (!selectedBarangay) {
      setError("Choose a barangay before sending your report.");
      return;
    }

    setSubmitting(true);
    try {
      const ok = await onSubmit({
        area: selectedBarangay.name,
        areaSlug: selectedBarangay.slug,
        status,
        notes,
        coordinates,
        photo: selectedPhoto,
      });
      if (ok) {
        onClose();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The report could not be saved.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !submitting && onClose()}>
      <section className="report-dialog" role="dialog" aria-modal="true" aria-labelledby="report-title">
        <div className="dialog-heading">
          <div>
            <span className="eyebrow">COMMUNITY REPORT</span>
            <h2 id="report-title">What’s happening?</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Close report form" disabled={submitting} onClick={onClose}><X size={19} /></button>
        </div>
        <form onSubmit={submit}>
          <label className="field-label" htmlFor="report-area">Barangay</label>
          <div className="field-with-action">
            <select id="report-area" value={areaSlug} disabled={submitting} onChange={(event) => { setAreaSlug(event.target.value); setCoordinates(undefined); }}>
              {SURIGAO_CITY_BARANGAYS.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
            </select>
            <button className="locate-button" type="button" disabled={locating || submitting} onClick={detectLocation} aria-label="Use my location" title="Use my location">
              {locating ? <span className="spinner" /> : <Crosshair size={17} />}
            </button>
          </div>
          <span className="field-hint">{coordinates ? `Pin captured: ${coordinates[0].toFixed(4)}, ${coordinates[1].toFixed(4)}` : "Confirm your barangay with location, map click, or choose it manually."}</span>

          <span className="field-label status-label">Current status</span>
          <div className="report-status-options">
            <label className={status === "no_power" ? "report-status selected" : "report-status"}>
              <input type="radio" name="status" value="no_power" disabled={submitting} checked={status === "no_power"} onChange={() => setStatus("no_power")} />
              <Zap size={17} /><span>No power</span>
            </label>
            <label className={status === "flickering" ? "report-status selected" : "report-status"}>
              <input type="radio" name="status" value="flickering" disabled={submitting} checked={status === "flickering"} onChange={() => setStatus("flickering")} />
              <Activity size={17} /><span>Flickering</span>
            </label>
            <label className={status === "restored" ? "report-status selected" : "report-status"}>
              <input type="radio" name="status" value="restored" disabled={submitting} checked={status === "restored"} onChange={() => setStatus("restored")} />
              <Sun size={17} /><span>Restored</span>
            </label>
          </div>

          <label className="field-label" htmlFor="report-notes">Anything else? <span className="optional">OPTIONAL</span></label>
          <textarea id="report-notes" value={notes} disabled={submitting} onChange={(event) => setNotes(event.target.value)} maxLength={500} rows={3} placeholder="Nearby landmark, what you observed…" />

          <label className="photo-upload" htmlFor="report-photo">
            <Plus size={16} />
            <span>{selectedPhoto ? selectedPhoto.name : "Add a photo"}</span>
            <span className="optional">{selectedPhoto ? `${(selectedPhoto.size / (1024 * 1024)).toFixed(1)} MB` : "4 MB MAX"}</span>
          </label>
          <input
            id="report-photo"
            name="photo"
            className="visually-hidden"
            type="file"
            disabled={submitting}
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                if (!file.type.startsWith("image/") || file.size > 4 * 1024 * 1024) {
                  setError("Choose a JPEG, PNG, or WebP image under 4 MB.");
                  setSelectedPhoto(undefined);
                } else {
                  setError("");
                  setSelectedPhoto(file);
                }
              }
            }}
          />

          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="submit-report" type="submit" disabled={submitting}>
            {submitting ? <span className="spinner" /> : <Send size={16} />}
            <span>{submitting ? "Sending report…" : "Send report"}</span>
          </button>
          <p className="privacy-note"><ShieldCheck size={14} /> Your report helps neighbors make informed decisions.</p>
        </form>
      </section>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [outages, setOutages] = useState(initialOutages);
  const [selectedId, setSelectedId] = useState("");
  const [area, setArea] = useState("All barangays");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [timeRange, setTimeRange] = useState("24");
  const [reportOpen, setReportOpen] = useState(false);
  const [pendingCoordinates, setPendingCoordinates] = useState<[number, number] | undefined>(undefined);
  const [pendingAreaSlug, setPendingAreaSlug] = useState<string | undefined>(undefined);
  const [toast, setToast] = useState("");
  const [view, setView] = useState("Live map");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userName, setUserName] = useState("Community Member");
  const [userInitials, setUserInitials] = useState("GS");
  const [userLocation, setUserLocation] = useState<[number, number] | undefined>(undefined);
  const [locatingUser, setLocatingUser] = useState(false);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;
    let cancelled = false;

    async function refreshOutages() {
      try {
        const response = await fetch("/api/outages", { cache: "no-store" });
        if (!response.ok) return;
        const result = await response.json();
        const rows = (result.outages ?? []) as Array<{ id: string; area_name: string; city: string; status: Status; report_count: number; latitude: number; longitude: number; first_reported_at: string; restored_at: string | null }>;
        const fresh: MapOutage[] = rows.filter((row) => Number.isFinite(row.latitude) && Number.isFinite(row.longitude)).map((row) => ({
          id: row.id,
          area: row.area_name,
          city: row.city,
          status: row.status,
          reports: row.report_count,
          coordinates: [row.latitude, row.longitude],
          reportedAt: row.first_reported_at,
          reported: row.restored_at ? `Restored ${Math.max(1, Math.round((Date.now() - new Date(row.restored_at).getTime()) / 60000))} min ago` : `${Math.max(1, Math.round((Date.now() - new Date(row.first_reported_at).getTime()) / 60000))} min ago`,
        }));
        if (!cancelled) {
          setOutages(fresh);
          if (fresh[0]) setSelectedId((current) => current || fresh[0].id);
        }
      } catch {
        // Keep the last known map state when connectivity drops.
      }
    }

    async function syncQueuedReports() {
      if (!navigator.onLine) return;
      try {
        for (const queued of await getQueuedReports()) {
          const body = new FormData();
          body.set("areaSlug", queued.areaSlug);
          body.set("status", queued.status);
          body.set("notes", queued.notes);
          body.set("requestId", queued.requestId);
          if (queued.latitude != null && queued.longitude != null) {
            body.set("latitude", String(queued.latitude));
            body.set("longitude", String(queued.longitude));
          }
          if (queued.photo) body.set("photo", queued.photo, "queued-photo");
          const response = await fetch("/api/reports", { method: "POST", body });
          if (response.ok) {
            await removeQueuedReport(queued.requestId);
          } else if (response.status === 401) {
            showToast("Sign in to sync your offline reports.");
            break;
          } else if (response.status === 400 || response.status === 413 || response.status === 422) {
            await removeQueuedReport(queued.requestId);
          }
        }
      } catch {
        // Keep the queue for the next online event.
      }
    }

    const supabase = createSupabaseBrowserClient();
    void supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user || cancelled) return;
      setIsSignedIn(true);
      const { data: profile } = await supabase.from("profiles").select("name, role").eq("id", user.id).single();
      if (!cancelled) {
        setIsAdmin(profile?.role === "admin");
        const displayName = profile?.name?.trim() || user.email?.split("@")[0] || "Reporter";
        setUserName(displayName);
        const initials = displayName.split(" ").map((n: string) => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "GS";
        setUserInitials(initials);
      }
      const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_read", false);
      if (!cancelled && count != null) setUnread(count);
    });

    const channel = supabase.channel("live-outage-map")
      .on("postgres_changes", { event: "*", schema: "public", table: "outages" }, () => { void refreshOutages(); })
      .subscribe();
    window.addEventListener("online", syncQueuedReports);
    void refreshOutages();
    void syncQueuedReports();
    return () => {
      cancelled = true;
      window.removeEventListener("online", syncQueuedReports);
      void supabase.removeChannel(channel);
    };
  }, []);

  const filteredOutages = useMemo(() => outages.filter((outage) =>
    (area === "All barangays" || outage.area === area) &&
    (statusFilter === "all" || outage.status === statusFilter) &&
    (!outage.reportedAt || Date.parse(outage.reportedAt) >= Date.now() - Number(timeRange) * 60 * 60 * 1000) &&
    `${outage.area} ${outage.city}`.toLowerCase().includes(search.toLowerCase()),
  ), [area, outages, search, statusFilter, timeRange]);

  const selectedBarangayFilter = useMemo(
    () => (area === "All barangays" ? null : SURIGAO_CITY_BARANGAYS.find((b) => b.name === area)),
    [area]
  );
  const selectedBarangayCoords: [number, number] | null = selectedBarangayFilter
    ? [selectedBarangayFilter.latitude, selectedBarangayFilter.longitude]
    : null;

  const selected = outages.find((outage) => outage.id === selectedId) ?? outages[0] ?? {
    id: "empty", area: "No active outage", city: "Surigao City", status: "unconfirmed" as Status,
    reports: 0, coordinates: [9.7878, 125.4916] as [number, number], reported: "No recent reports",
  };
  const activeCount = outages.filter((outage) => outage.status === "active").length;
  const reportCount = outages.reduce((total, outage) => total + outage.reports, 0);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3500);
  }

  function handleLocateUser() {
    if (!navigator.geolocation) {
      showToast("Geolocation is not supported by your browser.");
      return;
    }
    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
        setUserLocation(coords);
        setLocatingUser(false);
        showToast("Centered map on your current location.");
      },
      () => {
        setLocatingUser(false);
        showToast("Allow location access in your browser to center the map.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  function handleMapClick(coords: [number, number]) {
    setPendingAreaSlug(undefined);
    setPendingCoordinates(coords);
    setReportOpen(true);
    showToast("Captured map pin. Verifying Surigao City barangay…");
  }

  function handleReportArea(areaName: string, coordinates?: [number, number]) {
    const cleanName = areaName.toLowerCase().replace(/[^a-z0-9]/g, "");
    const matched = SURIGAO_CITY_BARANGAYS.find(
      (b) => b.name.toLowerCase().replace(/[^a-z0-9]/g, "") === cleanName
    );
    if (matched) {
      setPendingAreaSlug(matched.slug);
      setPendingCoordinates(coordinates || [matched.latitude, matched.longitude]);
      showToast(`Selected Brgy. ${matched.name}. Confirm details to submit.`);
    } else {
      setPendingAreaSlug(undefined);
      setPendingCoordinates(coordinates);
    }
    setReportOpen(true);
  }

  async function submitReport(report: { area: string; areaSlug: string; status: ReportStatus; notes: string; coordinates?: [number, number]; photo?: File }): Promise<boolean> {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const requestId = crypto.randomUUID();
      const queued = {
        requestId,
        areaSlug: report.areaSlug,
        status: report.status,
        notes: report.notes,
        latitude: report.coordinates?.[0] ?? null,
        longitude: report.coordinates?.[1] ?? null,
        photo: report.photo ?? null,
        queuedAt: new Date().toISOString(),
      };
      if (!navigator.onLine) {
        await queueReport(queued);
        showToast("You’re offline. Your report is queued to send when you reconnect.");
        return true;
      }
      const body = new FormData();
      body.set("areaSlug", queued.areaSlug);
      body.set("status", queued.status);
      body.set("notes", queued.notes);
      body.set("requestId", queued.requestId);
      if (queued.latitude != null && queued.longitude != null) {
        body.set("latitude", String(queued.latitude));
        body.set("longitude", String(queued.longitude));
      }
      if (queued.photo) body.set("photo", queued.photo);
      try {
        const response = await fetch("/api/reports", { method: "POST", body });
        const result = await response.json();
        if (!response.ok) {
          showToast(result.error || "The report could not be submitted.");
          return false;
        }
        showToast("Report received. Thanks for looking out for your area.");
        return true;
      } catch {
        await queueReport(queued);
        showToast("Connection lost. Your report is queued to send when you reconnect.");
        return true;
      }
    }

    const areaName = report.area;
    const city = "Surigao City";
    const status: Status = report.status === "restored" ? "restored" : "unconfirmed";
    const selectedBarangay = SURIGAO_CITY_BARANGAYS.find((barangay) => barangay.slug === report.areaSlug);
    const coordinates = report.coordinates ?? [selectedBarangay?.latitude ?? 9.7878, selectedBarangay?.longitude ?? 125.4916];
    const newOutage: MapOutage = {
      id: `local-${Date.now()}`,
      area: areaName,
      city,
      status,
      reports: 1,
      coordinates,
      reported: "Just now",
      reportedAt: new Date().toISOString(),
    };
    setOutages((current) => [newOutage, ...current]);
    setSelectedId(newOutage.id);
    showToast("Report received. Thanks for looking out for your area.");
    return true;
  }

  return (
    <main className="app-shell">
      <aside className={menuOpen ? "sidebar sidebar-open" : "sidebar"}>
        <a className="brand" href="#map" aria-label="GridSight home">
          <span className="brand-mark"><Bolt size={22} fill="currentColor" /></span>
          <span className="brand-name">grid<span>sight</span><small>POWER, IN PERSPECTIVE</small></span>
        </a>
        <div className="sidebar-section-label">YOUR GRID</div>
        <nav className="primary-nav" aria-label="Primary navigation">
          <button className={view === "Live map" ? "nav-item active" : "nav-item"} onClick={() => { setView("Live map"); setMenuOpen(false); }}><MapPin size={18} /><span>Live map</span>{activeCount > 0 && <span className="nav-count" suppressHydrationWarning>{activeCount}</span>}</button>
          <button className={view === "My reports" ? "nav-item active" : "nav-item"} onClick={() => router.push(isSignedIn ? "/reports" : "/login")}><FileClock size={18} /><span>My reports</span></button>
          <button className={view === "Following" ? "nav-item active" : "nav-item"} onClick={() => router.push(isSignedIn ? "/account" : "/login")}><Radio size={18} /><span>Following</span></button>
          <button className="nav-item" onClick={() => router.push(isSignedIn ? "/notifications" : "/login")}><Bell size={18} /><span>Notifications</span>{unread > 0 && <span className="nav-count">{unread}</span>}</button>
          {isAdmin && <button className="nav-item" onClick={() => router.push("/admin")}><ShieldCheck size={18} /><span>Admin desk</span></button>}
        </nav>
        <div className="sidebar-section-label areas-label">SURIGAO CITY PILOT</div>
        <div className="followed-area"><span className="area-dot dot-green" /><span>54 Barangays</span><span className="area-live">Active</span></div>
        <div className="followed-area"><span className="area-dot dot-yellow" /><span>PostGIS Boundaries</span></div>
        <div className="sidebar-bottom">
          <div className="grid-health"><span className="health-icon"><Activity size={16} /></span><div><strong>Grid health</strong><small>Monitoring active</small></div><span className="health-status" /></div>
          <button className="profile-button" onClick={() => router.push(isSignedIn ? "/account" : "/login")}>
            <span className="avatar">{userInitials}</span><span className="profile-copy"><strong>{userName}</strong><small>{isSignedIn ? (isAdmin ? "Administrator" : "Community reporter") : "Sign in / Register"}</small></span><ChevronDown size={15} />
          </button>
        </div>
      </aside>

      <section className="workspace" id="map">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Open menu" onClick={() => setMenuOpen(!menuOpen)}><Menu size={20} /></button>
          <div className="breadcrumb"><span>GridSight</span><span className="crumb-slash">/</span><strong>{view}</strong></div>
          <div className="topbar-actions">
            <div className="live-indicator"><span /> LIVE UPDATES</div>
            <button className="icon-button notification-trigger" aria-label="Notifications" onClick={() => { if (isSignedIn) { setNotificationsOpen(!notificationsOpen); setUnread(0); } else { router.push("/login"); } }}><Bell size={19} />{unread > 0 && <i />}</button>
            <button className="report-button" onClick={() => { setPendingCoordinates(undefined); setPendingAreaSlug(undefined); setReportOpen(true); }}><Plus size={17} /><span>Report outage</span></button>
          </div>
          {notificationsOpen && <div className="notification-popover">
            <div className="popover-heading"><strong>Notifications</strong><button onClick={() => setNotificationsOpen(false)} aria-label="Close notifications"><X size={16} /></button></div>
            <p className="auth-privacy" style={{ padding: "10px 0", margin: 0 }}>View your full notification feed from the notifications screen.</p>
            <button className="all-notifications" onClick={() => { setNotificationsOpen(false); router.push("/notifications"); }}>View all notifications <span>→</span></button>
          </div>}
        </header>

        <div className="page-content">
          <div className="page-heading">
            <div><span className="eyebrow">SURIGAO CITY · SURIGAO DEL NORTE · BARANGAY POWER WATCH</span><h1>Know before<br className="mobile-break" /> the lights go out.</h1><p>A clearer picture of what’s happening on your grid, right now.</p></div>
            <div className="updated-stamp"><span className="pulse-dot" /><span>Updated just now</span><span className="stamp-divider" /><Clock3 size={14} /><span>Last {timeRange} hours</span></div>
          </div>

          <div className="stats-strip">
            <div className="stat-item"><span className="stat-icon stat-red"><Zap size={17} /></span><div><strong suppressHydrationWarning>{activeCount.toString().padStart(2, "0")}</strong><span>Active outages</span></div><small className="stat-trend negative">+2 today</small></div>
            <div className="stat-item"><span className="stat-icon stat-gold"><MapPin size={17} /></span><div><strong suppressHydrationWarning>{new Set(outages.filter((outage) => outage.status !== "restored").map((outage) => outage.area)).size.toString().padStart(2, "0")}</strong><span>Barangays affected</span></div><small className="stat-trend">of 54 tracked</small></div>
            <div className="stat-item"><span className="stat-icon stat-green"><Activity size={17} /></span><div><strong suppressHydrationWarning>{reportCount}</strong><span>Reports today</span></div><small className="stat-trend positive">+18% vs avg</small></div>
            <div className="stat-item reliability-stat"><span className="stat-icon stat-blue"><ShieldCheck size={17} /></span><div><strong>94<span className="stat-percent">%</span></strong><span>Grid confidence</span></div><small className="stat-trend">High signal</small></div>
          </div>

          <div className="content-grid">
            <section className="map-panel" aria-label="Live outage map">
              <div className="panel-toolbar">
                <div className="panel-title"><span className="panel-kicker">LIVE VIEW</span><h2>Outage map</h2></div>
                <div className="map-tools">
                  <label className="search-box"><Search size={15} /><input aria-label="Search area" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search area" /></label>
                  <label className="select-wrap"><Filter size={14} /><select value={area} aria-label="Filter by barangay" onChange={(event) => setArea(event.target.value)}>{areaOptions.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={14} /></label>
                  <label className="select-wrap"><Activity size={14} /><select value={statusFilter} aria-label="Filter by outage status" onChange={(event) => setStatusFilter(event.target.value as "all" | Status)}><option value="all">All status</option><option value="active">Active</option><option value="unconfirmed">Checking</option><option value="restored">Restored</option></select><ChevronDown size={14} /></label>
                  <label className="select-wrap time-filter"><Clock3 size={14} /><select value={timeRange} aria-label="Filter by time range" onChange={(event) => setTimeRange(event.target.value)}><option value="1">1 hour</option><option value="6">6 hours</option><option value="24">24 hours</option></select><ChevronDown size={14} /></label>
                </div>
              </div>
              <div className="map-stage">
                <OutageMap
                  outages={filteredOutages}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  userLocation={userLocation}
                  selectedCoordinates={selectedBarangayCoords}
                  selectedAreaName={area !== "All barangays" ? area : undefined}
                  onMapClick={handleMapClick}
                  onReportArea={handleReportArea}
                />
                <div className="map-scale"><span className="scale-line" /> 2 km</div>
                <div className="map-legend">
                  <span><i className="legend-green" />Active (power on)</span>
                  <span><i className="legend-red" />Down (outage)</span>
                  <span><i className="legend-gold" />Checking</span>
                  <span><i className="legend-blue" />Restored</span>
                </div>
                <button className="map-locate" aria-label="Center map on my location" title="Center on my location" disabled={locatingUser} onClick={handleLocateUser}>
                  {locatingUser ? <span className="spinner" /> : <Crosshair size={17} />}
                </button>
                <div className="map-source">&copy; OpenStreetMap &copy; Humanitarian OSM</div>
              </div>
              <div className="map-footer"><span><span className="pulse-dot" /> Showing <span suppressHydrationWarning>{filteredOutages.length}</span> outage clusters</span><span>Cluster radius <strong>500 m</strong> · Click map to drop pin</span><button onClick={() => { setStatusFilter("all"); setArea("All barangays"); setTimeRange("24"); setSearch(""); }}>Reset filters <X size={13} /></button></div>
            </section>

            <aside className="incident-panel" aria-label="Recent outage reports">
              <div className="incident-heading"><div><span className="panel-kicker">FIELD SIGNALS</span><h2>Outage activity <span suppressHydrationWarning>{filteredOutages.length}</span></h2></div><button className="more-button" aria-label="More outage options" onClick={() => showToast("Showing reports from the last 24 hours.")}><SlidersHorizontal size={17} /></button></div>
              <div className="incident-filter-row"><span>NEAR YOU</span><span>{statusFilter === "all" ? "All status" : statusLabel[statusFilter]}</span></div>
              <div className="incident-list">
                {filteredOutages.map((outage) => <button key={outage.id} className={outage.id === selectedId ? "incident-card selected" : "incident-card"} onClick={() => setSelectedId(outage.id)}>
                  <span className={`incident-status status-${outage.status}`}><i />{statusLabel[outage.status]}</span>
                  <span className="incident-title">{outage.area}</span>
                  <span className="incident-city"><MapPin size={13} />{outage.city}</span>
                  <span className="incident-meta"><span><Activity size={13} />{outage.reports} reports</span><span><Clock3 size={13} />{outage.reported}</span></span>
                  <span className="confidence"><span className="confidence-track"><i style={{ width: `${Math.min(25 + outage.reports * 4, 96)}%` }} /></span><small>{Math.min(25 + outage.reports * 4, 96)}% confidence</small></span>
                </button>)}
                {filteredOutages.length === 0 && <div className="empty-list">No matching outages. Try a different area or status.</div>}
              </div>
              <button className="activity-link" onClick={() => router.push(isSignedIn ? "/reports" : "/login")}>View all activity <span>→</span></button>
            </aside>
          </div>

          {outages.length === 0 ? (
            <section className="detail-ribbon">
              <div className="detail-marker">
                <span className="detail-marker-dot" style={{ background: "#22c55e", color: "white" }}>
                  <Zap size={16} fill="currentColor" />
                </span>
              </div>
              <div className="detail-copy">
                <span className="panel-kicker">SURIGAO CITY · 54 BARANGAYS MONITORED</span>
                <h3>
                  Grid Normal{" "}
                  <span className="inline-status" style={{ background: "#dcfce7", color: "#15803d", borderColor: "#86efac" }}>
                    Active (power = true)
                  </span>
                </h3>
                <p>
                  Zero active power outages reported across all 54 barangays.{" "}
                  <button onClick={() => router.push(isSignedIn ? "/reports" : "/login")}>View report feed</button>
                </p>
              </div>
              <div className="detail-metric">
                <strong suppressHydrationWarning>54</strong>
                <span>barangays online</span>
              </div>
              <div className="detail-metric">
                <strong>100%</strong>
                <span>normal supply</span>
              </div>
              <button
                className="detail-report"
                onClick={() => {
                  setPendingCoordinates(undefined);
                  setPendingAreaSlug(undefined);
                  setReportOpen(true);
                }}
              >
                <Plus size={15} /> Add report
              </button>
            </section>
          ) : (
            <section className="detail-ribbon">
              <div className="detail-marker"><span className={`detail-marker-dot detail-${selected.status}`}><Zap size={16} fill="currentColor" /></span></div>
              <div className="detail-copy">
                <span className="panel-kicker">SELECTED CLUSTER · {selected.city.toUpperCase()}</span>
                <h3>
                  {selected.area}{" "}
                  <span className={`inline-status inline-${selected.status}`}>
                    {selected.status === "active" ? "Down (power = false)" : selected.status === "unconfirmed" ? "Checking" : "Restored"}
                  </span>
                </h3>
                <p>
                  {selected.status === "restored"
                    ? "Power service appears to be back."
                    : selected.status === "active"
                    ? "Confirmed power interruption in progress."
                    : "Community reports suggest a local fluctuation."}{" "}
                  <button onClick={() => router.push(isSignedIn ? "/reports" : "/login")}>View report feed</button>
                </p>
              </div>
              <div className="detail-metric"><strong suppressHydrationWarning>{selected.reports}</strong><span>community reports</span></div>
              <div className="detail-metric"><strong>{selected.status === "restored" ? "38m" : "12m"}</strong><span>{selected.status === "restored" ? "time to restore" : "since first report"}</span></div>
              <button className="detail-report" onClick={() => { handleReportArea(selected.area, selected.coordinates); }}><Plus size={15} /> Add report</button>
            </section>
          )}

          <footer className="page-footer"><span>GridSight combines community reports to reveal local power conditions.</span><button onClick={() => showToast("Status estimates are based on recent community reports.")}><CircleHelp size={14} /> How confidence works</button><span className="footer-version">GRID SIGNAL v0.1</span></footer>
        </div>
      </section>
      {reportOpen && (
        <ReportDialog
          initialCoordinates={pendingCoordinates}
          initialAreaSlug={pendingAreaSlug}
          onClose={() => {
            setReportOpen(false);
            setPendingCoordinates(undefined);
            setPendingAreaSlug(undefined);
          }}
          onSubmit={submitReport}
        />
      )}
      {toast && <div className="toast" role="status"><Check size={16} />{toast}<button aria-label="Dismiss message" onClick={() => setToast("")}><X size={14} /></button></div>}
    </main>
  );
}
