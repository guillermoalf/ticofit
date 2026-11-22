"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { staffForAction } from "@/lib/staff/context";
import { can } from "@/lib/staff/permissions";
import { todayCR } from "@/lib/clients/body";
import { CLINICAL_GROUPS, MEASUREMENT_GROUPS, PROFILE_GROUPS } from "@/lib/clients/fields";
import { inviteClient } from "@/lib/clients/invite";
import { isDate, parseFields } from "@/lib/clients/parse";
import type { SaveResult } from "@/lib/clients/result";

function dbError(error: { code?: string; message: string }): string {
  const m = error.message;
  if (m.includes("MEASUREMENT_INTERVAL")) {
    return "Ya hay una medición muy cerca de esa fecha. Un administrador puede registrarla escribiendo el motivo.";
  }
  if (m.includes("OVERRIDE_NOT_ALLOWED")) return "Solo un administrador puede saltarse el intervalo entre mediciones.";
  if (m.includes("MEASUREMENT_FUTURE")) return "La fecha de medición no puede ser futura.";
  if (m.includes("EMAIL_LOCKED")) return "El correo no se puede cambiar: ya es su acceso al portal.";
  if (m.includes("clients_email_key")) return "Ese correo ya está en otro expediente.";
  if (m.includes("client_day_key")) return "Ya hay una medición con esa fecha.";
  if (m.includes("NOT_ALLOWED") || error.code === "42501") return "Tu rol no permite hacer esto.";
  if (error.code === "23514") return "Hay un valor fuera de rango. Revisá los números.";
  return "No se pudo guardar. Intentá de nuevo.";
}

function profileValues(
  form: FormData,
  sedeIds: string[],
): { ok: true; values: Record<string, string | number | string[] | null> } | { ok: false; error: string } {
  const parsed = parseFields(PROFILE_GROUPS, form);
  if (!parsed.ok) return parsed;
  const { birth_date: birth } = parsed.values;
  const today = todayCR();
  if (typeof birth === "string" && (birth > today || birth <= "1900-01-01")) {
    return { ok: false as const, error: "Revisá la fecha de nacimiento." };
  }
  if (String(parsed.values.full_name).length < 2) return { ok: false as const, error: "Escribí el nombre completo." };

  const sede = String(form.get("sede_id") ?? "");
  if (!sedeIds.includes(sede)) return { ok: false as const, error: "Elegí una sede donde trabajés." };
  const joined = String(form.get("join_date") ?? "");
  if (!isDate(joined)) return { ok: false as const, error: "Revisá la fecha de ingreso." };
  return { ok: true as const, values: { ...parsed.values, sede_id: sede, join_date: joined } };
}

/** Creates the file and, when there is an email, sends the invitation. */
export async function createClientFileAction(form: FormData): Promise<SaveResult> {
  const auth = await staffForAction("clients.write");
  if (!auth.staff) return { ok: false, error: auth.error };
  const input = profileValues(form, auth.staff.sede_ids);
  if (!input.ok) return input;

  const supabase = await createClient();
  const { data, error } = await supabase.from("clients").insert(input.values).select("id").single();
  if (error) return { ok: false, error: dbError(error) };

  // The file exists even if the email fails: the invitation can be retried from it.
  const warning = input.values.email ? await inviteClient(data.id, auth.staff) : null;
  revalidatePath("/escritorio/clientes");
  return {
    ok: true,
    message: input.values.email && !warning ? "Cliente creado e invitado." : "Cliente creado.",
    warning: warning ?? undefined,
    // The sheet's order: history next, then the first measurement.
    href: can(auth.staff, "clinical.write")
      ? `/escritorio/clientes/${data.id}?tab=historia`
      : `/escritorio/clientes/${data.id}`,
  };
}

