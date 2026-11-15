"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Eye,
  Send,
  Undo2,
  LoaderCircle,
  AlertCircle,
  CheckCircle2,
  X,
  Clock,
  MapPin,
  Megaphone,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { AdminHeader } from "@/components/admin/admin-header";
import { ThemeProvider, useTheme } from "@/components/preview/preview-theme";
import { SURIGAO_CITY_BARANGAYS } from "@/lib/surigao-city-barangays";

export const dynamic = "force-dynamic";

type UpdateCategory =
  | "investigation"
  | "restoration_work"
  | "power_restored"
  | "scheduled_maintenance"
  | "advisory"
  | "outage_reported";

interface CommunityUpdate {
  id: string;
  title: string;
  message: string;
  category: UpdateCategory;
  audience: string;
  outage_id: string | null;
  estimated_time: string | null;
  next_update_time: string | null;
  state: "published" | "withdrawn";
  correction_note: string | null;
  author_name: string | null;
  author_role: string | null;
  published_at: string;
}

interface ActiveOutageOption {
  id: string;
  area_name: string;
  status: string;
}

const CATEGORY_META: Record<
  UpdateCategory,
  { label: string; tone: "amber" | "blue" | "green" | "red" }
> = {
  investigation: { label: "Investigation in progress", tone: "amber" },
  restoration_work: { label: "Restoration work", tone: "blue" },
  power_restored: { label: "Power restored", tone: "green" },
  scheduled_maintenance: { label: "Scheduled maintenance", tone: "amber" },
  advisory: { label: "Advisory / Notice", tone: "blue" },
  outage_reported: { label: "Outage reported", tone: "red" },
};

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

