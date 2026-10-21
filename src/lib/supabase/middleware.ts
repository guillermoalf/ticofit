import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from "./env";
import { publicUrl } from "@/lib/public-origin";

/** Routes that require an authenticated user. */
const PROTECTED_PREFIXES = ["/portal"];

/**
 * Refreshes the Supabase auth session on every request (so Server Components
 * always see a valid session) and guards protected routes by redirecting
 * unauthenticated users to /login. No-ops when Supabase isn't configured so
 * the public site keeps working.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!isSupabaseConfigured) return response;

  const supabase = createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options: CookieOptions }[],
      ) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANT: getUser() must run to refresh the token; don't insert logic
  // between client creation and this call.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  if (isProtected && !user) {
    // Built on the public origin: request.nextUrl carries the proxy's
    // internal localhost host on Amplify SSR (see @/lib/public-origin).
    const url = publicUrl(request, "/login");
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}
