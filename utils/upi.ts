// ─────────────────────────────────────────────────────────────
// UPI Utilities — Validation & Deep-Link Construction
// See: architecture/upi-flow.md (SOP-UPI)
// ─────────────────────────────────────────────────────────────

/**
 * Validates a UPI Virtual Payment Address (VPA).
 * Format: localpart@bankhandle
 * Examples: shop@oksbi, merchant.store@paytm, 9876543210@ybl
 */
const UPI_VPA_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

export function isValidUpiId(vpa: string): boolean {
  return UPI_VPA_REGEX.test(vpa.trim());
}

/**
 * Validates a 12-digit UPI Transaction Reference (UTR) number.
 */
const UTR_REGEX = /^\d{12}$/;

export function isValidUtr(utr: string): boolean {
  return UTR_REGEX.test(utr.trim());
}

/**
 * Constructs a UPI deep-link URL.
 * All parameters are URL-encoded to prevent injection (SOP-SEC Rule 6).
 *
 * @param pa  - Payee VPA (REQUIRED, must pass isValidUpiId)
 * @param am  - Amount in INR (REQUIRED, must be > 0)
 * @param pn  - Payee display name (optional)
 * @returns   The full `upi://pay?...` URL string, or null if inputs are invalid
 */
export function buildUpiDeepLink(
  pa: string,
  am: number,
  pn?: string
): string | null {
  const trimmedPa = pa.trim();

  // Validate inputs before constructing
  if (!isValidUpiId(trimmedPa)) return null;
  if (!am || am <= 0 || !isFinite(am)) return null;

  const params = new URLSearchParams({
    pa: trimmedPa,
    am: am.toFixed(2),
    cu: "INR",
  });

  if (pn && pn.trim().length > 0) {
    params.set("pn", pn.trim());
  }

  return `upi://pay?${params.toString()}`;
}

/**
 * Extracts the payee VPA (pa) and name (pn) from a scanned UPI QR code URL.
 * Returns null if the URL is not a valid UPI payment link.
 */
export function parseUpiQrCode(
  rawUrl: string
): { pa: string; pn: string } | null {
  try {
    if (!rawUrl.toLowerCase().startsWith("upi://pay")) return null;

    const url = new URL(rawUrl);
    const pa = url.searchParams.get("pa");
    if (!pa || !isValidUpiId(pa)) return null;

    const pn = url.searchParams.get("pn") || "Merchant";
    return { pa, pn };
  } catch {
    return null;
  }
}
