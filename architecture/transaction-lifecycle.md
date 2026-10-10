# SOP-TRACK: Transaction Lifecycle

## Goal
Track every transaction from intent creation through payment completion.

## Status Lifecycle
```
PENDING ──→ COMPLETED (user confirms payment succeeded)
   │
   └──→ CANCELLED (user cancels or payment failed)
```

## Return Detection
After the `upi://pay` deep-link fires, the user leaves the browser to complete payment in GPay/PhonePe/Paytm. When they return:

1. **Trigger:** `document.visibilitychange` event fires when the tab becomes visible again.
2. **Condition:** Only show the confirmation dialog if:
   - A payment was initiated in this session (`hasPendingPayment === true`)
   - The tab was hidden for at least 3 seconds (filters out accidental tab switches)
3. **Confirmation Dialog:** Shows the amount and payee. Options:
   - ✅ **"Payment Successful"** → status = `COMPLETED`, optionally enter 12-digit UTR
   - ❌ **"Payment Failed / Cancelled"** → status = `CANCELLED`
   - ⏭️ **"I'll confirm later"** → stays `PENDING`, can be updated from Dashboard

## UTR (UPI Transaction Reference)
- Format: exactly 12 digits
- Validation regex: `^\d{12}$`
- Optional field — many users won't know/enter it
- Stored in `upi_ref` column for audit trail

## Dashboard Integration
- Status shown as colored badges: 🟡 PENDING, 🟢 COMPLETED, 🔴 CANCELLED
- Filter buttons on dashboard: All / Completed / Pending / Cancelled
- Summary email only counts COMPLETED transactions in totals

## Learnings
*(populated by Self-Annealing loop)*
