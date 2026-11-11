"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, CircleAlert, Download, LoaderCircle, MapPin, ShieldCheck, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { AdminHeader } from "@/components/admin/admin-header";

type ReviewReport = {
  id: string;
  status: string;
  verification_status: string;
  notes: string | null;
  created_at: string;
  areas: { name: string; city: string }[] | null;
};
type AdminOutage = { id: string; area_name: string; city: string; status: "unconfirmed" | "active" | "restored"; report_count: number; first_reported_at: string };
type AreaAnalytics = { area_id: string; area_name: string; city: string; outages_last_30_days: number; total_outages: number; active_outages: number; average_restoration_minutes: number | null };

export default function AdminPage() {
  const [reports, setReports] = useState<ReviewReport[]>([]);
  const [outages, setOutages] = useState<AdminOutage[]>([]);
  const [reportsToday, setReportsToday] = useState(0);
  const [overrides, setOverrides] = useState<Record<string, AdminOutage["status"]>>({});
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AreaAnalytics[]>([]);
  const [authorized, setAuthorized] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("pending");
  const [areaFilter, setAreaFilter] = useState("all");
  const [reportStatusFilter, setReportStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [toDateFilter, setToDateFilter] = useState("");
  const [busyId, setBusyId] = useState("");

  const loadReports = useCallback(async () => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setError("Admin services are not configured. Add Supabase settings to .env.local.");
      setLoading(false);
      return;
    }
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Sign in with an administrator account to continue."); setLoading(false); return; }
    if (!user.email_confirmed_at) { setError("Confirm your account email before using administrator features."); setLoading(false); return; }
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") { setError("This dashboard is restricted to GridSight administrators."); setLoading(false); return; }
    const { data: assurance, error: assuranceError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assuranceError) { setError("Your MFA status could not be verified."); setLoading(false); return; }
    if (assurance.currentLevel !== "aal2") {
      setMfaRequired(true);
      setError("Verify an MFA challenge before using administrator features.");
      setLoading(false);
      return;
    }
    setAuthorized(true);
    const query = supabase.from("reports").select("id, status, verification_status, notes, created_at, areas(name, city)").order("created_at", { ascending: false }).limit(250);
    const { data, error: queryError } = filter === "pending" ? await query.eq("verification_status", "pending") : await query;
    if (queryError) setError("Incoming reports could not be loaded.");
    else setReports(((data ?? []) as ReviewReport[]).map((row) => ({
      ...row,
      areas: Array.isArray(row.areas) ? row.areas : row.areas ? [row.areas] : null,
    })));
    const { data: outageRows } = await supabase.from("outage_map").select("id, area_name, city, status, report_count, first_reported_at").eq("area_type", "barangay").order("first_reported_at", { ascending: false }).limit(300);
    setOutages((outageRows ?? []) as AdminOutage[]);
    const { data: analyticsRows } = await supabase.rpc("admin_area_analytics");
    setAnalytics((analyticsRows ?? []) as AreaAnalytics[]);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count } = await supabase.from("reports").select("id", { count: "exact", head: true }).gte("created_at", today.toISOString());
    setReportsToday(count ?? 0);
    setLoading(false);
  }, [filter]);

  useEffect(() => { void loadReports(); }, [loadReports]);

  const visibleReports = useMemo(() => reports.filter((report) => {
    const area = report.areas?.[0];
    return (areaFilter === "all" || area?.name === areaFilter) &&
      (reportStatusFilter === "all" || report.status === reportStatusFilter) &&
      (!dateFilter || report.created_at >= new Date(`${dateFilter}T00:00:00`).toISOString()) &&
      (!toDateFilter || report.created_at <= new Date(`${toDateFilter}T23:59:59.999`).toISOString());
  }), [areaFilter, dateFilter, reportStatusFilter, reports, toDateFilter]);

  async function moderate(reportId: string, action: "verified" | "dismissed") {
    setBusyId(reportId);
    setError("");
    const response = await fetch(`/api/admin/reports/${reportId}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      setError(result.error || "The action could not be saved.");
    } else {
      await loadReports();
    }
    setBusyId("");
  }

  async function overrideOutage(outageId: string) {
    const status = overrides[outageId];
    if (!status) return;
    setBusyId(outageId);
    const response = await fetch(`/api/admin/outages/${outageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      setError(result.error || "The outage status could not be updated.");
    } else {
      setOutages((current) => current.map((outage) => outage.id === outageId ? { ...outage, status } : outage));
      setError("");
    }
    setBusyId("");
  }

  return (
    <main className="admin-page">
      <AdminHeader activePage="desk" />
      <div className="admin-content">
        <div className="admin-heading"><div><span className="eyebrow">REPORT REVIEW · SURIGAO CITY · BARANGAY PILOT</span><h1>Signal desk</h1><p>Review community observations and keep the outage picture credible.</p></div><div className="admin-stat"><span>INCOMING REPORTS</span><strong suppressHydrationWarning>{reports.length.toString().padStart(2, "0")}</strong></div></div>
        <div className="admin-summary"><div><span className="summary-icon red"><CircleAlert size={17} /></span><span><strong suppressHydrationWarning>{reports.filter((report) => report.verification_status === "pending").length}</strong><small>Awaiting review</small></span></div><div><span className="summary-icon green"><Check size={17} /></span><span><strong suppressHydrationWarning>{outages.filter((outage) => outage.status === "active").length}</strong><small>Active outages</small></span></div><div><span className="summary-icon gray"><ShieldCheck size={17} /></span><span><strong suppressHydrationWarning>{reportsToday}</strong><small>Reports today</small></span></div><div><span className="summary-icon gray"><MapPin size={17} /></span><span><strong suppressHydrationWarning>{new Set(outages.filter((outage) => outage.status !== "restored").map((outage) => outage.area_name)).size}</strong><small>Barangays affected</small></span></div></div>
        <section className="review-panel"><div className="review-toolbar"><div><span className="panel-kicker">COMMUNITY FEED</span><h2>Incoming reports</h2></div><div className="review-filters"><label className="review-filter">Review <select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="pending">Needs review</option><option value="all">All reports</option></select></label><label className="review-filter">Barangay <select value={areaFilter} onChange={(event) => setAreaFilter(event.target.value)}><option value="all">All barangays</option>{Array.from(new Set(reports.flatMap((report) => report.areas?.map((area) => area.name) ?? []).filter((name): name is string => Boolean(name)))).map((name) => <option key={name}>{name}</option>)}</select></label><label className="review-filter">Status <select value={reportStatusFilter} onChange={(event) => setReportStatusFilter(event.target.value)}><option value="all">All</option><option value="no_power">No power</option><option value="flickering">Flickering</option><option value="restored">Restored</option></select></label><label className="review-filter">From <input aria-label="Filter reports from date" type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} /></label><label className="review-filter">To <input aria-label="Filter reports through date" type="date" value={toDateFilter} onChange={(event) => setToDateFilter(event.target.value)} /></label></div></div>
        <div className="review-export-row"><div><a className="csv-export" href={`/api/admin/export${dateFilter || toDateFilter ? `?${dateFilter ? `from=${encodeURIComponent(dateFilter)}` : ""}${dateFilter && toDateFilter ? "&" : ""}${toDateFilter ? `to=${encodeURIComponent(toDateFilter)}` : ""}` : ""}`}><Download size={14} /> Export CSV</a></div></div>
          {error && <div className="admin-error" role="alert">{error}{mfaRequired ? <Link href="/admin/accounts">Set up MFA</Link> : !authorized && <Link href="/login">Sign in</Link>}</div>}
          {loading ? <div className="admin-loading"><LoaderCircle size={18} className="loading-icon" /> Loading reports</div> : authorized && <div className="table-scroll"><table className="review-table"><thead><tr><th>AREA / SUBMITTED</th><th>OBSERVATION</th><th>NOTE</th><th>REVIEW</th><th>ACTION</th></tr></thead><tbody>
            {visibleReports.map((report) => {
              const area = report.areas?.[0];
              return <tr key={report.id}><td><strong>{area?.name ?? "Unknown area"}</strong><small>{area?.city ?? ""} · {new Date(report.created_at).toLocaleString()}</small></td><td><span className={`review-state review-${report.status}`}>{report.status.replace("_", " ")}</span></td><td className="review-note">{report.notes || "No note provided"}</td><td><span className={`review-state review-${report.verification_status}`}>{report.verification_status}</span></td><td><div className="review-actions"><button aria-label="Verify report" title="Verify report" disabled={busyId === report.id} onClick={() => moderate(report.id, "verified")}><Check size={15} /></button><button aria-label="Dismiss report" title="Dismiss report" disabled={busyId === report.id} onClick={() => moderate(report.id, "dismissed")}><X size={15} /></button></div></td></tr>;
            })}
            {visibleReports.length === 0 && <tr><td colSpan={5} className="no-reports">No reports match these filters.</td></tr>}
          </tbody></table></div>}
        </section>
        <section className="review-panel outage-control-panel"><div className="review-toolbar"><div><span className="panel-kicker">LIVE CLUSTERS</span><h2>Outage status control</h2></div><span className="review-filter">Admin overrides</span></div><div className="table-scroll"><table className="review-table"><thead><tr><th>AREA</th><th>REPORTS</th><th>FIRST REPORTED</th><th>CURRENT STATUS</th><th>OVERRIDE</th></tr></thead><tbody>{outages.map((outage) => <tr key={outage.id}><td><strong>{outage.area_name}</strong><small>{outage.city}</small></td><td>{outage.report_count}</td><td>{new Date(outage.first_reported_at).toLocaleString()}</td><td><span className={`review-state review-${outage.status}`}>{outage.status}</span></td><td><div className="override-control"><select aria-label={`Override status for ${outage.area_name}`} value={overrides[outage.id] ?? outage.status} onChange={(event) => setOverrides((current) => ({ ...current, [outage.id]: event.target.value as AdminOutage["status"] }))}><option value="unconfirmed">Unconfirmed</option><option value="active">Active</option><option value="restored">Restored</option></select><button disabled={busyId === outage.id || !overrides[outage.id] || overrides[outage.id] === outage.status} onClick={() => void overrideOutage(outage.id)}>Apply</button></div></td></tr>)}{outages.length === 0 && <tr><td colSpan={5} className="no-reports">No outage clusters to manage.</td></tr>}</tbody></table></div></section>
        <p className="admin-footnote"><ShieldCheck size={14} /> Every verify or dismiss action is stored with the administrator identity and timestamp.</p>
        <section className="review-panel analytics-panel"><div className="review-toolbar"><div><span className="panel-kicker">HISTORICAL SIGNALS</span><h2>Area trends</h2></div><span className="review-filter">30-day frequency · all-time restoration average</span></div><div className="table-scroll"><table className="review-table"><thead><tr><th>AREA</th><th>OUTAGES · 30 DAYS</th><th>ACTIVE</th><th>ALL-TIME OUTAGES</th><th>AVG RESTORATION</th></tr></thead><tbody>{analytics.map((item) => <tr key={item.area_id}><td><strong>{item.area_name}</strong><small>{item.city}</small></td><td>{item.outages_last_30_days}</td><td>{item.active_outages}</td><td>{item.total_outages}</td><td>{item.average_restoration_minutes == null ? "—" : `${Math.round(item.average_restoration_minutes)} min`}</td></tr>)}{analytics.length === 0 && <tr><td colSpan={5} className="no-reports">Historical metrics will appear as outages are recorded.</td></tr>}</tbody></table></div></section>
      </div>
    </main>
  );
}
