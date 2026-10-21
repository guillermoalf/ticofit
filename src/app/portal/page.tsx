import { redirect } from "next/navigation";
import { requireProfile, hasPassword } from "@/lib/portal";
import { ROLE_HOME } from "@/types/profile";

// Reads the session + profile per request; never statically prerendered.
export const dynamic = "force-dynamic";

/**
 * Central portal entry — sends each user to their role's home.
 *
 * This is also where /auth/callback lands, so it doubles as the first-login
 * hook: an account provisioned by the ledger has no password (0009/0010), so
 * the first arrival is offered the "crear contraseña" step. Offered once —
 * skipping sets password_prompt_dismissed and the step stays available from
 * /portal/perfil.
 */
export default async function PortalPage() {
  const { profile } = await requireProfile();
  const home = ROLE_HOME[profile.role];

  if (!profile.password_prompt_dismissed && !(await hasPassword())) {
    redirect(`/portal/crear-contrasena?desde=${encodeURIComponent(home)}`);
  }

  redirect(home);
}
