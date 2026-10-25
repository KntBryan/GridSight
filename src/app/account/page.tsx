"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bell, BellOff, Check, LoaderCircle, MapPin, Save, ShieldCheck, UserRound } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Area = { id: string; slug: string; name: string; city: string; psgc_code: string | null };
type Follow = { area_id: string; notifications_enabled: boolean };

export default function AccountPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [globalNotifications, setGlobalNotifications] = useState(true);
  const [areas, setAreas] = useState<Area[]>([]);
  const [follows, setFollows] = useState<Follow[]>([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pushEnabled, setPushEnabled] = useState(false);

  const loadAccount = useCallback(async () => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setError("Account services are not configured. Add Supabase settings to .env.local.");
      setBusy(false);
      return;
    }
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login"); return; }
    setUserId(user.id);
    const [{ data: profile }, { data: areaRows }, { data: followRows }] = await Promise.all([
      supabase.from("profiles").select("name, phone, notifications_enabled").eq("id", user.id).single(),
      supabase.from("areas").select("id, slug, name, city, psgc_code").eq("area_type", "barangay").eq("city", "Surigao City").order("name"),
      supabase.from("user_areas").select("area_id, notifications_enabled").eq("user_id", user.id),
    ]);
    setName(profile?.name ?? "");
    setPhone(profile?.phone ?? "");
    setGlobalNotifications(profile?.notifications_enabled ?? true);
    const cityAreas = (areaRows ?? []) as Area[];
    const cityAreaIds = new Set(cityAreas.map((area) => area.id));
    setAreas(cityAreas);
    setFollows(((followRows ?? []) as Follow[]).filter((follow) => cityAreaIds.has(follow.area_id)));
    setBusy(false);
  }, [router]);

  useEffect(() => { void loadAccount(); }, [loadAccount]);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const supabase = createSupabaseBrowserClient();
    const { error: profileError } = await supabase.from("profiles").update({ name: name.trim(), phone: phone.trim() || null, notifications_enabled: globalNotifications }).eq("id", userId);
    if (profileError) { setError("Profile changes could not be saved."); return; }
    if (password) {
      const { error: passwordError } = await supabase.auth.updateUser({ password });
      if (passwordError) { setError(passwordError.message); return; }
      setPassword("");
    }
    setMessage("Account settings saved.");
  }

  async function toggleFollow(area: Area) {
    const supabase = createSupabaseBrowserClient();
    const existing = follows.find((follow) => follow.area_id === area.id);
    if (existing) {
      const { error: deleteError } = await supabase.from("user_areas").delete().eq("user_id", userId).eq("area_id", area.id);
      if (deleteError) { setError("Could not unfollow this area."); return; }
      setFollows((current) => current.filter((follow) => follow.area_id !== area.id));
    } else {
      const { error: insertError } = await supabase.from("user_areas").insert({ user_id: userId, area_id: area.id });
      if (insertError) { setError("Could not follow this area."); return; }
      setFollows((current) => [...current, { area_id: area.id, notifications_enabled: true }]);
    }
  }

  async function toggleAreaNotifications(areaId: string, enabled: boolean) {
    const supabase = createSupabaseBrowserClient();
    const { error: updateError } = await supabase.from("user_areas").update({ notifications_enabled: enabled }).eq("user_id", userId).eq("area_id", areaId);
    if (!updateError) setFollows((current) => current.map((follow) => follow.area_id === areaId ? { ...follow, notifications_enabled: enabled } : follow));
  }

  async function enablePush() {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
      setError("Push notifications are not configured for this deployment.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") { setError("Allow notifications in your browser settings to enable alerts."); return; }
    const registration = await navigator.serviceWorker.ready;
    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(key.padEnd(Math.ceil(key.length / 4) * 4, "="));
    const applicationServerKey = Uint8Array.from(decoded, (character) => character.charCodeAt(0));
    const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
    const response = await fetch("/api/push-subscription", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(subscription) });
    if (!response.ok) { setError("Push subscription could not be saved."); return; }
    setPushEnabled(true);
    setMessage("Push notifications enabled on this device.");
  }

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/");
  }

  const followedIds = new Set(follows.map((follow) => follow.area_id));
  const availableAreas = areas.filter((area) => `${area.name} ${area.city}`.toLowerCase().includes(search.toLowerCase()));

  return <main className="settings-page">
    <header className="settings-topbar"><Link href="/" className="admin-back"><ArrowLeft size={16} /> Live map</Link><span className="admin-brand"><span><UserRound size={16} /></span> ACCOUNT SETTINGS</span><button className="settings-signout" onClick={signOut}>Sign out</button></header>
    <div className="settings-content">
      <div className="settings-heading"><span className="eyebrow">YOUR GRID SIGHT</span><h1>Account & areas</h1><p>Manage your details and the places you keep an eye on.</p></div>
      {error && <p className="settings-message settings-error" role="alert">{error}</p>}{message && <p className="settings-message settings-success" role="status"><Check size={14} />{message}</p>}
      {busy ? <div className="admin-loading"><LoaderCircle size={18} className="loading-icon" /> Loading your account</div> : <div className="settings-grid">
        <section className="settings-section"><div className="settings-section-title"><span className="settings-icon"><UserRound size={17} /></span><div><h2>Profile</h2><p>Keep your account details up to date.</p></div></div>
          <form className="account-form" onSubmit={saveProfile}><label htmlFor="account-name">Name</label><input id="account-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required />
            <label htmlFor="account-phone">Phone</label><input id="account-phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={30} placeholder="Optional" />
            <label htmlFor="account-password">New password <small>LEAVE BLANK TO KEEP CURRENT</small></label><input id="account-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} autoComplete="new-password" placeholder="At least 8 characters" />
            <label className="settings-toggle"><span><Bell size={15} /> Global notifications</span><input type="checkbox" checked={globalNotifications} onChange={(event) => setGlobalNotifications(event.target.checked)} /></label>
            <button className="settings-save" type="submit"><Save size={15} /> Save changes</button>
          </form>
        </section>
        <section className="settings-section areas-section"><div className="settings-section-title"><span className="settings-icon"><MapPin size={17} /></span><div><h2>Followed areas <span className="follow-count" suppressHydrationWarning>{follows.length}</span></h2><p>Choose where you want local outage updates.</p></div></div>
          <label className="area-search"><MapPin size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search areas" aria-label="Search areas" /></label>
          <div className="settings-area-list">{availableAreas.map((area) => { const follow = follows.find((item) => item.area_id === area.id); return <div className="settings-area" key={area.id}><span className="area-dot dot-green" /><div><strong>{area.name}</strong><small>{area.city}</small></div>{follow && <label className="area-alert-toggle" title="Notifications for this area"><input type="checkbox" checked={follow.notifications_enabled} onChange={(event) => void toggleAreaNotifications(area.id, event.target.checked)} /><Bell size={14} /></label>}<button className={follow ? "follow-control following" : "follow-control"} onClick={() => void toggleFollow(area)}>{follow ? "Following" : "Follow"}</button></div>; })}</div>
          <div className="push-setting"><div><strong>Web push on this device</strong><small>Get outage and restoration alerts.</small></div><button onClick={() => void enablePush()} disabled={pushEnabled}>{pushEnabled ? <><Check size={14} /> Enabled</> : <><Bell size={14} /> Enable</>}</button></div>
        </section>
      </div>}
    </div>
  </main>;
}
