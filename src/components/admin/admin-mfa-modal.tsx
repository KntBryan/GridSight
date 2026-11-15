"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { KeyRound, LoaderCircle, RefreshCw, RotateCcw, ShieldAlert, ShieldCheck } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useTheme } from "@/components/preview/preview-theme";

interface AdminMfaModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onCancel?: () => void;
}

interface TotpFactor {
  id: string;
  friendly_name?: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

type ModalStep = "verify" | "enroll-new";

export function AdminMfaModal({ isOpen, onSuccess, onCancel }: AdminMfaModalProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [step, setStep] = useState<ModalStep>("verify");
  const [verifiedFactors, setVerifiedFactors] = useState<TotpFactor[]>([]);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // New enrollment state
  const [newFactorId, setNewFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secretKey, setSecretKey] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setCode("");
      setError("");
      setStep("verify");
      setVerifiedFactors([]);
      setNewFactorId(null);
      setQrCode(null);
      setSecretKey(null);
      return;
    }

    let active = true;

    async function loadFactors() {
      setLoading(true);
      setError("");
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: factorData, error: factorError } = await supabase.auth.mfa.listFactors();
        if (factorError) throw factorError;

        const verified = (factorData.totp || []).filter((f) => f.status === "verified");

        if (active) {
          if (verified.length === 0) {
            // No verified factors -> start enrollment immediately
            await startEnrollment(active);
          } else {
            // Sort factors: newest first
            const sorted = [...verified].sort((a, b) => {
              const timeA = new Date(a.updated_at || a.created_at || 0).getTime();
              const timeB = new Date(b.updated_at || b.created_at || 0).getTime();
              return timeB - timeA;
            });
            setVerifiedFactors(sorted);
            setStep("verify");
          }
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Could not load MFA status. Please try again."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadFactors();

    return () => {
      active = false;
    };
  }, [isOpen]);

  async function startEnrollment(activeCheck = true) {
    setLoading(true);
    setError("");
    try {
      // 1. Clear any old/conflicting factors via backend reset
      await fetch("/api/admin/mfa/reset", { method: "POST" });

      // 2. Enroll a clean, single TOTP factor
      const supabase = createSupabaseBrowserClient();
      const { data: enrollData, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "GridSight admin",
      });

      if (enrollError) throw enrollError;

      if (activeCheck) {
        setNewFactorId(enrollData.id);
        setQrCode(enrollData.totp.qr_code);
        setSecretKey(enrollData.totp.secret);
        setStep("enroll-new");
        setCode("");
      }
    } catch (err) {
      if (activeCheck) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not initialize new authenticator. Please try again."
        );
      }
    } finally {
      if (activeCheck) setLoading(false);
    }
  }

  async function handleVerifySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanCode = code.trim().replace(/\s+/g, "");
    if (cleanCode.length !== 6 || submitting) return;

    setSubmitting(true);
    setError("");

    try {
      const supabase = createSupabaseBrowserClient();

      if (step === "enroll-new") {
        if (!newFactorId) throw new Error("Enrollment session missing. Please restart.");

        const { data, error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
          factorId: newFactorId,
          code: cleanCode,
        });

        if (verifyError) throw verifyError;
        if (data) {
          onSuccess();
          return;
        }
      } else {
        // Step === "verify": Try each verified factor (newest first)
        let verifiedSuccess = false;
        let lastErrorMsg = "";
        const successfulFactorId: string[] = [];

        for (const factor of verifiedFactors) {
          try {
            const { data, error: challengeError } = await supabase.auth.mfa.challengeAndVerify({
              factorId: factor.id,
              code: cleanCode,
            });

            if (!challengeError && data) {
              verifiedSuccess = true;
              successfulFactorId.push(factor.id);
              break;
            } else if (challengeError) {
              lastErrorMsg = challengeError.message;
            }
          } catch {
            // continue to next factor
          }
        }

        if (verifiedSuccess) {
          // In the background, cleanup any duplicate stale factors
          if (verifiedFactors.length > 1) {
            void (async () => {
              try {
                for (const oldFactor of verifiedFactors) {
                  if (!successfulFactorId.includes(oldFactor.id)) {
                    await supabase.auth.mfa.unenroll({ factorId: oldFactor.id });
                  }
                }
              } catch {
                // best effort cleanup
              }
            })();
          }

          onSuccess();
          return;
        }

        setError(
          lastErrorMsg ||
            "Invalid code. If you have multiple authenticator entries or reset your app, use 'Reset Authenticator' below to set up a fresh one."
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Invalid verification code. Check your authenticator app and try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`w-full max-w-[460px] rounded-2xl border p-6 shadow-2xl transition ${
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
              {step === "enroll-new" ? "Set up new authenticator" : "Two-factor challenge"}
            </h3>
            <p className={`text-[12.5px] ${isDark ? "text-white/60" : "text-slate-500"}`}>
              {step === "enroll-new"
                ? "Scan QR code to link your phone"
                : `Registered authenticators (${verifiedFactors.length})`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <LoaderCircle size={28} className="animate-spin text-blue-500" />
            <p className={`mt-3 text-[13px] ${isDark ? "text-white/70" : "text-slate-600"}`}>
              Preparing security verification...
            </p>
          </div>
        ) : step === "enroll-new" ? (
          /* Enrollment view with QR code */
          <form onSubmit={handleVerifySubmit} className="mt-5 space-y-4">
            <p className={`text-[13px] leading-relaxed ${isDark ? "text-white/75" : "text-slate-600"}`}>
              Scan this QR code with your authenticator app (Google Authenticator, Apple Passwords,
              or 1Password), then enter the 6-digit code below to confirm.
            </p>

            {qrCode && (
              <div className="flex flex-col items-center justify-center rounded-xl bg-white p-4 shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrCode}
                  alt="Authenticator QR Code"
                  className="h-[180px] w-[180px] object-contain"
                />
              </div>
            )}

            {secretKey && (
              <div
                className={`rounded-xl border p-3 text-[12px] ${
                  isDark ? "border-white/10 bg-white/5 text-white/80" : "border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                <span className="block font-medium">Or enter key manually:</span>
                <code className="mt-1 block select-all font-mono text-[12.5px] font-bold tracking-wider text-blue-600 dark:text-blue-400">
                  {secretKey}
                </code>
              </div>
            )}

            <div>
              <label
                htmlFor="mfa-enroll-code"
                className={`block text-[12px] font-semibold uppercase tracking-wider ${
                  isDark ? "text-white/60" : "text-slate-500"
                }`}
              >
                Enter 6-digit confirmation code
              </label>
              <input
                id="mfa-enroll-code"
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
              <button
                type="button"
                onClick={() => setStep("verify")}
                className={`text-[12.5px] font-medium transition ${
                  isDark ? "text-white/60 hover:text-white" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Back to Challenge
              </button>
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
                  disabled={code.length !== 6 || submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-[13px] font-semibold text-white shadow-md transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <LoaderCircle size={15} className="animate-spin" /> Verifying...
                    </>
                  ) : (
                    "Confirm & Activate"
                  )}
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* Standard challenge view */
          <form onSubmit={handleVerifySubmit} className="mt-5 space-y-4">
            <p className={`text-[13px] leading-relaxed ${isDark ? "text-white/75" : "text-slate-600"}`}>
              Enter the 6-digit verification code from your authenticator app to access the Signal
              Desk.
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
              <button
                type="button"
                onClick={() => void startEnrollment(true)}
                className={`inline-flex items-center gap-1.5 text-[12.5px] font-medium transition ${
                  isDark
                    ? "text-amber-400 hover:text-amber-300"
                    : "text-amber-700 hover:text-amber-900"
                }`}
                title="If you lost or changed your authenticator, reset it here"
              >
                <RotateCcw size={13} /> Reset Authenticator
              </button>
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
                  disabled={code.length !== 6 || submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-[13px] font-semibold text-white shadow-md transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
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
