"use client";

import { useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Loader2, CheckCircle2, Camera, ScanLine, AlertCircle } from "lucide-react";

interface QrScannerModalProps {
  /** The transaction amount to display in the UI */
  amount: number;
  /** Controls visibility — parent must manage this */
  isOpen: boolean;
  /**
   * True while the parent is saving to DB + firing the UPI deep-link.
   * Replaces the UI with a "Saving…" overlay.
   */
  isSaving?: boolean;
  /** Called when the user dismisses the modal (blocked while isSaving) */
  onClose: () => void;
  /**
   * Called with the raw decoded QR string.
   * Parent is responsible for UPI parsing, DB save, and deep-link.
   */
  onScanSuccess?: (decodedText: string) => void;
}

/**
 * QrScannerModal — Camera-capture QR decoder
 *
 * Strategy: instead of streaming video (which requires getUserMedia +
 * HTTPS + browser permission grants and is unreliable on iOS Safari),
 * we use the native file input with capture="environment" to let the
 * user take a photo of the QR code, then decode it from the image with
 * Html5Qrcode.scanFile(). This works on every mobile browser.
 */
export default function QrScannerModal({
  amount,
  isOpen,
  isSaving = false,
  onClose,
  onScanSuccess,
}: QrScannerModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [decoding, setDecoding] = useState(false);
  const [decodeError, setDecodeError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  if (!isOpen) return null;

  // ── Handle photo taken by the user ──────────────────────────────────────
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset state
    setDecodeError(null);
    setDecoding(true);

    // Show image preview immediately
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    try {
      // Use a temporary invisible div as the decoder anchor
      const tempId = "qr-decode-anchor";
      let anchor = document.getElementById(tempId);
      if (!anchor) {
        anchor = document.createElement("div");
        anchor.id = tempId;
        anchor.style.display = "none";
        document.body.appendChild(anchor);
      }

      const decoder = new Html5Qrcode(tempId);

      const decodedText = await decoder
        .scanFile(file, /* showImage= */ false)
        .finally(() => {
          try { decoder.clear(); } catch { /* ignore */ }
        });


      // Successfully decoded — hand off to parent
      if (onScanSuccess) {
        onScanSuccess(decodedText);
      } else {
        // Legacy fallback: direct UPI redirect
        if (!decodedText.toLowerCase().startsWith("upi://pay")) {
          setDecodeError("Not a UPI QR code. Please try again.");
          setDecoding(false);
          return;
        }
        try {
          const upiUrl = new URL(decodedText);
          const pa = upiUrl.searchParams.get("pa");
          const pn = upiUrl.searchParams.get("pn") || "Merchant";
          if (!pa) {
            setDecodeError("QR code missing Payee Address. Try again.");
            setDecoding(false);
            return;
          }
          window.location.href = `upi://pay?pa=${encodeURIComponent(pa)}&pn=${encodeURIComponent(pn)}&am=${amount.toFixed(2)}&cu=INR`;
        } catch {
          setDecodeError("Failed to parse UPI QR code. Try again.");
        }
        setDecoding(false);
        onClose();
      }
    } catch {
      // Html5Qrcode throws when it can't find a QR code in the image
      setDecodeError(
        "No QR code found in the photo. Make sure the QR code fills the frame clearly and try again."
      );
      setDecoding(false);
    } finally {
      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function retryCapture() {
    setDecodeError(null);
    setPreview(null);
    fileInputRef.current?.click();
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Scan UPI QR Code"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (!isSaving && !decoding && e.target === e.currentTarget) onClose();
      }}
    >
      {/* Hidden file input — capture="environment" opens the rear camera natively */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl relative overflow-hidden">

        {/* ── Header ── */}
        <div className="px-6 pt-6 pb-4 text-center border-b border-zinc-100">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50">
            <ScanLine className="h-6 w-6 text-indigo-600" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900">Scan QR &amp; Pay</h3>
          <p className="mt-1 text-sm text-zinc-500">
            {amount > 0 ? (
              <>
                Snap a photo of the merchant&apos;s UPI QR code
                {" "}to pay{" "}
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

        {/* ── Body ── */}
        <div className="px-6 py-5 space-y-4">

          {/* Preview of captured image */}
          {preview && (
            <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="QR code capture"
                className="w-full max-h-52 object-contain"
              />
              {decoding && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 backdrop-blur-sm">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                  <p className="text-xs font-medium text-white">Reading QR code…</p>
                </div>
              )}
            </div>
          )}

          {/* Error state */}
          {decodeError && (
            <div className="flex items-start gap-2.5 rounded-xl bg-red-50 px-4 py-3 ring-1 ring-red-200">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 leading-relaxed">{decodeError}</p>
            </div>
          )}

          {/* Instructions (shown before first capture) */}
          {!preview && !decodeError && (
            <div className="rounded-xl bg-indigo-50 px-4 py-4 space-y-2.5">
              {[
                "Tap the button below to open your camera",
                "Point it squarely at the merchant's UPI QR code",
                "Take the photo — the QR is decoded automatically",
                "Google Pay opens instantly with the amount pre-filled",
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                    {i + 1}
                  </span>
                  <p className="text-xs text-indigo-800">{step}</p>
                </div>
              ))}
            </div>
          )}

          {/* Primary action button */}
          {!decoding && (
            <button
              type="button"
              id="qr-open-camera-btn"
              disabled={isSaving}
              onClick={() => {
                setDecodeError(null);
                setPreview(null);
                fileInputRef.current?.click();
              }}
              className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-indigo-600 py-3.5 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Camera className="h-4 w-4" />
              {decodeError ? "Retry — Take Another Photo" : "Open Camera to Scan QR"}
            </button>
          )}

          {/* Decoding in progress — no button */}
          {decoding && (
            <button
              disabled
              className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-indigo-100 py-3.5 text-sm font-semibold text-indigo-400 cursor-not-allowed"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              Decoding QR code…
            </button>
          )}

          {/* Cancel */}
          <button
            type="button"
            id="qr-scanner-cancel-btn"
            onClick={onClose}
            disabled={isSaving || decoding}
            className="w-full rounded-xl bg-zinc-100 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>

        {/* ── Saving overlay (parent is writing to DB + firing deep-link) ── */}
        {isSaving && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 rounded-2xl bg-white">
            {/* Pulsing ring + icon */}
            <div className="relative flex items-center justify-center">
              <div className="h-24 w-24 rounded-full bg-indigo-50" />
              <div className="absolute h-24 w-24 animate-spin rounded-full border-4 border-transparent border-t-indigo-500" />
              <CheckCircle2 className="absolute h-10 w-10 text-indigo-600" />
            </div>

            <div className="text-center px-4">
              <p className="text-base font-bold text-zinc-900">QR Code Read!</p>
              <p className="mt-1.5 text-sm text-zinc-500 flex items-center justify-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving &amp; opening Google Pay…
              </p>
            </div>

            <div className="rounded-full bg-indigo-600 px-6 py-2 text-sm font-bold text-white shadow-lg shadow-indigo-200">
              ₹{amount.toFixed(2)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}