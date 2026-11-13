"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock3,
  Zap,
  Megaphone,
  CircleX,
  LoaderCircle,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { ThemeProvider, ThemeToggle, useTheme } from "@/components/preview/preview-theme";
import { ProtectedPage } from "@/components/auth/auth-gate";

type NotificationItem = {
  id: string;
  message: string;
  kind: "outage_reported" | "outage_restored" | "verified" | "dismissed" | "update";
  is_read: boolean;
  created_at: string;
};

function NotificationsPageInner() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setMessage("Notifications require a configured Supabase project.");
      setLoading(false);
      return;
    }
    const supabase = createSupabaseBrowserClient();
    void supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setMessage("Sign in to view your notifications.");
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("notifications")
        .select("id, message, kind, is_read, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        setMessage("Notifications could not be loaded.");
      } else {
        setItems((data ?? []) as NotificationItem[]);
      }
      setLoading(false);
    });
  }, []);

  async function markRead(id: string) {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    if (!error) {
      setItems((current) => current.map((item) => (item.id === id ? { ...item, is_read: true } : item)));
    }
  }

  async function markAllRead() {
    const supabase = createSupabaseBrowserClient();
    const ids = items.filter((item) => !item.is_read).map((item) => item.id);
    if (!ids.length) return;
    const { error } = await supabase.from("notifications").update({ is_read: true }).in("id", ids);
    if (!error) {
      setItems((current) => current.map((item) => ({ ...item, is_read: true })));
    }
  }

  const unreadCount = items.filter((item) => !item.is_read).length;

  const getNotificationIcon = (kind: NotificationItem["kind"]) => {
    if (kind === "outage_restored" || kind === "verified") {
      return (
        <div className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-500/15 text-emerald-400">
          <CheckCircle2 size={16} />
        </div>
      );
    }
    if (kind === "dismissed") {
      return (
        <div className="grid h-8 w-8 place-items-center rounded-xl bg-slate-500/15 text-slate-400">
          <CircleX size={16} />
        </div>
      );
    }
    if (kind === "update") {
      return (
        <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500/15 text-amber-400">
          <Megaphone size={16} />
        </div>
      );
    }
    return (
      <div className="grid h-8 w-8 place-items-center rounded-xl bg-red-500/15 text-red-400">
        <Zap size={16} />
      </div>
    );
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDark ? "bg-[#061120] text-white" : "bg-slate-50 text-slate-900"
      }`}
    >
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
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition ${
                  isDark
                    ? "border-white/15 bg-white/[0.06] text-white/80 hover:bg-white/15 hover:text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-sm"
                }`}
              >
                <CheckCheck size={14} />
                <span>Mark all read</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-8">
        {/* Page Heading - Base44 Style */}
        <div className="mb-8">
          <p
            className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${
              isDark ? "text-blue-400" : "text-blue-600"
            }`}
          >
            Your activity
          </p>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-[-0.02em]">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <span className="rounded-full bg-red-500/15 border border-red-500/25 px-2.5 py-0.5 text-xs font-bold text-red-400">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className={`text-[13.5px] mt-1 ${isDark ? "text-white/60" : "text-slate-600"}`}>
            Review outcomes, status changes on outages you reported, and updates from the city for your barangay.
          </p>
        </div>

        {/* Card Panel */}
        <div
          className={`rounded-2xl border transition shadow-sm overflow-hidden ${
            isDark ? "border-white/10 bg-[#0b1a2e]" : "border-slate-200 bg-white"
          }`}
        >
          {loading ? (
            <div className="flex items-center justify-center py-20 gap-3">
              <LoaderCircle size={20} className="animate-spin text-blue-500" />
              <span className={`text-[13.5px] ${isDark ? "text-white/60" : "text-slate-500"}`}>
                Loading notifications…
              </span>
            </div>
          ) : message ? (
            <div className="p-12 text-center">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-blue-500/15 text-blue-400">
                <Bell size={22} />
              </div>
              <h3 className="font-heading text-[16px] font-bold">{message}</h3>
              {message.includes("Sign in") && (
                <Link
                  href="/login"
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#0d6edc] px-5 py-2 text-[13px] font-semibold text-white shadow transition hover:bg-[#0b5ec0]"
                >
                  Sign in
                </Link>
              )}
            </div>
          ) : items.length === 0 ? (
            <div className="p-14 text-center">
              <div
                className={`mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl ${
                  isDark ? "bg-white/[0.04] text-white/40" : "bg-slate-100 text-slate-500"
                }`}
              >
                <Bell size={26} />
              </div>
              <h3 className="font-heading text-[17px] font-bold">Nothing yet</h3>
              <p className={`mt-1.5 max-w-sm mx-auto text-[13px] ${isDark ? "text-white/50" : "text-slate-500"}`}>
                Once you report an outage or follow a barangay, you’ll see the city’s review and any status change here.
              </p>
              <Link
                href="/"
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#0d6edc] px-5 py-2 text-[13px] font-semibold text-white shadow-[0_4px_16px_rgba(13,110,220,0.35)] transition hover:bg-[#0b5ec0]"
              >
                <span>Back to live map</span>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 sm:p-5 flex items-start justify-between gap-4 transition ${
                    !item.is_read
                      ? isDark
                        ? "bg-blue-500/[0.06]"
                        : "bg-blue-50/50"
                      : isDark
                      ? "hover:bg-white/[0.02]"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="shrink-0 mt-0.5">{getNotificationIcon(item.kind)}</div>
                    <div className="min-w-0 space-y-1">
                      <p
                        className={`text-[13.5px] leading-relaxed ${
                          !item.is_read
                            ? isDark
                              ? "font-semibold text-white"
                              : "font-semibold text-slate-900"
                            : isDark
                              ? "text-white/80"
                              : "text-slate-700"
                        }`}
                      >
                        {item.message}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] opacity-45">
                        <Clock3 size={11} />
                        <span>{new Date(item.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {!item.is_read && (
                    <button
                      type="button"
                      onClick={() => void markRead(item.id)}
                      className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                        isDark
                          ? "bg-white/10 text-white hover:bg-white/20"
                          : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                      }`}
                    >
                      Mark read
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <ThemeProvider>
      <ProtectedPage
        returnTo="/notifications"
        title="Sign in to view your notifications"
        description="Sign in or create a free account to see updates about your reports and the areas you follow."
      >
        <NotificationsPageInner />
      </ProtectedPage>
    </ThemeProvider>
  );
}
