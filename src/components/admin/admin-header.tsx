"use client";

import Link from "next/link";
import { ArrowLeft, Zap, ClipboardList, Send, Users } from "lucide-react";
import { ThemeToggle, useTheme } from "@/components/preview/preview-theme";

/**
 * Component props for the administrative workspace header.
 */
type AdminHeaderProps = {
  /** Active administrative subpage identifier. */
  activePage: "desk" | "updates" | "accounts";
};

/**
 * Top navigation header for administrative workspace pages (`/admin`, `/admin/updates`, `/admin/accounts`).
 *
 * @remarks
 * Renders:
 * - Desktop: Full-width navigation bar with breadcrumb brand, subpage pills, "Back to live map", and theme toggle.
 * - Mobile: Compact sticky bar with direct map exit and a horizontal bottom navigation bar for touch switching between Desk, Updates, and Accounts.
 */
export function AdminHeader({ activePage }: AdminHeaderProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <header
      className={`sticky top-0 z-40 border-b backdrop-blur-xl transition-colors ${
        isDark
          ? "border-white/10 bg-[#061120]/95 text-white"
          : "border-slate-200 bg-white text-slate-900 shadow-sm"
      }`}
    >
      {/* ========================================================
          DESKTOP HEADER (>= md / 768px): 100% PRESERVED EXACT UI
          ======================================================== */}
      <div className="mx-auto hidden min-h-[70px] w-full max-w-[1240px] items-center justify-between gap-4 px-5 sm:px-8 md:flex">
        <Link href="/" className="flex items-center gap-2.5 text-inherit no-underline">
          <span className="grid h-[34px] w-[34px] place-items-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/30">
            <Zap size={18} fill="currentColor" />
          </span>
          <span className="grid gap-0.5 leading-tight">
            <strong className="font-heading text-[16px] font-bold">GridSight</strong>
            <small className={`text-[10.5px] font-medium ${isDark ? "text-white/50" : "text-slate-500"}`}>
              Surigao City pilot
            </small>
          </span>
        </Link>

        <nav className="flex flex-wrap items-center gap-1.5 sm:gap-2" aria-label="Administrator navigation">
          <Link
            href="/admin"
            aria-current={activePage === "desk" ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition ${
              activePage === "desk"
                ? isDark
                  ? "bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/30"
                  : "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                : isDark
                ? "text-white/70 hover:bg-white/5 hover:text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            Admin desk
          </Link>

          <Link
            href="/admin/updates"
            aria-current={activePage === "updates" ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition ${
              activePage === "updates"
                ? isDark
                  ? "bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/30"
                  : "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                : isDark
                ? "text-white/70 hover:bg-white/5 hover:text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            Post Updates
          </Link>

          <Link
            href="/admin/accounts"
            aria-current={activePage === "accounts" ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition ${
              activePage === "accounts"
                ? isDark
                  ? "bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/30"
                  : "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                : isDark
                ? "text-white/70 hover:bg-white/5 hover:text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            Accounts
          </Link>

          <Link
            href="/"
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition ${
              isDark
                ? "border-white/15 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
                : "border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <ArrowLeft size={13} /> Live map
          </Link>

          <div className="ml-1">
            <ThemeToggle />
          </div>
        </nav>
      </div>

      {/* ========================================================
          MOBILE HEADER (< md / 768px): ADAPTIVE BASE44 ADMIN UI
          ======================================================== */}
      <div className="flex flex-col w-full px-3 pt-2.5 pb-2 md:hidden">
        {/* Top row: Brand + Live Dot + Map Link + Theme Toggle */}
        <div className="flex items-center justify-between gap-2">
          <Link href="/admin" className="flex items-center gap-2 min-w-0 text-inherit no-underline">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-600/30">
              <Zap size={16} fill="currentColor" />
            </span>
            <div className="flex flex-col min-w-0 leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="font-heading text-[14px] font-extrabold truncate">
                  Admin Desk
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              </div>
              <span className={`text-[9px] font-semibold uppercase tracking-wider ${isDark ? "text-white/50" : "text-slate-500"}`}>
                Operations
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-1.5 shrink-0">
            <Link
              href="/"
              className={`inline-flex h-8 items-center gap-1 rounded-full border px-2.5 text-[11px] font-semibold transition active:scale-95 ${
                isDark
                  ? "border-white/15 bg-white/5 text-white/90"
                  : "border-slate-200 bg-slate-50 text-slate-700"
              }`}
            >
              <ArrowLeft size={12} />
              <span>Map</span>
            </Link>
            <ThemeToggle />
          </div>
        </div>

        {/* Bottom row: Touch-friendly segmented navigation pills */}
        <nav
          className={`mt-2.5 grid grid-cols-3 gap-1 rounded-xl p-1 text-[11.5px] font-semibold border ${
            isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-100"
          }`}
          aria-label="Mobile administrator navigation"
        >
          <Link
            href="/admin"
            aria-current={activePage === "desk" ? "page" : undefined}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition active:scale-95 ${
              activePage === "desk"
                ? "bg-blue-600 text-white shadow-sm"
                : isDark
                ? "text-white/70 hover:text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ClipboardList size={13} />
            <span>Triage</span>
          </Link>

          <Link
            href="/admin/updates"
            aria-current={activePage === "updates" ? "page" : undefined}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition active:scale-95 ${
              activePage === "updates"
                ? "bg-blue-600 text-white shadow-sm"
                : isDark
                ? "text-white/70 hover:text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Send size={13} />
            <span>Updates</span>
          </Link>

          <Link
            href="/admin/accounts"
            aria-current={activePage === "accounts" ? "page" : undefined}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition active:scale-95 ${
              activePage === "accounts"
                ? "bg-blue-600 text-white shadow-sm"
                : isDark
                ? "text-white/70 hover:text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users size={13} />
            <span>Staff</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
