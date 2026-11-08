"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { getQueuedReports, queueReport, removeQueuedReport, type QueuedReport } from "@/lib/offline-queue";
import { SURIGAO_CITY_BARANGAYS } from "@/lib/surigao-city-barangays";

const OutageMap = dynamic(() => import("@/components/outage-map"), { ssr: false });

type Status = MapOutage["status"];
type ReportStatus = "no_power" | "flickering" | "restored";
type MapDataState = "demo" | "loading" | "ready" | "error";
const hasSupabaseConfig = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

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
  const [mapDataState, setMapDataState] = useState<MapDataState>(hasSupabaseConfig ? "loading" : "demo");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
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
  const [queuedReports, setQueuedReports] = useState<QueuedReport[]>([]);
  const syncingQueue = useRef(false);
  const queueRetryTimer = useRef<number | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3500);
  }, []);

  const refreshQueuedReports = useCallback(async () => {
    const queued = await getQueuedReports();
    setQueuedReports(queued);
    return queued;
  }, []);

  const syncQueuedReports = useCallback(async () => {
    if (!navigator.onLine || syncingQueue.current) return;
    syncingQueue.current = true;
    try {
      const queuedReports = await getQueuedReports();
      for (const queued of queuedReports) {
        if (queued.lastError && queued.nextRetryAt == null) continue;
        if (queued.nextRetryAt != null && queued.nextRetryAt > Date.now()) continue;

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

        try {
          const response = await fetch("/api/reports", { method: "POST", body });
          if (response.ok) {
            await removeQueuedReport(queued.requestId);
            const result = await response.json().catch(() => ({}));
            if (result.warning) showToast(result.warning);
            continue;
          }

          const result = await response.json().catch(() => ({}));
          const attempts = (queued.attempts ?? 0) + 1;
          const retryable = response.status === 429 || response.status >= 500;
          const nextRetryAt = retryable && attempts < 5
            ? Date.now() + Math.min(60 * 60 * 1000, 30_000 * 2 ** attempts)
            : undefined;
          await queueReport({
            ...queued,
            attempts,
            nextRetryAt,
            lastError: result.error || `Submission failed (HTTP ${response.status}).`,
          });
          if (response.status === 401 || retryable) break;
        } catch {
          const attempts = (queued.attempts ?? 0) + 1;
          await queueReport({
            ...queued,
            attempts,
            nextRetryAt: attempts < 5
              ? Date.now() + Math.min(60 * 60 * 1000, 30_000 * 2 ** attempts)
              : undefined,
            lastError: "Connection failed while syncing this report.",
          });
          break;
        }
      }
    } catch {
      showToast("Offline reports could not be loaded from this device.");
    } finally {
      syncingQueue.current = false;
      try {
        const queued = await refreshQueuedReports();
        if (queueRetryTimer.current != null) window.clearTimeout(queueRetryTimer.current);
        const nextRetryAt = queued
          .map((report) => report.nextRetryAt)
          .filter((time): time is number => time != null && time > Date.now())
          .sort((left, right) => left - right)[0];
        if (nextRetryAt != null) {
          queueRetryTimer.current = window.setTimeout(() => void syncQueuedReports(), nextRetryAt - Date.now());
        }
      } catch {
        showToast("Offline report status could not be refreshed.");
      }
    }
  }, [refreshQueuedReports, showToast]);

  async function retryQueuedReport(requestId: string) {
    try {
      const queued = (await getQueuedReports()).find((report) => report.requestId === requestId);
      if (!queued) return;
      await queueReport({ ...queued, lastError: undefined, nextRetryAt: 0 });
      await refreshQueuedReports();
      await syncQueuedReports();
    } catch {
      showToast("This offline report could not be retried.");
    }
  }

  async function discardQueuedReport(requestId: string) {
    try {
      await removeQueuedReport(requestId);
      await refreshQueuedReports();
    } catch {
      showToast("This offline report could not be discarded.");
    }
  }

  useEffect(() => {
    if (!hasSupabaseConfig) return;
    let cancelled = false;

    async function refreshOutages() {
      try {
        const response = await fetch("/api/outages", { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) setMapDataState("error");
          return;
        }
        const result = await response.json();
        if (!Array.isArray(result.outages)) {
          if (!cancelled) setMapDataState("error");
          return;
        }
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
          setMapDataState("ready");
          setLastUpdatedAt(new Date());
          if (fresh[0]) setSelectedId((current) => current || fresh[0].id);
        }
      } catch {
        if (!cancelled) setMapDataState("error");
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
      if (queueRetryTimer.current != null) window.clearTimeout(queueRetryTimer.current);
      void supabase.removeChannel(channel);
    };
  }, [syncQueuedReports]);

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
  const clusterReportCount = outages.reduce((total, outage) => total + outage.reports, 0);
  const affectedBarangaysCount = new Set(
    outages.filter((outage) => outage.status !== "restored").map((outage) => outage.area)
  ).size;

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
        await refreshQueuedReports();
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
        showToast(result.warning || "Report received. Thanks for looking out for your area.");
        return true;
      } catch {
        await queueReport(queued);
        await refreshQueuedReports();
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
    setMapDataState("ready");
    setLastUpdatedAt(new Date());
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
          <div className="grid-health"><span className="health-icon"><Activity size={16} /></span><div><strong>Map data</strong><small>{mapDataState === "ready" ? "Recently updated" : mapDataState === "loading" ? "Loading" : mapDataState === "error" ? "Unavailable" : "Demo mode"}</small></div><span className={`health-status health-${mapDataState}`} /></div>
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
            <div className="live-indicator"><span className={`data-state-${mapDataState}`} />{mapDataState === "ready" ? "LIVE MAP DATA" : mapDataState === "loading" ? "LOADING MAP" : mapDataState === "error" ? "MAP DATA UNAVAILABLE" : "DEMO MODE"}</div>
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
            <div className="updated-stamp"><span className={`pulse-dot data-state-${mapDataState}`} /><span>{mapDataState === "ready" && lastUpdatedAt ? `Updated ${lastUpdatedAt.toLocaleTimeString()}` : mapDataState === "loading" ? "Loading outage data" : mapDataState === "error" ? "Outage data unavailable" : "Local demo data"}</span><span className="stamp-divider" /><Clock3 size={14} /><span>Last {timeRange} hours</span></div>
          </div>

          {queuedReports.length > 0 && <section className="queue-panel" aria-label="Offline reports">
            <div className="queue-heading"><strong>{queuedReports.length} report{queuedReports.length === 1 ? "" : "s"} waiting to sync</strong><span>Stored on this device</span></div>
            {queuedReports.map((report) => {
              const areaName = SURIGAO_CITY_BARANGAYS.find((area) => area.slug === report.areaSlug)?.name ?? report.areaSlug;
              return <article className="queue-item" key={report.requestId}>
                <div><strong>{areaName}</strong><small>{report.lastError ?? "Will sync when connected"}</small></div>
                <div className="queue-actions">
                  {report.lastError && <button onClick={() => void retryQueuedReport(report.requestId)}>Retry</button>}
                  <button onClick={() => void discardQueuedReport(report.requestId)}>Discard</button>
                </div>
              </article>;
            })}
          </section>}

          <div className="stats-strip">
            <div className="stat-item">
              <span className="stat-icon stat-red"><Zap size={17} /></span>
              <div>
                <strong suppressHydrationWarning>{mapDataState === "ready" ? activeCount.toString().padStart(2, "0") : "—"}</strong>
                <span>Active outages</span>
              </div>
              {mapDataState !== "ready" ? (
                <small className="stat-trend">{mapDataState === "error" ? "Unavailable" : "Awaiting data"}</small>
              ) : activeCount === 0 ? (
                <small className="stat-trend positive">None confirmed</small>
              ) : (
                <small className="stat-trend negative">+{activeCount} active</small>
              )}
            </div>

            <div className="stat-item">
              <span className="stat-icon stat-gold"><MapPin size={17} /></span>
              <div>
                <strong suppressHydrationWarning>{mapDataState === "ready" ? affectedBarangaysCount.toString().padStart(2, "0") : "—"}</strong>
                <span>Barangays affected</span>
              </div>
              <small className="stat-trend">
                {mapDataState === "ready" ? `${affectedBarangaysCount} of 54 tracked` : "54 barangays in pilot"}
              </small>
            </div>

            <div className="stat-item">
              <span className="stat-icon stat-green"><Activity size={17} /></span>
              <div>
                <strong suppressHydrationWarning>{mapDataState === "ready" ? clusterReportCount : "—"}</strong>
                <span>Reports in clusters</span>
              </div>
              {mapDataState !== "ready" ? (
                <small className="stat-trend">{mapDataState === "error" ? "Unavailable" : "Awaiting data"}</small>
              ) : clusterReportCount === 0 ? (
                <small className="stat-trend positive">No recent clusters</small>
              ) : (
                <small className="stat-trend">{clusterReportCount} signal{clusterReportCount === 1 ? "" : "s"}</small>
              )}
            </div>

            <div className="stat-item reliability-stat">
              <span className="stat-icon stat-blue"><ShieldCheck size={17} /></span>
              <div>
                <strong>{mapDataState === "ready" ? "Live" : mapDataState === "loading" ? "…" : mapDataState === "error" ? "Offline" : "Demo"}</strong>
                <span>Data status</span>
              </div>
              <small className="stat-trend">{lastUpdatedAt && mapDataState === "ready" ? lastUpdatedAt.toLocaleTimeString() : "Community reports"}</small>
            </div>
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
                  dataAvailable={mapDataState === "ready"}
                  onMapClick={handleMapClick}
                  onReportArea={handleReportArea}
                />
                <div className="map-scale"><span className="scale-line" /> 2 km</div>
                <div className="map-legend">
                  <span><i className="legend-green" />Active</span>
                  <span><i className="legend-red" />Down</span>
                  <span><i className="legend-gold" />Checking</span>
                  <span><i className="legend-blue" />Restored</span>
                </div>
                <button className="map-locate" aria-label="Center map on my location" title="Center on my location" disabled={locatingUser} onClick={handleLocateUser}>
                  {locatingUser ? <span className="spinner" /> : <Crosshair size={17} />}
                </button>
                <div className="map-source">&copy; OpenStreetMap &copy; Humanitarian OSM</div>
              </div>
              <div className="map-footer"><span><span className={`pulse-dot data-state-${mapDataState}`} />{mapDataState === "ready" ? <>Showing <span suppressHydrationWarning>{filteredOutages.length}</span> outage clusters</> : mapDataState === "error" ? "Outage data unavailable" : mapDataState === "loading" ? "Loading outage data" : "Demo mode · no live outage data"}</span><span>Cluster radius <strong>500 m</strong> · Click map to drop pin</span><button onClick={() => { setStatusFilter("all"); setArea("All barangays"); setTimeRange("24"); setSearch(""); }}>Reset filters <X size={13} /></button></div>
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
                  <span className="confidence"><small>{outage.reports} community report{outage.reports === 1 ? "" : "s"} · not utility-confirmed</small></span>
                </button>)}
                {filteredOutages.length === 0 && <div className="empty-list">No matching outages. Try a different area or status.</div>}
              </div>
              <button className="activity-link" onClick={() => router.push(isSignedIn ? "/reports" : "/login")}>View all activity <span>→</span></button>
            </aside>
          </div>

          {outages.length === 0 ? (
            <section className="detail-ribbon">
              <div className="detail-marker">
                <span className="detail-marker-dot" style={{ background: mapDataState === "ready" ? "#22c55e" : "#7b8580", color: "white" }}>
                  <Zap size={16} fill="currentColor" />
                </span>
              </div>
              <div className="detail-copy">
                <span className="panel-kicker">SURIGAO CITY · 54 BARANGAYS MONITORED</span>
                <h3>
                  {mapDataState === "ready" ? "No active outage reports" : mapDataState === "loading" ? "Loading outage data" : mapDataState === "error" ? "Outage data unavailable" : "Demo mode"}
                  <span className="inline-status" style={{ background: mapDataState === "ready" ? "#dcfce7" : "#eef0ed", color: mapDataState === "ready" ? "#15803d" : "#59645e", borderColor: mapDataState === "ready" ? "#86efac" : "#cbd1cc" }}>
                    {mapDataState === "ready" ? "Community status" : mapDataState === "error" ? "Unavailable" : mapDataState === "loading" ? "Loading" : "Local only"}
                  </span>
                </h3>
                <p>
                  {mapDataState === "ready" ? "No active outage clusters are currently reported; this is not confirmation from the utility." : mapDataState === "error" ? "The latest map update failed. Any previously loaded outage data may be stale." : mapDataState === "loading" ? "Waiting for the latest outage data." : "Live outage data is not connected in this demo."}{" "}
                  <button onClick={() => router.push(isSignedIn ? "/reports" : "/login")}>View report feed</button>
                </p>
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
                    {selected.status === "active" ? "Down" : selected.status === "unconfirmed" ? "Checking" : "Restored"}
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
              <div className="detail-metric"><strong>{selected.reported}</strong><span>report activity</span></div>
              <button className="detail-report" onClick={() => { handleReportArea(selected.area, selected.coordinates); }}><Plus size={15} /> Add report</button>
            </section>
          )}

          <footer className="page-footer"><span>GridSight shares community reports; status is not utility-confirmed.</span><button onClick={() => showToast("Outage clusters summarize community reports and should not be treated as official utility confirmation.")}><CircleHelp size={14} /> How to read this map</button><span className="footer-version">GRID SIGNAL v0.1</span></footer>
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
