/** Time clock and payroll (migration 0029): shared types, formatting and error text. */

export type TimeEntry = {
  id: string;
  staff_id: string;
  sede_id: string;
  clock_in: string;
  clock_out: string | null;
  source: "pin" | "manual";
  note: string | null;
  updated_by_staff: string | null;
};

/** Hours between two moments, or since `from` while still open. */
export function hoursBetween(from: string, to: string | null, now = Date.now()): number {
  const end = to ? Date.parse(to) : now;
  return Math.max(0, (end - Date.parse(from)) / 3_600_000);
}

/** 7.5 → "7 h 30 min". */
export function hoursLabel(hours: number): string {
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** ₡600.000 (no decimals unless there are céntimos). */
export function colones(n: number | string | null | undefined): string {
  const v = Number(n ?? 0);
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    minimumFractionDigits: Number.isInteger(v) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(v);
}

const ERRORS: Record<string, string> = {
  NOT_ALLOWED: "Tu rol no permite hacer esto.",
  STAFF_NOT_HERE: "Esa persona no trabaja en esa sede.",
  TIME_IN_FUTURE: "La hora no puede ser en el futuro.",
  RUN_EXISTS: "Ya hay una planilla para ese periodo.",
  RUN_NOT_DRAFT: "Esa planilla ya está aprobada: volvela a borrador para cambiarla.",
  RUN_EMPTY: "La planilla no tiene a nadie. Revisá los datos de planilla de cada persona.",
  BAD_TRANSITION: "Ese cambio de estado no se puede hacer.",
  UNKNOWN_RATE: "Esa tarifa no existe.",
  PERIOD_REQUIRED: "Elegí el inicio del periodo.",
};

/** Spanish text for a database error from any 0029 function or table. */
export function clockError(error: { code?: string; message: string } | null | undefined): string {
  if (!error) return "No se pudo guardar. Intentá de nuevo.";
  const code = Object.keys(ERRORS).find((k) => error.message.includes(k));
  if (code) return ERRORS[code];
  if (error.message.includes("staff_time_entries_open_idx")) return "Esa persona ya tiene una entrada sin salida.";
  if (error.message.includes("length_check")) return "Un turno no puede pasar de 16 horas.";
  if (error.message.includes("order_check")) return "La salida tiene que ser después de la entrada.";
  if (error.message.includes("iban_check")) return "El IBAN es CR seguido de 20 números.";
  if (error.message.includes("shape_check") || error.message.includes("brackets_check"))
    return "Revisá el valor: hay algo fuera de rango.";
  if (error.code === "42501") return ERRORS.NOT_ALLOWED;
  if (error.code === "23514" || error.code === "22P02" || error.code === "22007" || error.code === "22008")
    return "Hay un valor fuera de rango. Revisalo.";
  return "No se pudo guardar. Intentá de nuevo.";
}
