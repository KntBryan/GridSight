"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { ArrowRight, ShieldCheck, Zap } from "lucide-react";
import { authHref, safeReturnPath } from "@/lib/auth/return-path.mjs";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useTheme } from "@/components/preview/preview-theme";

export function useAuthenticatedUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setLoading(false);
      return;
    }

    let active = true;
    let authStateReceived = false;
    let supabase: ReturnType<typeof createSupabaseBrowserClient>;
    try {
      supabase = createSupabaseBrowserClient();
    } catch (error) {
      console.error("Could not initialize authentication:", error);
      setLoading(false);
      return;
    }
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      authStateReceived = true;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    void supabase.auth.getUser().then(({ data: { user: authUser }, error }) => {
      if (!active || authStateReceived) return;
      if (error) {
        console.error("Could not verify the current user:", error);
        setUser(null);
      } else {
        setUser(authUser);
      }
      setLoading(false);
    }).catch((error: unknown) => {
      if (!active || authStateReceived) return;
      console.error("Could not verify the current user:", error);
      setUser(null);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}

interface AuthGatePanelProps {
  returnTo: string;
  title: string;
  description: string;
  onClose?: () => void;
}

export function AuthGatePanel({
  returnTo,
  title,
  description,
  onClose,
}: AuthGatePanelProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const dialogRef = useRef<HTMLDivElement>(null);
  const signInHref = authHref("/login", returnTo);
  const registerHref = authHref("/register", returnTo);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const firstControl = dialog.querySelector<HTMLElement>("a, button");
    firstControl?.focus();

    function trapFocus(event: KeyboardEvent) {
      if (event.key === "Escape" && onClose) {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;

      const controls = Array.from(
        dialog.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")
      );
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", trapFocus);
    return () => document.removeEventListener("keydown", trapFocus);
  }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center overflow-y-auto p-4 sm:p-6">
      <div
        className={`absolute inset-0 backdrop-blur-md ${
          isDark ? "bg-[#020817]/65" : "bg-slate-900/35"
        }`}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-gate-title"
        aria-describedby="auth-gate-description"
        className={`relative my-auto w-full max-w-md overflow-hidden rounded-[28px] border p-6 shadow-2xl backdrop-blur-2xl transition duration-200 hover:-translate-y-0.5 sm:p-8 ${
          isDark
            ? "border-white/15 bg-[#0b1a2e]/90 text-white shadow-black/40"
            : "border-white/70 bg-white/85 text-slate-900 shadow-slate-900/20"
        }`}
      >
        <div
          className={`pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full blur-3xl ${
            isDark ? "bg-blue-500/20" : "bg-blue-400/20"
          }`}
          aria-hidden="true"
        />
        <div className="relative">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0d6edc] text-white shadow-[0_8px_24px_rgba(13,110,220,0.35)]">
            <Zap size={22} fill="currentColor" aria-hidden="true" />
          </div>
          <p className={`mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] ${
            isDark ? "text-blue-300" : "text-blue-700"
          }`}>
            <ShieldCheck size={14} aria-hidden="true" />
            Account required
          </p>
          <h1 id="auth-gate-title" className="font-heading text-2xl font-extrabold tracking-tight">
            {title}
          </h1>
          <p
            id="auth-gate-description"
            className={`mt-2 text-sm leading-6 ${isDark ? "text-white/65" : "text-slate-600"}`}
          >
            {description}
          </p>

          <div className="mt-7 grid gap-3">
            <Link
              href={signInHref}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#0d6edc] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(13,110,220,0.3)] transition hover:bg-[#0b5ec0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
            >
              Sign in
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link
              href={registerHref}
              className={`inline-flex min-h-12 items-center justify-center rounded-xl border px-5 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 ${
                isDark
                  ? "border-white/15 bg-white/[0.05] text-white hover:bg-white/10"
                  : "border-slate-200 bg-white/70 text-slate-700 hover:bg-white"
              }`}
            >
              Create an account
            </Link>
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className={`min-h-11 rounded-xl text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                  isDark ? "text-white/55 hover:text-white" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Continue browsing home
              </button>
            ) : (
              <Link
                href="/"
                className={`min-h-11 rounded-xl pt-3 text-center text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                  isDark ? "text-white/55 hover:text-white" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Return to home
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ProtectedPageProps {
  children: React.ReactNode;
  returnTo: string;
  title: string;
  description: string;
}

export function ProtectedPage({
  children,
  returnTo,
  title,
  description,
}: ProtectedPageProps) {
  const { user, loading } = useAuthenticatedUser();
  const [requestedReturnTo, setRequestedReturnTo] = useState(returnTo);

  useEffect(() => {
    setRequestedReturnTo(safeReturnPath(`${window.location.pathname}${window.location.search}`));
  }, [returnTo]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#061120] text-white" role="status">
        <span className="sr-only">Checking your sign-in status…</span>
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-blue-400" />
      </div>
    );
  }

  if (!user) {
    return <AuthGatePanel returnTo={requestedReturnTo} title={title} description={description} />;
  }

  return children;
}
