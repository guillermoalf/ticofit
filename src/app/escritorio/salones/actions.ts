"use server";

import { revalidatePath } from "next/cache";

import { crInstant, scheduleError } from "@/lib/schedule";
import { staffForAction } from "@/lib/staff/context";
import { createClient } from "@/lib/supabase/server";

type Result<T = object> = ({ ok: true; message: string } & T) | { ok: false; error: string };

const UUID_RE = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const uuid = (v: string | null | undefined) => (v && UUID_RE.test(v) ? v : null);

function refresh() {
  revalidatePath("/escritorio/salones", "layout");
  revalidatePath("/escritorio/clientes", "layout");
}

/** Optional whole number in a range; "" → null, anything else → undefined (invalid). */
function optionalInt(raw: string, min: number, max: number): number | null | undefined {
  const t = raw.trim();
  if (!t) return null;
  if (!/^\d{1,3}$/.test(t)) return undefined;
  const n = Number(t);
  return n >= min && n <= max ? n : undefined;
}

// --- Reservations (reservations.write) ------------------------------------------------

export async function bookForClientAction(classId: string, clientId: string): Promise<Result> {
  const auth = await staffForAction("reservations.write");
  if (!auth.staff) return { ok: false, error: auth.error };
  if (!uuid(classId) || !uuid(clientId)) return { ok: false, error: "Elegí un cliente." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("reservation_book", { p_class_id: classId, p_client_id: clientId });
  if (error) return { ok: false, error: scheduleError(error) };
  refresh();
  return { ok: true, message: "Reserva hecha." };
}

export async function cancelReservationAction(reservationId: string): Promise<Result> {
  const auth = await staffForAction("reservations.write");
  if (!auth.staff) return { ok: false, error: auth.error };
  if (!uuid(reservationId)) return { ok: false, error: "No se encontró la reserva." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("reservation_cancel", { p_reservation_id: reservationId });
  if (error) return { ok: false, error: scheduleError(error) };
  refresh();
  return { ok: true, message: "Reserva cancelada." };
}

export async function setAttendedAction(reservationId: string, attended: boolean): Promise<Result> {
  const auth = await staffForAction("reservations.write");
  if (!auth.staff) return { ok: false, error: auth.error };
  if (!uuid(reservationId)) return { ok: false, error: "No se encontró la reserva." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("reservation_set_attended", { p_reservation_id: reservationId, p_attended: attended });
  if (error) return { ok: false, error: scheduleError(error) };
  refresh();
  return { ok: true, message: attended ? "Asistencia marcada." : "Asistencia quitada." };
}

// --- One class (schedule.write) -------------------------------------------------------

export type ClassInput = {
  sede_id: string;
  discipline_id: string;
  salon_id: string;
  coach_staff_id: string;
  date: string;
  start: string;
  end: string;
  capacity: string;
};

/** A one-off class (id null) or a change to one occurrence. */
export async function saveClassAction(id: string | null, input: ClassInput): Promise<Result<{ id: string }>> {
  const auth = await staffForAction("schedule.write");
  if (!auth.staff) return { ok: false, error: auth.error };
  if (id && !uuid(id)) return { ok: false, error: "No se encontró la clase." };
  if (!uuid(input.discipline_id)) return { ok: false, error: "Elegí la disciplina." };
  if (!uuid(input.salon_id)) return { ok: false, error: "Elegí el salón." };
  if (!DATE_RE.test(input.date)) return { ok: false, error: "Elegí la fecha." };
  if (!TIME_RE.test(input.start) || !TIME_RE.test(input.end)) return { ok: false, error: "Poné la hora de inicio y de fin." };
  if (input.end <= input.start) return { ok: false, error: "La clase tiene que terminar después de empezar." };
  const capacity = optionalInt(input.capacity, 1, 200);
  if (capacity === undefined) return { ok: false, error: "El cupo va de 1 a 200, o vacío para el de la disciplina." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("class_save", {
    p_id: id,
    p_class: {
      sede_id: input.sede_id,
      discipline_id: input.discipline_id,
      salon_id: input.salon_id,
      coach_staff_id: uuid(input.coach_staff_id) ?? "",
      starts_at: crInstant(input.date, input.start),
      ends_at: crInstant(input.date, input.end),
      capacity: capacity ?? "",
    },
  });
  if (error || !data) return { ok: false, error: scheduleError(error) };
  refresh();
  return { ok: true, id: data as string, message: id ? "Clase actualizada." : "Clase agregada." };
}

export async function cancelClassAction(id: string, reason: string): Promise<Result> {
  const auth = await staffForAction("schedule.write");
  if (!auth.staff) return { ok: false, error: auth.error };
  if (!uuid(id)) return { ok: false, error: "No se encontró la clase." };
  const why = reason.trim().slice(0, 300);
  if (why.length < 3) return { ok: false, error: "Escribí el motivo: lo ven los clientes que tenían reserva." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("class_cancel", { p_id: id, p_reason: why });
  if (error) return { ok: false, error: scheduleError(error) };
  refresh();
  const n = (data as number | null) ?? 0;
  return { ok: true, message: n ? `Clase cancelada. Se cancelaron ${n} ${n === 1 ? "reserva" : "reservas"}.` : "Clase cancelada." };
}

// --- Weekly schedule (schedule.write) -------------------------------------------------

export type TemplateInput = {
  sede_id: string;
  discipline_id: string;
  salon_id: string;
  coach_staff_id: string;
  weekdays: number[];
  start_time: string;
  duration_min: string;
  repeat_until: string;
  capacity: string;
  valid_from: string;
  valid_until: string;
};

export async function saveTemplateAction(id: string | null, input: TemplateInput): Promise<Result<{ id: string }>> {
  const auth = await staffForAction("schedule.write");
  if (!auth.staff) return { ok: false, error: auth.error };
  if (id && !uuid(id)) return { ok: false, error: "No se encontró esa clase semanal." };
  if (!uuid(input.discipline_id)) return { ok: false, error: "Elegí la disciplina." };
  if (!uuid(input.salon_id)) return { ok: false, error: "Elegí el salón." };
  const days = [...new Set(input.weekdays)].filter((d) => Number.isInteger(d) && d >= 1 && d <= 7).sort();
  if (!days.length) return { ok: false, error: "Marcá al menos un día." };
  if (!TIME_RE.test(input.start_time)) return { ok: false, error: "Poné la hora de inicio." };
  const minutes = optionalInt(input.duration_min, 15, 240);
  if (!minutes) return { ok: false, error: "La duración va de 15 a 240 minutos." };
  const [h, m] = input.start_time.split(":").map(Number);
  if (h * 60 + m + minutes > 24 * 60) return { ok: false, error: "La clase no puede pasar de la medianoche." };
  if (input.repeat_until && (!TIME_RE.test(input.repeat_until) || input.repeat_until <= input.start_time)) {
    return { ok: false, error: "«Repetir cada hora hasta» tiene que ser después de la hora de inicio." };
  }
  const capacity = optionalInt(input.capacity, 1, 200);
  if (capacity === undefined) return { ok: false, error: "El cupo va de 1 a 200, o vacío para el de la disciplina." };
  if (input.valid_from && !DATE_RE.test(input.valid_from)) return { ok: false, error: "Revisá la fecha de inicio." };
  if (input.valid_until && !DATE_RE.test(input.valid_until)) return { ok: false, error: "Revisá la fecha de fin." };
  if (input.valid_from && input.valid_until && input.valid_until < input.valid_from) {
    return { ok: false, error: "La fecha de fin tiene que ser después de la de inicio." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("class_template_save", {
    p_id: id,
    p_tpl: {
      sede_id: input.sede_id,
      discipline_id: input.discipline_id,
      salon_id: input.salon_id,
      coach_staff_id: uuid(input.coach_staff_id) ?? "",
      weekdays: days,
      start_time: input.start_time,
      duration_min: minutes,
      repeat_until: input.repeat_until,
      capacity: capacity ?? "",
      valid_from: input.valid_from,
      valid_until: input.valid_until,
    },
  });
  if (error || !data) return { ok: false, error: scheduleError(error) };
  refresh();
  return {
    ok: true,
    id: data as string,
    message: id ? "Horario actualizado. Las clases futuras sin reservas se rehicieron." : "Clase semanal agregada.",
  };
}

export async function endTemplateAction(id: string): Promise<Result> {
  const auth = await staffForAction("schedule.write");
  if (!auth.staff) return { ok: false, error: auth.error };
  if (!uuid(id)) return { ok: false, error: "No se encontró esa clase semanal." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("class_template_end", { p_id: id });
  if (error) return { ok: false, error: scheduleError(error) };
  refresh();
  return { ok: true, message: "Clase semanal quitada. Las clases que ya tenían reservas siguen en el calendario." };
}

// --- Salones and disciplines (salons.manage, owners only) ----------------------------------------

export type SalonInput = { name: string; capacity: string; sort_order: string; active: boolean };

export async function saveSalonAction(id: string | null, sedeId: string, input: SalonInput): Promise<Result> {
  const auth = await staffForAction("salons.manage");
  if (!auth.staff) return { ok: false, error: auth.error };
  if (id && !uuid(id)) return { ok: false, error: "No se encontró el salón." };
  if (!id && !auth.staff.sede_ids.includes(sedeId)) return { ok: false, error: "Tu rol no permite hacer esto." };
  const name = input.name.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 60) return { ok: false, error: "Poné un nombre de 2 a 60 letras." };
  const capacity = optionalInt(input.capacity, 1, 200);
  if (!capacity) return { ok: false, error: "La capacidad va de 1 a 200 personas." };
  const order = optionalInt(input.sort_order, 0, 999) ?? 0;

  const supabase = await createClient();
  const row = { name, capacity, sort_order: order, active: input.active };
  const { data, error } = id
    ? await supabase.from("salones").update(row).eq("id", id).select("id")
    : await supabase.from("salones").insert({ ...row, sede_id: sedeId }).select("id");
  if (error || !data?.length) return { ok: false, error: error ? scheduleError(error) : "Tu rol no permite hacer esto." };
  refresh();
  return { ok: true, message: id ? "Salón guardado." : "Salón agregado." };
}

export type DisciplineInput = { name: string; default_capacity: string; default_minutes: string; sort_order: string; active: boolean };

function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export async function saveDisciplineAction(id: string | null, input: DisciplineInput): Promise<Result> {
  const auth = await staffForAction("salons.manage");
  if (!auth.staff) return { ok: false, error: auth.error };
  if (id && !uuid(id)) return { ok: false, error: "No se encontró la disciplina." };
  const name = input.name.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 60) return { ok: false, error: "Poné un nombre de 2 a 60 letras." };
  const capacity = optionalInt(input.default_capacity, 1, 200);
  if (capacity === undefined) return { ok: false, error: "El cupo va de 1 a 200, o vacío para usar el del salón." };
  const minutes = optionalInt(input.default_minutes, 15, 240);
  if (!minutes) return { ok: false, error: "La duración va de 15 a 240 minutos." };
  const order = optionalInt(input.sort_order, 0, 999) ?? 0;

  const supabase = await createClient();
  const row = { name, default_capacity: capacity, default_minutes: minutes, sort_order: order, active: input.active };
  let res;
  if (id) {
    res = await supabase.from("disciplines").update(row).eq("id", id).select("id");
  } else {
    const slug = slugify(name);
    if (slug.length < 2) return { ok: false, error: "Poné un nombre con letras." };
    res = await supabase.from("disciplines").insert({ ...row, slug }).select("id");
  }
  if (res.error || !res.data?.length) return { ok: false, error: res.error ? scheduleError(res.error) : "Tu rol no permite hacer esto." };
  refresh();
  return { ok: true, message: id ? "Disciplina guardada." : "Disciplina agregada." };
}

/** The salón a discipline uses by default in one sede (salonId "" clears it). */
export async function setDisciplineSalonAction(disciplineId: string, sedeId: string, salonId: string): Promise<Result> {
  const auth = await staffForAction("salons.manage");
  if (!auth.staff) return { ok: false, error: auth.error };
  if (!uuid(disciplineId) || !auth.staff.sede_ids.includes(sedeId)) return { ok: false, error: "Tu rol no permite hacer esto." };
  const supabase = await createClient();
  const salon = uuid(salonId);
  // Delete + insert: the grant only lets salon_id be updated, which an upsert can't limit itself to.
  const del = await supabase.from("discipline_salons").delete().eq("discipline_id", disciplineId).eq("sede_id", sedeId);
  if (del.error) return { ok: false, error: scheduleError(del.error) };
  if (salon) {
    const { error } = await supabase.from("discipline_salons").insert({ discipline_id: disciplineId, sede_id: sedeId, salon_id: salon });
    if (error) return { ok: false, error: scheduleError(error) };
  }
  refresh();
  return { ok: true, message: "Salón por defecto guardado." };
}
