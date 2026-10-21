import type { ClientType, Profile } from "@/types/profile";

/** Rows in the Fase A portal tables (see supabase/migrations/0003). */

/**
 * 'system' rows are the shared base library every coach starts with: they
 * belong to no coach (coach_id null, identified by slug) and are read-only.
 * 'coach' rows are the coach's own, fully editable. See migration 0017.
 */
export type ExerciseSource = "system" | "coach";

export type Exercise = {
  id: string;
  coach_id: string | null;
  name: string;
  category: string | null;
  youtube_url: string | null;
  is_explainer: boolean;
  created_at: string;
  source: ExerciseSource;
  slug: string | null;
};

/** Base-library rows a coach may use but never edit or delete. */
export function isSystemExercise(exercise: Exercise): boolean {
  return exercise.source === "system";
}

export type Program = {
  id: string;
  coach_id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export type ProgramItem = {
  id: string;
  program_id: string;
  exercise_id: string;
  day_label: string;
  order_index: number;
  sets: string | null;
  reps: string | null;
  notes: string | null;
};

/** A program list row: the program plus how many items it contains. */
export type ProgramListEntry = Program & { item_count: number };

/** A builder row: the program item joined with its library exercise. */
export type ProgramItemWithExercise = ProgramItem & { exercise: Exercise };

export type Routine = {
  id: string;
  client_id: string;
  coach_id: string;
  name: string;
  assigned_at: string;
  source_program_id: string | null;
};

export type RoutineItem = {
  id: string;
  routine_id: string;
  exercise_id: string;
  day_label: string;
  order_index: number;
  sets: string | null;
  reps: string | null;
  notes: string | null;
  /** Working weight in kg for this client on this exercise. See migration 0019. */
  weight: number | null;
};

/**
 * One SET the client logged: a weight and the reps done at it. A session holds
 * several — "275 × 4, then 220 × 12" is two rows minutes apart. Keyed by
 * (client, exercise) so the record follows the movement across routines.
 */
export type ExerciseWeightLog = {
  id: string;
  client_id: string;
  exercise_id: string;
  routine_id: string | null;
  weight: number;
  /** NULL when the weight was logged without a rep count. */
  reps: number | null;
  logged_at: string;
  logged_by: string | null;
};

/** Weight history grouped by exercise id, newest entry first. */
export type WeightHistoryByExercise = Record<string, ExerciseWeightLog[]>;

/** "60 kg", "22.5 kg" — trailing zeros trimmed so 60.00 never reaches the UI. */
export function formatWeight(weight: number): string {
  return `${Number(weight)} kg`;
}

/** "275 kg × 4", or just "275 kg" when no rep count was given. */
export function formatSet(weight: number, reps: number | null): string {
  const load = formatWeight(weight);
  return reps === null ? load : `${load} × ${reps}`;
}

/**
 * A routine list row. Counts DAYS, not items: how many days a week the
 * client trains is what a coach scans for; a raw exercise total across all
 * days tells them nothing.
 */
export type RoutineListEntry = Routine & { day_count: number };

/** A builder row: the routine item joined with its library exercise. */
export type RoutineItemWithExercise = RoutineItem & { exercise: Exercise };

export type PaymentStatus = "al_dia" | "por_vencer" | "vencido";

export type ClientsMeta = {
  client_id: string;
  monthly_fee: number | null;
  join_date: string | null;
  next_payment_date: string | null;
  payment_status: PaymentStatus;
  active: boolean;
  created_at: string;
  updated_at: string;
};

/** A coach roster row: the client profile plus its financial meta (if any). */
export type RosterEntry = Profile & { clients_meta: ClientsMeta | null };

/** Spanish labels for the payment-status pill. */
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  al_dia: "Al día",
  por_vencer: "Por vencer",
  vencido: "Vencido",
};

// ---------------------------------------------------------------------------
// Visits + Measurements (Fase E)
// ---------------------------------------------------------------------------

export type ProcedureType = "medicion" | "rutina" | "fisioterapia" | "otro";

export const PROCEDURE_TYPE_LABELS: Record<ProcedureType, string> = {
  medicion: "Medición",
  rutina: "Rutina",
  fisioterapia: "Fisioterapia",
  otro: "Otro",
};

export type Visit = {
  id: string;
  client_id: string;
  coach_id: string;
  visit_date: string;
  procedure_type: ProcedureType;
  cost: number | null;
  notes: string | null;
  created_at: string;
};

export type Measurement = {
  id: string;
  client_id: string;
  visit_id: string | null;
  measured_at: string;
  weight: number | null;
  muscle_pct: number | null;
  fat_pct: number | null;
  created_at: string;
};

/** A visit row joined with its (optional) linked measurement. */
export type VisitWithMeasurement = Visit & {
  measurement: Measurement | null;
};

/** A visit row for the global coach view (adds client display name + type). */
export type VisitRowWithClient = VisitWithMeasurement & {
  client_name: string | null;
  client_type: ClientType | null;
};
