"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  Check,
  LoaderCircle,
  MapPin,
  Save,
  ShieldCheck,
  UserRound,
  LogOut,
  Search,
  KeyRound,
  Zap,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { ThemeProvider, ThemeToggle, useTheme } from "@/components/preview/preview-theme";

type Area = { id: string; slug: string; name: string; city: string; psgc_code: string | null };
type Follow = { area_id: string; notifications_enabled: boolean };

function AccountPageInner() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [userId, setUserId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [globalNotifications, setGlobalNotifications] = useState(true);
  const [areas, setAreas] = useState<Area[]>([]);
  const [follows, setFollows] = useState<Follow[]>([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
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
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    setUserId(user.id);
    setEmail(user.email ?? "");

    const [{ data: profile }, { data: areaRows }, { data: followRows }] = await Promise.all([
      supabase.from("profiles").select("name, phone, role, notifications_enabled").eq("id", user.id).single(),
      supabase
        .from("areas")
        .select("id, slug, name, city, psgc_code")
        .eq("area_type", "barangay")
        .eq("city", "Surigao City")
        .order("name"),
      supabase.from("user_areas").select("area_id, notifications_enabled").eq("user_id", user.id),
    ]);

    setName(profile?.name ?? "");
    setRole(profile?.role ?? "user");
    setPhone(profile?.phone ?? "");
    setGlobalNotifications(profile?.notifications_enabled ?? true);

    const cityAreas = (areaRows ?? []) as Area[];
    const cityAreaIds = new Set(cityAreas.map((area) => area.id));
    setAreas(cityAreas);
    setFollows(((followRows ?? []) as Follow[]).filter((follow) => cityAreaIds.has(follow.area_id)));
    setBusy(false);
  }, [router]);

  useEffect(() => {
    void loadAccount();
  }, [loadAccount]);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!name.trim()) {
      setError("Please enter a display name.");
      return;
    }
    setSaving(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          name: name.trim(),
          phone: phone.trim() || null,
          notifications_enabled: globalNotifications,
        })
        .eq("id", userId);

      if (profileError) {
        setError("Profile changes could not be saved.");
        return;
      }

      if (password) {
        const { error: passwordError } = await supabase.auth.updateUser({ password });
        if (passwordError) {
          setError(passwordError.message);
          return;
        }
        setPassword("");
      }

      setMessage("Profile and settings updated successfully.");
      setTimeout(() => setMessage(""), 4000);
    } catch {
      setError("An unexpected error occurred while saving.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleFollow(area: Area) {
    const supabase = createSupabaseBrowserClient();
    const existing = follows.find((follow) => follow.area_id === area.id);
    if (existing) {
      const { error: deleteError } = await supabase
        .from("user_areas")
        .delete()
        .eq("user_id", userId)
        .eq("area_id", area.id);
      if (deleteError) {
        setError("Could not unfollow this area.");
        return;
      }
      setFollows((current) => current.filter((follow) => follow.area_id !== area.id));
    } else {
      const { error: insertError } = await supabase
        .from("user_areas")
        .insert({ user_id: userId, area_id: area.id });
      if (insertError) {
        setError("Could not follow this area.");
        return;
      }
      setFollows((current) => [...current, { area_id: area.id, notifications_enabled: true }]);
    }
  }

  async function toggleAreaNotifications(areaId: string, enabled: boolean) {
    const supabase = createSupabaseBrowserClient();
    const { error: updateError } = await supabase
      .from("user_areas")
      .update({ notifications_enabled: enabled })
      .eq("user_id", userId)
      .eq("area_id", areaId);

    if (!updateError) {
      setFollows((current) =>
        current.map((follow) => (follow.area_id === areaId ? { ...follow, notifications_enabled: enabled } : follow))
      );
    }
  }

  async function enablePush() {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
      setError("Push notifications are not configured for this deployment.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setError("Allow notifications in your browser settings to enable alerts.");
      return;
    }
    const registration = await navigator.serviceWorker.ready;
    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(key.padEnd(Math.ceil(key.length / 4) * 4, "="));
    const applicationServerKey = Uint8Array.from(decoded, (character) => character.charCodeAt(0));
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
    const response = await fetch("/api/push-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription),
    });
    if (!response.ok) {
      setError("Push subscription could not be saved.");
      return;
    }
    setPushEnabled(true);
    setMessage("Push notifications enabled on this device.");
  }

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/");
  }

  const followedIds = new Set(follows.map((follow) => follow.area_id));
  const availableAreas = areas.filter((area) =>
    `${area.name} ${area.city}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDark ? "bg-[#061120] text-white" : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* Top Header */}
      <header
        className={`sticky top-0 z-40 border-b backdrop-blur-xl transition-colors ${
          isDark
            ? "border-white/10 bg-[#061120]/85 text-white"
            : "border-slate-200 bg-white/90 text-slate-900 shadow-sm"
        }`}
      >
        <div className="mx-auto flex h-[70px] w-full max-w-[1240px] items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition ${
                isDark
                  ? "border-white/15 bg-white/[0.06] text-white/80 hover:bg-white/10 hover:text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-sm"
              }`}
            >
              <ArrowLeft size={14} />
              <span>Back to Map</span>
            </Link>

            <div className="flex items-center gap-2">
              <div className="grid h-[28px] w-[28px] place-items-center rounded-lg bg-[#0d6edc] text-white">
                <Zap size={15} fill="currentColor" />
              </div>
              <span className="font-heading text-[15px] font-bold">GridSight</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              type="button"
              onClick={signOut}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition ${
                isDark
                  ? "border-white/15 bg-white/[0.06] text-white/70 hover:border-red-500/40 hover:text-red-400"
                  : "border-slate-300 bg-white text-slate-600 hover:border-red-300 hover:text-red-600 shadow-sm"
              }`}
            >
              <LogOut size={13} />
              <span>Log out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-8">
        {/* Page Heading - Base44 Style */}
        <div className="mb-8">
          <p
            className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${
              isDark ? "text-blue-400" : "text-blue-600"
            }`}
          >
            Account
          </p>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-[-0.02em] mt-1">
            Settings
          </h1>
          <p className={`text-[13.5px] mt-1 ${isDark ? "text-white/60" : "text-slate-600"}`}>
            Your profile, sign-in and reporting areas.
          </p>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-[13px] text-red-400">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-[13px] text-emerald-400">
            <Check size={16} />
            <span>{message}</span>
          </div>
        )}

        {busy ? (
          <div className="flex items-center justify-center py-24 gap-3">
            <LoaderCircle size={22} className="animate-spin text-blue-500" />
            <span className={`text-[14px] ${isDark ? "text-white/60" : "text-slate-600"}`}>
              Loading your account details…
            </span>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            {/* Left Column: Profile & Sign-in */}
            <div className="space-y-6">
              {/* Profile Card */}
              <div
                className={`rounded-2xl border p-6 transition ${
                  isDark
                    ? "border-white/10 bg-[#0b1a2e]"
                    : "border-slate-200 bg-white shadow-sm"
                }`}
              >
                <div className="mb-5 flex items-center gap-2.5">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-500/20 text-blue-400">
                    <UserRound size={17} />
                  </div>
                  <div>
                    <h2 className="font-heading text-[16px] font-bold">Profile</h2>
                    <p className={`text-[12px] ${isDark ? "text-white/50" : "text-slate-500"}`}>
                      Keep your account details up to date.
                    </p>
                  </div>
                </div>

                <form onSubmit={saveProfile} className="space-y-4">
                  <div>
                    <label
                      htmlFor="full_name"
                      className={`mb-1.5 block text-[12.5px] font-semibold ${
                        isDark ? "text-white/80" : "text-slate-700"
                      }`}
                    >
                      Display name
                    </label>
                    <input
                      id="full_name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={80}
                      className={`h-11 w-full rounded-xl border px-3.5 text-[13.5px] outline-none transition focus:border-blue-500 ${
                        isDark
                          ? "border-white/10 bg-[#081524] text-white"
                          : "border-slate-200 bg-slate-50 text-slate-900 focus:bg-white"
                      }`}
                      placeholder="Your name"
                      required
                    />
                    <p className={`mt-1.5 text-[11px] ${isDark ? "text-white/40" : "text-slate-500"}`}>
                      Shown to you and to city staff reviewing your reports. Never shown publicly.
                    </p>
                  </div>

                  <div>
                    <span
                      className={`mb-1.5 block text-[12.5px] font-semibold ${
                        isDark ? "text-white/80" : "text-slate-700"
                      }`}
                    >
                      Email address
                    </span>
                    <p
                      className={`rounded-xl border px-3.5 py-2.5 text-[13px] ${
                        isDark
                          ? "border-white/10 bg-white/[0.04] text-white/50"
                          : "border-slate-200 bg-slate-100 text-slate-500"
                      }`}
                    >
                      {email || "—"}
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="phone"
                      className={`mb-1.5 block text-[12.5px] font-semibold ${
                        isDark ? "text-white/80" : "text-slate-700"
                      }`}
                    >
                      Phone number (optional)
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      maxLength={30}
                      className={`h-11 w-full rounded-xl border px-3.5 text-[13.5px] outline-none transition focus:border-blue-500 ${
                        isDark
                          ? "border-white/10 bg-[#081524] text-white"
                          : "border-slate-200 bg-slate-50 text-slate-900 focus:bg-white"
                      }`}
                      placeholder="+63 9XX XXX XXXX"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#0d6edc] px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_16px_rgba(13,110,220,0.35)] transition hover:bg-[#0b5ec0] disabled:opacity-60"
                    >
                      {saving ? (
                        <>
                          <LoaderCircle size={15} className="animate-spin" />
                          <span>Saving…</span>
                        </>
                      ) : (
                        <>
                          <Save size={15} />
                          <span>Save changes</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Sign-in Card */}
              <div
                className={`rounded-2xl border p-6 transition ${
                  isDark
                    ? "border-white/10 bg-[#0b1a2e]"
                    : "border-slate-200 bg-white shadow-sm"
                }`}
              >
                <div className="mb-4 flex items-center gap-2.5">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500/20 text-amber-400">
                    <KeyRound size={17} />
                  </div>
                  <div>
                    <h2 className="font-heading text-[16px] font-bold">Sign-in & Password</h2>
                    <p className={`text-[12px] ${isDark ? "text-white/50" : "text-slate-500"}`}>
                      Manage your password and security.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="account-password"
                      className={`mb-1.5 block text-[12.5px] font-semibold ${
                        isDark ? "text-white/80" : "text-slate-700"
                      }`}
                    >
                      Set new password (leave blank to keep current)
                    </label>
                    <input
                      id="account-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={8}
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                      className={`h-11 w-full rounded-xl border px-3.5 text-[13.5px] outline-none transition focus:border-blue-500 ${
                        isDark
                          ? "border-white/10 bg-[#081524] text-white"
                          : "border-slate-200 bg-slate-50 text-slate-900 focus:bg-white"
                      }`}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={signOut}
                      className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[12.5px] font-semibold transition ${
                        isDark
                          ? "border-white/15 bg-white/[0.06] text-white/80 hover:border-red-500/40 hover:text-red-400"
                          : "border-slate-300 bg-white text-slate-700 hover:border-red-300 hover:text-red-600 shadow-sm"
                      }`}
                    >
                      <LogOut size={14} />
                      <span>Log out</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Your Access & Followed Areas */}
            <div className="space-y-6">
              {/* Your Access Card */}
              <div
                className={`rounded-2xl border p-6 transition ${
                  isDark
                    ? "border-white/10 bg-[#0b1a2e]"
                    : "border-slate-200 bg-white shadow-sm"
                }`}
              >
                <div className="mb-3 flex items-center gap-2.5">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-purple-500/20 text-purple-400">
                    <ShieldCheck size={17} />
                  </div>
                  <div>
                    <h2 className="font-heading text-[16px] font-bold">Your Access</h2>
                  </div>
                </div>

                <div className="mt-3">
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${
                      role === "admin"
                        ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                        : isDark
                        ? "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                        : "bg-blue-50 text-blue-600 border border-blue-200"
                    }`}
                  >
                    {role === "admin" ? "City Administrator" : "Community Member"}
                  </span>
                  <p className={`mt-3 text-[12.5px] leading-relaxed ${isDark ? "text-white/60" : "text-slate-600"}`}>
                    {role === "admin"
                      ? "You can review reports, set outage statuses, post community updates and export data."
                      : "You can submit reports, follow your area and see verified outage information."}
                  </p>
                </div>
              </div>

              {/* Followed Areas Card */}
              <div
                className={`rounded-2xl border p-6 transition ${
                  isDark
                    ? "border-white/10 bg-[#0b1a2e]"
                    : "border-slate-200 bg-white shadow-sm"
                }`}
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/20 text-emerald-400">
                      <MapPin size={17} />
                    </div>
                    <div>
                      <h2 className="font-heading text-[16px] font-bold">Followed Areas</h2>
                      <p className={`text-[12px] ${isDark ? "text-white/50" : "text-slate-500"}`}>
                        Get alerts for your barangays.
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/25 px-2.5 py-0.5 text-xs font-bold">
                    {follows.length}
                  </span>
                </div>

                {/* Search Barangays */}
                <div className="relative mb-3">
                  <Search
                    size={14}
                    className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                      isDark ? "text-white/40" : "text-slate-400"
                    }`}
                  />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search 54 barangays…"
                    className={`h-9 w-full rounded-xl border pl-9 pr-3 text-[12.5px] outline-none transition focus:border-blue-500 ${
                      isDark
                        ? "border-white/10 bg-[#081524] text-white placeholder-white/30"
                        : "border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:bg-white"
                    }`}
                  />
                </div>

                {/* Barangay List */}
                <div className="max-h-[280px] overflow-y-auto space-y-1.5 pr-1">
                  {availableAreas.map((area) => {
                    const isFollowed = followedIds.has(area.id);
                    const follow = follows.find((f) => f.area_id === area.id);

                    return (
                      <div
                        key={area.id}
                        className={`flex items-center justify-between rounded-xl p-2.5 transition ${
                          isDark
                            ? "bg-white/[0.03] hover:bg-white/[0.06]"
                            : "bg-slate-50 hover:bg-slate-100"
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <p className="truncate text-[13px] font-semibold">{area.name}</p>
                          <p className={`text-[11px] ${isDark ? "text-white/40" : "text-slate-500"}`}>
                            {area.city}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {isFollowed && (
                            <button
                              type="button"
                              onClick={() => toggleAreaNotifications(area.id, !follow?.notifications_enabled)}
                              className={`rounded-lg p-1.5 transition ${
                                follow?.notifications_enabled
                                  ? "text-amber-400 hover:bg-amber-400/10"
                                  : isDark
                                  ? "text-white/30 hover:bg-white/10"
                                  : "text-slate-300 hover:bg-slate-200"
                              }`}
                              title={follow?.notifications_enabled ? "Alerts on" : "Alerts muted"}
                            >
                              <Bell size={14} />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => toggleFollow(area)}
                            className={`rounded-full px-3 py-1 text-[11.5px] font-semibold transition ${
                              isFollowed
                                ? isDark
                                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-red-500/15 hover:text-red-400 hover:border-red-500/30"
                                  : "bg-blue-50 text-blue-600 border border-blue-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                                : isDark
                                ? "border border-white/15 bg-white/[0.06] text-white/70 hover:bg-white/15 hover:text-white"
                                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                            }`}
                          >
                            {isFollowed ? "Following" : "Follow"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Web Push Setting */}
                <div
                  className={`mt-4 rounded-xl border p-3 flex items-center justify-between gap-3 ${
                    isDark ? "border-white/10 bg-white/[0.02]" : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div>
                    <p className="text-[12px] font-semibold">Web Push Alerts</p>
                    <p className={`text-[10.5px] ${isDark ? "text-white/40" : "text-slate-500"}`}>
                      Direct browser notifications.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={enablePush}
                    disabled={pushEnabled}
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                      pushEnabled
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : isDark
                        ? "bg-white/10 text-white hover:bg-white/20"
                        : "bg-slate-900 text-white hover:bg-slate-800"
                    }`}
                  >
                    {pushEnabled ? "Enabled" : "Enable"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function AccountPage() {
  return (
    <ThemeProvider>
      <AccountPageInner />
    </ThemeProvider>
  );
}
