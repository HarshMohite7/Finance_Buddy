# SOP-SEC: Security

## Goal
Prevent all identified threats from the B.L.A.S.T. threat model.

## Rule 1: RLS is Mandatory
- Every query to `user_transactions` MUST go through a Supabase client that has a valid user JWT.
- Server-side route handlers (`/api/*`) must create a per-request authenticated client using the forwarded `accessToken`.
- NEVER trust `user_id` from the request body alone — always verify via `auth.uid()`.

## Rule 2: Input Validation
- **UPI VPA:** `^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$`
- **Amount:** Must be a positive number. Server-side: `parseFloat(amount) > 0`.
- **User Note:** Max 200 characters. Strip HTML tags.
- **UTR:** `^\d{12}$` or empty.
- **Category:** Must be one of the 7 allowed strings. Unknown → `Miscellaneous`.

## Rule 3: API Key Isolation
- `GROQ_API_KEY`, `RESEND_API_KEY` → server-side only (no `NEXT_PUBLIC_` prefix).
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` → safe to expose (anon key has RLS restrictions).
- `.env.local` is in `.gitignore`.

## Rule 4: Rate Limiting
- `/api/summary`: 60-second cooldown per user. Track via in-memory Map (good enough for Vercel serverless).
- `/api/analyze`: No strict limit needed (Groq has its own rate limits), but validate image size < 4MB.

## Rule 5: No Sensitive Data in Client-Side Code
- Never log the full JWT to console in production.
- Never embed API keys in `console.log`.
- Never store financial data in `localStorage` or `sessionStorage`.

## Rule 6: Deep-Link Safety
- Always use `encodeURIComponent()` on all UPI deep-link params.
- Never construct UPI URLs from raw, unvalidated user input.
- The amount in the deep-link MUST match the amount saved in the database.

## Learnings
*(populated by Self-Annealing loop)*
