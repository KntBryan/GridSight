"use client";

import Link from "next/link";
import { Zap, MapPin, ExternalLink } from "lucide-react";
import { ThemeToggle, useTheme } from "./preview-theme";

export type PreviewTab = "home" | "map" | "updates" | "dashboard";

interface PreviewNavProps {
  currentTab: PreviewTab;
  onSelectTab: (tab: PreviewTab) => void;
  onOpenReport: () => void;
}

export function PreviewNav({ currentTab, onSelectTab, onOpenReport }: PreviewNavProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <>
      {/* Top Preview Status Bar */}
      <div
        className={`px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-3 transition-colors ${
          isDark
            ? "bg-[#0b1a2e] border-b border-white/10 text-white/80"
            : "bg-slate-100 border-b border-slate-200 text-slate-700 shadow-sm"
        }`}
      >
        <div className="flex items-center gap-2 font-mono">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
            BASE44 UI PREVIEW MODE
          </span>
          <span className={isDark ? "text-white/40" : "text-slate-400"}>|</span>
          <span className={isDark ? "text-white/60" : "text-slate-600"}>
            Isolated route at <code className="text-blue-500 font-semibold">/preview</code>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded font-medium transition text-[11px] ${
              isDark
                ? "bg-white/10 hover:bg-white/20 text-white"
                : "bg-slate-200 hover:bg-slate-300 text-slate-800"
            }`}
          >
            <span>Exit Preview & View Current UI</span>
            <ExternalLink size={12} />
          </Link>
        </div>
      </div>

      {/* Main Base44 Header */}
      <header
        className={`sticky top-0 z-40 border-b backdrop-blur-xl transition-colors ${
          isDark
            ? "border-white/10 bg-[#061120]/85 text-white"
            : "border-slate-200 bg-white/90 text-slate-900 shadow-sm"
        }`}
      >
        <div className="mx-auto flex h-[70px] w-full max-w-[1240px] items-center justify-between gap-6 px-5 sm:px-8">
          {/* Logo */}
          <button
            type="button"
            onClick={() => onSelectTab("home")}
            className="flex items-center gap-3 text-left focus:outline-none"
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
          <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
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

          {/* Action CTAs + Theme Toggle */}
          <div className="flex items-center gap-3">
            <ThemeToggle />

            <button
              type="button"
              onClick={onOpenReport}
              className="inline-flex items-center gap-2 rounded-full bg-[#0d6edc] px-4 py-2 text-[13px] font-semibold text-white shadow-[0_4px_16px_rgba(13,110,220,0.35)] transition hover:bg-[#0b5ec0]"
            >
              <MapPin size={14} />
              <span>Report Outage</span>
            </button>
          </div>
        </div>

        {/* Mobile Nav Tabs */}
        <div
          className={`flex overflow-x-auto border-t px-4 py-2 md:hidden gap-2 transition-colors ${
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
        </div>
      </header>
    </>
  );
}
