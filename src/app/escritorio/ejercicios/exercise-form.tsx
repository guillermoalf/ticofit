"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ExerciseVideo } from "@/components/routines/exercise-video";
import { EQUIPMENT, LEVELS, MAX_VIDEO_MB, MUSCLES, type Exercise } from "@/lib/routines/library";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { saveExerciseAction, videoUploadUrlAction } from "./actions";

const input =
  "w-full rounded-xl border border-border-strong bg-surface px-3 py-2.5 text-[16px] text-ink outline-none focus:border-primary";

export function ExerciseForm({ exercise }: { exercise?: Exercise }) {
  const router = useRouter();
  const [name, setName] = useState(exercise?.name ?? "");
  const [muscles, setMuscles] = useState<string[]>(exercise?.muscle_groups ?? []);
  const [equipment, setEquipment] = useState<string>(exercise?.equipment ?? "");
  const [level, setLevel] = useState<string>(exercise?.level ?? "");
  const [instructions, setInstructions] = useState(exercise?.instructions ?? "");
  const [youtube, setYoutube] = useState(exercise?.youtube_url ?? "");
  const [videoPath, setVideoPath] = useState<string | null>(exercise?.video_path ?? null);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const signed = await videoUploadUrlAction(file.type, file.size);
      if (!signed.ok) return void toast.error(signed.error);
      const { error } = await createClient().storage.from("exercise-videos").uploadToSignedUrl(signed.path, signed.token, file, {
        contentType: file.type,
      });
      if (error) return void toast.error("No se pudo subir el video. Intentá de nuevo.");
      setVideoPath(signed.path);
      toast.success("Video subido. Falta guardar el ejercicio.");
    } finally {
      setUploading(false);
    }
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await saveExerciseAction(exercise?.id ?? null, {
        name,
        muscle_groups: muscles,
        equipment,
        level,
        instructions,
        youtube_url: youtube,
        video_path: videoPath,
      });
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.message);
      router.push("/escritorio/ejercicios");
      router.refresh();
    });
  };

  return (
    <form onSubmit={save} method="post" className="max-w-3xl space-y-6">
      <label className="block">
        <span className="mb-1.5 block font-semibold">Nombre</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required className={input} />
      </label>

      <fieldset>
        <legend className="mb-2 font-semibold">Grupos musculares</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(MUSCLES).map(([k, v]) => {
            const on = muscles.includes(k);
            return (
              <label
                key={k}
                className={cn(
                  "inline-flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-[15px]",
                  on ? "border-verde-profundo bg-verde-profundo text-crema-claro" : "border-border-strong bg-surface",
                )}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={on}
                  onChange={(e) => setMuscles((m) => (e.target.checked ? [...m, k] : m.filter((x) => x !== k)))}
                />
                {v}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block font-semibold">Equipo</span>
          <select value={equipment} onChange={(e) => setEquipment(e.target.value)} className={input}>
            <option value="">Sin especificar</option>
            {Object.entries(EQUIPMENT).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block font-semibold">Nivel</span>
          <select value={level} onChange={(e) => setLevel(e.target.value)} className={input}>
            <option value="">Sin especificar</option>
            {Object.entries(LEVELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block font-semibold">Instrucciones</span>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          maxLength={3000}
          rows={5}
          placeholder="Postura, cómo se hace, errores comunes…"
          className={input}
        />
      </label>

      <fieldset className="space-y-3">
        <legend className="mb-1 font-semibold">Video</legend>
        <label className="block">
          <span className="mb-1.5 block text-[15px]">Enlace de YouTube</span>
          <input
            value={youtube}
            onChange={(e) => setYoutube(e.target.value)}
            inputMode="url"
            placeholder="https://youtu.be/…"
            className={input}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[15px]">
            O subí el video desde la compu o el celular (MP4, MOV o WebM, hasta {MAX_VIDEO_MB} MB)
          </span>
          <input
            type="file"
            accept="video/mp4,video/quicktime,video/webm"
            disabled={uploading || !ready}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
            }}
            className="block w-full text-[15px] file:mr-3 file:cursor-pointer file:rounded-full file:border file:border-border-strong file:bg-surface file:px-4 file:py-2 file:text-ink"
          />
        </label>
        {uploading && <p className="text-sm text-muted">Subiendo video…</p>}
        {videoPath && (
          <p className="text-sm">
            Se va a mostrar el video subido.{" "}
            <button type="button" onClick={() => setVideoPath(null)} className="cursor-pointer underline underline-offset-2">
              Quitarlo
            </button>
          </p>
        )}
        {(videoPath || youtube) && (
          <div className="max-w-md">
            <ExerciseVideo exercise={{ name: name || "Ejercicio", youtube_url: youtube, video_path: videoPath }} />
          </div>
        )}
      </fieldset>

      <button
        type="submit"
        disabled={pending || uploading || !ready}
        className="cursor-pointer rounded-full bg-verde-profundo px-6 py-3 font-semibold text-crema-claro disabled:cursor-default disabled:opacity-50"
      >
        {exercise ? "Guardar cambios" : "Agregar a la biblioteca"}
      </button>
    </form>
  );
}
