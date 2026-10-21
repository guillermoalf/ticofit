"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { PROCEDURE_TYPE_LABELS, type ProcedureType } from "@/types/db";

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : T))
  | { ok: false; error: string };

async function requireCoachId(): Promise<
  { ok: true; coachId: string } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return { ok: false, error: "Tu sesión expiró. Iniciá sesión de nuevo." };

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<{ role: string }>();

  if (me?.role !== "coach") return { ok: false, error: "No autorizado." };
  return { ok: true, coachId: user.id };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_TYPES = Object.keys(PROCEDURE_TYPE_LABELS) as ProcedureType[];

export type VisitInput = {
  client_id: string;
  visit_date: string;
  procedure_type: ProcedureType;
  cost: string;
  notes: string;
};

export type MeasurementInput = {
  weight: string;
  muscle_pct: string;
  fat_pct: string;
};

function parseCost(raw: string): number | null | { ok: false; error: string } {
  if (raw.trim() === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0)
    return { ok: false, error: "El costo debe ser un monto válido." };
  return n;
}

function parseMeasurementFields(m: MeasurementInput) {
  const toNum = (s: string) => (s.trim() === "" ? null : Number(s));
  return {
    weight: toNum(m.weight),
    muscle_pct: toNum(m.muscle_pct),
    fat_pct: toNum(m.fat_pct),
  };
}

function revalidateVisitPaths(clientId: string) {
  revalidatePath("/portal/visitas");
  revalidatePath(`/portal/clientes/${clientId}`);
}

export async function createVisitAction(
  visit: VisitInput,
  measurement?: MeasurementInput,
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireCoachId();
  if (!auth.ok) return auth;

  if (!DATE_RE.test(visit.visit_date))
    return { ok: false, error: "La fecha de visita no es válida." };
  if (!VALID_TYPES.includes(visit.procedure_type))
    return { ok: false, error: "Tipo de procedimiento inválido." };

  const cost = parseCost(visit.cost);
  if (cost !== null && typeof cost === "object") return cost;

  const supabase = await createClient();

  // Confirm the client belongs to this coach (RLS also enforces this).
  const { data: clientRow } = await supabase
    .from("profiles")
    .select("coach_id")
    .eq("id", visit.client_id)
    .single<{ coach_id: string | null }>();

  if (!clientRow || clientRow.coach_id !== auth.coachId)
    return { ok: false, error: "No autorizado." };

  const { data: newVisit, error: visitErr } = await supabase
    .from("visits")
    .insert({
      client_id: visit.client_id,
      coach_id: auth.coachId,
      visit_date: visit.visit_date,
      procedure_type: visit.procedure_type,
      cost: cost as number | null,
      notes: visit.notes.trim() || null,
    })
    .select("id")
    .single<{ id: string }>();

  if (visitErr || !newVisit)
    return { ok: false, error: "No se pudo registrar la visita." };

  if (visit.procedure_type === "medicion" && measurement) {
    const fields = parseMeasurementFields(measurement);
    if (fields.weight !== null || fields.muscle_pct !== null || fields.fat_pct !== null) {
      await supabase.from("measurements").insert({
        client_id: visit.client_id,
        visit_id: newVisit.id,
        measured_at: visit.visit_date,
        ...fields,
      });
    }
  }

  revalidateVisitPaths(visit.client_id);
  return { ok: true, id: newVisit.id };
}

export async function updateVisitAction(
  visitId: string,
  visit: VisitInput,
  measurement?: MeasurementInput,
  existingMeasurementId?: string | null,
): Promise<ActionResult> {
  const auth = await requireCoachId();
  if (!auth.ok) return auth;

  if (!DATE_RE.test(visit.visit_date))
    return { ok: false, error: "La fecha de visita no es válida." };
  if (!VALID_TYPES.includes(visit.procedure_type))
    return { ok: false, error: "Tipo de procedimiento inválido." };

  const cost = parseCost(visit.cost);
  if (cost !== null && typeof cost === "object") return cost;

  const supabase = await createClient();

  const { error: visitErr } = await supabase
    .from("visits")
    .update({
      visit_date: visit.visit_date,
      procedure_type: visit.procedure_type,
      cost: cost as number | null,
      notes: visit.notes.trim() || null,
    })
    .eq("id", visitId)
    .eq("coach_id", auth.coachId);

  if (visitErr) return { ok: false, error: "No se pudo actualizar la visita." };

  if (visit.procedure_type === "medicion" && measurement) {
    const fields = parseMeasurementFields(measurement);
    if (existingMeasurementId) {
      await supabase
        .from("measurements")
        .update({ measured_at: visit.visit_date, ...fields })
        .eq("id", existingMeasurementId);
    } else if (fields.weight !== null || fields.muscle_pct !== null || fields.fat_pct !== null) {
      await supabase.from("measurements").insert({
        client_id: visit.client_id,
        visit_id: visitId,
        measured_at: visit.visit_date,
        ...fields,
      });
    }
  } else if (visit.procedure_type !== "medicion" && existingMeasurementId) {
    await supabase.from("measurements").delete().eq("id", existingMeasurementId);
  }

  revalidateVisitPaths(visit.client_id);
  return { ok: true };
}

export async function deleteVisitAction(
  visitId: string,
  clientId: string,
): Promise<ActionResult> {
  const auth = await requireCoachId();
  if (!auth.ok) return auth;

  const supabase = await createClient();

  await supabase.from("measurements").delete().eq("visit_id", visitId);

  const { error } = await supabase
    .from("visits")
    .delete()
    .eq("id", visitId)
    .eq("coach_id", auth.coachId);

  if (error) return { ok: false, error: "No se pudo eliminar la visita." };

  revalidateVisitPaths(clientId);
  return { ok: true };
}