export async function updateClientFileAction(id: string, form: FormData): Promise<SaveResult> {
  const auth = await staffForAction("clients.write");
  if (!auth.staff) return { ok: false, error: auth.error };
  const input = profileValues(form, auth.staff.sede_ids);
  if (!input.ok) return input;

  const supabase = await createClient();
  const { data, error } = await supabase.from("clients").update(input.values).eq("id", id).select("id");
  if (error) return { ok: false, error: dbError(error) };
  if (!data.length) return { ok: false, error: "No podés editar a este cliente." };
  revalidatePath(`/escritorio/clientes/${id}`);
  return { ok: true, message: "Perfil guardado.", href: `/escritorio/clientes/${id}` };
}

export async function inviteClientAction(id: string): Promise<SaveResult> {
  const auth = await staffForAction("clients.write");
  if (!auth.staff) return { ok: false, error: auth.error };
  const error = await inviteClient(id, auth.staff);
  if (error) return { ok: false, error };
  revalidatePath(`/escritorio/clientes/${id}`);
  return { ok: true, message: "Invitación enviada." };
}

/** Every save is a new dated version; nothing is overwritten. */
export async function saveClinicalAction(id: string, form: FormData): Promise<SaveResult> {
  const auth = await staffForAction("clinical.write");
  if (!auth.staff) return { ok: false, error: auth.error };
  const input = parseFields(CLINICAL_GROUPS, form);
  if (!input.ok) return input;

  const supabase = await createClient();
  // Read before writing: the first save continues to the first measurement.
  const { count } = await supabase
    .from("client_measurements")
    .select("id", { count: "exact", head: true })
    .eq("client_id", id);
  const { error } = await supabase.from("client_clinical_history").insert({ ...input.values, client_id: id });
  if (error) return { ok: false, error: dbError(error) };

  revalidatePath(`/escritorio/clientes/${id}`);
  const first = !count && can(auth.staff, "measurements.write");
  return {
    ok: true,
    message: "Historia clínica guardada.",
    href: `/escritorio/clientes/${id}?tab=${first ? "mediciones&nueva=1" : "historia"}`,
  };
}

function measurementValues(form: FormData) {
  const parsed = parseFields(MEASUREMENT_GROUPS, form);
  if (!parsed.ok) return parsed;
  const { weight_kg: weight, muscle_kg: muscle, fat_kg: fat } = parsed.values;
  if (Number(muscle ?? 0) > Number(weight) || Number(fat ?? 0) > Number(weight)) {
    return { ok: false as const, error: "El músculo y la grasa en kg no pueden pesar más que el cliente." };
  }
  return parsed;
}

export async function createMeasurementAction(id: string, form: FormData): Promise<SaveResult> {
  const auth = await staffForAction("measurements.write");
  if (!auth.staff) return { ok: false, error: auth.error };
  const input = measurementValues(form);
  if (!input.ok) return input;
  const date = String(form.get("measured_on") ?? "");
  if (!isDate(date)) return { ok: false, error: "Revisá la fecha de medición." };
  const reason = String(form.get("override_reason") ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase.from("client_measurements").insert({
    ...input.values,
    client_id: id,
    measured_on: date,
    override_reason: reason && can(auth.staff, "measurements.override") ? reason.slice(0, 500) : null,
  });
  if (error) return { ok: false, error: dbError(error) };
  revalidatePath(`/escritorio/clientes/${id}`);
  return { ok: true, message: "Medición guardada.", href: `/escritorio/clientes/${id}?tab=mediciones` };
}

/** Fixes a typo. The date, the coach and the client can't change (0024 grants). */
export async function updateMeasurementAction(id: string, measurementId: string, form: FormData): Promise<SaveResult> {
  const auth = await staffForAction("measurements.write");
  if (!auth.staff) return { ok: false, error: auth.error };
  const input = measurementValues(form);
  if (!input.ok) return input;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_measurements")
    .update(input.values)
    .eq("id", measurementId)
    .eq("client_id", id)
    .select("id");
  if (error) return { ok: false, error: dbError(error) };
  if (!data.length) return { ok: false, error: "No podés corregir esta medición." };
  revalidatePath(`/escritorio/clientes/${id}`);
  return { ok: true, message: "Medición corregida.", href: `/escritorio/clientes/${id}?tab=mediciones&m=${measurementId}` };
}
