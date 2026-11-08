"use client";

import { useState } from "react";
import { Megaphone, Calendar, Tag, ShieldCheck, AlertCircle } from "lucide-react";
import { useTheme } from "./preview-theme";

interface CommunityUpdateItem {
  id: string;
  category: "restoration" | "scheduled_maintenance" | "advisory" | "general";
  title: string;
  body: string;
  barangay?: string;
  posted_at: string;
  author_role?: string;
}

const sampleUpdates: CommunityUpdateItem[] = [
  {
    id: "up-1",
    category: "advisory",
    title: "Feeder 2 Inspection in Progress — Luna & Washington",
    body: "Surigao City power dispatch teams are inspecting main feeder overhead lines after localized line fluctuations were reported by residents.",
    barangay: "Luna",
    posted_at: "35 minutes ago",
    author_role: "City Dispatch Staff",
  },
  {
    id: "up-2",
    category: "scheduled_maintenance",
    title: "Scheduled Substation Maintenance Notice",
    body: "Planned preventive maintenance scheduled for the San Juan substation on Saturday between 08:00 and 12:00. Nearby barangays may experience brief service transfers.",
    barangay: "San Juan",
    posted_at: "4 hours ago",
    author_role: "Engineering Division",
  },
  {
    id: "up-3",
    category: "restoration",
    title: "Togbongon Power Normalised",
    body: "All feeder sections serving Togbongon have been re-energized and confirmed stable following transformer fuse replacement.",
    barangay: "Togbongon",
    posted_at: "Yesterday at 17:40",
    author_role: "Field Crew Supervisor",
  },
];

export function PreviewUpdatesView() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [filter, setFilter] = useState<string>("all");

  const filteredUpdates = sampleUpdates.filter((item) => {
    if (filter === "all") return true;
    return item.category === filter;
  });

  const categories = [
    { label: "All updates", value: "all" },
    { label: "Restorations", value: "restoration" },
    { label: "Advisories", value: "advisory" },
    { label: "Maintenance", value: "scheduled_maintenance" },
  ];

  function getBadge(cat: string) {
    if (cat === "restoration") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-500">
          Restoration
        </span>
      );
    }
    if (cat === "scheduled_maintenance") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/15 border border-purple-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-purple-500">
          Maintenance
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 border border-blue-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-blue-500">
        Advisory
      </span>
    );
  }

  return (
    <div className={`mx-auto max-w-[1240px] px-5 py-8 sm:px-8 sm:py-12 transition-colors ${
      isDark ? "text-white" : "text-slate-900"
    }`}>
      {/* Header */}
      <div className="mb-8">
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-500">
          Official Broadcasts
        </span>
        <h1 className={`mt-2 font-heading text-[28px] font-extrabold leading-[1.15] sm:text-[34px] ${
          isDark ? "text-white" : "text-slate-900"
        }`}>
          Community Updates
        </h1>
        <p className={`mt-2 text-[14px] leading-relaxed max-w-xl ${
          isDark ? "text-white/60" : "text-slate-600"
        }`}>
          Direct field communications, maintenance schedules, and restoration confirmations issued by Surigao City staff.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        {categories.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => setFilter(c.value)}
            className={`rounded-full px-4 py-2 text-[13px] font-medium transition ${
              filter === c.value
                ? "bg-blue-600 text-white shadow-sm"
                : isDark
                ? "bg-[#0b1a2e] text-white/60 hover:text-white border border-white/10"
                : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200 shadow-sm"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Updates Stream */}
      <div className="space-y-4">
        {filteredUpdates.map((item) => (
          <div
            key={item.id}
            className={`rounded-2xl border p-6 transition ${
              isDark
                ? "border-white/10 bg-[#0b1a2e] hover:border-white/20 text-white"
                : "border-slate-200 bg-white hover:border-slate-300 text-slate-900 shadow-sm"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                {getBadge(item.category)}
                {item.barangay && (
                  <span className={`text-[12px] font-medium ${isDark ? "text-white/40" : "text-slate-400"}`}>
                    · {item.barangay}
                  </span>
                )}
              </div>
              <div className={`flex items-center gap-1.5 text-[11.5px] ${isDark ? "text-white/40" : "text-slate-500"}`}>
                <Calendar size={13} />
                <span>{item.posted_at}</span>
              </div>
            </div>

            <h2 className={`font-heading text-[18px] font-bold mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>
              {item.title}
            </h2>
            <p className={`text-[14px] leading-relaxed ${isDark ? "text-white/70" : "text-slate-600"}`}>
              {item.body}
            </p>

            {item.author_role && (
              <div className={`mt-4 pt-3 border-t flex items-center gap-2 text-[11.5px] ${
                isDark ? "border-white/[0.06] text-white/40" : "border-slate-100 text-slate-500"
              }`}>
                <ShieldCheck size={13} className="text-blue-500" />
                <span>Issued by {item.author_role}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
