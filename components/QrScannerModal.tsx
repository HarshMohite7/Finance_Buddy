"use client";

import { useEffect, useRef } from "react";
import { Html5QrcodeScanner, Html5QrcodeScannerState } from "html5-qrcode";
import { Loader2, CheckCircle2 } from "lucide-react";

interface QrScannerModalProps {
  /** The transaction amount to display in the UI */
  amount: number;
  /** Controls visibility — parent must manage this */
  isOpen: boolean;
  /**
   * True while the parent is saving to DB + firing UPI deep-link.
   * When true the scanner is replaced with a loading overlay.
   */
  isSaving?: boolean;
  /** Called when the user dismisses the modal (blocked while isSaving) */
  onClose: () => void;
  /**
   * Called with the raw decoded QR string when a valid code is scanned.
   * Parent handles UPI parsing, DB save, and UPI deep-link.
   */
  onScanSuccess?: (decodedText: string) => void;
}

export default function QrScannerModal({
  amount,
  isOpen,
  isSaving = false,
  onClose,
  onScanSuccess,
}: QrScannerModalProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Small delay so the DOM anchor is guaranteed to be in the tree
    const initTimer = setTimeout(() => {
      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        {
          fps: 10,
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true,
          videoConstraints: { facingMode: "environment" },
        },
        /* verbose= */ false
      );

      scannerRef.current = scanner;

      scanner.render(
        // ── Success callback ──────────────────────────────────────────────
        (decodedText) => {
          // Stop the camera immediately
          scanner
            .clear()
            .catch((err) => console.error("[QrScanner] clear error:", err));

          if (onScanSuccess) {
            // Delegate to parent — parent shows isSaving overlay
            onScanSuccess(decodedText);
          } else {
            // Legacy fallback: direct UPI redirect
            if (!decodedText.toLowerCase().startsWith("upi://pay")) {
              alert("The scanned QR code is not a valid UPI payment code.");
              onClose();
              return;
            }
            try {
              const upiUrl = new URL(decodedText);
              const pa = upiUrl.searchParams.get("pa");
              const pn = upiUrl.searchParams.get("pn") || "Merchant";
              if (!pa) {
                alert("Invalid UPI QR Code: Missing Payee Address (pa).");
                onClose();
                return;
              }
              window.location.href = `upi://pay?pa=${encodeURIComponent(pa)}&pn=${encodeURIComponent(pn)}&am=${amount.toFixed(2)}&cu=INR`;
            } catch {
              alert("Failed to parse the UPI QR Code. Please try again.");
            }
            onClose();
          }
        },

        // ── Per-frame error (no QR in frame) — silently ignored ─────────
        (_errorMessage) => { /* noop */ }
      );
    }, 50);

    // ── Cleanup: stop camera when modal closes or component unmounts ────
    return () => {
      clearTimeout(initTimer);
      if (scannerRef.current) {
        const state = scannerRef.current.getState();
        if (
          state === Html5QrcodeScannerState.SCANNING ||
          state === Html5QrcodeScannerState.PAUSED
        ) {
          scannerRef.current
            .clear()
            .catch((err) => console.error("[QrScanner] cleanup error:", err));
        }
        scannerRef.current = null;
      }
    };
  }, [isOpen, amount, onClose, onScanSuccess]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Scan UPI QR Code"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={(e) => {
        // Clicking outside dismisses — unless save is in progress
        if (!isSaving && e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl relative overflow-hidden">

        {/* ── Header ── */}
        <div className="mb-4 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-indigo-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-zinc-900">Scan &amp; Pay</h3>
          <p className="mt-1 text-sm text-zinc-500">
            {amount > 0 ? (
              <>
                Point at a merchant&apos;s UPI QR code to instantly pay{" "}
                <strong className="font-semibold text-indigo-600">
                  ₹{amount.toFixed(2)}
                </strong>
              </>
            ) : (
              <span className="text-amber-600 font-medium">
                ⚠ Enter an amount first, then scan
              </span>
            )}
          </p>
        </div>

        {/* ── Camera / Scanner mount point ── */}
        <div
          id="qr-reader"
          className="overflow-hidden rounded-xl border-2 border-dashed border-zinc-300 [&_video]:w-full [&_video]:rounded-lg [&_select]:text-sm [&_select]:rounded [&_img]:hidden"
        />

        {/* ── Cancel button ── */}
        <button
          type="button"
          id="qr-scanner-cancel-btn"
          onClick={onClose}
          disabled={isSaving}
          className="mt-5 w-full rounded-xl bg-zinc-100 py-3 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Cancel Scanning
        </button>

        {/* ── Saving overlay (shown while parent is writing to DB + firing deep-link) ── */}
        {isSaving && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-2xl bg-white/95 backdrop-blur-sm">
            {/* Animated ring */}
            <div className="relative flex items-center justify-center">
              <div className="h-20 w-20 rounded-full border-4 border-indigo-100" />
              <div className="absolute h-20 w-20 animate-spin rounded-full border-4 border-transparent border-t-indigo-600" />
              <CheckCircle2 className="absolute h-8 w-8 text-indigo-600" />
            </div>

            <div className="text-center">
              <p className="text-base font-bold text-zinc-900">QR Scanned!</p>
              <p className="mt-1 text-sm text-zinc-500 flex items-center justify-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving &amp; opening UPI payment…
              </p>
            </div>

            {/* Amount badge */}
            <div className="rounded-full bg-indigo-600 px-5 py-1.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200">
              ₹{amount.toFixed(2)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}