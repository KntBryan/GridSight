"use client";

import Image from "next/image";
import { ArrowRight, MapPin, Map, ShieldCheck, Zap } from "lucide-react";
import { useTheme } from "./preview-theme";

interface PreviewLandingProps {
  onGoToMap: () => void;
  onOpenReport: () => void;
  onGoToUpdates: () => void;
}

export function PreviewLanding({ onGoToMap, onOpenReport, onGoToUpdates }: PreviewLandingProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const pillars = [
    {
      icon: MapPin,
      title: "Report",
      body: "Tell us where you are and what you see — no power, flickering lights, or power back. Takes under a minute, GPS or manual pin.",
      actionLabel: "Submit a report",
      onClick: onOpenReport,
    },
    {
      icon: Map,
      title: "Check",
      body: "Verified reports cluster into outages on a live map of all 54 barangays, so you can see whether it's just your block or the whole area.",
      actionLabel: "View live map",
      onClick: onGoToMap,
    },
    {
      icon: ShieldCheck,
      title: "Stay informed",
      body: "City staff confirm what's happening and post updates. You see the difference between a neighbour's report and a verified outage.",
      actionLabel: "Read advisories",
      onClick: onGoToUpdates,
    },
  ];

  const steps = [
    {
      step: "01",
      title: "A neighbour reports",
      body: "Any resident pins their barangay and describes what they see. Photos are stored privately and inspected only by city operations staff.",
    },
    {
      step: "02",
      title: "Reports become an outage",
      body: "Nearby reports of the same kind group into one outage, marked Checking until city staff review it. A single report alone never claims power is restored.",
    },
    {
      step: "03",
      title: "The city confirms it",
      body: "Staff set the outage to Active or Restored and post an official community update. Every change is attributed and recorded in the audit history.",
    },
  ];

  return (
    <div className={`transition-colors duration-200 ${isDark ? "bg-[#061120] text-white" : "bg-slate-50 text-slate-900"}`}>
      {/* Hero Section */}
      <section className="gh-hero" aria-label="GridSight Overview">
        <div className="gh-frame">
          <div className="gh-stage">
            <div className="gh-content">
              <h1 className="gh-title">
                See. Report.<br />Stay Informed.
              </h1>
              <div className="gh-lower">
                <p className="gh-body">
                  Grid Sight turns neighbour reports into a live picture of power across Surigao City’s 54 barangays — so families know what’s happening and crews know where to go.
                </p>
                <div className="gh-actions">
                  <button
                    type="button"
                    onClick={onOpenReport}
                    className="gh-cta gh-cta-primary"
                  >
                    <span>Report an outage</span>
                    <ArrowRight className="gh-cta-arrow" size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={onGoToMap}
                    className="gh-cta"
                  >
                    View outage map
                  </button>
                </div>
              </div>
            </div>

            {/* Hero Visual Media */}
            <figure className="gh-media">
              <div className="relative h-full w-full">
                <Image
                  src="/hero_surigao_night.png"
                  alt="Surigao City neighbourhoods at night, lit and darkened blocks seen from above."
                  fill
                  sizes="(max-width: 900px) 100vw, 44vw"
                  priority
                  className="object-cover"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#061120]/80 via-transparent to-transparent" />
                <figcaption className="absolute bottom-4 left-4 right-4 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-white/80">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  <span>Surigao City, Surigao del Norte — 54 barangays</span>
                </figcaption>
              </div>
            </figure>
          </div>
        </div>
      </section>

      {/* 3 Pillars Section */}
      <section className={`border-t py-16 sm:py-20 transition-colors ${
        isDark ? "border-white/10 bg-[#061120]" : "border-slate-200 bg-slate-50"
      }`}>
        <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
          <div className="grid gap-6 md:grid-cols-3">
            {pillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={pillar.title}
                  className={`flex flex-col justify-between rounded-2xl border p-7 transition sm:p-8 ${
                    isDark
                      ? "border-white/10 bg-[#0b1a2e] hover:border-white/20 text-white"
                      : "border-slate-200/90 bg-white hover:border-slate-300 text-slate-900 shadow-sm"
                  }`}
                >
                  <div>
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-500/10 text-blue-500">
                      <Icon size={22} strokeWidth={2.2} />
                    </div>
                    <h3 className={`mt-5 font-heading text-[19px] font-bold ${
                      isDark ? "text-white" : "text-slate-900"
                    }`}>
                      {pillar.title}
                    </h3>
                    <p className={`mt-3 text-[14px] leading-relaxed ${
                      isDark ? "text-white/65" : "text-slate-600"
                    }`}>
                      {pillar.body}
                    </p>
                  </div>
                  <div className={`mt-6 pt-4 border-t ${
                    isDark ? "border-white/[0.08]" : "border-slate-100"
                  }`}>
                    <button
                      type="button"
                      onClick={pillar.onClick}
                      className="inline-flex items-center gap-2 text-[13px] font-semibold text-blue-500 hover:text-blue-600 transition"
                    >
                      <span>{pillar.actionLabel}</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className={`border-t py-20 sm:py-28 transition-colors ${
        isDark ? "border-white/10 bg-[#081525]" : "border-slate-200 bg-white"
      }`}>
        <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
          <div className="max-w-2xl">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-500">
              How it works
            </span>
            <h2 className={`mt-4 font-heading text-[30px] font-extrabold leading-[1.15] sm:text-[38px] ${
              isDark ? "text-white" : "text-slate-900"
            }`}>
              Community reports, checked by the city.
            </h2>
            <p className={`mt-4 text-[15.5px] leading-relaxed ${
              isDark ? "text-white/65" : "text-slate-600"
            }`}>
              Grid Sight is a listening post, not a rumour mill. Residents report what they observe, and only verified status changes reach the public map.
            </p>
          </div>

          <div className={`mt-12 grid gap-px overflow-hidden rounded-2xl border ${
            isDark ? "border-white/10 bg-white/10" : "border-slate-200 bg-slate-200 shadow-sm"
          } md:grid-cols-3`}>
            {steps.map((step) => (
              <div
                key={step.step}
                className={`p-7 sm:p-8 ${
                  isDark ? "bg-[#0b1a2e]" : "bg-white"
                }`}
              >
                <span className="font-mono text-[13px] font-semibold tracking-[0.1em] text-blue-500">
                  {step.step}
                </span>
                <h3 className={`mt-4 font-heading text-[18px] font-bold ${
                  isDark ? "text-white" : "text-slate-900"
                }`}>
                  {step.title}
                </h3>
                <p className={`mt-2.5 text-[14px] leading-relaxed ${
                  isDark ? "text-white/65" : "text-slate-600"
                }`}>
                  {step.body}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={onOpenReport}
              className="inline-flex items-center gap-2 rounded-full bg-[#0d6edc] px-6 py-3.5 text-[14px] font-semibold text-white shadow-[0_16px_36px_-20px_rgba(13,110,220,0.9)] transition hover:bg-[#0b5ec0]"
            >
              <span>Submit a community report</span>
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              onClick={onGoToMap}
              className={`text-[14px] font-semibold underline underline-offset-4 transition ${
                isDark ? "text-white/80 hover:text-white" : "text-slate-700 hover:text-slate-900"
              }`}
            >
              Explore live outage map
            </button>
          </div>
        </div>
      </section>

      {/* Dark Civic Footer */}
      <footer className="border-t border-white/10 bg-[#040c17] py-14 text-white/60">
        <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
          <div className="flex flex-col gap-10 md:flex-row md:justify-between">
            <div className="max-w-sm">
              <div className="flex items-center gap-3">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#0d6edc] text-white">
                  <Zap size={16} strokeWidth={2.4} fill="currentColor" />
                </div>
                <span className="font-heading text-[17px] font-bold text-white">GridSight</span>
              </div>
              <p className="mt-4 text-[13px] leading-relaxed text-white/45">
                A community-powered power outage map piloted in Surigao City, Surigao del Norte. Reports are observations from residents; status changes are verified by city staff.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-10 text-[13.5px] sm:gap-16">
              <div>
                <h4 className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-white/35">
                  Navigation
                </h4>
                <ul className="space-y-2.5 text-white/60">
                  <li><button type="button" onClick={onGoToMap} className="hover:text-white transition">Outage map</button></li>
                  <li><button type="button" onClick={onOpenReport} className="hover:text-white transition">Report an outage</button></li>
                  <li><button type="button" onClick={onGoToUpdates} className="hover:text-white transition">Community updates</button></li>
                </ul>
              </div>

              <div>
                <h4 className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-white/35">
                  Pilot Coverage
                </h4>
                <ul className="space-y-2.5 text-white/60">
                  <li>Surigao City Mainland</li>
                  <li>Hikdop Island</li>
                  <li>Nonoc Island</li>
                  <li>Hanigad Island</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-6 text-[12px] text-white/35 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} Grid Sight · Surigao City pilot (54 Barangays)</p>
            <p>Barangay boundaries: PSA / NAMRIA COD-AB. Not an official emergency channel.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
