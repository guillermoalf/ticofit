"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { staffForAction } from "@/lib/staff/context";
import type { SedeInput } from "./types";

type Result = { ok: true } | { ok: false; error: string };

const TIME_RE = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

export async function updateSedeAction(id: string, input: SedeInput): Promise<Result> {
  const auth = await staffForAction("settings.manage");
  if (!auth.staff) return { ok: false, error: auth.error };
  if (input.name.trim().length < 2) return { ok: false, error: "Escribí el nombre de la sede." };
  if (!Number.isInteger(input.building_capacity) || input.building_capacity < 1) {
    return { ok: false, error: "El aforo del edificio tiene que ser un número mayor que cero." };
  }
  for (const ranges of Object.values(input.opening_hours)) {
    for (const [from, to] of ranges ?? []) {
      if (!TIME_RE.test(from) || !TIME_RE.test(to) || from >= to) {
        return { ok: false, error: "Revisá los horarios: la hora de cierre tiene que ser después de la de apertura." };
      }
    }
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sedes")
    .update({
      name: input.name.trim(),
      address: input.address.trim() || null,
      building_capacity: input.building_capacity,
      status: input.status,
      opening_hours: input.opening_hours,
    })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) return { ok: false, error: "No se pudo guardar la sede." };
  revalidatePath("/escritorio/ajustes");
  return { ok: true };
}

export async function updateSettingAction(key: string, value: number): Promise<Result> {
  const auth = await staffForAction("settings.manage");
  if (!auth.staff) return { ok: false, error: auth.error };
  if (!Number.isFinite(value) || value < 0) return { ok: false, error: "Tiene que ser un número." };
  const supabase = await createClient();
  // Who and when are stamped by the database (0023).
  const { data, error } = await supabase.from("app_settings").update({ value }).eq("key", key).select("key");
  if (error?.code === "23514") return { ok: false, error: "Ese valor está fuera del rango permitido." };
  if (error || !data?.length) return { ok: false, error: "No se pudo guardar." };
  revalidatePath("/escritorio/ajustes");
  return { ok: true };
}

/**
 * A new shared computer: a desk login (email + password chosen here), bound
 * to the sedes picked. Invite-only like every account: the pre-authorization
 * row goes in first, then the auth user (0010's trigger needs both).
 */
export async function createDeskAction(input: {
  name: string;
  email: string;
  password: string;
  sede_ids: string[];
}): Promise<Result> {
  const auth = await staffForAction("settings.manage");
  if (!auth.staff) return { ok: false, error: auth.error };
  const email = input.email.trim().toLowerCase();
  if (input.name.trim().length < 2) return { ok: false, error: "Poné un nombre, por ejemplo «Recepción Bellavista»." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Revisá el correo." };
  if (input.password.length < 10) return { ok: false, error: "La contraseña necesita al menos 10 caracteres." };
  const sedes = input.sede_ids.filter((s) => auth.staff.sede_ids.includes(s));
  if (sedes.length === 0) return { ok: false, error: "Elegí al menos una sede." };

  const admin = createAdminClient();
  const { error: preErr } = await admin
    .from("preauthorized_emails")
    .insert({ email, intended_role: "desk", full_name: input.name.trim() });
  if (preErr) {
    return { ok: false, error: preErr.code === "23505" ? "Ese correo ya tiene una invitación pendiente." : "No se pudo crear." };
  }
  const { data: created, error: userErr } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.name.trim() },
  });
  if (userErr || !created.user) {
    await admin.from("preauthorized_emails").delete().eq("email", email).is("consumed_at", null);
    return { ok: false, error: userErr?.message.includes("already") ? "Ese correo ya tiene una cuenta." : "No se pudo crear la cuenta." };
  }
  await admin.from("profiles").update({ password_prompt_dismissed: true }).eq("id", created.user.id);
  const { error: sedeErr } = await admin
    .from("desk_sedes")
    .insert(sedes.map((sede_id) => ({ desk_id: created.user.id, sede_id })));
  if (sedeErr) return { ok: false, error: "La cuenta se creó, pero no se pudieron asignar las sedes." };

  revalidatePath("/escritorio/ajustes");
  return { ok: true };
}

/** Turns a desk login off (or back on) without deleting it. */
export async function setDeskEnabledAction(deskId: string, enabled: boolean): Promise<Result> {
  const auth = await staffForAction("settings.manage");
  if (!auth.staff) return { ok: false, error: auth.error };
  const admin = createAdminClient();
  // Only desks that share a sede with this person.
  const { data: shared } = await admin
    .from("desk_sedes")
    .select("sede_id")
    .eq("desk_id", deskId)
    .in("sede_id", auth.staff.sede_ids);
  if (!shared?.length) return { ok: false, error: "Esa computadora no es de tus sedes." };
  const { error } = await admin.from("profiles").update({ authorized: enabled }).eq("id", deskId).eq("role", "desk");
  if (error) return { ok: false, error: "No se pudo cambiar." };
  revalidatePath("/escritorio/ajustes");
  return { ok: true };
}
