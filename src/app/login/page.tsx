"use client";

import { Suspense, FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Zap,
  Mail,
  Lock,
  User,
  ArrowLeft,
  CheckCircle2,
  LoaderCircle,
  LogIn,
  UserPlus,
  KeyRound,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { ThemeProvider, ThemeToggle, useTheme } from "@/components/preview/preview-theme";

type Mode = "sign-in" | "create" | "reset" | "update";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = (searchParams.get("mode") as Mode) || "sign-in";

  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const qMode = searchParams.get("mode") as Mode | null;
    if (qMode && ["sign-in", "create", "reset", "update"].includes(qMode)) {
      setMode(qMode);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;
    const supabase = createSupabaseBrowserClient();
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setEmail(user.email ?? "");
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("update");
    });
    return () => subscription.unsubscribe();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");

    try {
      const supabase = createSupabaseBrowserClient();

      if (mode === "reset") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login?mode=update`,
        });
        if (resetError) throw resetError;
        setMessage("Password reset instructions are on their way. Check your inbox.");
      } else if (mode === "update") {
        const { error: passwordError } = await supabase.auth.updateUser({ password });
        if (passwordError) throw passwordError;
        setMessage("Your password has been updated.");
        setTimeout(() => router.replace("/"), 1500);
      } else if (mode === "create") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } },
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          router.replace("/");
        } else {
          setMessage("Check your inbox to confirm your email, then sign in.");
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        router.replace("/");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const title =
    mode === "create"
      ? "Create your account"
      : mode === "reset"
      ? "Reset password"
      : mode === "update"
      ? "Set new password"
      : "Welcome back";

  const subtitle =
    mode === "create"
      ? "Sign up to follow areas and report outages"
      : mode === "reset"
      ? "Enter your email to receive a reset link"
      : mode === "update"
      ? "Choose a strong password"
      : "Log in to your account";

  const HeaderIcon =
    mode === "create" ? UserPlus : mode === "reset" || mode === "update" ? KeyRound : LogIn;

  return (
    <div
      className={`min-h-screen flex flex-col justify-between transition-colors duration-300 ${
        isDark ? "bg-[#061120] text-white" : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* Top Bar */}
      <div className="mx-auto w-full max-w-6xl px-5 py-5 flex items-center justify-between">
        <Link
          href="/"
          className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition ${
            isDark
              ? "border-white/15 bg-white/[0.06] text-white/80 hover:bg-white/10 hover:text-white"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-sm"
          }`}
        >
          <ArrowLeft size={14} />
          <span>Back to GridSight</span>
        </Link>

        <ThemeToggle />
      </div>

      {/* Centered Base44 Card */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0d6edc] text-white shadow-[0_8px_24px_rgba(13,110,220,0.35)]">
              <HeaderIcon className="h-7 w-7" aria-hidden="true" />
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight">
              {title}
            </h1>
            <p className={`mt-2 text-[13.5px] ${isDark ? "text-white/60" : "text-slate-500"}`}>
              {subtitle}
            </p>
          </div>

          {/* Form Card */}
          <div
            className={`rounded-2xl border p-7 sm:p-8 shadow-xl backdrop-blur-xl transition ${
              isDark
                ? "border-white/10 bg-[#0b1a2e] text-white"
                : "border-slate-200 bg-white text-slate-900 shadow-slate-200/50"
            }`}
          >
            {error && (
              <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-[13px] text-red-400">
                {error}
              </div>
            )}
            {message && (
              <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-[13px] text-emerald-400">
                <CheckCircle2 size={16} className="shrink-0" />
                <span>{message}</span>
              </div>
            )}

            <form onSubmit={submit} className="space-y-4">
              {mode === "create" && (
                <div className="space-y-1.5">
                  <label
                    htmlFor="login-name"
                    className={`block text-[12.5px] font-semibold ${
                      isDark ? "text-white/80" : "text-slate-700"
                    }`}
                  >
                    Your name
                  </label>
                  <div className="relative">
                    <User
                      size={16}
                      className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${
                        isDark ? "text-white/40" : "text-slate-400"
                      }`}
                    />
                    <input
                      id="login-name"
                      type="text"
                      autoComplete="name"
                      autoFocus
                      placeholder="Jane Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={100}
                      className={`h-12 w-full rounded-xl border pl-10 pr-3.5 text-[13.5px] outline-none transition focus:border-blue-500 ${
                        isDark
                          ? "border-white/10 bg-[#081524] text-white placeholder-white/30"
                          : "border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:bg-white"
                      }`}
                      required
                      disabled={busy}
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <label
                  htmlFor="login-email"
                  className={`block text-[12.5px] font-semibold ${
                    isDark ? "text-white/80" : "text-slate-700"
                  }`}
                >
                  Email
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${
                      isDark ? "text-white/40" : "text-slate-400"
                    }`}
                  />
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    autoFocus={mode !== "create"}
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`h-12 w-full rounded-xl border pl-10 pr-3.5 text-[13.5px] outline-none transition focus:border-blue-500 ${
                      isDark
                        ? "border-white/10 bg-[#081524] text-white placeholder-white/30"
                        : "border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:bg-white"
                    }`}
                    required
                    disabled={busy}
                  />
                </div>
              </div>

              {/* Password */}
              {mode !== "reset" && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="login-password"
                      className={`block text-[12.5px] font-semibold ${
                        isDark ? "text-white/80" : "text-slate-700"
                      }`}
                    >
                      Password
                    </label>
                    {mode === "sign-in" && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode("reset");
                          setError("");
                          setMessage("");
                        }}
                        className="text-xs text-blue-500 hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock
                      size={16}
                      className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${
                        isDark ? "text-white/40" : "text-slate-400"
                      }`}
                    />
                    <input
                      id="login-password"
                      type="password"
                      autoComplete={mode === "create" || mode === "update" ? "new-password" : "current-password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={mode === "create" || mode === "update" ? 8 : 1}
                      className={`h-12 w-full rounded-xl border pl-10 pr-3.5 text-[13.5px] outline-none transition focus:border-blue-500 ${
                        isDark
                          ? "border-white/10 bg-[#081524] text-white placeholder-white/30"
                          : "border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:bg-white"
                      }`}
                      required
                      disabled={busy}
                    />
                  </div>
                </div>
              )}

              {/* Submit CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0d6edc] text-[13.5px] font-semibold text-white shadow-[0_4px_16px_rgba(13,110,220,0.35)] transition hover:bg-[#0b5ec0] disabled:opacity-60"
                >
                  {busy ? (
                    <>
                      <LoaderCircle size={16} className="animate-spin" />
                      <span>
                        {mode === "create"
                          ? "Creating account…"
                          : mode === "reset"
                          ? "Sending link…"
                          : "Logging in…"}
                      </span>
                    </>
                  ) : (
                    <span>
                      {mode === "create"
                        ? "Create account"
                        : mode === "reset"
                        ? "Send reset link"
                        : mode === "update"
                        ? "Update password"
                        : "Log in"}
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Footer Switching Links */}
          <div className="mt-6 text-center text-sm">
            {mode === "sign-in" && (
              <p className={isDark ? "text-white/60" : "text-slate-500"}>
                Don’t have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("create");
                    setError("");
                    setMessage("");
                  }}
                  className="font-semibold text-blue-500 hover:underline"
                >
                  Create one
                </button>
              </p>
            )}

            {mode === "create" && (
              <p className={isDark ? "text-white/60" : "text-slate-500"}>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("sign-in");
                    setError("");
                    setMessage("");
                  }}
                  className="font-semibold text-blue-500 hover:underline"
                >
                  Log in
                </button>
              </p>
            )}

            {mode === "reset" && (
              <p className={isDark ? "text-white/60" : "text-slate-500"}>
                Remember your password?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("sign-in");
                    setError("");
                    setMessage("");
                  }}
                  className="font-semibold text-blue-500 hover:underline"
                >
                  Back to login
                </button>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Footer Notice */}
      <div className="py-4 text-center text-[11.5px] opacity-40 font-mono">
        GridSight Surigao City Pilot · Real-time community grid watch
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <ThemeProvider>
      <Suspense
        fallback={
          <div className="min-h-screen grid place-items-center bg-[#061120] text-white">
            <LoaderCircle size={24} className="animate-spin text-blue-500" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </ThemeProvider>
  );
}
