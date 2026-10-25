"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bell, Check, CheckCheck, Clock3, Zap } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type NotificationItem = { id: string; message: string; kind: "outage_reported" | "outage_restored"; is_read: boolean; created_at: string };

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [message, setMessage] = useState("Loading notifications…");
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setMessage("Notifications require a configured Supabase project.");
      return;
    }
    const supabase = createSupabaseBrowserClient();
    void supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setMessage("Sign in to view your notifications."); return; }
      const { data, error } = await supabase.from("notifications").select("id, message, kind, is_read, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
      if (error) { setMessage("Notifications could not be loaded."); return; }
      setItems((data ?? []) as NotificationItem[]);
      setMessage("");
    });
  }, []);

  async function markRead(id: string) {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    if (!error) setItems((current) => current.map((item) => item.id === id ? { ...item, is_read: true } : item));
  }

  async function markAllRead() {
    const supabase = createSupabaseBrowserClient();
    const ids = items.filter((item) => !item.is_read).map((item) => item.id);
    if (!ids.length) return;
    const { error } = await supabase.from("notifications").update({ is_read: true }).in("id", ids);
    if (!error) setItems((current) => current.map((item) => ({ ...item, is_read: true })));
  }

  return <main className="history-page"><header className="settings-topbar"><Link href="/" className="admin-back"><ArrowLeft size={16} /> Live map</Link><span className="admin-brand"><span><Bell size={16} /></span> NOTIFICATIONS</span><button className="settings-signout" onClick={() => void markAllRead()}><CheckCheck size={14} /> Mark all read</button></header><div className="history-content"><span className="eyebrow">AREA UPDATES</span><h1>Notifications</h1><p className="history-lede">Updates from the areas you follow.</p>{message && <div className="history-empty"><Bell size={20} /><p>{message}</p>{message.includes("Sign in") && <Link href="/login">Sign in</Link>}</div>}{!message && items.length === 0 && <div className="history-empty"><Bell size={20} /><p>You’re all caught up. New area updates will show here.</p></div>}{items.length > 0 && <div className="history-list">{items.map((item) => <article className={item.is_read ? "notification-item read" : "notification-item"} key={item.id}><span className={item.kind === "outage_restored" ? "notification-icon green" : "notification-icon red"}>{item.kind === "outage_restored" ? <Check size={15} /> : <Zap size={15} />}</span><div className="notification-body"><strong>{item.kind === "outage_restored" ? "Power restored" : "Outage reported"}</strong><p>{item.message}</p><time><Clock3 size={12} />{new Date(item.created_at).toLocaleString()}</time></div>{!item.is_read && <button className="mark-read" onClick={() => void markRead(item.id)}>Mark read</button>}</article>)}</div>}</div></main>;
}
