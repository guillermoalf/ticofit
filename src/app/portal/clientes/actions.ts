"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  BLOOD_TYPES,
  CLIENT_GOAL_LABELS,
  CLIENT_TYPE_LABELS,
  GENDER_LABELS,
  type ClientGoal,
  type ClientStatus,
  type ClientType,
  type TrainingType,
} from "@/types/profile";
import { PAYMENT_STATUS_LABELS, type PaymentStatus } from "@/types/db";

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : T))
  | { ok: false; error: string };

/**
 * The intake sheet as the form sends it: every optional value arrives as a
 * string (or "") and is normalized here. See 0011 + 0016 for the columns and
 * ClientIntakeFields for the form.
 */
export type ClientIntakeInput = {
  full_name: string;
  email?: string;
  phone?: string;
  national_id?: string;
  birth_date?: string;
  gender?: string;
  address?: string;
  occupation?: string;
  blood_type?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  client_type: ClientType;
  training_type: TrainingType;
  sports_experience?: string;
  weekly_frequency_days?: string;
  session_duration_min?: string;
  height_cm?: string;
  goals?: string[];
  goal?: string;
  medical_notes?: string;
  medications?: string;
  sports_injuries?: string;
  excluded_exercises?: string;
  equipment_notes?: string;
};

export type NewClientInput = ClientIntakeInput & {
  /** When false the client is a walk-in: profile row only, no auth user. */
  create_account: boolean;
  /** Financial fields stored in clients_meta (coach-only). */
  monthly_fee?: number | null;
  join_date?: string | null;
  next_payment_date?: string | null;
};

export type EditClientInput = ClientIntakeInput & {
  status: ClientStatus;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Trimmed text, or null for an empty field — never an empty string in the DB. */
function text(value: string | undefined): string | null {
  return value?.trim() || null;
}

/** Parses an optional numeric field, bounded. Returns undefined when invalid. */
function bounded(
  value: string | undefined,
  min: number,
  max: number,
): number | null | undefined {
  const raw = value?.trim();
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min || n > max) return undefined;
  return n;
}

/**
 * Turns the form payload into profile columns, or an error message when a
 * value fails validation. Shared by create and update so the two can never
 * disagree about what a valid client looks like.
 */
function intakeColumns(
  input: ClientIntakeInput,
):
  | { ok: true; columns: Record<string, unknown> }
  | { ok: false; error: string } {
  if (!(input.client_type in CLIENT_TYPE_LABELS)) {
    return { ok: false, error: "Tipo de cliente inválido." };
  }
  if (input.gender && !(input.gender in GENDER_LABELS)) {
    return { ok: false, error: "Género inválido." };
  }
  if (input.blood_type && !BLOOD_TYPES.includes(input.blood_type as never)) {
    return { ok: false, error: "Tipo de sangre inválido." };
  }

  const goals = (input.goals ?? []).filter(
    (g): g is ClientGoal => g in CLIENT_GOAL_LABELS,
  );

  const weekly = bounded(input.weekly_frequency_days, 0, 14);
  if (weekly === undefined) {
    return { ok: false, error: "La frecuencia semanal debe ser entre 0 y 14 días." };
  }
  const duration = bounded(input.session_duration_min, 5, 600);
  if (duration === undefined) {
    return { ok: false, error: "La disponibilidad debe ser entre 5 y 600 minutos." };
  }
  const height = bounded(input.height_cm, 50, 260);
  if (height === undefined) {
    return { ok: false, error: "La estatura debe ser entre 50 y 260 cm." };
  }

  // The DB CHECK from 0011 rejects future or absurd dates; catch it here so
  // the coach gets a sentence instead of a Postgres error.
  const birth = text(input.birth_date);
  if (birth) {
    const parsed = new Date(`${birth}T00:00:00`);
    const floor = new Date();
    floor.setFullYear(floor.getFullYear() - 120);
    if (Number.isNaN(parsed.getTime()) || parsed > new Date() || parsed < floor) {
      return { ok: false, error: "Revisá la fecha de nacimiento." };
    }
  }

  return {
    ok: true,
    columns: {
      client_type: input.client_type,
      training_type: input.training_type,
      phone: text(input.phone),
      national_id: text(input.national_id),
      birth_date: birth,
      gender: text(input.gender),
      address: text(input.address),
      occupation: text(input.occupation),
      blood_type: text(input.blood_type),
      emergency_contact_name: text(input.emergency_contact_name),
      emergency_contact_phone: text(input.emergency_contact_phone),
      sports_experience: text(input.sports_experience),
      weekly_frequency_days: weekly,
      session_duration_min: duration,
      height_cm: height,
      goals: goals.length ? goals : null,
      goal: text(input.goal),
      medical_notes: text(input.medical_notes),
      medications: text(input.medications),
      sports_injuries: text(input.sports_injuries),
      excluded_exercises: text(input.excluded_exercises),
      equipment_notes: text(input.equipment_notes),
    },
  };
}

