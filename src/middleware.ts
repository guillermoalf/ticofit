import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Only the routes that use the Supabase session. The public site never
  // reads it, and running getUser() there costs a network round-trip per
  // request — up to ~30s when a stale cookie's token refresh can't reach
  // Supabase, since auth-js retries with backoff for a full refresh tick.
  matcher: ["/portal/:path*", "/login", "/auth/:path*", "/sin-acceso"],
};
