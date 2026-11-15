"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { KeyRound, LoaderCircle, ShieldAlert, ShieldCheck } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useTheme } from "@/components/preview/preview-theme";

interface AdminMfaModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function AdminMfaModal({ isOpen, onSuccess, onCancel }: AdminMfaModalProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loadingFactor, setLoadingFactor] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [noFactorEnrolled, setNoFactorEnrolled] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setCode("");
      setError("");
      setFactorId(null);
      setChallengeId(null);
      setNoFactorEnrolled(false);
      return;
    }

    let active = true;

    async function initChallenge() {
      setLoadingFactor(true);
      setError("");
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
        if (factorsError) throw factorsError;

        const verified = factors.totp.find((f) => f.status === "verified");
        if (!verified) {
          if (active) {
            setNoFactorEnrolled(true);
            setLoadingFactor(false);
          }
          return;
        }

        const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
          factorId: verified.id,
        });
        if (challengeError) throw challengeError;

        if (active) {
          setFactorId(verified.id);
          setChallengeId(challenge.id);
          setNoFactorEnrolled(false);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Could not create MFA challenge. Please try again."
          );
        }
      } finally {
        if (active) setLoadingFactor(false);
      }
    }

    void initChallenge();

    return () => {
      active = false;
    };
  }, [isOpen]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!factorId || !challengeId || verifying) return;
    const cleanCode = code.trim().replace(/\s+/g, "");
    if (cleanCode.length !== 6) {
      setError("Please enter the full 6-digit code.");
      return;
    }

    setVerifying(true);
    setError("");

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code: cleanCode,
      });

      if (verifyError) {
        throw verifyError;
      }

      onSuccess();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Invalid verification code. Check your authenticator app and try again."
      );
    } finally {
      setVerifying(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`w-full max-w-[440px] rounded-2xl border p-6 shadow-2xl transition ${
          isDark
            ? "border-white/15 bg-[#0b1626] text-white"
            : "border-slate-200 bg-white text-slate-900"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-xl ${
              isDark ? "bg-blue-500/20 text-blue-400" : "bg-blue-50 text-blue-600"
            }`}
          >
            <ShieldCheck size={24} />
          </div>
          <div>
            <h3 className="font-heading text-[18px] font-bold leading-tight">
              Two-factor challenge
            </h3>
            <p className={`text-[12.5px] ${isDark ? "text-white/60" : "text-slate-500"}`}>
              Administrator authentication
            </p>
          </div>
        </div>

        {loadingFactor ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <LoaderCircle size={28} className="animate-spin text-blue-500" />
            <p className={`mt-3 text-[13px] ${isDark ? "text-white/70" : "text-slate-600"}`}>
              Preparing security challenge...
            </p>
          </div>
        ) : noFactorEnrolled ? (
          <div className="mt-5 space-y-4">
            <div
              className={`flex items-start gap-3 rounded-xl border p-4 text-[13px] ${
                isDark
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                  : "border-amber-200 bg-amber-50 text-amber-900"
              }`}
            >
              <ShieldAlert size={20} className="shrink-0 text-amber-500" />
              <div>
                <strong className="block font-semibold">No authenticator enrolled</strong>
                <span>
                  This administrator account does not have a 2-factor authenticator app configured
                  yet.
                </span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className={`rounded-xl px-4 py-2.5 text-[13px] font-medium transition ${
                    isDark
                      ? "text-white/70 hover:bg-white/10 hover:text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  Close
                </button>
              )}
              <Link
                href="/admin/accounts"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow-md transition hover:bg-blue-700"
              >
                <KeyRound size={15} /> Set up MFA in Accounts
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <p className={`text-[13px] leading-relaxed ${isDark ? "text-white/75" : "text-slate-600"}`}>
              Enter the 6-digit verification code from your authenticator app (Google Authenticator,
              Apple Passwords, or 1Password) to confirm your identity.
            </p>

            <div>
              <label
                htmlFor="mfa-inline-code"
                className={`block text-[12px] font-semibold uppercase tracking-wider ${
                  isDark ? "text-white/60" : "text-slate-500"
                }`}
              >
                Verification Code
              </label>
              <input
                id="mfa-inline-code"
                type="text"
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className={`mt-1.5 block w-full rounded-xl border px-4 py-3 text-center font-mono text-[24px] font-bold tracking-[0.3em] outline-none transition ${
                  isDark
                    ? "border-white/15 bg-white/5 text-white placeholder-white/20 focus:border-blue-500 focus:bg-white/10"
                    : "border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white"
                }`}
              />
            </div>

            {error && (
              <div
                className={`rounded-xl border p-3 text-[12.5px] leading-normal ${
                  isDark
                    ? "border-red-500/30 bg-red-500/10 text-red-200"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {error}
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-2">
              <Link
                href="/login"
                className={`text-[12.5px] font-medium transition ${
                  isDark ? "text-white/60 hover:text-white" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Sign out
              </Link>
              <div className="flex items-center gap-2">
                {onCancel && (
                  <button
                    type="button"
                    onClick={onCancel}
                    className={`rounded-xl px-4 py-2 text-[13px] font-medium transition ${
                      isDark
                        ? "text-white/70 hover:bg-white/10 hover:text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={code.length !== 6 || verifying}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-[13px] font-semibold text-white shadow-md transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {verifying ? (
                    <>
                      <LoaderCircle size={15} className="animate-spin" /> Verifying...
                    </>
                  ) : (
                    "Verify & Continue"
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
