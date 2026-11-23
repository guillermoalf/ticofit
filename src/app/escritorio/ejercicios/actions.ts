"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { extractYouTubeId } from "@/components/portal/youtube-embed";
import { EQUIPMENT, LEVELS, MAX_VIDEO_MB, MUSCLES, type RoutineDay } from "@/lib/routines/library";
import { staffForAction } from "@/lib/staff/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Result<T = object> = ({ ok: true; message?: string } & T) | { ok: false; error: string };

const UUID_RE = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const VIDEO_TYPES: Record<string, string> = { "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm" };

function dbError(error: { code?: string; message: string }): string {
  const m = error.message;
  if (m.includes("DAYS_OUT_OF_RANGE")) return "Una rutina lleva de 2 a 6 días.";
  if (m.includes("EXERCISE_NOT_AVAILABLE")) return "Uno de los ejercicios ya no está en la biblioteca. Cambialo por otro.";
  if (m.includes("NOT_ALLOWED") || error.code === "42501") return "Tu rol no permite hacer esto.";
  if (m.includes("valid_weeks")) return "La vigencia va de 4 a 6 semanas.";
  if (m.includes("client_routines_name_check")) return "Poné un nombre de 2 a 80 letras.";
  if (error.code === "23514" || error.code === "22P02") return "Hay un valor fuera de rango. Revisá series, descanso y supersets.";
  return "No se pudo guardar. Intentá de nuevo.";
}

export type ExerciseInput = {
  name: string;
  muscle_groups: string[];
  equipment: string;
  level: string;
  instructions: string;
  youtube_url: string;
  video_path: string | null;
};

/** Adds or edits an exercise of the gym's own library (source = 'staff'). */
export async function saveExerciseAction(id: string | null, input: ExerciseInput): Promise<Result<{ id: string }>> {
  const auth = await staffForAction("exercises.write");
  if (!auth.staff) return { ok: false, error: auth.error };

  const name = input.name.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 80) return { ok: false, error: "Poné un nombre de 2 a 80 letras." };
  const muscles = [...new Set(input.muscle_groups)].filter((m) => m in MUSCLES);
  if (!muscles.length) return { ok: false, error: "Marcá al menos un grupo muscular." };
  const youtube = input.youtube_url.trim();
  if (youtube && !extractYouTubeId(youtube)) return { ok: false, error: "Ese enlace no es de un video de YouTube." };
  if (input.video_path && !/^[0-9a-f-]{36}\.(mp4|mov|webm)$/.test(input.video_path)) {
    return { ok: false, error: "No se pudo usar ese video. Subilo de nuevo." };
  }

  const row = {
    name,
    category: MUSCLES[muscles[0] as keyof typeof MUSCLES],
    source: "staff",
    muscle_groups: muscles,
    equipment: input.equipment in EQUIPMENT ? input.equipment : null,
    level: input.level in LEVELS ? input.level : null,
    instructions: input.instructions.trim().slice(0, 3000) || null,
    youtube_url: youtube || null,
    video_path: input.video_path,
  };

  const supabase = await createClient();
  const query = id
    ? supabase.from("exercises").update(row).eq("id", id).eq("source", "staff").select("id").single()
    : supabase.from("exercises").insert(row).select("id").single();
  const { data, error } = await query;
  if (error || !data) return { ok: false, error: error ? dbError(error) : "Ese ejercicio no se puede editar." };
  revalidatePath("/escritorio/ejercicios");
  return { ok: true, id: data.id as string, message: id ? "Ejercicio guardado." : "Ejercicio agregado a la biblioteca." };
}

export async function archiveExerciseAction(id: string, archived: boolean): Promise<Result> {
  const auth = await staffForAction("exercises.write");
  if (!auth.staff) return { ok: false, error: auth.error };
  const supabase = await createClient();
  const { data, error } = await supabase.from("exercises").update({ archived }).eq("id", id).eq("source", "staff").select("id");
  if (error || !data?.length) return { ok: false, error: "No se pudo cambiar. Solo se archivan ejercicios del gimnasio." };
  revalidatePath("/escritorio/ejercicios");
  return { ok: true, message: archived ? "Ejercicio archivado: ya no aparece al armar rutinas." : "Ejercicio de vuelta en la biblioteca." };
}

