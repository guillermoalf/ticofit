import { addDays } from "@/lib/clients/body";
import { extractYouTubeId } from "@/components/portal/youtube-embed";

/** Muscle-group keys stored in exercises.muscle_groups (checked in 0027). */
export const MUSCLES = {
  pecho: "Pecho",
  espalda: "Espalda",
  hombros: "Hombros",
  biceps: "Bíceps",
  triceps: "Tríceps",
  antebrazos: "Antebrazos",
  core: "Core / abdomen",
  gluteos: "Glúteos",
  cuadriceps: "Cuádriceps",
  isquiotibiales: "Isquiotibiales",
  aductores: "Aductores",
  abductores: "Abductores",
  pantorrillas: "Pantorrillas",
  cuerpo_completo: "Cuerpo completo",
  movilidad: "Movilidad",
} as const;
export type Muscle = keyof typeof MUSCLES;

export const EQUIPMENT = {
  peso_corporal: "Peso corporal",
  mancuerna: "Mancuerna",
  barra: "Barra",
  maquina: "Máquina",
  polea: "Polea",
  smith: "Smith",
  kettlebell: "Kettlebell",
  banda: "Banda",
  banco: "Banco",
  otro: "Otro",
} as const;
export type Equipment = keyof typeof EQUIPMENT;

export const MAX_VIDEO_MB = 50;

export const LEVELS = { principiante: "Principiante", intermedio: "Intermedio", avanzado: "Avanzado" } as const;
export type Level = keyof typeof LEVELS;

/** Words people type, mapped to the muscle groups they mean. */
const SYNONYMS: Record<string, Muscle[]> = {
  pierna: ["cuadriceps", "isquiotibiales", "gluteos", "pantorrillas", "aductores", "abductores"],
  piernas: ["cuadriceps", "isquiotibiales", "gluteos", "pantorrillas", "aductores", "abductores"],
  inferior: ["cuadriceps", "isquiotibiales", "gluteos", "pantorrillas"],
  superior: ["pecho", "espalda", "hombros", "biceps", "triceps"],
  brazo: ["biceps", "triceps", "antebrazos"],
  brazos: ["biceps", "triceps", "antebrazos"],
  pectoral: ["pecho"],
  pectorales: ["pecho"],
  dorsal: ["espalda"],
  dorsales: ["espalda"],
  trapecio: ["espalda", "hombros"],
  lumbar: ["espalda", "core"],
  lumbares: ["espalda", "core"],
  deltoides: ["hombros"],
  hombro: ["hombros"],
  abdomen: ["core"],
  abdominales: ["core"],
  abs: ["core"],
  gluteo: ["gluteos"],
  nalga: ["gluteos"],
  pompis: ["gluteos"],
  femoral: ["isquiotibiales"],
  femorales: ["isquiotibiales"],
  isquios: ["isquiotibiales"],
  cuadricep: ["cuadriceps"],
  pantorrilla: ["pantorrillas"],
  gemelos: ["pantorrillas"],
  estiramiento: ["movilidad"],
  flexibilidad: ["movilidad"],
};

export type Exercise = {
  id: string;
  name: string;
  category: string;
  source: "system" | "staff" | "coach";
  youtube_url: string | null;
  video_path: string | null;
  muscle_groups: Muscle[];
  equipment: Equipment | null;
  level: Level | null;
  instructions: string | null;
  archived: boolean;
};

export const EXERCISE_COLUMNS =
  "id, name, category, source, youtube_url, video_path, muscle_groups, equipment, level, instructions, archived";

export const plain = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Accent-insensitive search over name, muscles (with synonyms) and equipment. */
export function matchesQuery(ex: Exercise, query: string): boolean {
  const words = plain(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = plain(
    [ex.name, ex.category, ...ex.muscle_groups.map((m) => `${m} ${MUSCLES[m]}`), ex.equipment ? EQUIPMENT[ex.equipment] : ""].join(" "),
  );
  return words.every((w) => hay.includes(w) || (SYNONYMS[w] ?? []).some((m) => ex.muscle_groups.includes(m)));
}

export function videoFileUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/exercise-videos/${path}`;
}

/** Where the movement can be watched: the uploaded file wins over YouTube. */
export function exerciseVideo(ex: Pick<Exercise, "youtube_url" | "video_path">):
  | { kind: "file"; url: string }
  | { kind: "youtube"; url: string; id: string }
  | null {
  if (ex.video_path) return { kind: "file", url: videoFileUrl(ex.video_path) };
  const id = ex.youtube_url ? extractYouTubeId(ex.youtube_url) : null;
  return id ? { kind: "youtube", url: `https://youtu.be/${id}`, id } : null;
}

export function describeExercise(ex: Pick<Exercise, "muscle_groups" | "equipment" | "level">): string {
  return [ex.muscle_groups.map((m) => MUSCLES[m]).join(", "), ex.equipment && EQUIPMENT[ex.equipment], ex.level && LEVELS[ex.level]]
    .filter(Boolean)
    .join(" · ");
}

// Routines ----------------------------------------------------------------------------------

export type RoutineItem = {
  id?: string;
  exercise_id: string;
  sets: number | null;
  reps: string | null;
  rest_seconds: number | null;
  load: string | null;
  notes: string | null;
  superset: number | null;
};
export type RoutineDay = { id?: string; title: string; items: RoutineItem[] };
export type Routine = {
  id: string;
  client_id: string | null;
  sede_id: string;
  name: string;
  notes: string | null;
  valid_from: string | null;
  valid_weeks: number | null;
  assigned_at: string | null;
  assigned_by_staff: string | null;
  updated_at: string;
  days: RoutineDay[];
};

export const ROUTINE_SELECT =
  "id, client_id, sede_id, name, notes, valid_from, valid_weeks, assigned_at, assigned_by_staff, updated_at, " +
  "days:client_routine_days(id, position, title, items:client_routine_items(id, position, exercise_id, sets, reps, rest_seconds, load, notes, superset))";

type RawRoutine = Omit<Routine, "days"> & {
  days: (RoutineDay & { position: number; items: (RoutineItem & { position: number })[] })[];
};

/** Orders days and items by position (PostgREST embeds come back unordered). */
export function normalizeRoutine(raw: RawRoutine): Routine {
  return {
    ...raw,
    days: [...raw.days]
      .sort((a, b) => a.position - b.position)
      .map((d) => ({ id: d.id, title: d.title, items: [...d.items].sort((a, b) => a.position - b.position) })),
  };
}

/** Last day the routine is meant for, and whether it is time to renew it. */
export function routineValidity(r: Pick<Routine, "valid_from" | "valid_weeks">, today: string) {
  if (!r.valid_from || !r.valid_weeks) return null;
  const ends = addDays(r.valid_from, r.valid_weeks * 7 - 1);
  const daysLeft = Math.round((Date.parse(ends) - Date.parse(today)) / 86_400_000);
  return { ends, daysLeft, state: daysLeft < 0 ? "expired" : daysLeft <= 7 ? "soon" : "ok" } as const;
}

export function formatRest(seconds: number | null): string | null {
  if (seconds === null) return null;
  if (seconds < 60) return `${seconds} s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m} min ${s} s` : `${m} min`;
}

/** "3 × 10-12 · 60 kg · descanso 1 min" */
export function prescription(i: RoutineItem): string {
  const sr = i.sets && i.reps ? `${i.sets} × ${i.reps}` : i.sets ? `${i.sets} series` : i.reps ? `${i.reps} reps` : null;
  const rest = formatRest(i.rest_seconds);
  return [sr, i.load, rest && `descanso ${rest}`].filter(Boolean).join(" · ");
}
