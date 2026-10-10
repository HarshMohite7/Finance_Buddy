# SOP-AUTH: Authentication & Session Management

## Goal
Users log in once and never see the login page again until they explicitly sign out.

## How It Works

### Cookie-Based Sessions (Supabase SSR)
- `@supabase/ssr` stores the JWT in **HttpOnly cookies** (not localStorage).
- Cookie name pattern: `sb-<project-ref>-auth-token`.
- The middleware reads cookies on every request and validates the session via `supabase.auth.getUser()`.

### Middleware Teleporter Rule
- If a **valid session exists** AND the user hits `/` → redirect to `/intent`.
- This happens server-side before the page renders, so there is zero flash.

### Client-Side Auth Guard
- Every protected page (`/intent`, `/dashboard`) checks auth on mount.
- If `getUser()` returns null → `router.replace("/")`.
- While checking, show a loading spinner (not a blank page).

### Landing Page Client-Side Check
- `app/page.tsx` also checks auth on mount.
- If already logged in → `router.replace("/intent")` before rendering the form.
- This covers the edge case where middleware hasn't hydrated yet (e.g., client-side navigation).

## Edge Cases
- **Expired cookie:** `getUser()` returns null → user sees login page.
- **Network offline:** Supabase SSR gracefully degrades; stale cookies are treated as invalid.
- **Multiple tabs:** Cookie is shared across tabs. Sign out in one tab → others redirect on next `getUser()` call.

## Learnings
*(populated by Self-Annealing loop)*
