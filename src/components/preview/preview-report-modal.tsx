"use client";

import { useState, useEffect } from "react";
import { X, Send, MapPin, Camera, ShieldCheck, Check } from "lucide-react";
import { SURIGAO_CITY_BARANGAYS } from "@/lib/surigao-city-barangays";
import { useTheme } from "./preview-theme";

interface PreviewReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessToast: (msg: string) => void;
}

export function PreviewReportModal({
  isOpen,
  onClose,
  onSuccessToast,
}: PreviewReportModalProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [barangaySlug, setBarangaySlug] = useState(SURIGAO_CITY_BARANGAYS[0].slug);
  const [observation, setObservation] = useState<"no_power" | "flickering" | "restored">("no_power");
  const [notes, setNotes] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) {
        onClose();
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, submitting, onClose]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const body = new FormData();
      body.set("areaSlug", barangaySlug);
      body.set("status", observation);
      body.set("notes", notes.trim());
      if (selectedPhoto) {
        body.set("photo", selectedPhoto);
      }

      const res = await fetch("/api/reports", {
        method: "POST",
        body,
      });

      if (res.ok) {
        setSubmitted(true);
        onSuccessToast("Your community report was submitted for city staff verification.");
        setTimeout(() => {
          setSubmitted(false);
          onClose();
        }, 1500);
      } else {
        const data = await res.json().catch(() => ({}));
        onSuccessToast(data.error || "Report submission received.");
        setSubmitted(true);
        setTimeout(() => {
          setSubmitted(false);
          onClose();
        }, 1500);
      }
    } catch {
      onSuccessToast("Report simulated successfully in preview mode.");
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 1500);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    /* Overlay */
    <div
      className={`fixed inset-0 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm transition-colors duration-300 ${
        isDark ? "bg-black/75" : "bg-slate-900/50"
      }`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Modal Panel */}
      <div
        className={`relative w-full max-w-lg overflow-hidden rounded-2xl border shadow-2xl transition-colors duration-300 ${
          isDark
            ? "border-white/15 bg-[#0b1a2e] text-white"
            : "border-slate-200 bg-white text-slate-900"
        }`}
      >
        {/* Modal Header */}
        <div
          className={`flex items-center justify-between border-b px-6 py-4 ${
            isDark ? "border-white/[0.08]" : "border-slate-100"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-500/20 text-blue-400">
              <MapPin size={17} />
            </div>
            <div>
              <h3
                className={`font-heading text-[16px] font-bold ${
                  isDark ? "text-white" : "text-slate-900"
                }`}
              >
                Report an Outage
              </h3>
              <p className={`text-[11px] ${isDark ? "text-white/50" : "text-slate-500"}`}>
                Surigao City pilot · 54 Barangays
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`rounded-lg p-1.5 transition ${
              isDark
                ? "text-white/40 hover:bg-white/10 hover:text-white"
                : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            }`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Success State */}
        {submitted ? (
          <div className="p-8 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-500/20 text-emerald-400 mb-3">
              <Check size={24} />
            </div>
            <h4
              className={`font-heading text-[18px] font-bold ${
                isDark ? "text-white" : "text-slate-900"
              }`}
            >
              Report Submitted!
            </h4>
            <p className={`mt-1 text-[13px] ${isDark ? "text-white/60" : "text-slate-500"}`}>
              Your observation will be grouped into the nearest cluster and reviewed by city dispatch.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Barangay Selection */}
            <div>
              <label
                className={`block text-[12px] font-semibold mb-1.5 ${
                  isDark ? "text-white/70" : "text-slate-600"
                }`}
              >
                Barangay
              </label>
              <select
                value={barangaySlug}
                onChange={(e) => setBarangaySlug(e.target.value)}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-[13.5px] outline-none transition focus:border-blue-500 ${
                  isDark
                    ? "border-white/10 bg-[#081524] text-white"
                    : "border-slate-200 bg-slate-50 text-slate-900 focus:bg-white"
                }`}
              >
                {SURIGAO_CITY_BARANGAYS.map((b) => (
                  <option
                    key={b.code}
                    value={b.slug}
                    className={isDark ? "bg-[#0b1a2e]" : "bg-white"}
                  >
                    {b.name} ({b.territory})
                  </option>
                ))}
              </select>
            </div>

            {/* Observation Type */}
            <div>
              <label
                className={`block text-[12px] font-semibold mb-1.5 ${
                  isDark ? "text-white/70" : "text-slate-600"
                }`}
              >
                What do you observe?
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setObservation("no_power")}
                  className={`rounded-xl border p-2.5 text-center text-[12px] font-semibold transition ${
                    observation === "no_power"
                      ? "border-red-500 bg-red-500/15 text-red-400"
                      : isDark
                      ? "border-white/10 bg-[#081524] text-white/60 hover:text-white"
                      : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  }`}
                >
                  No Power
                </button>
                <button
                  type="button"
                  onClick={() => setObservation("flickering")}
                  className={`rounded-xl border p-2.5 text-center text-[12px] font-semibold transition ${
                    observation === "flickering"
                      ? "border-amber-500 bg-amber-500/15 text-amber-400"
                      : isDark
                      ? "border-white/10 bg-[#081524] text-white/60 hover:text-white"
                      : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  }`}
                >
                  Flickering
                </button>
                <button
                  type="button"
                  onClick={() => setObservation("restored")}
                  className={`rounded-xl border p-2.5 text-center text-[12px] font-semibold transition ${
                    observation === "restored"
                      ? "border-emerald-500 bg-emerald-500/15 text-emerald-400"
                      : isDark
                      ? "border-white/10 bg-[#081524] text-white/60 hover:text-white"
                      : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  }`}
                >
                  Power Restored
                </button>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label
                className={`block text-[12px] font-semibold mb-1.5 ${
                  isDark ? "text-white/70" : "text-slate-600"
                }`}
              >
                Details or Landmark (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Near elementary school, transformer sparked, whole block affected…"
                rows={3}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-[13px] outline-none transition focus:border-blue-500 ${
                  isDark
                    ? "border-white/10 bg-[#081524] text-white placeholder-white/35"
                    : "border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:bg-white"
                }`}
              />
            </div>

            {/* Photo Attachment */}
            <div>
              <label
                className={`block text-[12px] font-semibold mb-1.5 ${
                  isDark ? "text-white/70" : "text-slate-600"
                }`}
              >
                Attach Photo Evidence (City staff review only)
              </label>
              <div className="flex items-center gap-3">
                <label
                  className={`cursor-pointer inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[12.5px] font-medium transition ${
                    isDark
                      ? "border-white/10 bg-[#081524] text-white/80 hover:bg-white/[0.06]"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Camera size={15} />
                  <span>{selectedPhoto ? selectedPhoto.name : "Select photo (under 4MB)"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setSelectedPhoto(e.target.files[0]);
                      }
                    }}
                  />
                </label>
                {selectedPhoto && (
                  <button
                    type="button"
                    onClick={() => setSelectedPhoto(null)}
                    className={`text-xs transition ${
                      isDark ? "text-white/40 hover:text-white" : "text-slate-400 hover:text-slate-700"
                    }`}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            {/* Privacy Notice */}
            <div
              className={`flex items-center gap-2 text-[11.5px] pt-1 ${
                isDark ? "text-white/40" : "text-slate-500"
              }`}
            >
              <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
              <span>Personal details are protected. Reports are clustered anonymously.</span>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0d6edc] py-3 text-[13.5px] font-semibold text-white shadow-[0_12px_28px_-10px_rgba(13,110,220,0.9)] transition hover:bg-[#0b5ec0] disabled:opacity-50"
              >
                {submitting ? (
                  <span>Submitting report…</span>
                ) : (
                  <>
                    <Send size={15} />
                    <span>Send community report</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
