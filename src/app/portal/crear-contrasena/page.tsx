import { requireProfile, hasPassword } from "@/lib/portal";
import { ROLE_HOME } from "@/types/profile";
import { SetPasswordForm } from "./set-password-form";

// Reads the session per request; never statically prerendered.
export const dynamic = "force-dynamic";

/**
 * The "crear contraseña" step. Accounts are provisioned WITHOUT a password
 * (0009/0010): the invitee's first entry is Google, which Supabase links to
 * the existing confirmed address rather than creating a second user. Setting
 * a password here adds email/password as a SECOND way into the SAME account —
 * it never creates a duplicate user for the address.
 *
 * Skippable, and offered again from /portal/perfil at any time.
 */
export default async function CrearContrasenaPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string }>;
}) {
  const { profile, email } = await requireProfile();
  const { desde } = await searchParams;

  // Someone who already has a password reaches this page from their profile
  // to CHANGE it, so the same form serves both — only the copy differs.
  const passwordSet = await hasPassword();

  return (
    <SetPasswordForm
      email={email}
      returnTo={desde || ROLE_HOME[profile.role]}
      alreadyDismissed={profile.password_prompt_dismissed}
      passwordSet={passwordSet}
    />
  );
}
