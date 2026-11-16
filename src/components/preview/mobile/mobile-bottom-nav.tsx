"use client";

import { LayoutDashboard, Map, Megaphone, FileClock, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { type PreviewTab } from "../preview-nav";
import { useTheme } from "../preview-theme";

interface MobileBottomNavProps {
  currentTab: PreviewTab;
  onSelectTab: (tab: PreviewTab) => void;
  isAdmin?: boolean;
}

export function MobileBottomNav({
  currentTab,
  onSelectTab,
  isAdmin = false,
}: MobileBottomNavProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const navItems: Array<{
    id: PreviewTab | "admin" | "reports";
    label: string;
    icon: typeof LayoutDashboard;
    href?: string;
  }> = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "map", label: "Live Map", icon: Map },
    { id: "updates", label: "Updates", icon: Megaphone },
  ];

  if (isAdmin) {
    navItems.push({
      id: "admin",
      label: "Admin Desk",
      icon: ShieldCheck,
      href: "/admin",
    });
  } else {
    navItems.push({
      id: "reports",
      label: "My Reports",
      icon: FileClock,
      href: "/reports",
    });
  }

  return (
    <nav
      aria-label="Mobile Navigation"
      className={`fixed bottom-0 inset-x-0 z-50 flex items-center justify-around border-t backdrop-blur-xl transition-colors md:hidden ${
        isDark
          ? "border-white/10 bg-[#061120]/95 text-white"
          : "border-slate-200 bg-white/95 text-slate-900 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]"
      } pb-[max(env(safe-area-inset-bottom,0px),8px)] pt-2`}
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentTab === item.id;

        if (item.href) {
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex flex-col items-center justify-center min-w-[64px] py-1 transition-transform active:scale-90 ${
                isDark
                  ? "text-white/60 hover:text-white"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <div className="relative">
                <Icon size={20} strokeWidth={2} />
              </div>
              <span className="mt-1 text-[10px] font-medium tracking-tight">
                {item.label}
              </span>
            </Link>
          );
        }

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectTab(item.id as PreviewTab)}
            className={`flex flex-col items-center justify-center min-w-[64px] py-1 transition-all active:scale-90 ${
              isActive
                ? isDark
                  ? "text-blue-400 font-semibold"
                  : "text-blue-600 font-semibold"
                : isDark
                ? "text-white/60 hover:text-white"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <div
              className={`relative flex items-center justify-center rounded-xl p-1 transition-all ${
                isActive
                  ? isDark
                    ? "bg-blue-500/20 shadow-sm shadow-blue-500/20"
                    : "bg-blue-50 shadow-sm shadow-blue-500/10"
                  : ""
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.4 : 2} />
              {isActive && (
                <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-blue-500" />
              )}
            </div>
            <span className="mt-1 text-[10px] font-medium tracking-tight">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
