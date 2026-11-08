"use client";

import { useEffect, useState, useCallback } from "react";
import type { MapOutage } from "@/components/outage-map";
import { ThemeProvider, useTheme } from "@/components/preview/preview-theme";
import { PreviewNav, type PreviewTab } from "@/components/preview/preview-nav";
import { PreviewLanding } from "@/components/preview/preview-landing";
import { PreviewMapView } from "@/components/preview/preview-map-view";
import { PreviewUpdatesView } from "@/components/preview/preview-updates-view";
import { PreviewDashboardView } from "@/components/preview/preview-dashboard-view";
import { PreviewReportModal } from "@/components/preview/preview-report-modal";

function PreviewPageInner() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [currentTab, setCurrentTab] = useState<PreviewTab>("home");
  const [outages, setOutages] = useState<MapOutage[]>([]);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  }, []);

  // Fetch live outages from the existing API
  useEffect(() => {
    let active = true;

    async function loadOutages() {
      try {
        const res = await fetch("/api/outages", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.outages) && active) {
          const formatted: MapOutage[] = data.outages
            .filter((row: any) => Number.isFinite(row.latitude) && Number.isFinite(row.longitude))
            .map((row: any) => ({
              id: row.id,
              area: row.area_name,
              city: row.city || "Surigao City",
              status: row.status,
              reports: row.report_count,
              coordinates: [row.latitude, row.longitude],
              reported: row.first_reported_at
                ? new Date(row.first_reported_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "Recent",
              reportedAt: row.first_reported_at,
            }));
          setOutages(formatted);
        }
      } catch (err) {
        console.error("Error loading outages for preview:", err);
      }
    }

    loadOutages();
    const interval = setInterval(loadOutages, 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div
      className={`preview-root min-h-screen transition-colors duration-300 ${
        isDark ? "bg-[#061120] text-[#f0f6fc]" : "bg-slate-50 text-slate-900"
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

      {/* Navigation & Header */}
      <PreviewNav
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        onOpenReport={() => setReportModalOpen(true)}
      />

      {/* Active View Container */}
      <main>
        {currentTab === "home" && (
          <PreviewLanding
            onGoToMap={() => setCurrentTab("map")}
            onOpenReport={() => setReportModalOpen(true)}
            onGoToUpdates={() => setCurrentTab("updates")}
          />
        )}

        {currentTab === "map" && (
          <PreviewMapView
            outages={outages}
            onOpenReport={() => setReportModalOpen(true)}
          />
        )}

        {currentTab === "updates" && <PreviewUpdatesView />}

        {currentTab === "dashboard" && (
          <PreviewDashboardView
            outages={outages}
            onOpenReport={() => setReportModalOpen(true)}
            onGoToMap={() => setCurrentTab("map")}
          />
        )}
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

export default function PreviewPage() {
  return (
    <ThemeProvider>
      <PreviewPageInner />
    </ThemeProvider>
  );
}

