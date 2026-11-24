import { headers } from "next/headers";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { StaffContext } from "@/lib/staff/permissions";

/**
 * Invites a client to their portal and links the login to their file.
 *
 * Server only, and only after the caller checked `clients.write`. The file is
 * re-read through the caller's session, so RLS decides whether it is in their
 * sede; the service role is used just for the auth steps RLS can't do:
 * pre-authorization (invite-only, 0010), the invite email and the link.
 *
 * It never links to an account that already exists: typing someone else's
 * email must not hand their login this file, or this file to their login.
 *
 * Returns an error in Spanish, or null when the invitation went out.
 */
export async function inviteClient(clientId: string, staff: StaffContext): Promise<string | null> {
  const supabase = await createClient();
  const { data: client } = await supabase
    .from("clients")
    .select("id, email, full_name, user_id, sede_id")
    .eq("id", clientId)
    .maybeSingle();
  if (!client || !staff.sede_ids.includes(client.sede_id)) return "No encontramos a ese cliente.";
  if (client.user_id) return "Ya tiene acceso al portal.";
  if (!client.email) return "Primero agregale un correo.";

  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") || h.get("origin");
  if (!origin) return "No se pudo armar el link de la invitación.";

  const admin = createAdminClient();
  const { data: pending, error: preError } = await admin
    .from("preauthorized_emails")
    .insert({ email: client.email, intended_role: "client", full_name: client.full_name })
    .select("id")
    .single();
  if (preError) {
    return preError.code === "23505" ? "Ese correo ya tiene una invitación pendiente." : "No se pudo preparar la invitación.";
  }

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(client.email, {
    data: { full_name: client.full_name },
    redirectTo: `${origin}/auth/invitacion`,
  });
  if (inviteError || !invited.user) {
    await admin.from("preauthorized_emails").delete().eq("id", pending.id).is("consumed_at", null);
    // The profile trigger didn't consume the row: either the account already
    // existed or the email couldn't be sent.
    return inviteError?.code === "email_exists"
      ? "Ese correo ya tiene una cuenta. Usá otro correo."
      : "El correo de invitación no salió. Intentá de nuevo más tarde.";
  }

  // Only a brand-new invite may be linked. For an address that was already
  // invited and never confirmed, Auth re-sends and returns that same user, and
  // its pre-authorization is left unconsumed.
  const { data: consumed } = await admin
    .from("preauthorized_emails")
    .select("consumed_by")
    .eq("id", pending.id)
    .single();
  if (consumed?.consumed_by !== invited.user.id) {
    await admin.from("preauthorized_emails").delete().eq("id", pending.id).is("consumed_at", null);
    return "Ese correo ya tiene una cuenta. Usá otro correo.";
  }

  // `.is("user_id", null)` and the email match close the race with a second desk.
  const { data: linked, error: linkError } = await admin
    .from("clients")
    .update({ user_id: invited.user.id, invited_at: new Date().toISOString(), updated_by_staff: staff.id })
    .eq("id", client.id)
    .eq("email", client.email)
    .is("user_id", null)
    .select("id");
  if (linkError || !linked?.length) {
    return "La invitación salió, pero la cuenta no quedó ligada al expediente. Avisale a un administrador.";
  }
  return null;
}
