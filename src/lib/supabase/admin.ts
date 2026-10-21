import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./env";

/**
 * Server-only Supabase client using the service-role key. Bypasses RLS, so it
 * MUST never be imported into a Client Component or exposed to the browser.
 * Only used inside server actions to create auth users (admin API) and write
 * coach-owned client rows after verifying the caller is the owning coach.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !serviceRoleKey) {
    throw new Error(
      "Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor para crear clientes.",
    );
  }

  return createSupabaseClient(SUPABASE_URL, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
