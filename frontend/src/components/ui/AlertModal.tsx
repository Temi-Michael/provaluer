"use client";

import React, { useEffect } from "react";

export type AlertVariant = "success" | "error" | "info";

export interface AlertState {
  title: string;
  message: string;
  variant?: AlertVariant;
}

interface AlertModalProps {
  /** Pass null to close. */
  alert: AlertState | null;
  onClose: () => void;
  closeText?: string;
}

const VARIANTS: Record<AlertVariant, { accent: string; ring: string; icon: React.ReactNode }> = {
  success: {
    accent: "text-[#30d158]",
    ring: "bg-[#30d158]/10",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  },
  error: {
    accent: "text-red",
    ring: "bg-red/10",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    ),
  },
  info: {
    accent: "text-blue",
    ring: "bg-blue/10",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  },
};

/**
 * Single-acknowledgement dialog replacing window.alert().
 * For destructive yes/no decisions use ConfirmModal instead.
 */
export default function AlertModal({ alert, onClose, closeText = "Got it" }: AlertModalProps) {
  // Escape closes, and background scroll is locked while open — window.alert()
  // blocked the page, so the modal should feel equally modal.
  useEffect(() => {
    if (!alert) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [alert, onClose]);

  if (!alert) return null;

  const variant = VARIANTS[alert.variant ?? "info"];

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="alert-modal-title"
        aria-describedby="alert-modal-message"
        className="relative w-full max-w-md bg-[#1c1c1e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="p-6">
          <div className={`w-11 h-11 rounded-xl ${variant.ring} ${variant.accent} flex items-center justify-center mb-5`}>
            {variant.icon}
          </div>

          <h3 id="alert-modal-title" className="text-xl font-semibold text-white mb-2">
            {alert.title}
          </h3>
          <p id="alert-modal-message" className="text-[15px] text-gray2 leading-relaxed mb-8">
            {alert.message}
          </p>

          <div className="flex justify-end">
            <button
              autoFocus
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-[14px] font-medium bg-blue text-white hover:bg-blue/90 transition-colors min-w-[100px]"
            >
              {closeText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
