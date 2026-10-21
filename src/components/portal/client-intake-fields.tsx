"use client";

import {
  CheckboxField,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/portal/form-fields";
import {
  BLOOD_TYPES,
  CLIENT_GOAL_LABELS,
  CLIENT_TYPE_LABELS,
  GENDER_LABELS,
  TRAINING_TYPE_LABELS,
  type ClientGoal,
  type ClientType,
  type Gender,
  type TrainingType,
} from "@/types/profile";

/**
 * The coach's intake sheet, shared by "Agregar cliente" and the client
 * record so the two can never drift. Values are strings throughout — the
 * server action parses and validates; the form only collects.
 *
 * Only the name is required. A coach registering someone mid-class saves a
 * name and fills the rest in later.
 */

export type ClientIntakeForm = {
  full_name: string;
  email: string;
  phone: string;
  national_id: string;
  birth_date: string;
  gender: Gender | "";
  address: string;
  occupation: string;
  blood_type: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  client_type: ClientType;
  training_type: TrainingType;
  sports_experience: string;
  weekly_frequency_days: string;
  session_duration_min: string;
  height_cm: string;
  goals: ClientGoal[];
  goal: string;
  medical_notes: string;
  medications: string;
  sports_injuries: string;
  excluded_exercises: string;
  equipment_notes: string;
};

export const EMPTY_INTAKE: ClientIntakeForm = {
  full_name: "",
  email: "",
  phone: "",
  national_id: "",
  birth_date: "",
  gender: "",
  address: "",
  occupation: "",
  blood_type: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  client_type: "personal_training",
  training_type: "in_person",
  sports_experience: "",
  weekly_frequency_days: "",
  session_duration_min: "",
  height_cm: "",
  goals: [],
  goal: "",
  medical_notes: "",
  medications: "",
  sports_injuries: "",
  excluded_exercises: "",
  equipment_notes: "",
};

const GENDER_OPTIONS = [
  { value: "", label: "Sin especificar" },
  ...(Object.entries(GENDER_LABELS) as [Gender, string][]).map(
    ([value, label]) => ({ value, label }),
  ),
];

const BLOOD_OPTIONS = [
  { value: "", label: "Sin especificar" },
  ...BLOOD_TYPES.map((t) => ({ value: t, label: t })),
];

const CLIENT_TYPE_OPTIONS = (
  Object.entries(CLIENT_TYPE_LABELS) as [ClientType, string][]
).map(([value, label]) => ({ value, label }));

const TRAINING_OPTIONS = (
  Object.entries(TRAINING_TYPE_LABELS) as [TrainingType, string][]
).map(([value, label]) => ({ value, label }));

const GOAL_OPTIONS = (
  Object.entries(CLIENT_GOAL_LABELS) as [ClientGoal, string][]
).map(([value, label]) => ({ value, label }));

function Fieldset({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-1 text-xs font-medium uppercase tracking-[0.08em] text-muted-2">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

export function ClientIntakeFields({
  form,
  onChange,
  disabled,
  emailRequired,
  emailHint,
}: {
  form: ClientIntakeForm;
  /**
   * Takes a patch rather than a (key, value) setter so hosts can carry extra
   * fields of their own — a generic setter over a wider form type is not
   * assignable to one over this narrower shape.
   */
  onChange: (patch: Partial<ClientIntakeForm>) => void;
  disabled?: boolean;
  emailRequired?: boolean;
  emailHint?: string;
}) {
  function toggleGoal(goal: ClientGoal, on: boolean) {
    onChange({
      goals: on ? [...form.goals, goal] : form.goals.filter((g) => g !== goal),
    });
  }

  return (
    <>
      <Fieldset title="Datos personales">
        <TextField
          label="Nombre completo"
          value={form.full_name}
          onChange={(v) => onChange({ full_name: v })}
          required
          disabled={disabled}
        />
        <TextField
          label="Correo electrónico"
          type="email"
          inputMode="email"
          value={form.email}
          onChange={(v) => onChange({ email: v })}
          required={emailRequired}
          disabled={disabled}
          placeholder={emailHint ?? "Opcional — solo contacto"}
        />
        <TextField
          label="Teléfono"
          type="tel"
          inputMode="tel"
          value={form.phone}
          onChange={(v) => onChange({ phone: v })}
          disabled={disabled}
        />
        <TextField
          label="Cédula"
          value={form.national_id}
          onChange={(v) => onChange({ national_id: v })}
          disabled={disabled}
        />
        <TextField
          label="Fecha de nacimiento"
          type="date"
          value={form.birth_date}
          onChange={(v) => onChange({ birth_date: v })}
          disabled={disabled}
        />
        <SelectField
          label="Género"
          value={form.gender}
          onChange={(v) => onChange({ gender: v as Gender | "" })}
          options={GENDER_OPTIONS}
          disabled={disabled}
        />
        <TextField
          label="Domicilio"
          value={form.address}
          onChange={(v) => onChange({ address: v })}
          disabled={disabled}
        />
        <TextField
          label="Ocupación"
          value={form.occupation}
          onChange={(v) => onChange({ occupation: v })}
          disabled={disabled}
        />
        <SelectField
          label="Tipo de sangre"
          value={form.blood_type}
          onChange={(v) => onChange({ blood_type: v })}
          options={BLOOD_OPTIONS}
          disabled={disabled}
        />
      </Fieldset>

      <Fieldset title="Contacto de emergencia">
        <TextField
          label="Nombre y parentesco"
          value={form.emergency_contact_name}
          onChange={(v) => onChange({ emergency_contact_name: v })}
          disabled={disabled}
          placeholder="Ej. Gabriela Moltalto — mamá"
        />
        <TextField
          label="Teléfono de emergencia"
          type="tel"
          inputMode="tel"
          value={form.emergency_contact_phone}
          onChange={(v) => onChange({ emergency_contact_phone: v })}
          disabled={disabled}
        />
      </Fieldset>

      <Fieldset title="Entrenamiento">
        <SelectField
          label="Tipo de cliente"
          value={form.client_type}
          onChange={(v) => onChange({ client_type: v })}
          options={CLIENT_TYPE_OPTIONS}
          required
          disabled={disabled}
        />
        <SelectField
          label="Tipo de entrenamiento"
          value={form.training_type}
          onChange={(v) => onChange({ training_type: v })}
          options={TRAINING_OPTIONS}
          required
          disabled={disabled}
        />
        <TextAreaField
          label="Experiencia deportiva"
          value={form.sports_experience}
          onChange={(v) => onChange({ sports_experience: v })}
          rows={2}
          disabled={disabled}
          placeholder="Ej. Correr, surfear"
        />
        <TextField
          label="Frecuencia semanal (días)"
          type="number"
          inputMode="numeric"
          value={form.weekly_frequency_days}
          onChange={(v) => onChange({ weekly_frequency_days: v })}
          disabled={disabled}
          placeholder="Ej. 3"
        />
        <TextField
          label="Disponibilidad por sesión (minutos)"
          type="number"
          inputMode="numeric"
          value={form.session_duration_min}
          onChange={(v) => onChange({ session_duration_min: v })}
          disabled={disabled}
          placeholder="Ej. 90"
        />
        <TextField
          label="Estatura (cm)"
          type="number"
          inputMode="decimal"
          value={form.height_cm}
          onChange={(v) => onChange({ height_cm: v })}
          disabled={disabled}
          placeholder="Ej. 178"
        />
      </Fieldset>

      <Fieldset title="Objetivos">
        <div className="flex flex-col gap-2">
          {GOAL_OPTIONS.map((o) => (
            <CheckboxField
              key={o.value}
              label={o.label}
              checked={form.goals.includes(o.value)}
              onChange={(on) => toggleGoal(o.value, on)}
              disabled={disabled}
            />
          ))}
        </div>
        <TextAreaField
          label="Objetivo en sus palabras"
          value={form.goal}
          onChange={(v) => onChange({ goal: v })}
          rows={2}
          disabled={disabled}
          placeholder="Opcional — ¿qué quiere lograr?"
        />
      </Fieldset>

      <Fieldset title="Historia clínica">
        <TextAreaField
          label="Antecedentes patológicos"
          value={form.medical_notes}
          onChange={(v) => onChange({ medical_notes: v })}
          rows={2}
          disabled={disabled}
          placeholder="Ej. Diabético"
        />
        <TextAreaField
          label="Medicamentos"
          value={form.medications}
          onChange={(v) => onChange({ medications: v })}
          rows={2}
          disabled={disabled}
          placeholder="Ej. Pastillas e insulina"
        />
        <TextAreaField
          label="Lesiones deportivas"
          value={form.sports_injuries}
          onChange={(v) => onChange({ sports_injuries: v })}
          rows={2}
          disabled={disabled}
          placeholder="Ej. Cruzado anterior derecho roto"
        />
        <TextAreaField
          label="Ejercicios no deseados"
          value={form.excluded_exercises}
          onChange={(v) => onChange({ excluded_exercises: v })}
          rows={2}
          disabled={disabled}
        />
        <TextAreaField
          label="Notas de equipo"
          value={form.equipment_notes}
          onChange={(v) => onChange({ equipment_notes: v })}
          rows={2}
          disabled={disabled}
          placeholder="Opcional — equipo disponible, espacio, etc."
        />
      </Fieldset>
    </>
  );
}
