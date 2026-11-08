"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Zap,
  MapPin,
  Bell,
  UserRound,
  LogOut,
  ShieldCheck,
  FileClock,
  ChevronDown,
  LogIn,
  Settings,
} from "lucide-react";
import { ThemeToggle, useTheme } from "./preview-theme";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export type PreviewTab = "home" | "map" | "updates" | "dashboard";

interface PreviewNavProps {
  currentTab: PreviewTab;
  onSelectTab: (tab: PreviewTab) => void;
  onOpenReport: () => void;
}

interface UserState {
  isSignedIn: boolean;
  name: string;
  email: string;
  role: string;
  isAdmin: boolean;
  initials: string;
}

export function PreviewNav({ currentTab, onSelectTab, onOpenReport }: PreviewNavProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [user, setUser] = useState<UserState | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Supabase Auth listener
  useEffect(() => {
    const hasSupabase = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    if (!hasSupabase) return;

    let cancelled = false;

    async function loadUser() {
      try {
        const supabase = createSupabaseBrowserClient();
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (!authUser) {
          if (!cancelled) {
            setUser(null);
            setUnreadCount(0);
          }
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("name, role")
          .eq("id", authUser.id)
          .single();

        if (cancelled) return;

        const displayName =
          profile?.name?.trim() || authUser.email?.split("@")[0] || "Reporter";
        const initials =
          displayName
            .split(" ")
            .map((n: string) => n[0])
            .filter(Boolean)
            .slice(0, 2)
            .join("")
            .toUpperCase() || "GS";

        setUser({
          isSignedIn: true,
          name: displayName,
          email: authUser.email || "",
          role: profile?.role || "user",
          isAdmin: profile?.role === "admin",
          initials,
        });

        const { count } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", authUser.id)
          .eq("is_read", false);

        if (!cancelled && count != null) {
          setUnreadCount(count);
        }
      } catch (err) {
        console.error("Auth check error in nav:", err);
      }
    }

    void loadUser();

    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(() => {
        void loadUser();
      });

      return () => {
        cancelled = true;
        subscription.unsubscribe();
      };
    } catch {
      // ignore
    }
  }, []);

  async function handleSignOut() {
    try {
      const hasSupabase = Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );
      if (hasSupabase) {
        const supabase = createSupabaseBrowserClient();
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error("Sign out error:", err);
    }
    setUser(null);
    setMenuOpen(false);
    router.refresh();
  }

  return (
    <>
      {/* Main Base44 Header */}
      <header
        className={`sticky top-0 z-40 border-b backdrop-blur-xl transition-colors ${
          isDark
            ? "border-white/10 bg-[#061120]/85 text-white"
            : "border-slate-200 bg-white/90 text-slate-900 shadow-sm"
        }`}
      >
        <div className="mx-auto flex h-[70px] w-full max-w-[1240px] items-center justify-between gap-4 px-4 sm:px-8">
          {/* Logo */}
          <button
            type="button"
            onClick={() => onSelectTab("home")}
            className="flex items-center gap-3 text-left focus:outline-none shrink-0"
          >
            <div className="grid h-[34px] w-[34px] place-items-center rounded-[9px] bg-[#0d6edc] text-white shadow-[0_4px_14px_rgba(13,110,220,0.4)]">
              <Zap size={18} strokeWidth={2.4} fill="currentColor" />
            </div>
            <div>
              <div
                className={`font-heading text-[17px] font-extrabold tracking-[-0.02em] ${
                  isDark ? "text-white" : "text-slate-900"
                }`}
              >
                GridSight
              </div>
              <div
                className={`text-[9px] font-semibold tracking-[0.16em] uppercase ${
                  isDark ? "text-white/45" : "text-slate-500"
                }`}
              >
                Surigao City pilot
              </div>
            </div>
          </button>

          {/* Primary Nav Links */}
          <nav className="hidden items-center gap-6 lg:gap-7 md:flex" aria-label="Primary">
            <button
              type="button"
              onClick={() => onSelectTab("home")}
              className={`text-[13.5px] font-medium transition-colors ${
                currentTab === "home"
                  ? isDark
                    ? "text-white font-semibold"
                    : "text-blue-600 font-semibold"
                  : isDark
                  ? "text-white/65 hover:text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => onSelectTab("map")}
              className={`text-[13.5px] font-medium transition-colors ${
                currentTab === "map"
                  ? isDark
                    ? "text-white font-semibold"
                    : "text-blue-600 font-semibold"
                  : isDark
                  ? "text-white/65 hover:text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Outage Map
            </button>
            <button
              type="button"
              onClick={() => onSelectTab("updates")}
              className={`text-[13.5px] font-medium transition-colors ${
                currentTab === "updates"
                  ? isDark
                    ? "text-white font-semibold"
                    : "text-blue-600 font-semibold"
                  : isDark
                  ? "text-white/65 hover:text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Community Updates
            </button>
            <button
              type="button"
              onClick={() => onSelectTab("dashboard")}
              className={`text-[13.5px] font-medium transition-colors ${
                currentTab === "dashboard"
                  ? isDark
                    ? "text-white font-semibold"
                    : "text-blue-600 font-semibold"
                  : isDark
                  ? "text-white/65 hover:text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Dashboard
            </button>
          </nav>

          {/* Right Action CTAs + Account & Auth */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Notifications Button (if signed in) */}
            {user?.isSignedIn && (
              <Link
                href="/notifications"
                aria-label="Notifications"
                className={`relative grid h-9 w-9 place-items-center rounded-full border transition ${
                  isDark
                    ? "border-white/15 bg-white/[0.08] text-white/80 hover:bg-white/15 hover:text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-sm"
                }`}
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
            )}

            {/* Report Outage Button */}
            <button
              type="button"
              onClick={onOpenReport}
              className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-[#0d6edc] px-3.5 sm:px-4 py-2 text-[12.5px] sm:text-[13px] font-semibold text-white shadow-[0_4px_16px_rgba(13,110,220,0.35)] transition hover:bg-[#0b5ec0] shrink-0"
            >
              <MapPin size={14} />
              <span className="hidden xs:inline">Report Outage</span>
              <span className="xs:hidden">Report</span>
            </button>

            {/* Account / User Menu or Sign In */}
            {user?.isSignedIn ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen(!menuOpen)}
                  className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-2.5 transition ${
                    isDark
                      ? "border-white/15 bg-white/[0.06] hover:bg-white/10 text-white"
                      : "border-slate-300 bg-white hover:bg-slate-50 text-slate-800 shadow-sm"
                  }`}
                >
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-blue-600 text-[11px] font-bold text-white">
                    {user.initials}
                  </span>
                  <span className="hidden md:inline max-w-[100px] truncate text-[12.5px] font-medium">
                    {user.name}
                  </span>
                  <ChevronDown size={14} className={isDark ? "text-white/50" : "text-slate-400"} />
                </button>

                {/* Dropdown Menu */}
                {menuOpen && (
                  <div
                    className={`absolute right-0 mt-2 w-60 rounded-2xl border p-2 shadow-2xl backdrop-blur-xl z-50 transition ${
                      isDark
                        ? "border-white/15 bg-[#0b1a2e] text-white"
                        : "border-slate-200 bg-white text-slate-900 shadow-slate-300/50"
                    }`}
                  >
                    {/* User Info Header */}
                    <div
                      className={`border-b px-3.5 py-2.5 ${
                        isDark ? "border-white/10" : "border-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-blue-600 text-xs font-bold text-white">
                          {user.initials}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold">{user.name}</p>
                          <p className={`truncate text-[11px] ${isDark ? "text-white/50" : "text-slate-500"}`}>
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                            user.isAdmin
                              ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                              : isDark
                              ? "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                              : "bg-blue-50 text-blue-600 border border-blue-200"
                          }`}
                        >
                          {user.isAdmin ? "Administrator" : "Community Reporter"}
                        </span>
                      </div>
                    </div>

                    {/* Menu Links */}
                    <div className="py-1 space-y-0.5 text-[13px]">
                      <Link
                        href="/account"
                        onClick={() => setMenuOpen(false)}
                        className={`flex items-center gap-2.5 rounded-xl px-3 py-2 transition ${
                          isDark
                            ? "hover:bg-white/10 text-white/90 hover:text-white"
                            : "hover:bg-slate-100 text-slate-700 hover:text-slate-900"
                        }`}
                      >
                        <Settings size={15} className="text-blue-500" />
                        <span>Account & Areas</span>
                      </Link>

                      <Link
                        href="/reports"
                        onClick={() => setMenuOpen(false)}
                        className={`flex items-center gap-2.5 rounded-xl px-3 py-2 transition ${
                          isDark
                            ? "hover:bg-white/10 text-white/90 hover:text-white"
                            : "hover:bg-slate-100 text-slate-700 hover:text-slate-900"
                        }`}
                      >
                        <FileClock size={15} className="text-emerald-500" />
                        <span>My Outage Reports</span>
                      </Link>

                      <Link
                        href="/notifications"
                        onClick={() => setMenuOpen(false)}
                        className={`flex items-center justify-between rounded-xl px-3 py-2 transition ${
                          isDark
                            ? "hover:bg-white/10 text-white/90 hover:text-white"
                            : "hover:bg-slate-100 text-slate-700 hover:text-slate-900"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Bell size={15} className="text-amber-500" />
                          <span>Notifications</span>
                        </div>
                        {unreadCount > 0 && (
                          <span className="rounded-full bg-red-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
                            {unreadCount}
                          </span>
                        )}
                      </Link>

                      {user.isAdmin && (
                        <Link
                          href="/admin"
                          onClick={() => setMenuOpen(false)}
                          className={`flex items-center gap-2.5 rounded-xl px-3 py-2 transition ${
                            isDark
                              ? "hover:bg-purple-500/20 text-purple-300"
                              : "hover:bg-purple-50 text-purple-700"
                          }`}
                        >
                          <ShieldCheck size={15} className="text-purple-500" />
                          <span>Admin Desk</span>
                        </Link>
                      )}
                    </div>

                    {/* Divider & Sign Out */}
                    <div
                      className={`border-t pt-1 ${
                        isDark ? "border-white/10" : "border-slate-100"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] text-red-500 hover:bg-red-500/10 transition`}
                      >
                        <LogOut size={15} />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Link
                  href="/login"
                  className={`rounded-full px-3 sm:px-4 py-1.5 text-[13px] font-semibold transition-colors ${
                    isDark
                      ? "text-white/80 hover:text-white"
                      : "text-slate-700 hover:text-slate-900"
                  }`}
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className={`rounded-full px-3.5 sm:px-4 py-1.5 text-[13px] font-semibold transition shadow-sm ${
                    isDark
                      ? "bg-white text-[#061120] hover:bg-white/90"
                      : "bg-slate-900 text-white hover:bg-slate-800"
                  }`}
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Nav Tabs */}
        <div
          className={`flex overflow-x-auto border-t px-4 py-2 md:hidden gap-2 transition-colors scrollbar-none ${
            isDark
              ? "border-white/[0.08] bg-[#061120]/95"
              : "border-slate-200 bg-white/95"
          }`}
        >
          <button
            type="button"
            onClick={() => onSelectTab("home")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
              currentTab === "home"
                ? isDark
                  ? "bg-white/15 text-white"
                  : "bg-blue-600 text-white"
                : isDark
                ? "text-white/60"
                : "text-slate-600"
            }`}
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => onSelectTab("map")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
              currentTab === "map"
                ? isDark
                  ? "bg-white/15 text-white"
                  : "bg-blue-600 text-white"
                : isDark
                ? "text-white/60"
                : "text-slate-600"
            }`}
          >
            Outage Map
          </button>
          <button
            type="button"
            onClick={() => onSelectTab("updates")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
              currentTab === "updates"
                ? isDark
                  ? "bg-white/15 text-white"
                  : "bg-blue-600 text-white"
                : isDark
                ? "text-white/60"
                : "text-slate-600"
            }`}
          >
            Updates
          </button>
          <button
            type="button"
            onClick={() => onSelectTab("dashboard")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
              currentTab === "dashboard"
                ? isDark
                  ? "bg-white/15 text-white"
                  : "bg-blue-600 text-white"
                : isDark
                ? "text-white/60"
                : "text-slate-600"
            }`}
          >
            Dashboard
          </button>

          {/* Quick links on mobile */}
          {user?.isSignedIn ? (
            <>
              <Link
                href="/account"
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex items-center gap-1 ${
                  isDark ? "text-white/70 hover:text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <UserRound size={12} />
                <span>Account</span>
              </Link>
              <Link
                href="/reports"
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex items-center gap-1 ${
                  isDark ? "text-white/70 hover:text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FileClock size={12} />
                <span>My Reports</span>
              </Link>
              {user.isAdmin && (
                <Link
                  href="/admin"
                  className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap text-purple-400"
                >
                  Admin Desk
                </Link>
              )}
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex items-center gap-1 ${
                  isDark ? "text-white/70 hover:text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>Login</span>
              </Link>
              <Link
                href="/register"
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1 ${
                  isDark ? "bg-white text-[#061120]" : "bg-slate-900 text-white"
                }`}
              >
                <span>Sign up</span>
              </Link>
            </>
          )}
        </div>
      </header>
    </>
  );
}
