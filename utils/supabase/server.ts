import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client (for Server Components, Route Handlers,
 * and Server Actions).
 *
 * Reads and writes auth tokens via HTTP-only cookies so the session
 * is accessible on the server and survives hard reloads.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll() is called from a Server Component; cookies can only be
            // written from middleware or a Route Handler — safe to swallow here.
          }
        },
      },
    }
  );
}
