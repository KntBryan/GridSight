"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Clock3,
  FileClock,
  MapPin,
  Search,
  Plus,
  Zap,
  Activity,
  Sun,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  XCircle,
  LoaderCircle,
} from "lucide-react";
import { ThemeProvider, ThemeToggle, useTheme } from "@/components/preview/preview-theme";
import { PreviewReportModal } from "@/components/preview/preview-report-modal";

type Report = {
  id: string;
  status: "no_power" | "flickering" | "restored";
  verification_status: "pending" | "verified" | "dismissed";
  notes: string | null;
  created_at: string;
  areas: { name: string; city: string }[] | null;
};

type FilterKey = "all" | "pending" | "verified" | "dismissed";

function ReportsPageInner() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    async function loadReports() {
      try {
        const response = await fetch("/api/reports", { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) {
          setErrorMsg(result.error || "Sign in to view your report history.");
          setLoading(false);
          return;
        }
        setReports(
          ((result.reports ?? []) as Report[]).map((row) => ({
            ...row,
            areas: Array.isArray(row.areas) ? row.areas : row.areas ? [row.areas] : null,
          }))
        );
      } catch {
        setErrorMsg("Report history is currently unavailable.");
      } finally {
        setLoading(false);
      }
    }
    loadReports();
  }, []);

  const counts = useMemo(
    () => ({
      all: reports.length,
      pending: reports.filter((r) => (r.verification_status || "pending") === "pending").length,
      verified: reports.filter((r) => r.verification_status === "verified").length,
      dismissed: reports.filter((r) => r.verification_status === "dismissed").length,
    }),
    [reports]
  );

  const filteredReports = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reports.filter((r) => {
      const matchFilter = filter === "all" || (r.verification_status || "pending") === filter;
      if (!matchFilter) return false;
      if (!q) return true;
      const areaName = r.areas?.[0]?.name?.toLowerCase() || "";
      const notes = r.notes?.toLowerCase() || "";
      return areaName.includes(q) || notes.includes(q);
    });
  }, [reports, filter, search]);

  const observationPill = (status: Report["status"]) => {
    if (status === "no_power") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 border border-red-500/25 px-2.5 py-0.5 text-xs font-semibold text-red-400">
          <Zap size={11} />
          <span>No Power</span>
        </span>
      );
    }
    if (status === "flickering") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/25 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
          <Activity size={11} />
          <span>Flickering</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
        <Sun size={11} />
        <span>Restored</span>
      </span>
    );
  };

  const verificationPill = (status: Report["verification_status"]) => {
    if (status === "verified") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
          <CheckCircle2 size={11} />
          <span>Verified</span>
        </span>
      );
    }
    if (status === "dismissed") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-500/15 border border-slate-500/25 px-2.5 py-0.5 text-xs font-semibold text-slate-400">
          <XCircle size={11} />
          <span>Dismissed</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/25 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
        <AlertCircle size={11} />
        <span>Pending Review</span>
      </span>
    );
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDark ? "bg-[#061120] text-white" : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-[2000] flex items-center gap-3 rounded-xl border px-4 py-3 text-[13px] shadow-2xl backdrop-blur-md ${
            isDark
              ? "border-blue-500/30 bg-[#0b1a2e] text-white"
              : "border-blue-200 bg-white text-slate-800 shadow-blue-100"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <header
        className={`sticky top-0 z-40 border-b backdrop-blur-xl transition-colors ${
          isDark
            ? "border-white/10 bg-[#061120]/85 text-white"
            : "border-slate-200 bg-white/90 text-slate-900 shadow-sm"
        }`}
      >
        <div className="mx-auto flex h-[70px] w-full max-w-[1240px] items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition ${
                isDark
                  ? "border-white/15 bg-white/[0.06] text-white/80 hover:bg-white/10 hover:text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-sm"
              }`}
            >
              <ArrowLeft size={14} />
              <span>Back to Map</span>
            </Link>

            <div className="flex items-center gap-2">
              <div className="grid h-[28px] w-[28px] place-items-center rounded-lg bg-[#0d6edc] text-white">
                <Zap size={15} fill="currentColor" />
              </div>
              <span className="font-heading text-[15px] font-bold">GridSight</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setReportModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-[#0d6edc] px-4 py-2 text-[12.5px] font-semibold text-white shadow-[0_4px_16px_rgba(13,110,220,0.35)] transition hover:bg-[#0b5ec0]"
            >
              <Plus size={14} />
              <span>New report</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-8">
        {/* Page Heading - Base44 Style */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p
              className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${
                isDark ? "text-blue-400" : "text-blue-600"
              }`}
            >
              Your activity
            </p>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-[-0.02em] mt-1">
              My reports
            </h1>
            <p className={`text-[13.5px] mt-1 ${isDark ? "text-white/60" : "text-slate-600"}`}>
              Every observation you’ve sent, and whether city staff verified it.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setReportModalOpen(true)}
            className="inline-flex sm:hidden items-center justify-center gap-2 rounded-full bg-[#0d6edc] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_16px_rgba(13,110,220,0.35)]"
          >
            <Plus size={14} />
            <span>New report</span>
          </button>
        </div>

        {/* Card Panel */}
        <div
          className={`rounded-2xl border transition shadow-sm overflow-hidden ${
            isDark
              ? "border-white/10 bg-[#0b1a2e]"
              : "border-slate-200 bg-white"
          }`}
        >
          {/* Filter Bar & Search */}
          <div
            className={`p-4 border-b flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${
              isDark ? "border-white/10" : "border-slate-100"
            }`}
          >
            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { key: "all", label: "All" },
                  { key: "pending", label: "Pending" },
                  { key: "verified", label: "Verified" },
                  { key: "dismissed", label: "Dismissed" },
                ] as const
              ).map((tab) => {
                const count = counts[tab.key];
                const active = filter === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setFilter(tab.key)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? "bg-[#0d6edc] text-white shadow-sm"
                        : isDark
                        ? "text-white/60 hover:bg-white/[0.06] hover:text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                        active
                          ? "bg-white/20 text-white"
                          : isDark
                          ? "bg-white/10 text-white/70"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search Box */}
            <div className="relative w-full sm:w-64">
              <Search
                size={14}
                className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                  isDark ? "text-white/40" : "text-slate-400"
                }`}
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search your reports…"
                className={`h-9 w-full rounded-xl border pl-9 pr-3 text-[12.5px] outline-none transition focus:border-blue-500 ${
                  isDark
                    ? "border-white/10 bg-[#081524] text-white placeholder-white/30"
                    : "border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:bg-white"
                }`}
              />
            </div>
          </div>

          {/* Table / List Body */}
          {loading ? (
            <div className="flex items-center justify-center py-20 gap-3">
              <LoaderCircle size={20} className="animate-spin text-blue-500" />
              <span className={`text-[13.5px] ${isDark ? "text-white/60" : "text-slate-500"}`}>
                Loading your report history…
              </span>
            </div>
          ) : errorMsg ? (
            <div className="p-12 text-center">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-blue-500/15 text-blue-400">
                <ShieldCheck size={22} />
              </div>
              <h3 className="font-heading text-[16px] font-bold">{errorMsg}</h3>
              {errorMsg.includes("Sign in") && (
                <Link
                  href="/login"
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#0d6edc] px-5 py-2 text-[13px] font-semibold text-white shadow transition hover:bg-[#0b5ec0]"
                >
                  Sign in to view
                </Link>
              )}
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="p-14 text-center">
              <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-white/[0.04] text-white/40">
                <FileClock size={26} />
              </div>
              <h3 className="font-heading text-[17px] font-bold">No reports found</h3>
              <p className={`mt-1.5 max-w-sm mx-auto text-[13px] ${isDark ? "text-white/50" : "text-slate-500"}`}>
                {reports.length === 0
                  ? "Every signal you share helps neighbors and city staff track outages across Surigao City."
                  : "No reports match your current filter or search criteria."}
              </p>
              <button
                type="button"
                onClick={() => setReportModalOpen(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#0d6edc] px-5 py-2 text-[13px] font-semibold text-white shadow-[0_4px_16px_rgba(13,110,220,0.35)] transition hover:bg-[#0b5ec0]"
              >
                <Plus size={14} />
                <span>Report an outage</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {filteredReports.map((report) => {
                const area = report.areas?.[0];
                return (
                  <div
                    key={report.id}
                    className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition ${
                      isDark ? "hover:bg-white/[0.02]" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`font-heading text-[15px] font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                          {area?.name || "Surigao City Area"}
                        </span>
                        {observationPill(report.status)}
                        {verificationPill(report.verification_status)}
                      </div>

                      {report.notes && (
                        <p className={`text-[12.5px] ${isDark ? "text-white/70" : "text-slate-600"}`}>
                          “{report.notes}”
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-[11.5px] opacity-50">
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={12} />
                          <span>{area?.city || "Surigao City"}</span>
                        </span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock3 size={12} />
                          <span>{new Date(report.created_at).toLocaleString()}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Report Modal */}
      <PreviewReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        onSuccessToast={showToast}
      />
    </div>
  );
}

export default function ReportsPage() {
  return (
    <ThemeProvider>
      <ReportsPageInner />
    </ThemeProvider>
  );
}
