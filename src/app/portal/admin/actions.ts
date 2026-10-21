"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : T))
  | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Confirms the caller is the platform admin. Read through the user's own
 * session (not the service role) so RLS and is_admin() decide, and the
 * service role is only reached for the Admin API call afterwards.
 */
async function requireAdminId(): Promise<
  { ok: true; adminId: string } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Tu sesión expiró. Iniciá sesión de nuevo." };
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) return { ok: false, error: "No autorizado." };

  return { ok: true, adminId: user.id };
}

export type AuthorizeCoachInput = {
  email: string;
  full_name?: string;
};

/**
 * Pre-authorizes a COACH by email, then provisions their passwordless
 * account so their profile id is fixed from day one.
 *
 * Order matters and mirrors 0010's documented flow:
 *   1. Insert the ledger row through the ADMIN'S OWN session, so the RLS
 *      policy "admin authorizes coaches" is what permits it — the database
 *      pins intended_role = 'coach' and refuses anything else. Doing this
 *      with the service role would bypass exactly the check we want.
 *   2. Create the auth user with the service role, email_confirm = true and
 *      NO password. 0010's trigger consumes the ledger row and builds the
 *      profile with role = 'coach' and authorized = true.
 *
 * The coach then signs in with Google (Supabase links the OAuth identity to
 * the existing confirmed address rather than creating a second user) and may
 * set a password afterwards from /portal/crear-contrasena.
 *
 * If step 2 fails we delete the ledger row again, so a retry is clean and no
 * orphan authorization is left pending.
 */
export async function authorizeCoachAction(
  input: AuthorizeCoachInput,
): Promise<ActionResult> {
  const auth = await requireAdminId();
  if (!auth.ok) return auth;

  const email = input.email.trim().toLowerCase();
  const full_name = input.full_name?.trim() || null;

  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: "Ingresá un correo electrónico válido." };
  }

  const supabase = await createClient();

  // Already has an account? Nothing to authorize.
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle<{ id: string }>();

  if (existing) {
    return { ok: false, error: "Ya existe una cuenta con ese correo." };
  }

  const { data: ledgerRow, error: ledgerErr } = await supabase
    .from("preauthorized_emails")
    .insert({
      email,
      intended_role: "coach",
      full_name,
      authorized_by: auth.adminId,
      coach_id: null,
    })
    .select("id")
    .single<{ id: string }>();

  if (ledgerErr || !ledgerRow) {
    // The partial unique index allows only one pending row per address.
    if (ledgerErr?.code === "23505") {
      return { ok: false, error: "Ese correo ya tiene una invitación pendiente." };
    }
    return {
      ok: false,
      error: "No se pudo autorizar el correo. Intentá de nuevo.",
    };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    await supabase.from("preauthorized_emails").delete().eq("id", ledgerRow.id);
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : "Configuración del servidor incompleta.",
    };
  }

  const { error: createErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: full_name ? { full_name } : {},
  });

  if (createErr) {
    await supabase.from("preauthorized_emails").delete().eq("id", ledgerRow.id);
    const msg = createErr.message?.toLowerCase() ?? "";
    if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
      return { ok: false, error: "Ya existe una cuenta con ese correo." };
    }
    return { ok: false, error: "No se pudo crear la cuenta del entrenador." };
  }

  revalidatePath("/portal/admin");
  return { ok: true };
}

/**
 * Revokes a still-pending coach authorization. RLS only permits deleting
 * rows with consumed_at is null, so a coach who already signed in cannot be
 * removed this way — suspend them instead.
 */
export async function revokeCoachAuthorizationAction(
  id: string,
): Promise<ActionResult> {
  const auth = await requireAdminId();
  if (!auth.ok) return auth;

  const supabase = await createClient();

  // Read first so we can drop the reserved auth user too — otherwise the
  // address stays taken and re-authorizing it later fails.
  const { data: row } = await supabase
    .from("preauthorized_emails")
    .select("id, email, consumed_at")
    .eq("id", id)
    .maybeSingle<{ id: string; email: string; consumed_at: string | null }>();

  if (!row) return { ok: false, error: "No autorizado." };
  if (row.consumed_at) {
    return {
      ok: false,
      error: "Ese entrenador ya activó su cuenta. Suspendelo en vez de revocarlo.",
    };
  }

  const { error } = await supabase
    .from("preauthorized_emails")
    .delete()
    .eq("id", id);

  if (error) return { ok: false, error: "No se pudo revocar la invitación." };

  // Best-effort cleanup of the reserved (never used) auth user.
  try {
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", row.email)
      .maybeSingle<{ id: string }>();
    if (profile) await admin.auth.admin.deleteUser(profile.id);
  } catch {
    // The ledger row is gone, which is what authorizes access; a leftover
    // auth user without a pending row cannot get in.
  }

  revalidatePath("/portal/admin");
  return { ok: true };
}

/** Suspends or restores a coach's access (0010's profiles.authorized switch). */
export async function setCoachAuthorizedAction(
  coachId: string,
  authorized: boolean,
): Promise<ActionResult> {
  const auth = await requireAdminId();
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", coachId)
    .maybeSingle<{ id: string; role: string }>();

  // Guard the shape here too: the admin must never suspend themselves out of
  // the platform, and this screen only ever manages coaches.
  if (!target || target.role !== "coach") {
    return { ok: false, error: "No autorizado." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ authorized })
    .eq("id", coachId);

  if (error) return { ok: false, error: "No se pudo actualizar el acceso." };

  revalidatePath("/portal/admin");
  return { ok: true };
}
