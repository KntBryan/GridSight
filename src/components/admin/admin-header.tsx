import Link from "next/link";
import { ArrowLeft, Zap } from "lucide-react";

type AdminHeaderProps = {
  activePage: "desk" | "accounts";
};

export function AdminHeader({ activePage }: AdminHeaderProps) {
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
        </nav>
      </div>
    </header>
  );
}
