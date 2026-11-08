"use client";

import { Zap, Clock, ShieldCheck, MapPin, Activity, AlertCircle } from "lucide-react";
import type { MapOutage } from "@/components/outage-map";
import { useTheme } from "./preview-theme";

interface PreviewDashboardViewProps {
  outages: MapOutage[];
  onOpenReport: () => void;
  onGoToMap: () => void;
}

export function PreviewDashboardView({
  outages,
  onOpenReport,
  onGoToMap,
}: PreviewDashboardViewProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const openCount = outages.filter((o) => o.status !== "restored").length;
  const totalReports = outages.reduce((acc, curr) => acc + curr.reports, 0);

  const residentReports = [
    {
      id: "rep-1",
      barangay: "Alang-alang",
      status: "checking",
      type: "No power",
      time: "19 minutes ago",
      notes: "Blackout across Purok 2 since 11:15 AM.",
    },
    {
      id: "rep-2",
      barangay: "Luna",
      status: "active",
      type: "Flickering / Brownout",
      time: "1 hour ago",
      notes: "Fluctuating voltage and buzzing sound near transformer pole.",
    },
    {
      id: "rep-3",
      barangay: "Togbongon",
      status: "restored",
      type: "No power",
      time: "Yesterday",
      notes: "Power back on at 5:30 PM.",
    },
  ];

  return (
    <div className={`mx-auto max-w-[1240px] px-5 py-8 sm:px-8 sm:py-12 transition-colors ${
      isDark ? "text-white" : "text-slate-900"
    }`}>
      {/* Header */}
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end mb-8">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-500">
            Surigao City pilot
          </span>
          <h1 className={`mt-2 font-heading text-[28px] font-extrabold leading-[1.15] sm:text-[34px] ${
            isDark ? "text-white" : "text-slate-900"
          }`}>
            {greeting}, Resident!
          </h1>
          <p className={`mt-2 text-[14px] leading-relaxed max-w-xl ${
            isDark ? "text-white/60" : "text-slate-600"
          }`}>
            Here is the power picture right now, and what the city operations staff have verified.
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

      {/* 3 Metric Stat Cards */}
      <div className="grid gap-5 sm:grid-cols-3 mb-8">
        {[
          {
            label: "Open Outages",
            value: String(openCount).padStart(2, "0"),
            badge: "Active in city",
            badgeClass: "text-amber-500",
            sub: "Clusters currently being checked or confirmed",
            icon: <AlertCircle size={16} className="text-amber-500" />,
          },
          {
            label: "Barangays Monitored",
            value: "54",
            badge: "100% covered",
            badgeClass: "text-emerald-500",
            sub: "Official PSA / NAMRIA geographic boundaries",
            icon: <MapPin size={16} className="text-blue-500" />,
          },
          {
            label: "Reports in Clusters",
            value: String(totalReports || 5),
            badge: "Live signals",
            badgeClass: "text-purple-500",
            sub: "Grouped using spatial DBSCAN clustering",
            icon: <Activity size={16} className="text-purple-500" />,
          },
        ].map((card) => (
          <div
            key={card.label}
            className={`rounded-2xl border p-5 transition-colors ${
              isDark ? "border-white/10 bg-[#0b1a2e]" : "border-slate-200 bg-white shadow-sm"
            }`}
          >
            <div className={`flex items-center justify-between text-[12px] font-medium ${
              isDark ? "text-white/50" : "text-slate-500"
            }`}>
              <span>{card.label}</span>
              {card.icon}
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className={`font-heading text-[32px] font-extrabold ${
                isDark ? "text-white" : "text-slate-900"
              }`}>
                {card.value}
              </span>
              <span className={`text-[12px] font-semibold ${card.badgeClass}`}>
                {card.badge}
              </span>
            </div>
            <p className={`mt-1 text-[11.5px] ${isDark ? "text-white/40" : "text-slate-500"}`}>
              {card.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Reports Tracking Table */}
      <div className={`rounded-2xl border overflow-hidden transition-colors ${
        isDark ? "border-white/10 bg-[#0b1a2e]" : "border-slate-200 bg-white shadow-sm"
      }`}>
        <div className={`p-6 border-b flex items-center justify-between ${
          isDark ? "border-white/[0.08]" : "border-slate-100"
        }`}>
          <div>
            <h3 className={`font-heading text-[17px] font-bold ${
              isDark ? "text-white" : "text-slate-900"
            }`}>
              Recent Observations & Reports
            </h3>
            <p className={`text-[12.5px] ${isDark ? "text-white/50" : "text-slate-500"}`}>
              Community submissions and their current city verification state
            </p>
          </div>
          <button
            type="button"
            onClick={onGoToMap}
            className="text-[12.5px] font-semibold text-blue-500 hover:text-blue-600 transition"
          >
            Open on map →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13.5px]">
            <thead className={`text-[11px] font-bold uppercase tracking-wider border-b ${
              isDark
                ? "bg-[#081524] text-white/40 border-white/[0.08]"
                : "bg-slate-50 text-slate-500 border-slate-100"
            }`}>
              <tr>
                <th className="px-6 py-3">Barangay</th>
                <th className="px-6 py-3">Observation</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Timestamp</th>
                <th className="px-6 py-3">Notes</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? "divide-white/[0.06]" : "divide-slate-100"}`}>
              {residentReports.map((r) => (
                <tr
                  key={r.id}
                  className={`transition ${isDark ? "text-white/80 hover:bg-white/[0.02]" : "text-slate-700 hover:bg-slate-50"}`}
                >
                  <td className={`px-6 py-4 font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                    {r.barangay}
                  </td>
                  <td className="px-6 py-4">{r.type}</td>
                  <td className="px-6 py-4">
                    {r.status === "checking" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-amber-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        Checking
                      </span>
                    )}
                    {r.status === "active" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 border border-red-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-red-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        Active
                      </span>
                    )}
                    {r.status === "restored" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Restored
                      </span>
                    )}
                  </td>
                  <td className={`px-6 py-4 text-[12px] ${isDark ? "text-white/40" : "text-slate-500"}`}>
                    {r.time}
                  </td>
                  <td className={`px-6 py-4 text-[12px] max-w-xs truncate ${isDark ? "text-white/60" : "text-slate-500"}`}>
                    {r.notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
