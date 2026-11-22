import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireSupabaseEnv } from "./env";
import { STAFF_COOKIE, STAFF_HEADER } from "@/lib/staff/token";

/**
 * Server-side Supabase client (Server Components, Route Handlers, Actions).
 * On a desk computer it also forwards the staff PIN session token, which is
 * how RLS knows which employee is acting (migration 0023).
 */
export async function createClient() {
  const { url, anonKey } = requireSupabaseEnv();
  const cookieStore = await cookies();
  const staffToken = cookieStore.get(STAFF_COOKIE)?.value;

  return createServerClient(url, anonKey, {
    global:
      staffToken && /^[0-9a-f]{64}$/.test(staffToken)
        ? { headers: { [STAFF_HEADER]: staffToken } }
        : undefined,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options: CookieOptions }[],
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — safe to ignore; the middleware
          // refreshes the session cookie on the next request.
        }
      },
    },
  });
}
