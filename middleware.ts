import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Root middleware – runs on every matched request.
 *
 * It creates a Supabase client that can read/write cookies, calls
 * `getUser()` to silently refresh the access token when it is close
 * to expiring, and forwards the updated Set-Cookie headers back to
 * both the outgoing response AND the upstream request so that Server
 * Components get the fresh session on the same render cycle.
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // 1. Write the cookie onto the request so the current render can
          //    read it without an extra round-trip.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );

          // 2. Recreate the response so Next.js picks up the new cookies.
          supabaseResponse = NextResponse.next({ request });

          // 3. Write the cookie onto the response so the browser persists it.
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Do NOT add any logic between createServerClient and getUser().
  // A subtle bug can make it very hard to debug issues with users being
  // randomly logged out if additional code is placed here.
  //
  // getUser() refreshes the session if it is expired and is the only
  // reliable way to obtain the authenticated user on the server side.
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static  (static files)
     * - _next/image   (image optimisation)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - Any file with an extension (png, jpg, svg, css, js …)
     *
     * This keeps the middleware lean — it only runs on page navigations
     * and API routes that need an authenticated session.
     */
    "/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)",
  ],
};