/**
 * A one-time upload URL for an exercise video. The bucket has no storage
 * policies, so the only way in is a URL signed here after the permission check.
 */
export async function videoUploadUrlAction(type: string, size: number): Promise<Result<{ path: string; token: string }>> {
  const auth = await staffForAction("exercises.write");
  if (!auth.staff) return { ok: false, error: auth.error };
  const ext = VIDEO_TYPES[type];
  if (!ext) return { ok: false, error: "Subí el video en MP4, MOV o WebM." };
  if (size > MAX_VIDEO_MB * 1024 * 1024) return { ok: false, error: `El video pesa más de ${MAX_VIDEO_MB} MB. Recortalo o subilo a YouTube.` };
  const path = `${randomUUID()}.${ext}`;
  const { data, error } = await createAdminClient().storage.from("exercise-videos").createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: "No se pudo preparar la subida. Intentá de nuevo." };
  return { ok: true, path, token: data.token };
}

export async function toggleFavoriteAction(exerciseId: string, on: boolean): Promise<Result> {
  const auth = await staffForAction();
  if (!auth.staff) return { ok: false, error: auth.error };
  if (!UUID_RE.test(exerciseId)) return { ok: false, error: "Ejercicio inválido." };
  const supabase = await createClient();
  const { error } = on
    ? await supabase.from("staff_exercise_favorites").upsert({ staff_id: auth.staff.id, exercise_id: exerciseId }, { ignoreDuplicates: true })
    : await supabase.from("staff_exercise_favorites").delete().eq("staff_id", auth.staff.id).eq("exercise_id", exerciseId);
  if (error) return { ok: false, error: "No se pudo guardar el favorito." };
  return { ok: true };
}

export type RoutineInput = {
  client_id?: string | null;
  sede_id?: string | null;
  name: string;
  notes: string;
  valid_from?: string | null;
  valid_weeks?: number | null;
  days: RoutineDay[];
};

/** Saves a routine whole through routine_save(), which checks everything again. */
export async function saveRoutineAction(id: string | null, input: RoutineInput): Promise<Result<{ id: string }>> {
  const auth = await staffForAction("routines.write");
  if (!auth.staff) return { ok: false, error: auth.error };
  if (input.name.trim().length < 2) return { ok: false, error: "Poné un nombre a la rutina." };
  if (input.days.some((d) => !d.items.length)) return { ok: false, error: "Cada día necesita al menos un ejercicio." };

  const payload = {
    client_id: input.client_id ?? null,
    sede_id: input.sede_id ?? null,
    name: input.name.trim(),
    notes: input.notes,
    valid_from: input.valid_from || null,
    valid_weeks: input.valid_weeks ?? null,
    days: input.days.map((d) => ({
      title: d.title,
      items: d.items.map((i) => ({
        exercise_id: i.exercise_id,
        sets: i.sets,
        reps: i.reps,
        rest_seconds: i.rest_seconds,
        load: i.load,
        notes: i.notes,
        superset: i.superset,
      })),
    })),
  };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("routine_save", { p_id: id, p_routine: payload });
  if (error || !data) return { ok: false, error: error ? dbError(error) : "No se pudo guardar." };
  revalidatePath("/escritorio/ejercicios");
  if (input.client_id) revalidatePath(`/escritorio/clientes/${input.client_id}`);
  return { ok: true, id: data as string, message: input.client_id && !id ? "Rutina asignada." : "Rutina guardada." };
}

export async function deleteTemplateAction(id: string): Promise<Result> {
  const auth = await staffForAction("routines.write");
  if (!auth.staff) return { ok: false, error: auth.error };
  const supabase = await createClient();
  const { error } = await supabase.rpc("routine_template_delete", { p_id: id });
  if (error) return { ok: false, error: dbError(error) };
  revalidatePath("/escritorio/ejercicios");
  return { ok: true, message: "Plantilla borrada." };
}
