import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() validates the cookie-backed session on every request.
  // CRITICAL: No logic must be placed between createServerClient and getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── Teleporter rule ────────────────────────────────────────────────────────
  // Authenticated users who land on "/" (the login page) are bounced straight
  // to /intent so they never have to log in again after their first session.
  if (user && request.nextUrl.pathname === "/") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/intent";
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Run on every path except static assets, images, and metadata files.
    "/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)",
  ],
};