function CategoryPill({
  category,
  isDark,
}: {
  category: UpdateCategory;
  isDark: boolean;
}) {
  const meta = CATEGORY_META[category] || { label: category, tone: "amber" };
  const toneClasses = {
    amber: isDark
      ? "bg-amber-400/10 text-amber-300 border-amber-400/25"
      : "bg-amber-50 text-amber-800 border-amber-200",
    blue: isDark
      ? "bg-blue-400/10 text-blue-300 border-blue-400/25"
      : "bg-blue-50 text-blue-800 border-blue-200",
    green: isDark
      ? "bg-emerald-400/10 text-emerald-300 border-emerald-400/25"
      : "bg-emerald-50 text-emerald-800 border-emerald-200",
    red: isDark
      ? "bg-rose-400/10 text-rose-300 border-rose-400/25"
      : "bg-rose-50 text-rose-800 border-rose-200",
  }[meta.tone];

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${toneClasses}`}
    >
      {meta.label}
    </span>
  );
}

function AdminUpdatesInner() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [updates, setUpdates] = useState<CommunityUpdate[]>([]);
  const [activeOutages, setActiveOutages] = useState<ActiveOutageOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Form state
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<UpdateCategory>("investigation");
  const [audience, setAudience] = useState("All communities");
  const [outageId, setOutageId] = useState("");
  const [estimatedTime, setEstimatedTime] = useState("");
  const [nextUpdateTime, setNextUpdateTime] = useState("");

  // Modals
  const [previewOpen, setPreviewOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [withdrawingUpdate, setWithdrawingUpdate] = useState<CommunityUpdate | null>(null);
  const [withdrawReason, setWithdrawReason] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);

  const barangayNames = useMemo(
    () => SURIGAO_CITY_BARANGAYS.map((b) => b.name).sort((a, b) => a.localeCompare(b)),
    []
  );

  const loadData = useCallback(async () => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setError("Admin services are not configured. Add Supabase settings to .env.local.");
      setLoading(false);
      return;
    }
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Sign in with an administrator account to continue.");
      setLoading(false);
      return;
    }
    if (!user.email_confirmed_at) {
      setError("Confirm your account email before using administrator features.");
      setLoading(false);
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") {
      setError("This dashboard is restricted to GridSight administrators.");
      setLoading(false);
      return;
    }
    const { data: assurance, error: assuranceError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assuranceError) {
      setError("Your MFA status could not be verified.");
      setLoading(false);
      return;
    }
    if (assurance.currentLevel !== "aal2") {
      setMfaRequired(true);
      setError("Verify an MFA challenge before using administrator features.");
      setLoading(false);
      return;
    }
    setAuthorized(true);

    try {
      const res = await fetch("/api/admin/updates");
      if (res.ok) {
        const json = await res.json();
        setUpdates(json.updates || []);
      }
    } catch {
      // ignore
    }

    // Load active outages for linking
    const { data: outageRows } = await supabase
      .from("outages")
      .select("id, area_name, status")
      .eq("status", "active")
      .order("first_reported_at", { ascending: false })
      .limit(20);
    setActiveOutages((outageRows ?? []) as ActiveOutageOption[]);

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const canPreview = title.trim().length >= 4 && message.trim().length >= 4;

  async function handlePublish() {
    if (!canPreview) return;
    setPublishing(true);
    setError("");
    setSuccessMsg("");

    try {
      const response = await fetch("/api/admin/updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          category,
          audience,
          outageId: outageId || null,
          estimatedTime: estimatedTime.trim() || undefined,
          nextUpdateTime: nextUpdateTime.trim() || undefined,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "That update could not be published.");
      }

      setSuccessMsg("Update published to the community feed.");
      setTitle("");
      setMessage("");
      setEstimatedTime("");
      setNextUpdateTime("");
      setOutageId("");
      setPreviewOpen(false);
      await loadData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to publish update.");
    } finally {
      setPublishing(false);
    }
  }

  async function handleWithdraw() {
    if (!withdrawingUpdate || withdrawReason.trim().length < 3) return;
    setWithdrawing(true);
    setError("");

    try {
      const response = await fetch("/api/admin/updates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updateId: withdrawingUpdate.id,
          reason: withdrawReason.trim(),
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "That withdrawal could not be saved.");
      }

      setSuccessMsg("Update withdrawn. The original is kept in the audit history.");
      setWithdrawingUpdate(null);
      setWithdrawReason("");
      await loadData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to withdraw update.");
    } finally {
      setWithdrawing(false);
    }
  }

  return (
    <main className="admin-page" data-admin-theme={theme}>
      <AdminHeader activePage="updates" />

      <div className="admin-content">
        {/* Header */}
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-500">
              COMMUNITY FEED · SURIGAO CITY
            </p>
            <h1 className="font-heading text-[26px] font-extrabold leading-tight sm:text-[32px]">
              Post update
            </h1>
            <p className={`mt-2 max-w-2xl text-[14px] leading-relaxed ${isDark ? "text-white/60" : "text-slate-600"}`}>
              Keep Surigao City informed with official outage advisories, inspection notices, and restoration timelines.
            </p>
          </div>
        </div>

        {error && (
          <div className="admin-error mb-5" role="alert">
            {error}
            {mfaRequired ? (
              <Link href="/admin/accounts">Set up MFA</Link>
            ) : (
              !authorized && <Link href="/login">Sign in</Link>
            )}
          </div>
        )}

        {successMsg && (
          <div className="admin-success mb-5" role="status">
            {successMsg}
          </div>
        )}

        {loading ? (
          <div className="admin-loading">
            <LoaderCircle size={18} className="loading-icon" /> Loading updates desk…
          </div>
        ) : !authorized ? null : (
          /* Two-column Base44 Grid */
          <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
            {/* Left Card: Post a community update */}
            <section
              className={`overflow-hidden rounded-2xl border transition shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${
                isDark ? "border-white/10 bg-[#0f1e30]" : "border-slate-200 bg-white"
              }`}
            >
              <header className={`border-b px-5 py-4 ${isDark ? "border-white/10" : "border-slate-200"}`}>
                <h2 className="font-heading text-[16px] font-bold">Post a community update</h2>
                <p className={`mt-0.5 text-[12.5px] ${isDark ? "text-white/50" : "text-slate-500"}`}>
                  Write it, preview it, then publish.
                </p>
              </header>

              <div className="p-5">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!canPreview) {
                      setError("Add a title and a message (at least 4 characters each) first.");
                      return;
                    }
                    setPreviewOpen(true);
                  }}
                  className="space-y-4"
                >
                  {/* Title */}
                  <div>
                    <label htmlFor="title" className="mb-1.5 block text-[12.5px] font-semibold">
                      Title
                    </label>
                    <input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={120}
                      placeholder="e.g. Repair work on the Poblacion feeder tonight"
                      required
                      className={`h-11 w-full rounded-xl border px-3.5 text-[13.5px] transition focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                        isDark
                          ? "border-white/15 bg-[#0b1120] text-white placeholder:text-white/30 focus:border-blue-500"
                          : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500"
                      }`}
                    />
                  </div>

                  {/* Category and Audience */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-[12.5px] font-semibold">
                      Category
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as UpdateCategory)}
                        className={`mt-1.5 h-10 w-full rounded-xl border px-2.5 text-[13px] font-normal transition focus:outline-none ${
                          isDark
                            ? "border-white/15 bg-[#0b1120] text-white focus:border-blue-500"
                            : "border-slate-300 bg-white text-slate-900 focus:border-blue-500"
                        }`}
                      >
                        {Object.entries(CATEGORY_META).map(([key, meta]) => (
                          <option key={key} value={key}>
                            {meta.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block text-[12.5px] font-semibold">
                      Audience
                      <select
                        value={audience}
                        onChange={(e) => setAudience(e.target.value)}
                        className={`mt-1.5 h-10 w-full rounded-xl border px-2.5 text-[13px] font-normal transition focus:outline-none ${
                          isDark
                            ? "border-white/15 bg-[#0b1120] text-white focus:border-blue-500"
                            : "border-slate-300 bg-white text-slate-900 focus:border-blue-500"
                        }`}
                      >
                        <option value="All communities">All communities</option>
                        {barangayNames.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  {/* Message */}
                  <div>
                    <label htmlFor="message" className="mb-1.5 block text-[12.5px] font-semibold">
                      Message
                    </label>
                    <textarea
                      id="message"
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      maxLength={1200}
                      placeholder="What should residents know? Avoid claiming power is restored unless staff has verified it."
                      required
                      className={`w-full resize-none rounded-xl border px-3.5 py-3 text-[13.5px] leading-relaxed transition focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                        isDark
                          ? "border-white/15 bg-[#0b1120] text-white placeholder:text-white/30 focus:border-blue-500"
                          : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500"
                      }`}
                    />
                    <p className={`mt-1 text-right text-[11px] ${isDark ? "text-white/40" : "text-slate-400"}`}>
                      {message.length}/1200
                    </p>
                  </div>

                  {/* Estimated time and Next update */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-[12.5px] font-semibold">
                      Estimated time{" "}
                      <span className={`font-normal ${isDark ? "text-white/40" : "text-slate-400"}`}>(optional)</span>
                      <input
                        value={estimatedTime}
                        onChange={(e) => setEstimatedTime(e.target.value)}
                        maxLength={80}
                        placeholder="e.g. Around 9:00 PM"
                        className={`mt-1.5 h-10 w-full rounded-xl border px-3 text-[13px] font-normal transition focus:outline-none ${
                          isDark
                            ? "border-white/15 bg-[#0b1120] text-white placeholder:text-white/30 focus:border-blue-500"
                            : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500"
                        }`}
                      />
                    </label>

                    <label className="block text-[12.5px] font-semibold">
                      Next update{" "}
                      <span className={`font-normal ${isDark ? "text-white/40" : "text-slate-400"}`}>(optional)</span>
                      <input
                        value={nextUpdateTime}
                        onChange={(e) => setNextUpdateTime(e.target.value)}
                        maxLength={80}
                        placeholder="e.g. In 2 hours"
                        className={`mt-1.5 h-10 w-full rounded-xl border px-3 text-[13px] font-normal transition focus:outline-none ${
                          isDark
                            ? "border-white/15 bg-[#0b1120] text-white placeholder:text-white/30 focus:border-blue-500"
                            : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500"
                        }`}
                      />
                    </label>
                  </div>

                  {/* Active Outage Link */}
                  {activeOutages.length > 0 && (
                    <div>
                      <label className="block text-[12.5px] font-semibold">
                        Link to active outage{" "}
                        <span className={`font-normal ${isDark ? "text-white/40" : "text-slate-400"}`}>
                          (optional)
                        </span>
                        <select
                          value={outageId}
                          onChange={(e) => setOutageId(e.target.value)}
                          className={`mt-1.5 h-10 w-full rounded-xl border px-2.5 text-[13px] font-normal transition focus:outline-none ${
                            isDark
                              ? "border-white/15 bg-[#0b1120] text-white focus:border-blue-500"
                              : "border-slate-300 bg-white text-slate-900 focus:border-blue-500"
                          }`}
                        >
                          <option value="">None (General notice / City-wide)</option>
                          {activeOutages.map((outage) => (
                            <option key={outage.id} value={outage.id}>
                              {outage.area_name} ({outage.status})
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  )}

                  {/* Action button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={!canPreview}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#0d6edc] px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[#0b5ec0] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Eye size={16} />
                      <span>Preview update</span>
                    </button>
                  </div>
                </form>
              </div>
            </section>

            {/* Right Card: Published updates */}
            <section
              className={`overflow-hidden rounded-2xl border transition shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${
                isDark ? "border-white/10 bg-[#0f1e30]" : "border-slate-200 bg-white"
              }`}
            >
              <header className={`border-b px-4 py-3.5 ${isDark ? "border-white/10" : "border-slate-200"}`}>
                <h2 className="font-heading text-[15px] font-bold">Published updates</h2>
                <p className={`mt-0.5 text-[12px] ${isDark ? "text-white/50" : "text-slate-500"}`}>
                  Correct or withdraw with a reason — nothing is silently deleted.
                </p>
              </header>

              <div className="p-4">
                {updates.length === 0 ? (
                  <p className={`py-8 text-center text-[13px] ${isDark ? "text-white/40" : "text-slate-400"}`}>
                    Nothing published yet.
                  </p>
                ) : (
                  <ul className={`divide-y ${isDark ? "divide-white/10" : "divide-slate-200"}`}>
                    {updates.map((item) => (
                      <li key={item.id} className="py-3.5 first:pt-0 last:pb-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <CategoryPill category={item.category} isDark={isDark} />
                          {item.state === "withdrawn" && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                                isDark ? "bg-white/10 text-white/60" : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              Withdrawn
                            </span>
                          )}
                        </div>

                        <p className="mt-1.5 text-[13px] font-semibold leading-snug">{item.title}</p>

                        <p className={`mt-0.5 text-[11px] ${isDark ? "text-white/50" : "text-slate-500"}`}>
                          {item.audience} · {formatTimeAgo(item.published_at)}
                        </p>

                        {item.state === "withdrawn" && item.correction_note && (
                          <div
                            className={`mt-2 rounded-lg p-2.5 text-[11.5px] leading-relaxed ${
                              isDark ? "bg-white/5 text-white/70" : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            <span className="font-semibold text-rose-400">Withdrawal note: </span>
                            {item.correction_note}
                          </div>
                        )}

                        {item.state !== "withdrawn" && (
                          <button
                            type="button"
                            onClick={() => {
                              setWithdrawingUpdate(item);
                              setWithdrawReason("");
                            }}
                            className={`mt-2 inline-flex items-center gap-1.5 text-[11.5px] font-semibold transition ${
                              isDark
                                ? "text-white/50 hover:text-rose-400"
                                : "text-slate-500 hover:text-rose-600"
                            }`}
                          >
                            <Undo2 size={13} />
                            <span>Withdraw</span>
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className={`w-full max-w-[520px] rounded-2xl border p-6 shadow-2xl transition ${
              isDark ? "border-white/15 bg-[#0b1626] text-white" : "border-slate-200 bg-white text-slate-900"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-heading text-[18px] font-bold">Preview update</h3>
                <p className={`text-[12.5px] ${isDark ? "text-white/60" : "text-slate-500"}`}>
                  Review how this will look in the public Community Updates feed.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className={`rounded-lg p-1 transition ${
                  isDark ? "text-white/50 hover:bg-white/10 hover:text-white" : "text-slate-400 hover:bg-slate-100"
                }`}
              >
                <X size={18} />
              </button>
            </div>

            {/* Preview Card */}
            <div
              className={`mt-4 rounded-xl border p-4.5 ${
                isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <CategoryPill category={category} isDark={isDark} />
                <span className={`text-[11.5px] font-medium ${isDark ? "text-white/50" : "text-slate-500"}`}>
                  {audience}
                </span>
              </div>

              <p className="mt-2.5 font-heading text-[15.5px] font-bold leading-snug">{title}</p>

              <p className={`mt-2 whitespace-pre-line text-[13px] leading-relaxed ${isDark ? "text-white/80" : "text-slate-700"}`}>
                {message}
              </p>

              {(estimatedTime || nextUpdateTime) && (
                <div className="mt-3 flex flex-wrap gap-3 text-[12px]">
                  {estimatedTime && (
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      <Clock size={13} className="text-blue-500" />
                      <span className={isDark ? "text-white/50" : "text-slate-500"}>Estimated:</span>
                      <span>{estimatedTime}</span>
                    </span>
                  )}
                  {nextUpdateTime && (
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      <Clock size={13} className="text-amber-500" />
                      <span className={isDark ? "text-white/50" : "text-slate-500"}>Next update:</span>
                      <span>{nextUpdateTime}</span>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                disabled={publishing}
                className={`rounded-xl border px-4 py-2.5 text-[13px] font-semibold transition ${
                  isDark
                    ? "border-white/15 bg-white/5 text-white hover:bg-white/10"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={() => void handlePublish()}
                disabled={publishing}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0d6edc] px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[#0b5ec0] disabled:opacity-50"
              >
                {publishing ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={15} />}
                <span>{publishing ? "Publishing…" : "Publish update"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Dialog */}
      {withdrawingUpdate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className={`w-full max-w-[460px] rounded-2xl border p-6 shadow-2xl transition ${
              isDark ? "border-white/15 bg-[#0b1626] text-white" : "border-slate-200 bg-white text-slate-900"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-heading text-[18px] font-bold">Withdraw this update?</h3>
                <p className={`mt-1 text-[12.5px] leading-relaxed ${isDark ? "text-white/60" : "text-slate-500"}`}>
                  “{withdrawingUpdate.title}” will be marked withdrawn for {withdrawingUpdate.audience}. The original text and your reason stay in the audit history.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setWithdrawingUpdate(null)}
                className={`rounded-lg p-1 transition ${
                  isDark ? "text-white/50 hover:bg-white/10 hover:text-white" : "text-slate-400 hover:bg-slate-100"
                }`}
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4">
              <label htmlFor="withdraw-reason" className="mb-1.5 block text-[12.5px] font-semibold">
                Reason for withdrawal
              </label>
              <textarea
                id="withdraw-reason"
                rows={3}
                value={withdrawReason}
                onChange={(e) => setWithdrawReason(e.target.value)}
                placeholder="e.g. Restoration time was updated or line issue cleared earlier than expected."
                required
                className={`w-full resize-none rounded-xl border px-3.5 py-2.5 text-[13px] transition focus:outline-none focus:ring-2 focus:ring-rose-500/20 ${
                  isDark
                    ? "border-white/15 bg-[#0b1120] text-white placeholder:text-white/30 focus:border-rose-500"
                    : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-rose-500"
                }`}
              />
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setWithdrawingUpdate(null)}
                disabled={withdrawing}
                className={`rounded-xl border px-4 py-2.5 text-[13px] font-semibold transition ${
                  isDark
                    ? "border-white/15 bg-white/5 text-white hover:bg-white/10"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleWithdraw()}
                disabled={withdrawing || withdrawReason.trim().length < 3}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-50"
              >
                {withdrawing ? <LoaderCircle size={16} className="animate-spin" /> : <Undo2 size={15} />}
                <span>{withdrawing ? "Withdrawing…" : "Withdraw update"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function AdminUpdatesPage() {
  return (
    <ThemeProvider>
      <AdminUpdatesInner />
    </ThemeProvider>
  );
}
