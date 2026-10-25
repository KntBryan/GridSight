"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock3, FileClock, MapPin, ShieldCheck } from "lucide-react";

type Report = { id: string; status: string; verification_status: string; notes: string | null; created_at: string; areas: { name: string; city: string }[] | null };

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [message, setMessage] = useState("Loading your report history…");
  useEffect(() => {
    fetch("/api/reports", { cache: "no-store" }).then(async (response) => {
      const result = await response.json();
      if (!response.ok) { setMessage(result.error || "Sign in to view your report history."); return; }
      setReports(((result.reports ?? []) as Report[]).map((row) => ({
        ...row,
        areas: Array.isArray(row.areas) ? row.areas : row.areas ? [row.areas] : null,
      })));
      setMessage("");
    }).catch(() => setMessage("Report history is currently unavailable."));
  }, []);

  return <main className="history-page"><header className="settings-topbar"><Link href="/" className="admin-back"><ArrowLeft size={16} /> Live map</Link><span className="admin-brand"><span><FileClock size={16} /></span> MY REPORTS</span><Link href="/account" className="settings-signout">Account</Link></header><div className="history-content"><span className="eyebrow">YOUR CONTRIBUTIONS</span><h1>Report history</h1><p className="history-lede">Every signal you’ve shared, in one place.</p>{message && <div className="history-empty"><ShieldCheck size={20} /><p>{message}</p>{message.includes("Sign in") && <Link href="/login">Sign in</Link>}</div>}{!message && reports.length === 0 && <div className="history-empty"><FileClock size={20} /><p>No reports yet. Your first local signal starts here.</p><Link href="/">Report an outage</Link></div>}{reports.length > 0 && <div className="history-list">{reports.map((report) => { const area = report.areas?.[0]; return <article className="history-item" key={report.id}><span className={`history-status review-${report.status}`}>{report.status.replace("_", " ")}</span><div className="history-area"><strong>{area?.name ?? "Unknown area"}</strong><small><MapPin size={12} />{area?.city ?? ""}</small></div><p>{report.notes || "No notes provided."}</p><span className="history-review">{report.verification_status}</span><time><Clock3 size={12} />{new Date(report.created_at).toLocaleString()}</time></article>; })}</div>}</div></main>;
}
