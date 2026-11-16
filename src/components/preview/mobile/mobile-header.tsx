"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Zap,
  Bell,
  LogIn,
  Settings,
  FileClock,
  ShieldCheck,
  LogOut,
  X,
} from "lucide-react";
import { ThemeToggle, useTheme } from "../preview-theme";

interface MobileHeaderProps {
  user: {
    isSignedIn: boolean;
    name: string;
    email: string;
    role: string;
    isAdmin: boolean;
    initials: string;
  } | null;
  unreadCount: number;
  onSignOut?: () => void;
}

export function MobileHeader({ user, unreadCount, onSignOut }: MobileHeaderProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);

  return (
    <>
      <header
        className={`sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b px-4 backdrop-blur-xl transition-colors md:hidden ${
          isDark
            ? "border-white/10 bg-[#061120]/95 text-white"
            : "border-slate-200 bg-white/95 text-slate-900 shadow-xs"
        }`}
      >
        {/* Brand logo & pilot status */}
        <Link href="/" className="flex items-center gap-2.5 min-w-0">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#0d6edc] text-white shadow-md shadow-blue-500/25">
            <Zap size={16} strokeWidth={2.5} fill="currentColor" />
          </span>
          <div className="flex flex-col min-w-0 leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="font-heading text-[15px] font-extrabold tracking-tight truncate">
                GridSight
              </span>
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            </div>
            <span
              className={`text-[9px] font-semibold uppercase tracking-wider truncate ${
                isDark ? "text-white/50" : "text-slate-500"
              }`}
            >
              Surigao City
            </span>
          </div>
        </Link>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          {/* Notifications */}
          <Link
            href="/notifications"
            aria-label="Notifications"
            className={`relative grid h-8 w-8 place-items-center rounded-full border transition active:scale-95 ${
              isDark
                ? "border-white/15 bg-white/5 text-white/90"
                : "border-slate-200 bg-slate-50 text-slate-700"
            }`}
          >
            <Bell size={15} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white shadow-sm">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>

          {/* User initials (opens profile drawer) or Sign In button */}
          {user?.isSignedIn ? (
            <button
              type="button"
              onClick={() => setProfileDrawerOpen(true)}
              aria-label="Open profile menu"
              className="grid h-8 w-8 place-items-center rounded-full bg-blue-600 text-[11px] font-bold text-white shadow-sm active:scale-95"
            >
              {user.initials}
            </button>
          ) : (
            <Link
              href="/login"
              aria-label="Sign in"
              className={`inline-flex h-8 items-center gap-1 rounded-full px-3 text-[11.5px] font-semibold transition active:scale-95 ${
                isDark
                  ? "bg-white/10 text-white hover:bg-white/20"
                  : "bg-slate-900 text-white hover:bg-slate-800"
              }`}
            >
              <LogIn size={13} />
              <span>Login</span>
            </Link>
          )}
        </div>
      </header>

      {/* Mobile Profile Bottom Sheet / Drawer */}
      {profileDrawerOpen && user && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs md:hidden animate-in fade-in duration-150">
          <div
            className={`w-full rounded-t-2xl border-t p-5 shadow-2xl transition-transform ${
              isDark
                ? "border-white/10 bg-[#0b1a2e] text-white"
                : "border-slate-200 bg-white text-slate-900"
            } pb-[max(env(safe-area-inset-bottom,0px),20px)]`}
          >
            {/* Header: User Profile Info */}
            <div className="flex items-start justify-between border-b pb-4 dark:border-white/10 border-slate-100">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-sm">
                  {user.initials}
                </span>
                <div className="min-w-0">
                  <p className="font-heading text-[15px] font-bold truncate">
                    {user.name}
                  </p>
                  <p className={`text-[12px] truncate ${isDark ? "text-white/60" : "text-slate-500"}`}>
                    {user.email}
                  </p>
                  <span
                    className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider ${
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
              <button
                type="button"
                onClick={() => setProfileDrawerOpen(false)}
                className={`rounded-full p-1.5 transition ${
                  isDark ? "text-white/60 hover:bg-white/10" : "text-slate-400 hover:bg-slate-100"
                }`}
              >
                <X size={18} />
              </button>
            </div>

            {/* Links list */}
            <div className="py-3 space-y-1 text-[13.5px]">
              <Link
                href="/account"
                onClick={() => setProfileDrawerOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-3 font-medium transition active:scale-98 ${
                  isDark
                    ? "text-white/90 hover:bg-white/10"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Settings size={17} className="text-blue-500" />
                <span>Account & Monitored Areas</span>
              </Link>

              <Link
                href="/reports"
                onClick={() => setProfileDrawerOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-3 font-medium transition active:scale-98 ${
                  isDark
                    ? "text-white/90 hover:bg-white/10"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <FileClock size={17} className="text-emerald-500" />
                <span>My Outage Reports</span>
              </Link>

              {user.isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setProfileDrawerOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-3 font-medium transition active:scale-98 ${
                    isDark
                      ? "text-purple-300 hover:bg-purple-500/20"
                      : "text-purple-700 hover:bg-purple-50"
                  }`}
                >
                  <ShieldCheck size={17} className="text-purple-500" />
                  <span>Operations Workspace (Admin)</span>
                </Link>
              )}
            </div>

            {/* Sign Out */}
            {onSignOut && (
              <div className="border-t pt-2 dark:border-white/10 border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setProfileDrawerOpen(false);
                    onSignOut();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-[13.5px] font-semibold text-rose-500 hover:bg-rose-500/10 transition active:scale-98"
                >
                  <LogOut size={17} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