/** Confirms the caller has an active coach session; returns the coach id. */
async function requireCoachId(): Promise<
  { ok: true; coachId: string } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Tu sesión expiró. Iniciá sesión de nuevo." };

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<{ role: string }>();

  if (me?.role !== "coach") return { ok: false, error: "No autorizado." };
  return { ok: true, coachId: user.id };
}

/**
 * Creates a client.
 *
 * WITH create_account — the invite-only path (0009 + 0010). Entering the
 * client's email is what grants them access, in two steps that must happen
 * in this order:
 *
 *   1. Write the PRE-AUTHORIZATION ledger row through the COACH'S OWN
 *      session, so the RLS policy "coach authorizes own clients" is what
 *      permits it. That policy pins intended_role = 'client' and
 *      coach_id = auth.uid(), so a coach physically cannot authorize another
 *      coach — the database refuses the row, not just the UI. Using the
 *      service role here would bypass the very check we rely on.
 *   2. Provision the account with the service role: email_confirm = true and
 *      NO password. 0010's handle_new_user() trigger consumes the ledger row
 *      and builds the profile with role = 'client', the coach_id the ledger
 *      dictates and authorized = true.
 *
 * Creating the account up front (rather than only the ledger row) is what
 * keeps the client's profile id fixed from day one, so the fees, dates,
 * measurements and routines the coach records now stay attached when the
 * client first signs in. The client then enters with Google — Supabase links
 * the OAuth identity to the existing confirmed address instead of creating a
 * second user — and may set a password afterwards.
 *
 * No temporary password is generated or shown anywhere: the ledger is the
 * credential-free authorization, which is the whole point of 0009.
 *
 * WITHOUT create_account (walk-in) — profile row only, no ledger row and no
 * auth user. profiles.id no longer FKs auth.users, so the row exists with a
 * generated uuid and no login. Unchanged by the invite-only work.
 */
