"use client";

import { useEffect, useState } from "react";
import { Calendar, ShieldCheck, Clock, LoaderCircle } from "lucide-react";
import { useTheme } from "./preview-theme";

interface CommunityUpdateItem {
  id: string;
  category: string;
  title: string;
  body: string;
  barangay?: string;
  posted_at: string;
  author_role?: string;
  estimated_time?: string;
  next_update_time?: string;
}

const sampleUpdates: CommunityUpdateItem[] = [
  {
    id: "up-1",
    category: "advisory",
    title: "Feeder 2 Inspection in Progress — Luna & Washington",
    body: "Surigao City power dispatch teams are inspecting main feeder overhead lines after localized line fluctuations were reported by residents.",
    barangay: "Luna & Washington",
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
    estimated_time: "08:00 – 12:00",
  },
  {
    id: "up-3",
    category: "restoration_work",
    title: "Togbongon Power Normalised",
    body: "All feeder sections serving Togbongon have been re-energized and confirmed stable following transformer fuse replacement.",
    barangay: "Togbongon",
    posted_at: "Yesterday at 17:40",
    author_role: "Field Crew Supervisor",
  },
];

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr${diffHours === 1 ? "" : "s"} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function PreviewUpdatesView() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [filter, setFilter] = useState<string>("all");
  const [liveUpdates, setLiveUpdates] = useState<CommunityUpdateItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/updates")
      .then((res) => (res.ok ? res.json() : { updates: [] }))
      .then((data) => {
        if (!active) return;
        const fetched: CommunityUpdateItem[] = (data.updates || []).map(
          (u: {
            id: string;
            category: string;
            title: string;
            message: string;
            audience: string;
            published_at: string;
            author_role?: string;
            estimated_time?: string;
            next_update_time?: string;
          }) => ({
            id: u.id,
            category: u.category,
            title: u.title,
            body: u.message,
            barangay: u.audience,
            posted_at: formatTimeAgo(u.published_at),
            author_role: u.author_role || "City Staff",
            estimated_time: u.estimated_time || undefined,
            next_update_time: u.next_update_time || undefined,
          })
        );
        setLiveUpdates(fetched);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const allUpdates = liveUpdates.length > 0 ? liveUpdates : sampleUpdates;

  const filteredUpdates = allUpdates.filter((item) => {
    if (filter === "all") return true;
    if (filter === "restoration") return item.category === "restoration_work" || item.category === "power_restored";
    if (filter === "investigation") return item.category === "investigation";
    if (filter === "advisory") return item.category === "advisory" || item.category === "outage_reported";
    if (filter === "scheduled_maintenance") return item.category === "scheduled_maintenance";
    return item.category === filter;
  });

  const categories = [
    { label: "All updates", value: "all" },
    { label: "Investigations", value: "investigation" },
    { label: "Restorations", value: "restoration" },
    { label: "Advisories", value: "advisory" },
    { label: "Maintenance", value: "scheduled_maintenance" },
  ];

  function getBadge(cat: string) {
    if (cat === "restoration_work" || cat === "power_restored" || cat === "restoration") {
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
    if (cat === "investigation") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-amber-500">
          Investigation
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
    <div
      className={`mx-auto max-w-[1240px] px-4 py-5 sm:px-8 sm:py-12 transition-colors ${
        isDark ? "text-white" : "text-slate-900"
      }`}
    >
      {/* Header */}
      <div className="mb-8">
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-500">
          Official Broadcasts
        </span>
        <h1
          className={`mt-2 font-heading text-[28px] font-extrabold leading-[1.15] sm:text-[34px] ${
            isDark ? "text-white" : "text-slate-900"
          }`}
        >
          Community Updates
        </h1>
        <p
          className={`mt-2 text-[14px] leading-relaxed max-w-xl ${
            isDark ? "text-white/60" : "text-slate-600"
          }`}
        >
          Direct field communications, maintenance schedules, and restoration confirmations issued by Surigao City staff.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex overflow-x-auto scrollbar-none gap-2 pb-2 mb-6 sm:mb-8">
        {categories.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => setFilter(c.value)}
            className={`rounded-full px-3.5 sm:px-4 py-1.5 sm:py-2 text-[12.5px] sm:text-[13px] font-semibold whitespace-nowrap transition active:scale-95 ${
              filter === c.value
                ? "bg-[#0d6edc] text-white shadow-sm"
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
      {loading ? (
        <div className="py-12 flex items-center justify-center gap-2 text-sm opacity-60">
          <LoaderCircle size={18} className="animate-spin" />
          <span>Loading updates feed…</span>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredUpdates.map((item) => (
            <div
              key={item.id}
              className={`rounded-2xl border p-4 sm:p-6 transition ${
                isDark
                  ? "border-white/10 bg-[#0b1a2e] hover:border-white/20 text-white"
                  : "border-slate-200 bg-white hover:border-slate-300 text-slate-900 shadow-sm"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  {getBadge(item.category)}
                  {item.barangay && (
                    <span className={`text-[12px] font-medium ${isDark ? "text-white/50" : "text-slate-500"}`}>
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
              <p className={`whitespace-pre-line text-[14px] leading-relaxed ${isDark ? "text-white/75" : "text-slate-600"}`}>
                {item.body}
              </p>

              {(item.estimated_time || item.next_update_time) && (
                <div className="mt-3 flex flex-wrap gap-3 text-[12px]">
                  {item.estimated_time && (
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      <Clock size={13} className="text-blue-500" />
                      <span className={isDark ? "text-white/50" : "text-slate-500"}>Estimated:</span>
                      <span>{item.estimated_time}</span>
                    </span>
                  )}
                  {item.next_update_time && (
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      <Clock size={13} className="text-amber-500" />
                      <span className={isDark ? "text-white/50" : "text-slate-500"}>Next update:</span>
                      <span>{item.next_update_time}</span>
                    </span>
                  )}
                </div>
              )}

              {item.author_role && (
                <div
                  className={`mt-4 pt-3 border-t flex items-center gap-2 text-[11.5px] ${
                    isDark ? "border-white/[0.06] text-white/40" : "border-slate-100 text-slate-500"
                  }`}
                >
                  <ShieldCheck size={13} className="text-blue-500" />
                  <span>Issued by {item.author_role}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
