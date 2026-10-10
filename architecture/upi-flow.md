# SOP-UPI: UPI Payment Flow

## Goal
Allow users to pay any merchant via UPI by either typing a VPA or scanning a QR code.

## UPI VPA Validation
- **Regex:** `^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$`
- Examples: `shop@oksbi`, `merchant.store@paytm`, `9876543210@ybl`
- Reject anything that doesn't match before constructing the deep-link.

## Deep-Link Construction
```
upi://pay?pa={ENCODED_VPA}&pn={ENCODED_NAME}&am={AMOUNT}&cu=INR
```
- `pa` (payee address): REQUIRED. URL-encoded VPA.
- `pn` (payee name): OPTIONAL. URL-encoded display name.
- `am` (amount): REQUIRED. Positive number, max 2 decimal places.
- `cu` (currency): Always `INR`.
- All values MUST use `encodeURIComponent()`.

## Dual Input Flow
1. **Manual UPI ID:** Text input with live regex validation. Green checkmark when valid.
2. **QR Scanner:** Opens camera via `html5-qrcode`. Extracts `pa` and `pn` from scanned `upi://` URL.
3. Both paths converge on the same deep-link construction function.

## Important: No Amount Manipulation
- Amount is set by the user in the intent form. 
- The QR code's embedded amount (if any) is IGNORED — we always use the user's entered amount.
- This prevents merchant QR codes from overcharging.

## Learnings
*(populated by Self-Annealing loop)*
