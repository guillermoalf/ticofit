export type Role = "admin" | "coach" | "client";
export type ClientStatus = "active" | "paused";
export type TrainingType = "in_person" | "remote" | "hybrid";
export type Gender = "female" | "male" | "other" | "unspecified";
export type BloodType = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
/** The four intake objectives from the coach's paper form (see 0016). */
export type ClientGoal = "muscle_gain" | "fat_loss" | "fitness" | "health";

export type ClientType =
  | "personal_training"
  | "fisioterapia"
  | "rutinas"
  | "otro";

/** A row in public.profiles (see supabase/migrations). */
export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: Role;
  phone: string | null;
  status: ClientStatus;
  training_type: TrainingType | null;
  equipment_notes: string | null;
  /** Free-text objective, alongside the `goals` checklist. */
  goal: string | null;
  coach_id: string | null;
  client_type: ClientType;

  // ---- Intake record (0011 + 0016). All optional: a coach can save a
  // client with just a name and fill the rest in over time.
  birth_date: string | null;
  gender: Gender | null;
  height_cm: number | null;
  national_id: string | null;
  address: string | null;
  occupation: string | null;
  blood_type: BloodType | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  sports_experience: string | null;
  weekly_frequency_days: number | null;
  session_duration_min: number | null;
  goals: ClientGoal[] | null;
  /** Antecedentes patológicos — pre-existing conditions. */
  medical_notes: string | null;
  medications: string | null;
  sports_injuries: string | null;
  excluded_exercises: string | null;

  /** false = walk-in without a portal login (no auth.users row). */
  has_account: boolean;
  /** 0010's access switch. false = suspended; every is_coach() policy goes cold. */
  authorized: boolean;
  /** true once the user has skipped or completed the "crear contraseña" step. */
  password_prompt_dismissed: boolean;
  created_at: string;
};

/** Where each role lands after signing in. */
export const ROLE_HOME: Record<Role, string> = {
  admin: "/portal/admin",
  coach: "/portal/clientes",
  client: "/portal/inicio",
};

/** Spanish labels for the client classification (drives financial filters). */
export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  personal_training: "Personal training",
  fisioterapia: "Fisioterapia",
  rutinas: "Rutinas",
  otro: "Otro",
};

export const GENDER_LABELS: Record<Gender, string> = {
  female: "Femenino",
  male: "Masculino",
  other: "Otro",
  unspecified: "Prefiere no decir",
};

export const BLOOD_TYPES: BloodType[] = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
];

/** Spanish labels for the intake objectives checklist. */
export const CLIENT_GOAL_LABELS: Record<ClientGoal, string> = {
  muscle_gain: "Aumento de masa muscular",
  fat_loss: "Reducción de porcentaje graso",
  fitness: "Mejorar condición física",
  health: "Mantenerse saludable y activo",
};

/** Spanish labels for the training-type badge. */
export const TRAINING_TYPE_LABELS: Record<TrainingType, string> = {
  in_person: "Presencial",
  remote: "Remoto",
  hybrid: "Híbrido",
};

/** Spanish labels for the status badge. */
export const STATUS_LABELS: Record<ClientStatus, string> = {
  active: "Activo",
  paused: "Pausado",
};
