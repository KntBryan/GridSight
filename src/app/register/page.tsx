"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  UserPlus,
  Mail,
  Lock,
  User,
  ArrowLeft,
  CheckCircle2,
  LoaderCircle,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { ThemeProvider, ThemeToggle, useTheme } from "@/components/preview/preview-theme";
import { authHref, safeReturnPath } from "@/lib/auth/return-path.mjs";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = safeReturnPath(searchParams.get("next"));
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleRegister(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setBusy(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: name.trim(),
          },
          emailRedirectTo: new URL(
            `/auth/callback?next=${encodeURIComponent(returnTo)}`,
            window.location.origin
          ).toString(),
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      if (data.session) {
        router.replace(returnTo);
      } else {
        setMessage(
          "Account created! Check your email to confirm your account, then sign in."
        );
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Registration failed. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

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

      {/* Centered Base44 Signup Card */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0d6edc] text-white shadow-[0_8px_24px_rgba(13,110,220,0.35)]">
              <UserPlus className="h-7 w-7" aria-hidden="true" />
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight">
              Create your account
            </h1>
            <p className={`mt-2 text-[13.5px] ${isDark ? "text-white/60" : "text-slate-500"}`}>
              Sign up to follow areas and report outages
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

            <form onSubmit={handleRegister} className="space-y-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label
                  htmlFor="register-name"
                  className={`block text-[12.5px] font-semibold ${
                    isDark ? "text-white/80" : "text-slate-700"
                  }`}
                >
                  Full name
                </label>
                <div className="relative">
                  <User
                    size={16}
                    className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${
                      isDark ? "text-white/40" : "text-slate-400"
                    }`}
                  />
                  <input
                    id="register-name"
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

              {/* Email */}
              <div className="space-y-1.5">
                <label
                  htmlFor="register-email"
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
                    id="register-email"
                    type="email"
                    autoComplete="email"
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
              <div className="space-y-1.5">
                <label
                  htmlFor="register-password"
                  className={`block text-[12.5px] font-semibold ${
                    isDark ? "text-white/80" : "text-slate-700"
                  }`}
                >
                  Password
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${
                      isDark ? "text-white/40" : "text-slate-400"
                    }`}
                  />
                  <input
                    id="register-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
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

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label
                  htmlFor="register-confirm-password"
                  className={`block text-[12.5px] font-semibold ${
                    isDark ? "text-white/80" : "text-slate-700"
                  }`}
                >
                  Confirm password
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${
                      isDark ? "text-white/40" : "text-slate-400"
                    }`}
                  />
                  <input
                    id="register-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={8}
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

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0d6edc] text-[13.5px] font-semibold text-white shadow-[0_4px_16px_rgba(13,110,220,0.35)] transition hover:bg-[#0b5ec0] disabled:opacity-60"
                >
                  {busy ? (
                    <>
                      <LoaderCircle size={16} className="animate-spin" />
                      <span>Creating account…</span>
                    </>
                  ) : (
                    <span>Create account</span>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Footer Switching Link */}
          <p className={`mt-6 text-center text-sm ${isDark ? "text-white/60" : "text-slate-500"}`}>
            Already have an account?{" "}
            <Link href={authHref("/login", returnTo)} className="font-semibold text-blue-500 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Footer Notice */}
      <div className="py-4 text-center text-[11.5px] opacity-40 font-mono">
        GridSight Surigao City Pilot · Real-time community grid watch
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <ThemeProvider>
      <Suspense
        fallback={
          <div className="min-h-screen grid place-items-center bg-[#061120] text-white">
            <LoaderCircle size={24} className="animate-spin text-blue-500" />
          </div>
        }
      >
        <RegisterForm />
      </Suspense>
    </ThemeProvider>
  );
}
