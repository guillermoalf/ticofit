import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Only /portal reads the session on the server (and ":path*" also matches
  // "/portal" itself). Every other route — the public site, the client-side
  // /login, /sin-acceso and /auth/callback, which builds its own client —
  // would only pay getUser()'s network round-trip per request: up to ~30s
  // when a stale cookie's token refresh can't reach Supabase, since auth-js
  // retries with backoff for a full refresh tick.
  matcher: ["/portal/:path*"],
};
