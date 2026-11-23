/**
 * Salones, classes and reservations (migration 0028): shared types, Costa Rica
 * time helpers and the Spanish text for every database error code.
 */

import { addDays, todayCR } from "@/lib/clients/body";

export const CR_TZ = "America/Costa_Rica";
/** Costa Rica has no daylight saving: always UTC−6. */
const CR_OFFSET = "-06:00";

export type Slot = {
  class_id: string;
  starts_at: string;
  ends_at: string;
  status: "scheduled" | "cancelled";
  discipline_id: string;
  discipline_name: string;
  discipline_slug: string;
  salon_id: string;
  salon_name: string;
  coach_name: string | null;
  capacity: number;
  booked: number;
  my_reservation_id: string | null;
};

export type Salon = {
  id: string;
  sede_id: string;
  name: string;
  capacity: number;
  sort_order: number;
  active: boolean;
};

export type Discipline = {
  id: string;
  slug: string;
  name: string;
  default_capacity: number | null;
  default_minutes: number;
  sort_order: number;
  active: boolean;
};

export type ClassTemplate = {
  id: string;
  sede_id: string;
  discipline_id: string;
  salon_id: string;
  coach_staff_id: string | null;
  weekdays: number[];
  start_time: string;
  duration_min: number;
  repeat_until: string | null;
  capacity: number | null;
  valid_from: string;
  valid_until: string | null;
  active: boolean;
};

/** ISO weekday (1 = lunes) → name. */
export const WEEKDAYS: Record<number, { short: string; long: string }> = {
  1: { short: "Lun", long: "lunes" },
  2: { short: "Mar", long: "martes" },
  3: { short: "Mié", long: "miércoles" },
  4: { short: "Jue", long: "jueves" },
  5: { short: "Vie", long: "viernes" },
  6: { short: "Sáb", long: "sábado" },
  7: { short: "Dom", long: "domingo" },
};

/** How far back and ahead the day views go (class_slots allows ±60 days). */
export const DAY_RANGE = 60;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** The `?dia=` of a day view, clamped to what class_slots accepts. */
export function pickDay(raw: string | undefined): string {
  const today = todayCR();
  if (!raw || !DATE_RE.test(raw) || Number.isNaN(Date.parse(raw))) return today;
  if (raw < addDays(today, -DAY_RANGE)) return addDays(today, -DAY_RANGE);
  if (raw > addDays(today, DAY_RANGE)) return addDays(today, DAY_RANGE);
  return raw;
}

/** "6:00 a. m." in Costa Rica. */
export function crTime(ts: string): string {
  return new Intl.DateTimeFormat("es-CR", { timeZone: CR_TZ, hour: "numeric", minute: "2-digit" }).format(new Date(ts));
}

/** "18:30" (24 h) in Costa Rica: the value of an `<input type="time">`. */
export function crClock(ts: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: CR_TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(
    new Date(ts),
  );
}

/** YYYY-MM-DD of a moment in Costa Rica. */
export function crDate(ts: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: CR_TZ }).format(new Date(ts));
}

/** A Costa Rica date + "HH:MM" as an ISO timestamp with offset. */
export function crInstant(date: string, time: string): string {
  return `${date}T${time.slice(0, 5)}:00${CR_OFFSET}`;
}

/** "lunes 23 de noviembre" for a YYYY-MM-DD. */
export function dayLabel(date: string): string {
  return new Intl.DateTimeFormat("es-CR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(
    new Date(`${date}T00:00:00Z`),
  );
}

/** "lun 23 nov · 6:00 a. m." for lists that span days. */
export function crMoment(ts: string): string {
  const d = new Intl.DateTimeFormat("es-CR", { timeZone: CR_TZ, weekday: "short", day: "numeric", month: "short" }).format(
    new Date(ts),
  );
  return `${d} · ${crTime(ts)}`;
}

/** "6:00" → "6:00 a. m." for a time-of-day column. */
export function clockLabel(time: string): string {
  return crTime(crInstant("2026-01-05", time));
}

export function weekdaysLabel(days: number[]): string {
  const sorted = [...days].sort();
  if (sorted.join() === "1,2,3,4,5") return "Lunes a viernes";
  if (sorted.join() === "1,2,3,4,5,6") return "Lunes a sábado";
  if (sorted.length === 7) return "Todos los días";
  return sorted.map((d) => WEEKDAYS[d]?.short ?? d).join(", ");
}

/** Spots left, never negative. */
export function spotsLeft(slot: Pick<Slot, "capacity" | "booked">): number {
  return Math.max(0, slot.capacity - slot.booked);
}

const ERRORS: Record<string, string> = {
  NOT_ALLOWED: "Tu rol no permite hacer esto.",
  DAY_OUT_OF_RANGE: "Ese día está fuera del calendario.",
  SALON_NOT_IN_SEDE: "Ese salón no es de esta sede o está desactivado.",
  DISCIPLINE_NOT_AVAILABLE: "Esa disciplina está desactivada.",
  COACH_NOT_IN_SEDE: "Ese coach no trabaja en esta sede.",
  CLASS_IN_THE_PAST: "La clase tiene que ser en el futuro.",
  CLASS_CANCELLED: "Esa clase está cancelada.",
  CAPACITY_BELOW_BOOKED: "Ya hay más reservas que ese cupo. Subilo o cancelá reservas primero.",
  OTHER_SEDE: "Esa clase es de otra sede.",
  CLASS_OVER: "Esa clase ya terminó.",
  SEDE_NOT_OPEN: "Esta sede todavía no recibe reservas.",
  CLASS_STARTED: "Esa clase ya empezó.",
  TOO_FAR_AHEAD: "Todavía no se puede reservar ese día.",
  MEMBERSHIP_INACTIVE: "La membresía no está activa. Hay que ponerse al día para reservar.",
  ALREADY_BOOKED: "Ya tiene un espacio en esa clase.",
  CLASS_FULL: "La clase está llena.",
  BUILDING_FULL: "La sede está a su capacidad máxima a esa hora.",
  PAST_CUTOFF: "Ya pasó el tiempo para cancelar. Escribinos por WhatsApp.",
  ALREADY_CANCELLED: "Esa reserva ya estaba cancelada.",
  NOT_TODAY: "La asistencia se marca el mismo día de la clase.",
};

/** Spanish text for a database error from any 0028 function or table. */
export function scheduleError(error: { code?: string; message: string } | null | undefined): string {
  if (!error) return "No se pudo guardar. Intentá de nuevo.";
  const code = Object.keys(ERRORS).find((k) => error.message.includes(k));
  if (code) return ERRORS[code];
  if (error.code === "42501") return ERRORS.NOT_ALLOWED;
  if (error.code === "23505") return "Ya existe uno con ese nombre.";
  if (error.message.includes("class_templates_shape_check")) return "Revisá los días y las horas: la clase no puede pasar de la medianoche.";
  if (error.message.includes("classes_time_check")) return "Una clase dura de unos minutos a 4 horas.";
  if (error.code === "23514" || error.code === "22P02" || error.code === "22007") return "Hay un valor fuera de rango. Revisalo.";
  return "No se pudo guardar. Intentá de nuevo.";
}
