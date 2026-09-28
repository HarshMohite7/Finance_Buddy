"use client";

import { useEffect, useRef } from "react";
import { Html5QrcodeScanner, Html5QrcodeScannerState } from "html5-qrcode";

interface QrScannerModalProps {
  /** The transaction amount to embed in the UPI deep link */
  amount: number;
  /** Controls visibility — parent must manage this */
  isOpen: boolean;
  /** Called when the user dismisses the modal or after a successful scan */
  onClose: () => void;
}

export default function QrScannerModal({
  amount,
  isOpen,
  onClose,
}: QrScannerModalProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    // Don't mount the scanner if modal is closed
    if (!isOpen) return;

    // Small delay so the DOM element is guaranteed to be in the tree
    const initTimer = setTimeout(() => {
      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true,
        },
        /* verbose= */ false
      );

      scannerRef.current = scanner;

      scanner.render(
        // ── Success callback ──────────────────────────────────────────────
        (decodedText) => {
          // Stop immediately so the camera doesn't keep running
          scanner
            .clear()
            .catch((err) => console.error("[QrScanner] clear error:", err));

          if (!decodedText.toLowerCase().startsWith("upi://pay")) {
            alert(
              "The scanned QR code is not a valid UPI payment code. Please try again."
            );
            onClose();
            return;
          }

          try {
            const upiUrl = new URL(decodedText);
            const pa = upiUrl.searchParams.get("pa"); // Payee VPA (merchant ID)
            const pn =
              upiUrl.searchParams.get("pn") || "Merchant"; // Payee name

            if (!pa) {
              alert(
                "Invalid UPI QR Code: Missing Payee Address (pa). Please try a different QR code."
              );
              onClose();
              return;
            }

            // Construct the final deep link with the dynamic amount
            const finalLink = `upi://pay?pa=${encodeURIComponent(pa)}&pn=${encodeURIComponent(pn)}&am=${amount.toFixed(2)}&cu=INR`;
            window.location.href = finalLink;
          } catch {
            alert(
              "Failed to parse the UPI QR Code. Please try again."
            );
          }

          onClose();
        },

        // ── Error callback (per-frame) ─────────────────────────────────────
        // These fire constantly when no QR is in frame — intentionally silent.
        (_errorMessage) => { /* noop */ }
      );
    }, 50);

    // ── Cleanup: called when isOpen → false or component unmounts ─────────
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
  }, [isOpen, amount, onClose]);

  // Render nothing when closed — avoids mounting the DOM anchor
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Scan UPI QR Code"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={(e) => {
        // Click outside the card → close
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
        {/* Header */}
        <div className="mb-4 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/40">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-indigo-600 dark:text-indigo-400"
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
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
            Scan &amp; Pay
          </h3>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Point at any merchant&apos;s UPI QR code to pay exactly{" "}
            <strong className="font-semibold text-indigo-600 dark:text-indigo-400">
              ₹{amount.toFixed(2)}
            </strong>
          </p>
        </div>

        {/* Camera / Scanner mount point — html5-qrcode injects video here */}
        <div
          id="qr-reader"
          className="overflow-hidden rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 [&_video]:w-full [&_video]:rounded-lg [&_select]:text-sm [&_select]:rounded [&_img]:hidden"
        />

        {/* Cancel button */}
        <button
          type="button"
          id="qr-scanner-cancel-btn"
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-zinc-100 py-3 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
        >
          Cancel Scanning
        </button>
      </div>
    </div>
  );
}