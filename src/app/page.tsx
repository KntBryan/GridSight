"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { MapOutage } from "@/components/outage-map";
import { ThemeProvider, useTheme } from "@/components/preview/preview-theme";
import { PreviewNav, type PreviewTab } from "@/components/preview/preview-nav";
import { PreviewLanding } from "@/components/preview/preview-landing";
import { PreviewMapView } from "@/components/preview/preview-map-view";
import { PreviewUpdatesView } from "@/components/preview/preview-updates-view";
import { PreviewDashboardView } from "@/components/preview/preview-dashboard-view";
import { PreviewReportModal } from "@/components/preview/preview-report-modal";
import { AuthGatePanel, useAuthenticatedUser } from "@/components/auth/auth-gate";
import { authHref, safeReturnPath } from "@/lib/auth/return-path.mjs";

interface AuthGateRequest {
  returnTo: string;
  title: string;
  description: string;
}

const protectedTabs = new Set<PreviewTab>(["map", "updates", "dashboard"]);

function tabTitle(tab: PreviewTab) {
  if (tab === "map") return "the outage map";
  if (tab === "updates") return "community updates";
  return "the dashboard";
}

function PreviewPageInner() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user, loading: authLoading } = useAuthenticatedUser();
  const userId = user?.id;
  const isDark = theme === "dark";

  const [currentTab, setCurrentTab] = useState<PreviewTab>("home");
  const [outages, setOutages] = useState<MapOutage[]>([]);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [authGate, setAuthGate] = useState<AuthGateRequest | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  }, []);
  const visibleTab = !authLoading && user ? currentTab : "home";

  useEffect(() => {
    if (authLoading || !userId) {
      setOutages([]);
      return;
    }

    let active = true;

    async function loadOutages() {
      try {
        const res = await fetch("/api/outages", { cache: "no-store" });
        if (res.status === 401) {
          setOutages([]);
          return;
        }
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
  }, [authLoading, userId]);

  const restoreIntent = useCallback((returnTo: string) => {
    const destination = new URL(safeReturnPath(returnTo), window.location.origin);
    const requestedTab = destination.searchParams.get("tab") as PreviewTab | null;
    const tab = requestedTab && (requestedTab === "home" || protectedTabs.has(requestedTab))
      ? requestedTab
      : "map";
    setCurrentTab(tab);
    if (destination.searchParams.get("report") === "1") {
      setReportModalOpen(true);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;

    const url = new URL(window.location.href);
    const requestedTab = url.searchParams.get("tab") as PreviewTab | null;
    const hasProtectedIntent =
      (requestedTab !== null && protectedTabs.has(requestedTab)) ||
      url.searchParams.get("report") === "1";
    if (!hasProtectedIntent) return;

    const returnTo = safeReturnPath(`${url.pathname}${url.search}`);
    if (!user) {
      setAuthGate({
        returnTo,
        title: requestedTab === "updates"
          ? "Sign in to view community updates"
          : requestedTab === "dashboard"
            ? "Sign in to view the dashboard"
            : url.searchParams.get("report") === "1"
              ? "Sign in to report an outage"
              : "Sign in to view the outage map",
        description: "Sign in or create a free account to continue. We’ll bring you back to where you left off.",
      });
      return;
    }

    restoreIntent(returnTo);
    window.history.replaceState(null, "", url.pathname);
  }, [authLoading, restoreIntent, user]);

  useEffect(() => {
    if (authLoading || user) return;
    if (currentTab !== "home") setCurrentTab("home");
    if (reportModalOpen) setReportModalOpen(false);
  }, [authLoading, currentTab, reportModalOpen, user]);

  useEffect(() => {
    if (authLoading || !user || !authGate) return;
    restoreIntent(authGate.returnTo);
    setAuthGate(null);
  }, [authGate, authLoading, restoreIntent, user]);

  const selectTab = useCallback((tab: PreviewTab) => {
    if (tab === "home") {
      setCurrentTab("home");
      setAuthGate(null);
      return;
    }
    if (authLoading || !user) {
      setAuthGate({
        returnTo: `/?tab=${tab}`,
        title: `Sign in to view ${tabTitle(tab)}`,
        description: "Sign in or create a free account to continue. We’ll bring you back to this section.",
      });
      return;
    }
    setCurrentTab(tab);
    setAuthGate(null);
  }, [authLoading, user]);

  const openReport = useCallback(() => {
    const destinationTab = currentTab === "home" ? "map" : currentTab;
    if (authLoading || !user) {
      setAuthGate({
        returnTo: `/?tab=${destinationTab}&report=1`,
        title: "Sign in to report an outage",
        description: "Create an account or sign in to submit a community outage report. Your report form will reopen when you return.",
      });
      return;
    }
    setCurrentTab(destinationTab);
    setReportModalOpen(true);
    setAuthGate(null);
  }, [authLoading, currentTab, user]);

  const redirectForExpiredReportSession = useCallback(() => {
    const destinationTab = currentTab === "home" ? "map" : currentTab;
    setReportModalOpen(false);
    router.push(authHref("/login", `/?tab=${destinationTab}&report=1`));
  }, [currentTab, router]);

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
        currentTab={visibleTab}
        onSelectTab={selectTab}
        onOpenReport={openReport}
      />

      {/* Active View Container */}
      <main>
        {visibleTab === "home" && (
          <PreviewLanding
            onGoToMap={() => selectTab("map")}
            onOpenReport={openReport}
            onGoToUpdates={() => selectTab("updates")}
          />
        )}

        {visibleTab === "map" && (
          <PreviewMapView
            outages={outages}
            onOpenReport={openReport}
          />
        )}

        {visibleTab === "updates" && <PreviewUpdatesView />}

        {visibleTab === "dashboard" && (
          <PreviewDashboardView
            outages={outages}
            onOpenReport={openReport}
            onGoToMap={() => selectTab("map")}
          />
        )}
      </main>

      {/* Report Modal */}
      <PreviewReportModal
        isOpen={reportModalOpen && !authLoading && Boolean(user)}
        onClose={() => setReportModalOpen(false)}
        onSuccessToast={showToast}
        onAuthRequired={redirectForExpiredReportSession}
      />

      {authGate && (
        <AuthGatePanel
          returnTo={authGate.returnTo}
          title={authGate.title}
          description={authGate.description}
          onClose={() => {
            setAuthGate(null);
            setCurrentTab("home");
            window.history.replaceState(null, "", window.location.pathname);
          }}
        />
      )}
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

