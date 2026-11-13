"use client";

import Link from "next/link";
import { ArrowLeft, Moon, Sun, Zap } from "lucide-react";
import { useEffect, useState } from "react";

export type AdminTheme = "light" | "dark";

type AdminHeaderProps = {
  activePage: "desk" | "accounts";
  onThemeChange?: (theme: AdminTheme) => void;
  theme?: AdminTheme;
};

export function AdminHeader({ activePage, onThemeChange, theme }: AdminHeaderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  function toggle() {
    const next: AdminTheme = theme === "dark" ? "light" : "dark";
    onThemeChange?.(next);
  }

  return (
    <header className="admin-topbar">
      <div className="admin-topbar-inner">
        <Link href="/" className="admin-logo">
          <span className="admin-logo-mark"><Zap size={18} fill="currentColor" /></span>
          <span className="admin-logo-copy">
            <strong>GridSight</strong>
            <small>Surigao City pilot</small>
          </span>
        </Link>
        <nav className="admin-nav" aria-label="Administrator navigation">
          <Link href="/admin" aria-current={activePage === "desk" ? "page" : undefined} className={activePage === "desk" ? "active" : undefined}>Admin desk</Link>
          <Link href="/admin/accounts" aria-current={activePage === "accounts" ? "page" : undefined} className={activePage === "accounts" ? "active" : undefined}>Accounts</Link>
          <Link href="/" className="admin-nav-return"><ArrowLeft size={15} /> Live map</Link>
          {mounted && (
            <button
              type="button"
              onClick={toggle}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="admin-theme-toggle"
              title={theme === "dark" ? "Light mode" : "Dark mode"}
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