export async function createClientAction(
  input: NewClientInput,
): Promise<ActionResult<{ invitedEmail: string | null }>> {
  const auth = await requireCoachId();
  if (!auth.ok) return auth;

  const full_name = input.full_name.trim();
  const email = input.email?.trim().toLowerCase() ?? "";

  if (!full_name) return { ok: false, error: "El nombre es obligatorio." };
  const intake = intakeColumns(input);
  if (!intake.ok) return intake;
  // Walk-ins may omit the email; if provided (or an account is requested) it
  // must be valid.
  if ((input.create_account || email) && !EMAIL_RE.test(email))
    return { ok: false, error: "Ingresá un correo electrónico válido." };
  if (
    input.monthly_fee != null &&
    (!Number.isFinite(input.monthly_fee) || input.monthly_fee < 0)
  ) {
    return { ok: false, error: "La mensualidad debe ser un monto válido." };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Configuración del servidor incompleta.",
    };
  }

  const rosterFields = {
    ...intake.columns,
    full_name,
    status: "active",
    role: "client",
    coach_id: auth.coachId,
  };

  const metaRow = {
    monthly_fee: input.monthly_fee ?? null,
    join_date: input.join_date || null,
    next_payment_date: input.next_payment_date || null,
    payment_status: "al_dia",
    active: true,
  };

  if (!input.create_account) {
    // Walk-in: profile row only, no auth user and no portal access.
    const { data: inserted, error: insertErr } = await admin
      .from("profiles")
      .insert({
        ...rosterFields,
        email: email || null,
        has_account: false,
      })
      .select("id")
      .single<{ id: string }>();

    if (insertErr || !inserted) {
      return { ok: false, error: "No se pudo crear el cliente. Intentá de nuevo." };
    }

    const { error: metaErr } = await admin
      .from("clients_meta")
      .insert({ client_id: inserted.id, ...metaRow });

    if (metaErr) {
      // Roll back the orphaned profile so the coach can retry cleanly.
      await admin.from("profiles").delete().eq("id", inserted.id);
      return { ok: false, error: "No se pudieron guardar los datos de pago. Intentá de nuevo." };
    }

    revalidatePath("/portal/clientes");
    return { ok: true, invitedEmail: null };
  }

  const supabase = await createClient();

  // Step 1 — the authorization itself, under the coach's own RLS.
  const { data: ledgerRow, error: ledgerErr } = await supabase
    .from("preauthorized_emails")
    .insert({
      email,
      intended_role: "client",
      full_name,
      authorized_by: auth.coachId,
      coach_id: auth.coachId,
    })
    .select("id")
    .single<{ id: string }>();

  if (ledgerErr || !ledgerRow) {
    // The partial unique index allows one pending row per address, so this
    // is how "another coach already invited them" surfaces.
    if (ledgerErr?.code === "23505") {
      return {
        ok: false,
        error: "Ese correo ya tiene una invitación pendiente.",
      };
    }
    return { ok: false, error: "No se pudo autorizar ese correo. Intentá de nuevo." };
  }

  // Rolls the authorization back with the service role: once the trigger has
  // consumed the row the coach's own DELETE policy no longer matches it.
  const dropLedgerRow = () =>
    admin.from("preauthorized_emails").delete().eq("id", ledgerRow.id);

  // Step 2 — provision the passwordless account; the trigger consumes the row.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name },
  });

  if (createErr || !created?.user) {
    await dropLedgerRow();
    const msg = createErr?.message?.toLowerCase() ?? "";
    if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
      return { ok: false, error: "Ya existe una cuenta con ese correo." };
    }
    return { ok: false, error: "No se pudo crear el cliente. Intentá de nuevo." };
  }

  // The trigger already wrote the identity fields (role, coach_id,
  // authorized); this fills in the roster detail the coach just entered.
  const { error: updateErr } = await admin
    .from("profiles")
    .update({ ...rosterFields, email, has_account: true })
    .eq("id", created.user.id);

  if (updateErr) {
    // Roll back the orphaned auth user so the coach can retry cleanly.
    await admin.auth.admin.deleteUser(created.user.id);
    await dropLedgerRow();
    return { ok: false, error: "No se pudo guardar el perfil del cliente. Intentá de nuevo." };
  }

  // Financial roster row (coach-only via RLS; written with the service role).
  const { error: metaErr } = await admin
    .from("clients_meta")
    .insert({ client_id: created.user.id, ...metaRow });

  if (metaErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    await dropLedgerRow();
    return { ok: false, error: "No se pudieron guardar los datos de pago. Intentá de nuevo." };
  }

  revalidatePath("/portal/clientes");
  return { ok: true, invitedEmail: email };
}

