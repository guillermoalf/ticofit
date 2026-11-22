import type { ClientGoal, Gender } from "@/types/profile";

/** Rows of migration 0024. */
export type Client = {
  id: string;
  user_id: string | null;
  sede_id: string;
  full_name: string;
  email: string | null;
  national_id: string | null;
  address: string | null;
  gender: Gender | null;
  birth_date: string | null;
  phone: string | null;
  blood_type: string | null;
  occupation: string | null;
  sports_experience: string | null;
  emergency_contact_name: string | null;
  emergency_contact_relationship: string | null;
  emergency_contact_phone: string | null;
  weekly_frequency_days: number | null;
  session_duration_min: number | null;
  join_date: string;
  invited_at: string | null;
};

export type ClinicalVersion = {
  id: string;
  client_id: string;
  goals: ClientGoal[];
  pathological_history: string | null;
  medications: string | null;
  sports_injuries: string | null;
  excluded_exercises: string | null;
  created_at: string;
  created_by_staff: string | null;
};

export type Measurement = {
  id: string;
  client_id: string;
  measured_on: string;
  measured_by_name: string | null;
  height_cm: number;
  weight_kg: number;
  muscle_kg: number | null;
  fat_kg: number | null;
  body_water_pct: number | null;
  target_weight_kg: number | null;
  target_fat_pct: number | null;
  target_muscle_pct: number | null;
  chest_cm: number | null;
  arm_right_cm: number | null;
  arm_left_cm: number | null;
  waist_cm: number | null;
  umbilical_cm: number | null;
  hip_cm: number | null;
  thigh_right_cm: number | null;
  thigh_left_cm: number | null;
  calf_right_cm: number | null;
  calf_left_cm: number | null;
  observations: string | null;
  metabolic_age: number | null;
  health_score: number | null;
  override_reason: string | null;
};
