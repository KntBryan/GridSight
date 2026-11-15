"use client";

import Link from "next/link";
import { ArrowLeft, Zap } from "lucide-react";
import { ThemeToggle } from "@/components/preview/preview-theme";

type AdminHeaderProps = {
  activePage: "desk" | "updates" | "accounts";
};

export function AdminHeader({ activePage }: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#061120]/95 text-white backdrop-blur-xl transition-colors">
      <div className="mx-auto flex min-h-[70px] w-full max-w-[1240px] flex-wrap items-center justify-between gap-4 px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5 text-inherit no-underline">
          <span className="grid h-[34px] w-[34px] place-items-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/30">
            <Zap size={18} fill="currentColor" />
          </span>
          <span className="grid gap-0.5 leading-tight">
            <strong className="font-heading text-[16px] font-bold text-white">GridSight</strong>
            <small className="text-[10.5px] font-medium text-white/50">
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
                ? "bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/30"
                : "text-white/70 hover:bg-white/5 hover:text-white"
            }`}
          >
            Admin desk
          </Link>

          <Link
            href="/admin/updates"
            aria-current={activePage === "updates" ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition ${
              activePage === "updates"
                ? "bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/30"
                : "text-white/70 hover:bg-white/5 hover:text-white"
            }`}
          >
            Post Updates
          </Link>

          <Link
            href="/admin/accounts"
            aria-current={activePage === "accounts" ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition ${
              activePage === "accounts"
                ? "bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/30"
                : "text-white/70 hover:bg-white/5 hover:text-white"
            }`}
          >
            Accounts
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[12px] font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
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