/** Updates a client's profile. The coach must own the client (RLS + check). */
export async function updateClientAction(
  id: string,
  input: EditClientInput,
): Promise<ActionResult> {
  const auth = await requireCoachId();
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("coach_id, email, has_account")
    .eq("id", id)
    .single<{ coach_id: string | null; email: string | null; has_account: boolean }>();

  if (!target || target.coach_id !== auth.coachId) {
    return { ok: false, error: "No autorizado." };
  }

  const full_name = input.full_name.trim();
  const email = input.email?.trim().toLowerCase() ?? "";
  if (!full_name) return { ok: false, error: "El nombre es obligatorio." };
  // Walk-ins have no login, so their email is optional contact info.
  if ((target.has_account || email) && !EMAIL_RE.test(email))
    return { ok: false, error: "Ingresá un correo electrónico válido." };

  const intake = intakeColumns(input);
  if (!intake.ok) return intake;

  const { error } = await supabase
    .from("profiles")
    .update({
      ...intake.columns,
      full_name,
      email: email || null,
      status: input.status,
    })
    .eq("id", id);

  if (error) return { ok: false, error: "No se pudieron guardar los cambios." };

  // Keep the auth login email in sync when it changes (account clients only —
  // walk-ins have no auth user to update).
  if (target.has_account && email && email !== target.email?.toLowerCase()) {
    try {
      await createAdminClient().auth.admin.updateUserById(id, { email });
    } catch {
      // Profile mirror is updated; auth email sync is best-effort here.
    }
  }

  revalidatePath("/portal/clientes");
  revalidatePath(`/portal/clientes/${id}`);
  return { ok: true };
}

export type ClientMetaInput = {
  monthly_fee: number | null;
  join_date: string | null;
  next_payment_date: string | null;
  payment_status: PaymentStatus;
  active: boolean;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Saves the coach-only financial fields (clients_meta). Upsert covers clients
 * that predate their meta row; RLS ("coach manages own clients meta")
 * re-checks ownership on write and clients have no read policy at all.
 */
export async function updateClientMetaAction(
  id: string,
  input: ClientMetaInput,
): Promise<ActionResult> {
  const auth = await requireCoachId();
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("coach_id")
    .eq("id", id)
    .single<{ coach_id: string | null }>();

  if (!target || target.coach_id !== auth.coachId) {
    return { ok: false, error: "No autorizado." };
  }

  if (
    input.monthly_fee != null &&
    (!Number.isFinite(input.monthly_fee) || input.monthly_fee < 0)
  ) {
    return { ok: false, error: "La mensualidad debe ser un monto válido." };
  }
  if (!(input.payment_status in PAYMENT_STATUS_LABELS)) {
    return { ok: false, error: "Estado de pago inválido." };
  }
  if (
    (input.join_date && !DATE_RE.test(input.join_date)) ||
    (input.next_payment_date && !DATE_RE.test(input.next_payment_date))
  ) {
    return { ok: false, error: "Ingresá fechas válidas." };
  }

  const { error } = await supabase.from("clients_meta").upsert(
    {
      client_id: id,
      monthly_fee: input.monthly_fee,
      join_date: input.join_date,
      next_payment_date: input.next_payment_date,
      payment_status: input.payment_status,
      active: input.active,
    },
    { onConflict: "client_id" },
  );

  if (error) {
    return { ok: false, error: "No se pudieron guardar los datos financieros." };
  }

  revalidatePath("/portal/clientes");
  revalidatePath(`/portal/clientes/${id}`);
  return { ok: true };
}

/** Flips a client's status between active and paused. */
export async function toggleClientStatusAction(
  id: string,
  next: ClientStatus,
): Promise<ActionResult> {
  const auth = await requireCoachId();
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("coach_id")
    .eq("id", id)
    .single<{ coach_id: string | null }>();

  if (!target || target.coach_id !== auth.coachId) {
    return { ok: false, error: "No autorizado." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ status: next })
    .eq("id", id);

  if (error) return { ok: false, error: "No se pudo actualizar el estado." };

  revalidatePath("/portal/clientes");
  revalidatePath(`/portal/clientes/${id}`);
  return { ok: true };
}
