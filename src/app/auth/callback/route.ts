import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  isSupabaseConfigured,
} from "@/lib/supabase/env";
import { publicUrl } from "@/lib/public-origin";
import { isUnauthorizedSignup } from "@/lib/auth-errors";

/**
 * OAuth / magic-link callback. Google (and Supabase email flows) redirect here
 * with `?code=...`. We exchange the code for a session and hand off to /portal,
 * which dispatches the user to their role's home (admin -> /portal/admin,
 * coach -> /portal/clientes, client -> /portal/inicio). Any failure falls back
 * to /login.
 *
 * `?next=<path>` overrides that landing spot. Password recovery uses it to
 * drop the user straight on /portal/crear-contrasena with a live session,
 * which is the whole reset: Supabase has no "reset" screen of its own, the
 * emailed link just signs you in so you can call updateUser({ password }).
 *
 * INVITE-ONLY: when the address has no pending ledger row, 0010's
 * handle_new_user() trigger raises and Postgres rolls back the auth.users
 * insert, so the exchange fails and no account is ever created. That is not a
 * crash — it is the product working — so it lands on /sin-acceso with friendly
 * Spanish copy instead of a raw error on /login. Google can also report the
 * same refusal before we ever see a code, as `?error=server_error` on this
 * redirect, so both shapes are handled.
 *
 * Redirects must be built on the public origin (see `@/lib/public-origin`):
 * on AWS Amplify's SSR runtime the server sits behind a proxy and both
 * `request.url` and `request.nextUrl` carry the internal `localhost:3000`
 * host, so an absolute redirect derived from either sends the browser to
 * https://localhost:3000 in production.
 *
 * The Supabase cookie writes are bound to the response we return, so the new
 * session cookies actually reach the browser.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const next = safeNext(params.get("next"));

  const redirectTo = (pathname: string, error?: string) => {
    const url = publicUrl(request, pathname);
    if (error) url.searchParams.set("error", error);
    return NextResponse.redirect(url);
  };

  // The provider refused before handing us a code. A rolled-back invite-only
  // signup arrives here as server_error / unexpected_failure.
  const providerError = params.get("error") ?? params.get("error_code");
  if (providerError) {
    return isUnauthorizedSignup({
      code: providerError,
      message: params.get("error_description") ?? undefined,
    })
      ? redirectTo("/sin-acceso")
      : redirectTo("/login", "auth");
  }

  if (!code || !isSupabaseConfigured) {
    return redirectTo("/login", "auth");
  }

  const response = redirectTo(next);

  const supabase = createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options: CookieOptions }[],
      ) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return isUnauthorizedSignup(error)
      ? redirectTo("/sin-acceso")
      : redirectTo("/login", "auth");
  }

  return response;
}

/**
 * Where to land after a successful exchange. Only same-site absolute paths are
 * honoured; anything else (a full URL, a protocol-relative `//evil.com`) falls
 * back to /portal, so the parameter can never be turned into an open redirect.
 */
function safeNext(value: string | null): string {
  if (!value) return "/portal";
  if (!value.startsWith("/") || value.startsWith("//")) return "/portal";
  return value;
}
