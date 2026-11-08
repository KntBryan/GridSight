"use client";

import dynamic from "next/dynamic";
import { useState, useMemo } from "react";
import { Search, Zap } from "lucide-react";
import type { MapOutage } from "@/components/outage-map";
import { SURIGAO_CITY_BARANGAYS } from "@/lib/surigao-city-barangays";
import { useTheme } from "./preview-theme";

const PreviewLeafletMap = dynamic(() => import("./preview-leaflet-map"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center bg-[#081524] text-[13px] text-white/50">
      Loading Surigao City live map…
    </div>
  ),
});

interface PreviewMapViewProps {
  outages: MapOutage[];
  onOpenReport: () => void;
}

export function PreviewMapView({ outages, onOpenReport }: PreviewMapViewProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [search, setSearch] = useState("");
  const [focusBarangay, setFocusBarangay] = useState<string | null>(null);

  // Autocomplete matching across 54 barangays
  const filteredBarangays = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return SURIGAO_CITY_BARANGAYS.filter((b) =>
      b.name.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [search]);

  // Active / Checking outages
  const openOutages = outages.filter((o) => o.status !== "restored");

  return (
    <div className={`mx-auto max-w-[1240px] px-5 py-8 sm:px-8 sm:py-12 transition-colors ${
      isDark ? "text-white" : "text-slate-900"
    }`}>
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end mb-7">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-500">
            Live outage map
          </span>
          <h1 className={`mt-2 font-heading text-[28px] font-extrabold leading-[1.15] sm:text-[34px] ${
            isDark ? "text-white" : "text-slate-900"
          }`}>
            Where the power is out
          </h1>
          <p className={`mt-2 text-[14px] leading-relaxed max-w-xl ${
            isDark ? "text-white/60" : "text-slate-600"
          }`}>
            Pins follow the barangays with reports this week. A pin shows the outage status city staff have set, not an isolated report.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenReport}
          className="inline-flex items-center gap-2 rounded-full bg-[#0d6edc] px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_10px_25px_-10px_rgba(13,110,220,0.8)] transition hover:bg-[#0b5ec0] self-start sm:self-auto"
        >
          <Zap size={15} strokeWidth={2.4} />
          <span>Report an outage</span>
        </button>
      </div>

      {/* Search Bar with Autocomplete */}
      <div className="relative mb-5">
        <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-sm focus-within:border-blue-500 transition-colors ${
          isDark
            ? "border-white/10 bg-[#0b1a2e]"
            : "border-slate-200 bg-white"
        }`}>
          <Search size={16} className={isDark ? "text-white/40" : "text-slate-400"} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search 54 Surigao City barangays (e.g. Taft, Washington)…"
            className={`w-full bg-transparent text-[13.5px] sm:text-[14px] outline-none ${
              isDark ? "text-white placeholder-white/40" : "text-slate-900 placeholder-slate-400"
            }`}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className={`text-xs ${isDark ? "text-white/40 hover:text-white" : "text-slate-400 hover:text-slate-700"}`}
            >
              Clear
            </button>
          )}
        </div>

        {filteredBarangays.length > 0 && (
          <ul className={`absolute z-[600] mt-1.5 w-full overflow-hidden rounded-xl border shadow-2xl ${
            isDark
              ? "border-white/10 bg-[#0d1f38] text-white"
              : "border-slate-200 bg-white text-slate-900"
          }`}>
            {filteredBarangays.map((b) => (
              <li key={b.code}>
                <button
                  type="button"
                  onClick={() => {
                    setFocusBarangay(b.name);
                    setSearch("");
                  }}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-[13.5px] transition ${
                    isDark ? "hover:bg-white/10" : "hover:bg-slate-100"
                  }`}
                >
                  <span className="font-medium">{b.name}</span>
                  <span className={`text-[11px] ${isDark ? "text-white/50" : "text-slate-500"}`}>{b.territory}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Map Frame */}
      <div className={`relative h-[380px] sm:h-[480px] lg:h-[540px] w-full overflow-hidden rounded-2xl border shadow-2xl ${
        isDark ? "border-white/10 bg-[#081524]" : "border-slate-200 bg-slate-100"
      }`}>
        <PreviewLeafletMap
          outages={outages}
          focusBarangay={focusBarangay}
          onSelectBarangay={(name) => setFocusBarangay(name)}
        />

        {/* Floating Glass Legend */}
        <div className={`pointer-events-none absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-[500] rounded-xl border p-2.5 sm:px-3.5 sm:py-3 shadow-lg backdrop-blur-md transition-colors ${
          isDark
            ? "border-white/15 bg-[#061120]/90 text-white/90"
            : "border-slate-200 bg-white/92 text-slate-800"
        }`}>
          <p className={`mb-1.5 sm:mb-2 text-[9.5px] sm:text-[10px] font-bold uppercase tracking-[0.16em] ${
            isDark ? "text-white/50" : "text-slate-500"
          }`}>
            Legend
          </p>
          <ul className="space-y-1 sm:space-y-1.5 text-[10.5px] sm:text-[11.5px] font-medium">
            <li className="flex items-center gap-1.5 sm:gap-2">
              <span className="h-2 w-2 rounded-full bg-[#e65c45] shrink-0" />
              <span>Active outage</span>
            </li>
            <li className="flex items-center gap-1.5 sm:gap-2">
              <span className="h-2 w-2 rounded-full bg-[#d9a637] shrink-0" />
              <span>Checking</span>
            </li>
            <li className="flex items-center gap-1.5 sm:gap-2">
              <span className="h-2 w-2 rounded-full bg-[#438c6a] shrink-0" />
              <span>Restored</span>
            </li>
            <li className="flex items-center gap-1.5 sm:gap-2">
              <span className="h-2 w-2 rounded-full bg-[#3b82f6] shrink-0" />
              <span>Monitored grid</span>
            </li>
          </ul>
        </div>
      </div>

      <p className={`mt-2.5 text-[11.5px] ${isDark ? "text-white/40" : "text-slate-500"}`}>
        Barangay boundaries: Official PSA / NAMRIA COD-AB dataset. Community signals refreshed continuously.
      </p>

      {/* Dual Bottom Cards */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Card 1: Open Outages */}
        <div className={`rounded-2xl border p-6 transition-colors ${
          isDark ? "border-white/10 bg-[#0b1a2e]" : "border-slate-200 bg-white shadow-sm"
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className={`font-heading text-[16px] font-bold ${
                isDark ? "text-white" : "text-slate-900"
              }`}>
                Open Outages ({openOutages.length})
              </h3>
              <p className={`text-[12px] ${isDark ? "text-white/50" : "text-slate-500"}`}>
                Active or currently being verified by city crews
              </p>
            </div>
            {openOutages.length > 0 && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
            )}
          </div>

          {openOutages.length === 0 ? (
            <div className={`py-8 text-center text-[13px] ${isDark ? "text-white/50" : "text-slate-500"}`}>
              No active outages reported right now.
            </div>
          ) : (
            <ul className={`divide-y ${isDark ? "divide-white/[0.07]" : "divide-slate-100"}`}>
              {openOutages.map((o) => {
                const isChecking = o.status === "unconfirmed";
                return (
                  <li
                    key={o.id}
                    className={`flex items-center justify-between gap-3 py-3 px-2 rounded-lg -mx-2 transition ${
                      isDark ? "hover:bg-white/[0.03]" : "hover:bg-slate-50"
                    }`}
                  >
                    <div>
                      <button
                        type="button"
                        onClick={() => setFocusBarangay(o.area)}
                        className={`text-left font-semibold text-[14px] transition ${
                          isDark ? "text-white hover:text-blue-400" : "text-slate-900 hover:text-blue-600"
                        }`}
                      >
                        {o.area}
                      </button>
                      <div className={`flex items-center gap-2 text-[11.5px] mt-0.5 ${
                        isDark ? "text-white/50" : "text-slate-500"
                      }`}>
                        <span>{o.reports} {o.reports === 1 ? "report" : "reports"}</span>
                        <span>·</span>
                        <span>First reported: {o.reported}</span>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold border ${
                        isChecking
                          ? "bg-amber-500/15 border-amber-500/30 text-amber-500"
                          : "bg-red-500/15 border-red-500/30 text-red-500"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isChecking ? "bg-amber-500" : "bg-red-500"
                        }`}
                      />
                      {isChecking ? "Checking" : "Active"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Card 2: Status Lifecycle Guide */}
        <div className={`rounded-2xl border p-6 transition-colors ${
          isDark ? "border-white/10 bg-[#0b1a2e]" : "border-slate-200 bg-white shadow-sm"
        }`}>
          <h3 className={`font-heading text-[16px] font-bold mb-1 ${
            isDark ? "text-white" : "text-slate-900"
          }`}>
            What the statuses mean
          </h3>
          <p className={`text-[12px] mb-5 ${isDark ? "text-white/50" : "text-slate-500"}`}>
            How GridSight verifies power signals across Surigao City
          </p>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="inline-flex shrink-0 items-center rounded-full bg-red-500/15 border border-red-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-red-500 mt-0.5">
                Active
              </span>
              <p className={`text-[12.5px] leading-relaxed ${
                isDark ? "text-white/60" : "text-slate-600"
              }`}>
                Confirmed power outage. Field crews have been notified or cluster threshold verified by city operations.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <span className="inline-flex shrink-0 items-center rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-amber-500 mt-0.5">
                Checking
              </span>
              <p className={`text-[12.5px] leading-relaxed ${
                isDark ? "text-white/60" : "text-slate-600"
              }`}>
                Neighbour reports received in this barangay. City staff are reviewing signals before changing status.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-500 mt-0.5">
                Restored
              </span>
              <p className={`text-[12.5px] leading-relaxed ${
                isDark ? "text-white/60" : "text-slate-600"
              }`}>
                Power is back on. Verified by resident reports and confirmed by city operations dispatch.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
