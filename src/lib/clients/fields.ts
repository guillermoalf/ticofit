import { BLOOD_TYPES, CLIENT_GOAL_LABELS, GENDER_LABELS } from "@/types/profile";

/**
 * The paper sheet, field by field (SISTEMA-INTERNO.md "Sheet fields", §0b.7).
 * Forms, server validation and read views are all built from these lists: add
 * or rename a field here and in a migration, nowhere else. Ranges mirror the
 * CHECK constraints in migration 0024.
 */
export type Field = {
  name: string;
  label: string;
  type: "text" | "email" | "tel" | "date" | "number" | "select" | "textarea" | "checks";
  required?: boolean;
  min?: number;
  max?: number;
  /** Whole numbers only. */
  integer?: boolean;
  unit?: string;
  maxLength?: number;
  options?: { value: string; label: string }[];
};

export type FieldGroup = { title: string; fields: Field[] };

const options = (labels: Record<string, string>) =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));

export const PROFILE_GROUPS: FieldGroup[] = [
  {
    title: "Datos personales",
    fields: [
      { name: "full_name", label: "Nombre completo", type: "text", required: true, maxLength: 120 },
      { name: "national_id", label: "Cédula", type: "text", maxLength: 30 },
      { name: "birth_date", label: "Fecha de nacimiento", type: "date" },
      { name: "gender", label: "Género", type: "select", options: options(GENDER_LABELS) },
      { name: "phone", label: "Teléfono", type: "tel", maxLength: 30 },
      { name: "email", label: "Correo", type: "email", maxLength: 200 },
      { name: "address", label: "Domicilio", type: "text", maxLength: 300 },
      {
        name: "blood_type",
        label: "Tipo de sangre",
        type: "select",
        options: BLOOD_TYPES.map((b) => ({ value: b, label: b })),
      },
      { name: "occupation", label: "Ocupación", type: "text", maxLength: 120 },
    ],
  },
  {
    title: "Contacto de emergencia",
    fields: [
      { name: "emergency_contact_name", label: "Nombre del contacto", type: "text", maxLength: 120 },
      { name: "emergency_contact_relationship", label: "Parentesco", type: "text", maxLength: 60 },
      { name: "emergency_contact_phone", label: "Teléfono del contacto", type: "tel", maxLength: 30 },
    ],
  },
  {
    title: "Entrenamiento",
    fields: [
      { name: "sports_experience", label: "Experiencia deportiva", type: "text", maxLength: 500 },
      { name: "weekly_frequency_days", label: "Frecuencia semanal", type: "number", integer: true, min: 0, max: 14, unit: "días" },
      { name: "session_duration_min", label: "Tiempo de disponibilidad", type: "number", integer: true, min: 5, max: 600, unit: "min" },
    ],
  },
];

export const CLINICAL_GROUPS: FieldGroup[] = [
  {
    title: "Objetivos",
    fields: [{ name: "goals", label: "Objetivos", type: "checks", options: options(CLIENT_GOAL_LABELS) }],
  },
  {
    title: "Historia clínica",
    fields: [
      { name: "pathological_history", label: "Antecedentes patológicos", type: "textarea", maxLength: 2000 },
      { name: "medications", label: "Medicamentos", type: "textarea", maxLength: 2000 },
      { name: "sports_injuries", label: "Lesiones deportivas", type: "textarea", maxLength: 2000 },
      { name: "excluded_exercises", label: "Ejercicios no deseados", type: "textarea", maxLength: 2000 },
    ],
  },
];

const cm = (name: string, label: string, min = 5): Field => ({ name, label, type: "number", min, max: 300, unit: "cm" });

export const TAPE_FIELDS: Field[] = [
  cm("chest_cm", "Pectoral", 10),
  cm("arm_right_cm", "Brazo derecho"),
  cm("arm_left_cm", "Brazo izquierdo"),
  cm("waist_cm", "Cintura", 10),
  cm("umbilical_cm", "Umbilical", 10),
  cm("hip_cm", "Cadera", 10),
  cm("thigh_right_cm", "Muslo derecho"),
  cm("thigh_left_cm", "Muslo izquierdo"),
  cm("calf_right_cm", "Pantorrilla derecha"),
  cm("calf_left_cm", "Pantorrilla izquierda"),
];

export const MEASUREMENT_GROUPS: FieldGroup[] = [
  {
    title: "Datos de evaluación",
    fields: [
      { name: "height_cm", label: "Estatura", type: "number", required: true, min: 50, max: 260, unit: "cm" },
      { name: "weight_kg", label: "Peso", type: "number", required: true, min: 10, max: 500, unit: "kg" },
      { name: "muscle_kg", label: "Músculo", type: "number", min: 0, max: 500, unit: "kg" },
      { name: "fat_kg", label: "Grasa", type: "number", min: 0, max: 500, unit: "kg" },
      { name: "body_water_pct", label: "Agua", type: "number", min: 0, max: 100, unit: "%" },
    ],
  },
  {
    title: "Objetivo",
    fields: [
      { name: "target_weight_kg", label: "Peso objetivo", type: "number", min: 10, max: 500, unit: "kg" },
      { name: "target_fat_pct", label: "Porcentaje de grasa", type: "number", min: 0, max: 100, unit: "%" },
      { name: "target_muscle_pct", label: "Porcentaje de músculo", type: "number", min: 0, max: 100, unit: "%" },
    ],
  },
  { title: "Perímetros", fields: TAPE_FIELDS },
  {
    title: "Resultado",
    fields: [
      { name: "metabolic_age", label: "Edad metabólica", type: "number", integer: true, min: 1, max: 130, unit: "años" },
      { name: "health_score", label: "Puntuación de salud", type: "number", integer: true, min: 0, max: 100 },
      { name: "observations", label: "Observaciones", type: "textarea", maxLength: 2000 },
    ],
  },
];

export const columnsOf = (groups: FieldGroup[]) => groups.flatMap((g) => g.fields.map((f) => f.name)).join(", ");
