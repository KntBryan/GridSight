"use client";

import Link from "next/link";
import { ArrowLeft, Zap } from "lucide-react";
import { ThemeToggle, useTheme } from "@/components/preview/preview-theme";

type AdminHeaderProps = {
  activePage: "desk" | "updates" | "accounts";
};

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
      <div className="mx-auto flex min-h-[70px] w-full max-w-[1240px] flex-wrap items-center justify-between gap-4 px-5 sm:px-8">
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
    </header>
  );
}
