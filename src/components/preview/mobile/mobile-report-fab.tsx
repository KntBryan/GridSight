"use client";

import { Zap } from "lucide-react";

/**
 * Component props for the mobile report floating action button.
 */
interface MobileReportFabProps {
  /** Callback fired when the user taps the floating action button to open the report modal. */
  onClick: () => void;
}

/**
 * Mobile-specific floating action button (FAB) for reporting power outages.
 *
 * @remarks
 * Anchored above the fixed bottom navigation bar and respects safe-area insets.
 * Provides a single-tap reporting flow from anywhere in the mobile interface.
 */
export function MobileReportFab({ onClick }: MobileReportFabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Report an outage"
      className="fixed z-40 md:hidden bottom-[calc(max(env(safe-area-inset-bottom,0px),8px)+64px)] right-4 flex items-center gap-2 rounded-full bg-[#0d6edc] px-4 py-3 text-[13px] font-bold text-white shadow-[0_6px_24px_rgba(13,110,220,0.55)] transition-transform active:scale-90"
    >
      <Zap size={16} strokeWidth={2.8} fill="currentColor" />
      <span>Report</span>
    </button>
  );
}
