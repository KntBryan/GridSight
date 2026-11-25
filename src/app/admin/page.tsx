"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardList,
  FileDown,
  LoaderCircle,
  MapPin,
  RefreshCw,
  Send,
  ShieldCheck,
  X,
  Zap,
  Camera,
  ExternalLink,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminMfaModal } from "@/components/admin/admin-mfa-modal";
import { ThemeProvider, useTheme } from "@/components/preview/preview-theme";

type ReviewReport = {
  id: string;
  status: string;
  verification_status: string;
  notes: string | null;
  photo_path: string | null;
  created_at: string;
  areas: { name: string; city: string }[] | null;
};

type AdminOutage = {
  id: string;
  area_name: string;
  city: string;
  status: "unconfirmed" | "active" | "restored";
  report_count: number;
  first_reported_at: string;
};

type AreaAnalytics = {
  area_id: string;
  area_name: string;
  city: string;
  outages_last_30_days: number;
  total_outages: number;
  active_outages: number;
  average_restoration_minutes: number | null;
};

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDays = Math.floor(diffHour / 24);
  return `${diffDays}d ago`;
}

function StatusPill({
  label,
  tone = "gray",
}: {
  label: string;
  tone?: "red" | "amber" | "green" | "blue" | "gray";
}) {
  const tones = {
    red: "bg-rose-500/10 text-rose-700 dark:text-rose-400 ring-rose-500/20 dot-bg-rose-500",
    amber: "bg-amber-500/10 text-amber-800 dark:text-amber-300 ring-amber-500/20 dot-bg-amber-500",
    green: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-emerald-500/20 dot-bg-emerald-500",
    blue: "bg-blue-500/10 text-blue-700 dark:text-blue-400 ring-blue-500/20 dot-bg-blue-500",
    gray: "bg-slate-500/10 text-slate-700 dark:text-slate-300 ring-slate-500/20 dot-bg-slate-400",
  };

  const dots = {
    red: "bg-rose-500",
    amber: "bg-amber-500",
    green: "bg-emerald-500",
    blue: "bg-blue-500",
    gray: "bg-slate-400",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ring-1 ring-inset ${tones[tone]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dots[tone]}`} />
      {label}
    </span>
  );
}

function AdminPageInner() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [reports, setReports] = useState<ReviewReport[]>([]);
  const [outages, setOutages] = useState<AdminOutage[]>([]);
  const [reportsToday, setReportsToday] = useState(0);
  const [overrides, setOverrides] = useState<Record<string, AdminOutage["status"]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState<AreaAnalytics[]>([]);
  const [authorized, setAuthorized] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [mobileSection, setMobileSection] = useState<"queue" | "outages" | "analytics">("queue");
  const [busyId, setBusyId] = useState("");
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Review confirmation modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [activeReport, setActiveReport] = useState<ReviewReport | null>(null);
  const [reviewAction, setReviewAction] = useState<"verified" | "dismissed">("verified");
  const [reviewReason, setReviewReason] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [activePhotoModal, setActivePhotoModal] = useState<{ url: string; areaName: string } | null>(null);
  const [photoLoadingId, setPhotoLoadingId] = useState<string | null>(null);

  const handleViewPhoto = async (report: ReviewReport) => {
    if (!report.photo_path) return;
    setPhotoLoadingId(report.id);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.storage.from("report-photos").createSignedUrl(report.photo_path, 3600);
      if (error || !data?.signedUrl) {
        setError("Could not load report photo.");
        return;
      }
      setActivePhotoModal({
        url: data.signedUrl,
        areaName: report.areas?.[0]?.name || "Surigao City Area",
      });
    } catch {
      setError("Could not load report photo.");
    } finally {
      setPhotoLoadingId(null);
    }
  };

  const loadReports = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setError("Admin services are not configured. Add Supabase settings to .env.local.");
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Sign in with an administrator account to continue.");
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (!user.email_confirmed_at) {
      setError("Confirm your account email before using administrator features.");
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin") {
      setError("This dashboard is restricted to GridSight administrators.");
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const { data: assurance, error: assuranceError } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assuranceError) {
      setError("Your MFA status could not be verified.");
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (assurance.currentLevel !== "aal2") {
      setMfaRequired(true);
      setError("Verify an MFA challenge before using administrator features.");
      setLoading(false);
      setRefreshing(false);
      return;
    }
    setAuthorized(true);

    const { data, error: queryError } = await supabase
      .from("reports")
      .select("id, status, verification_status, notes, photo_path, created_at, areas(name, city)")
      .order("created_at", { ascending: false })
      .limit(250);

    if (queryError) {
      setError("Incoming reports could not be loaded.");
    } else {
      setReports(
        ((data ?? []) as ReviewReport[]).map((row) => ({
          ...row,
          areas: Array.isArray(row.areas) ? row.areas : row.areas ? [row.areas] : null,
        }))
      );
    }

    const { data: outageRows } = await supabase
      .from("outage_map")
      .select("id, area_name, city, status, report_count, first_reported_at")
      .eq("area_type", "barangay")
      .order("first_reported_at", { ascending: false })
      .limit(300);
    setOutages((outageRows ?? []) as AdminOutage[]);

    const { data: analyticsRows } = await supabase.rpc("admin_area_analytics");
    setAnalytics((analyticsRows ?? []) as AreaAnalytics[]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .gte("created_at", today.toISOString());
    setReportsToday(count ?? 0);

    setLastRefreshed(new Date());
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  function openReviewModal(report: ReviewReport, action: "verified" | "dismissed") {
    setActiveReport(report);
    setReviewAction(action);
    setReviewReason("");
    setReviewModalOpen(true);
  }

  async function handleConfirmReview() {
    if (!activeReport || submittingReview) return;
    setSubmittingReview(true);
    setBusyId(activeReport.id);
    setError("");

    try {
      const response = await fetch(`/api/admin/reports/${activeReport.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: reviewAction,
          reason: reviewReason.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        setError(result.error || "The action could not be saved.");
      } else {
        setReviewModalOpen(false);
        setActiveReport(null);
        setReviewReason("");
        await loadReports();
      }
    } catch {
      setError("Network error while submitting review.");
    } finally {
      setSubmittingReview(false);
      setBusyId("");
    }
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
      setOutages((current) =>
        current.map((outage) => (outage.id === outageId ? { ...outage, status } : outage))
      );
      setError("");
    }
    setBusyId("");
  }

  // Derived counts
  const activeOutagesCount = useMemo(
    () => outages.filter((o) => o.status === "active").length,
    [outages]
  );
  const checkingOutagesCount = useMemo(
    () => outages.filter((o) => o.status === "unconfirmed").length,
    [outages]
  );
  const restoredOutagesCount = useMemo(
    () => outages.filter((o) => o.status === "restored").length,
    [outages]
  );
  const pendingReports = useMemo(
    () => reports.filter((r) => r.verification_status === "pending"),
    [reports]
  );
  const pendingReportsCount = pendingReports.length;
  const allReportsCount = reports.length;

  const displayedReports = useMemo(
    () => (filter === "pending" ? pendingReports : reports),
    [filter, pendingReports, reports]
  );

  const openOutages = useMemo(
    () => outages.filter((o) => o.status !== "restored").slice(0, 6),
    [outages]
  );

  return (
    <div
      className={`admin-page min-h-screen transition-colors ${
        isDark ? "bg-[#061120] text-white" : "bg-[#f8fafc] text-slate-900"
      }`}
      data-admin-theme={theme}
    >
      <AdminHeader activePage="desk" />

      <main className="mx-auto w-full max-w-[1240px] px-3.5 py-5 sm:px-8 sm:py-8">
        {/* Workspace Page Header */}
        <div className="mb-5 sm:mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="mb-1 text-[10.5px] sm:text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">
              City operations
            </p>
            <h1 className="font-heading text-[22px] sm:text-[32px] font-extrabold leading-tight tracking-tight">
              Operations workspace
            </h1>
            <p
              className={`mt-1 max-w-2xl text-[12.5px] sm:text-[13.5px] leading-relaxed ${
                isDark ? "text-white/60" : "text-slate-600"
              }`}
            >
              Monitor community reports, set verified outage status, and publish updates. Only
              administrators see this workspace.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-[11.5px] font-semibold shadow-sm transition ${
                isDark ? "border-white/10 bg-white/5 text-white" : "border-slate-200 bg-white text-slate-800"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
            <button
              type="button"
              onClick={() => void loadReports(true)}
              disabled={refreshing}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-[11.5px] font-semibold shadow-sm transition active:scale-95 ${
                isDark
                  ? "border-white/10 bg-white/5 text-white hover:border-blue-400 hover:text-blue-400"
                  : "border-slate-200 bg-white text-slate-800 hover:border-blue-500 hover:text-blue-600"
              }`}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div
            className={`mb-6 rounded-2xl border p-4 text-[13px] leading-relaxed ${
              isDark
                ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
                : "border-rose-200 bg-rose-50 text-rose-800"
            }`}
            role="alert"
          >
            {error}
            {mfaRequired ? (
              <>
                <button
                  type="button"
                  onClick={() => setMfaRequired(true)}
                  className="ml-3 font-bold underline hover:opacity-80"
                >
                  Enter MFA code
                </button>
                <Link href="/admin/accounts" className="ml-3 font-semibold underline hover:opacity-80">
                  Configure MFA
                </Link>
              </>
            ) : (
              !authorized && (
                <Link href="/login" className="ml-3 font-semibold underline hover:opacity-80">
                  Sign in
                </Link>
              )
            )}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <LoaderCircle size={32} className="animate-spin text-blue-500" />
            <p className={`mt-3 text-[13.5px] ${isDark ? "text-white/60" : "text-slate-500"}`}>
              Loading operations workspace…
            </p>
          </div>
        ) : !authorized ? null : (
          <>
            {/* 4 Elevated Stat Cards - 2x2 on mobile, 4 columns on large */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {/* Card 1: Active outages */}
              <div
                className={`rounded-2xl border p-3.5 sm:p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-300 hover:shadow-md ${
                  isDark ? "border-white/10 bg-[#0f1e30]" : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="grid h-8 w-8 sm:h-10 sm:w-10 place-items-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    <Zap className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={2} />
                  </span>
                </div>
                <p className="mt-2.5 sm:mt-4 font-heading text-[22px] sm:text-[30px] font-extrabold leading-none tracking-tight">
                  {activeOutagesCount}
                </p>
                <p className="mt-1.5 sm:mt-2 text-[12px] sm:text-[13px] font-semibold truncate">Active outages</p>
                <p className={`mt-0.5 text-[10.5px] sm:text-[11.5px] truncate ${isDark ? "text-white/50" : "text-slate-500"}`}>
                  Power confirmed down
                </p>
              </div>

              {/* Card 2: Checking */}
              <div
                className={`rounded-2xl border p-3.5 sm:p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-300 hover:shadow-md ${
                  isDark ? "border-white/10 bg-[#0f1e30]" : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="grid h-8 w-8 sm:h-10 sm:w-10 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Activity className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={2} />
                  </span>
                </div>
                <p className="mt-2.5 sm:mt-4 font-heading text-[22px] sm:text-[30px] font-extrabold leading-none tracking-tight">
                  {checkingOutagesCount}
                </p>
                <p className="mt-1.5 sm:mt-2 text-[12px] sm:text-[13px] font-semibold truncate">Checking</p>
                <p className={`mt-0.5 text-[10.5px] sm:text-[11.5px] truncate ${isDark ? "text-white/50" : "text-slate-500"}`}>
                  Not yet confirmed
                </p>
              </div>

              {/* Card 3: Reports to review */}
              <div
                className={`rounded-2xl border p-3.5 sm:p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-300 hover:shadow-md ${
                  isDark ? "border-white/10 bg-[#0f1e30]" : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="grid h-8 w-8 sm:h-10 sm:w-10 place-items-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <ClipboardList className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={2} />
                  </span>
                </div>
                <p className="mt-2.5 sm:mt-4 font-heading text-[22px] sm:text-[30px] font-extrabold leading-none tracking-tight">
                  {pendingReportsCount}
                </p>
                <p className="mt-1.5 sm:mt-2 text-[12px] sm:text-[13px] font-semibold truncate">Needs review</p>
                <p className={`mt-0.5 text-[10.5px] sm:text-[11.5px] truncate ${isDark ? "text-white/50" : "text-slate-500"}`}>
                  Waiting for decision
                </p>
              </div>

              {/* Card 4: Restored */}
              <div
                className={`rounded-2xl border p-3.5 sm:p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-300 hover:shadow-md ${
                  isDark ? "border-white/10 bg-[#0f1e30]" : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="grid h-8 w-8 sm:h-10 sm:w-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={2} />
                  </span>
                </div>
                <p className="mt-2.5 sm:mt-4 font-heading text-[22px] sm:text-[30px] font-extrabold leading-none tracking-tight">
                  {restoredOutagesCount}
                </p>
                <p className="mt-1.5 sm:mt-2 text-[12px] sm:text-[13px] font-semibold truncate">Restored</p>
                <p className={`mt-0.5 text-[10.5px] sm:text-[11.5px] truncate ${isDark ? "text-white/50" : "text-slate-500"}`}>
                  Verified power back
                </p>
              </div>
            </div>

            {/* Mobile Section Switcher (< lg) */}
            <div
              className={`mt-5 flex lg:hidden items-center rounded-xl border p-1 text-[12px] font-semibold ${
                isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-100"
              }`}
            >
              <button
                type="button"
                onClick={() => setMobileSection("queue")}
                className={`flex-1 rounded-lg py-2 text-center transition active:scale-95 ${
                  mobileSection === "queue"
                    ? "bg-blue-600 text-white shadow-sm"
                    : isDark
                    ? "text-white/70 hover:text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Queue ({pendingReportsCount})
              </button>
              <button
                type="button"
                onClick={() => setMobileSection("outages")}
                className={`flex-1 rounded-lg py-2 text-center transition active:scale-95 ${
                  mobileSection === "outages"
                    ? "bg-blue-600 text-white shadow-sm"
                    : isDark
                    ? "text-white/70 hover:text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Outages ({openOutages.length})
              </button>
              <button
                type="button"
                onClick={() => setMobileSection("analytics")}
                className={`flex-1 rounded-lg py-2 text-center transition active:scale-95 ${
                  mobileSection === "analytics"
                    ? "bg-blue-600 text-white shadow-sm"
                    : isDark
                    ? "text-white/70 hover:text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Trends
              </button>
            </div>

            {/* Main Operations Grid */}
            <div className="mt-4 sm:mt-6 grid gap-5 lg:grid-cols-[1fr_340px]">
              {/* Left Column: Live report queue */}
              <section
                className={`overflow-hidden rounded-2xl border shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${
                  mobileSection === "queue" ? "block" : "hidden lg:block"
                } ${
                  isDark ? "border-white/10 bg-[#0f1e30]" : "border-slate-200 bg-white"
                }`}
              >
                <header
                  className={`flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${
                    isDark ? "border-white/10" : "border-slate-200"
                  }`}
                >
                  <div>
                    <h2 className="font-heading text-[16px] font-bold">Live report queue</h2>
                    <p className={`mt-0.5 text-[12.5px] ${isDark ? "text-white/60" : "text-slate-500"}`}>
                      Newest community reports · refreshed {timeAgo(lastRefreshed.toISOString())}
                    </p>
                  </div>
                  <div
                    className={`inline-flex rounded-xl border p-1 text-[12px] font-semibold ${
                      isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-100/80"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setFilter("pending")}
                      className={`rounded-lg px-3 py-1 transition ${
                        filter === "pending"
                          ? "bg-blue-600 text-white shadow-sm"
                          : isDark
                          ? "text-white/70 hover:text-white"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Needs review ({pendingReportsCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilter("all")}
                      className={`rounded-lg px-3 py-1 transition ${
                        filter === "all"
                          ? "bg-blue-600 text-white shadow-sm"
                          : isDark
                          ? "text-white/70 hover:text-white"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      All reports ({allReportsCount})
                    </button>
                  </div>
                </header>

                <div className="px-5 py-3">
                  {displayedReports.length === 0 ? (
                    <div className="py-14 text-center">
                      <p className={`text-[13px] ${isDark ? "text-white/60" : "text-slate-500"}`}>
                        No reports match the current filter.
                      </p>
                    </div>
                  ) : (
                    <ul className={`divide-y ${isDark ? "divide-white/10" : "divide-slate-200"}`}>
                      {displayedReports.map((report) => {
                        const areaName = report.areas?.[0]?.name || "Unknown area";
                        const cityName = report.areas?.[0]?.city || "Surigao City";
                        const observationTone =
                          report.status === "no_power"
                            ? "red"
                            : report.status === "flickering"
                            ? "amber"
                            : report.status === "restored"
                            ? "green"
                            : "gray";

                        return (
                          <li
                            key={report.id}
                            className="flex flex-col gap-2.5 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0 flex-1 pr-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-[13.5px] font-semibold">{areaName}</p>
                                <StatusPill
                                  label={report.status.replace("_", " ")}
                                  tone={observationTone}
                                />
                                <span
                                  className={`text-[11px] ${
                                    isDark ? "text-white/50" : "text-slate-400"
                                  }`}
                                >
                                  {cityName} · {timeAgo(report.created_at)}
                                </span>
                              </div>
                              {report.notes && (
                                <p
                                  className={`mt-1 line-clamp-2 text-[12px] leading-relaxed ${
                                    isDark ? "text-white/70" : "text-slate-600"
                                  }`}
                                >
                                  {report.notes}
                                </p>
                              )}
                              {report.photo_path && (
                                <div className="mt-1.5 flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleViewPhoto(report)}
                                    disabled={photoLoadingId === report.id}
                                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-semibold transition active:scale-95 ${
                                      isDark
                                        ? "border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20"
                                        : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                                    }`}
                                  >
                                    {photoLoadingId === report.id ? (
                                      <LoaderCircle className="h-3 w-3 animate-spin text-blue-400" />
                                    ) : (
                                      <Camera className="h-3 w-3 text-blue-500" />
                                    )}
                                    <span>View photo evidence</span>
                                  </button>
                                </div>
                              )}
                            </div>

                            <div className="flex shrink-0 items-center gap-2 mt-2 sm:mt-0 w-full sm:w-auto">
                              {report.verification_status === "pending" ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => openReviewModal(report, "verified")}
                                    disabled={busyId === report.id}
                                    className={`inline-flex h-10 sm:h-8 min-h-[44px] sm:min-h-0 flex-1 sm:flex-none justify-center items-center gap-1.5 rounded-xl border px-3 text-[12.5px] sm:text-[12px] font-semibold transition active:scale-95 ${
                                      isDark
                                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                                        : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                    }`}
                                  >
                                    <Check className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                                    Verify
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openReviewModal(report, "dismissed")}
                                    disabled={busyId === report.id}
                                    className={`inline-flex h-10 sm:h-8 min-h-[44px] sm:min-h-0 flex-1 sm:flex-none justify-center items-center gap-1.5 rounded-xl border px-3 text-[12.5px] sm:text-[12px] font-semibold transition active:scale-95 ${
                                      isDark
                                        ? "border-white/10 bg-white/5 text-white/70 hover:bg-rose-500/10 hover:text-rose-300"
                                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-rose-50 hover:text-rose-700"
                                    }`}
                                  >
                                    <X className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                                    Dismiss
                                  </button>
                                </>
                              ) : (
                                <div className="flex flex-col items-end gap-0.5">
                                  <StatusPill
                                    label={
                                      report.verification_status === "verified"
                                        ? "Verified"
                                        : "Dismissed"
                                    }
                                    tone={
                                      report.verification_status === "verified"
                                        ? "green"
                                        : "gray"
                                    }
                                  />
                                  <span
                                    className={`text-[10px] ${
                                      isDark ? "text-white/40" : "text-slate-400"
                                    }`}
                                  >
                                    Reviewed
                                  </span>
                                </div>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </section>

              {/* Right Column: Quick Actions & Open Outages */}
              <div className={`space-y-5 ${mobileSection === "outages" ? "block" : "hidden lg:block"}`}>
                {/* Quick Actions Card */}
                <section
                  className={`overflow-hidden rounded-2xl border p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${
                    isDark ? "border-white/10 bg-[#0f1e30]" : "border-slate-200 bg-white"
                  }`}
                >
                  <h2 className="font-heading text-[15.5px] font-bold">Quick actions</h2>
                  <div className="mt-3.5 flex flex-col gap-2">
                    <Link
                      href="/admin/updates"
                      className={`flex items-center justify-between rounded-xl border px-3.5 py-3 text-[12.5px] font-semibold transition ${
                        isDark
                          ? "border-white/10 bg-white/5 text-white hover:border-blue-400 hover:bg-white/10"
                          : "border-slate-200 bg-slate-50 text-slate-800 hover:border-blue-500 hover:bg-slate-100"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Send size={15} className="text-blue-500" />
                        Post a community update
                      </span>
                      <ArrowRight size={14} className={isDark ? "text-white/40" : "text-slate-400"} />
                    </Link>

                    <Link
                      href="/admin/accounts"
                      className={`flex items-center justify-between rounded-xl border px-3.5 py-3 text-[12.5px] font-semibold transition ${
                        isDark
                          ? "border-white/10 bg-white/5 text-white hover:border-blue-400 hover:bg-white/10"
                          : "border-slate-200 bg-slate-50 text-slate-800 hover:border-blue-500 hover:bg-slate-100"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <ShieldCheck size={15} className="text-emerald-500" />
                        Manage accounts & access
                      </span>
                      <ArrowRight size={14} className={isDark ? "text-white/40" : "text-slate-400"} />
                    </Link>

                    <a
                      href="/api/admin/export"
                      className={`flex items-center justify-between rounded-xl border px-3.5 py-3 text-[12.5px] font-semibold transition ${
                        isDark
                          ? "border-white/10 bg-white/5 text-white hover:border-blue-400 hover:bg-white/10"
                          : "border-slate-200 bg-slate-50 text-slate-800 hover:border-blue-500 hover:bg-slate-100"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <FileDown size={15} className="text-purple-500" />
                        Export reports (CSV)
                      </span>
                      <ArrowRight size={14} className={isDark ? "text-white/40" : "text-slate-400"} />
                    </a>
                  </div>
                </section>

                {/* Open Outages Card with Overrides */}
                <section
                  className={`overflow-hidden rounded-2xl border shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${
                    isDark ? "border-white/10 bg-[#0f1e30]" : "border-slate-200 bg-white"
                  }`}
                >
                  <header
                    className={`border-b px-5 py-4 ${
                      isDark ? "border-white/10" : "border-slate-200"
                    }`}
                  >
                    <h2 className="font-heading text-[15.5px] font-bold">Open outages</h2>
                    <p className={`mt-0.5 text-[12.5px] ${isDark ? "text-white/60" : "text-slate-500"}`}>
                      Active barangay clusters and overrides
                    </p>
                  </header>
                  <div className="px-5 py-2">
                    {openOutages.length === 0 ? (
                      <p
                        className={`py-6 text-center text-[12.5px] ${
                          isDark ? "text-white/60" : "text-slate-500"
                        }`}
                      >
                        No open outages right now.
                      </p>
                    ) : (
                      <ul className={`divide-y ${isDark ? "divide-white/10" : "divide-slate-200"}`}>
                        {openOutages.map((outage) => (
                          <li
                            key={outage.id}
                            className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13px] font-semibold">
                                {outage.area_name}
                              </p>
                              <p
                                className={`text-[11px] ${
                                  isDark ? "text-white/50" : "text-slate-500"
                                }`}
                              >
                                {outage.report_count || 0} report
                                {(outage.report_count || 0) === 1 ? "" : "s"}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2 mt-2 sm:mt-0 w-full sm:w-auto">
                              <select
                                aria-label={`Override status for ${outage.area_name}`}
                                value={overrides[outage.id] ?? outage.status}
                                onChange={(e) =>
                                  setOverrides((cur) => ({
                                    ...cur,
                                    [outage.id]: e.target.value as AdminOutage["status"],
                                  }))
                                }
                                className={`h-10 sm:h-auto min-h-[44px] sm:min-h-0 flex-1 sm:flex-none rounded-lg border px-2.5 py-1 text-[12px] sm:text-[11.5px] font-medium outline-none transition ${
                                  isDark
                                    ? "border-white/15 bg-white/5 text-white focus:border-blue-400"
                                    : "border-slate-300 bg-white text-slate-800 focus:border-blue-500"
                                }`}
                              >
                                <option value="unconfirmed">Checking</option>
                                <option value="active">Active</option>
                                <option value="restored">Restored</option>
                              </select>
                              {overrides[outage.id] && overrides[outage.id] !== outage.status && (
                                <button
                                  type="button"
                                  disabled={busyId === outage.id}
                                  onClick={() => void overrideOutage(outage.id)}
                                  className="h-10 sm:h-auto min-h-[44px] sm:min-h-0 rounded-lg bg-blue-600 px-3.5 py-1 text-[12px] sm:text-[11px] font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95"
                                >
                                  {busyId === outage.id ? "Saving…" : "Apply"}
                                </button>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </section>
              </div>
            </div>

            {/* Bottom Section: Historical Signals & Area Trends */}
            <section
              className={`mt-6 overflow-hidden rounded-2xl border shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${
                mobileSection === "analytics" ? "block" : "hidden lg:block"
              } ${
                isDark ? "border-white/10 bg-[#0f1e30]" : "border-slate-200 bg-white"
              }`}
            >
              <header
                className={`border-b px-5 py-4 ${
                  isDark ? "border-white/10" : "border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-heading text-[15.5px] font-bold">
                      Historical signals · Area trends
                    </h2>
                    <p className={`mt-0.5 text-[12.5px] ${isDark ? "text-white/60" : "text-slate-500"}`}>
                      30-day frequency and all-time restoration averages across pilot barangays
                    </p>
                  </div>
                  <span
                    className={`text-[11px] font-semibold ${
                      isDark ? "text-white/50" : "text-slate-400"
                    }`}
                  >
                    Updated hourly
                  </span>
                </div>
              </header>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-[12.5px]">
                  <thead
                    className={`border-b text-[11px] uppercase tracking-wider font-semibold ${
                      isDark
                        ? "border-white/10 bg-white/[0.02] text-white/60"
                        : "border-slate-200 bg-slate-50 text-slate-500"
                    }`}
                  >
                    <tr>
                      <th className="px-5 py-3 font-semibold">Barangay</th>
                      <th className="px-5 py-3 font-semibold">City</th>
                      <th className="px-5 py-3 font-semibold">Outages (30d)</th>
                      <th className="px-5 py-3 font-semibold">Active Now</th>
                      <th className="px-5 py-3 font-semibold">All-Time Outages</th>
                      <th className="px-5 py-3 font-semibold">Avg. Restoration</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? "divide-white/10" : "divide-slate-200"}`}>
                    {analytics.map((item) => (
                      <tr
                        key={item.area_id}
                        className={`transition-colors ${
                          isDark ? "hover:bg-white/[0.02]" : "hover:bg-slate-50"
                        }`}
                      >
                        <td className="px-5 py-3 font-semibold">{item.area_name}</td>
                        <td className={`px-5 py-3 ${isDark ? "text-white/60" : "text-slate-500"}`}>
                          {item.city}
                        </td>
                        <td className="px-5 py-3 font-mono">{item.outages_last_30_days}</td>
                        <td className="px-5 py-3 font-mono">
                          {item.active_outages > 0 ? (
                            <span className="font-bold text-rose-500">{item.active_outages}</span>
                          ) : (
                            "0"
                          )}
                        </td>
                        <td className="px-5 py-3 font-mono">{item.total_outages}</td>
                        <td className={`px-5 py-3 ${isDark ? "text-white/60" : "text-slate-500"}`}>
                          {item.average_restoration_minutes == null
                            ? "—"
                            : `${Math.round(item.average_restoration_minutes)} min`}
                        </td>
                      </tr>
                    ))}
                    {analytics.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className={`px-5 py-8 text-center text-[13px] ${
                            isDark ? "text-white/50" : "text-slate-500"
                          }`}
                        >
                          Historical metrics will appear as outages are recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>

      {/* Review Confirmation Dialog (Base44 style) */}
      {reviewModalOpen && activeReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className={`w-full max-w-[460px] rounded-2xl border p-6 shadow-2xl transition ${
              isDark
                ? "border-white/15 bg-[#0b1626] text-white"
                : "border-slate-200 bg-white text-slate-900"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-heading text-[18px] font-bold">
                  {reviewAction === "verified" ? "Verify this report?" : "Dismiss this report?"}
                </h3>
                <p
                  className={`mt-1 text-[12.5px] leading-relaxed ${
                    isDark ? "text-white/60" : "text-slate-500"
                  }`}
                >
                  {activeReport.areas?.[0]?.name || "Unknown area"} ·{" "}
                  {activeReport.status.replace("_", " ")}. This action is recorded with your
                  administrator identity.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className={`rounded-lg p-1.5 transition ${
                  isDark ? "text-white/60 hover:bg-white/10" : "text-slate-400 hover:bg-slate-100"
                }`}
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4">
              <label
                htmlFor="review-reason"
                className={`block text-[12.5px] font-semibold ${
                  isDark ? "text-white/80" : "text-slate-700"
                }`}
              >
                Reason{" "}
                <span className={`font-normal ${isDark ? "text-white/50" : "text-slate-400"}`}>
                  (optional)
                </span>
              </label>
              <textarea
                id="review-reason"
                rows={3}
                maxLength={300}
                value={reviewReason}
                onChange={(e) => setReviewReason(e.target.value)}
                placeholder="e.g. Confirmed with barangay captain or verified restored."
                className={`mt-1.5 w-full resize-none rounded-xl border p-3 text-[13px] outline-none transition ${
                  isDark
                    ? "border-white/15 bg-white/5 text-white placeholder-white/20 focus:border-blue-500"
                    : "border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white"
                }`}
              />
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className={`rounded-xl px-4 py-2 text-[13px] font-medium transition ${
                  isDark
                    ? "text-white/70 hover:bg-white/10 hover:text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingReview}
                onClick={() => void handleConfirmReview()}
                className={`inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-[13px] font-semibold text-white shadow-md transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  reviewAction === "verified"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {submittingReview ? (
                  <>
                    <LoaderCircle size={15} className="animate-spin" /> Saving…
                  </>
                ) : reviewAction === "verified" ? (
                  "Verify report"
                ) : (
                  "Dismiss report"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline Two-factor authentication modal */}
      <AdminMfaModal
        isOpen={mfaRequired}
        onSuccess={() => {
          setMfaRequired(false);
          setError("");
          void loadReports();
        }}
        onCancel={() => setMfaRequired(false)}
      />

      {/* Photo Lightbox Modal for Operations Staff */}
      {activePhotoModal && (
        <div
          className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setActivePhotoModal(null)}
        >
          <div
            className={`relative max-w-2xl w-full max-h-[90vh] flex flex-col rounded-2xl overflow-hidden border shadow-2xl ${
              isDark ? "bg-[#0b1a2e] border-white/15 text-white" : "bg-white border-slate-200 text-slate-900"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex items-center justify-between px-4 py-3 border-b ${
              isDark ? "border-white/10" : "border-slate-200"
            }`}>
              <div className="flex items-center gap-2">
                <Camera size={16} className="text-blue-500" />
                <span className="font-heading text-sm font-bold truncate">
                  Field Photo Evidence · {activePhotoModal.areaName}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActivePhotoModal(null)}
                className={`p-1.5 rounded-lg transition ${
                  isDark ? "hover:bg-white/10 text-white/60 hover:text-white" : "hover:bg-slate-100 text-slate-500"
                }`}
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-black/40 flex items-center justify-center p-2 min-h-[240px]">
              <img
                src={activePhotoModal.url}
                alt="Field photo evidence"
                className="max-h-[75vh] w-auto max-w-full object-contain rounded-lg shadow-md"
              />
            </div>
            <div className={`px-4 py-2.5 text-xs flex justify-between items-center border-t ${
              isDark ? "border-white/10 text-white/50" : "border-slate-200 text-slate-500"
            }`}>
              <span>City dispatch authenticated view</span>
              <a
                href={activePhotoModal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-500 hover:underline font-semibold"
              >
                <span>Open original</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  return (
    <ThemeProvider>
      <AdminPageInner />
    </ThemeProvider>
  );
}
