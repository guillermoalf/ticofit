import { ExerciseVideo } from "@/components/routines/exercise-video";
import { formatDate } from "@/lib/clients/body";
import { exerciseVideo, prescription, routineValidity, type Exercise, type Routine } from "@/lib/routines/library";
import { cn } from "@/lib/utils";

const letter = (n: number) => String.fromCharCode(64 + n);

export function ValidityNote({ routine, today, audience }: { routine: Routine; today: string; audience: "staff" | "client" }) {
  const v = routineValidity(routine, today);
  if (!v) return null;
  const text =
    v.state === "expired"
      ? audience === "staff"
        ? `Venció el ${formatDate(v.ends)}: toca renovarla.`
        : `Tu rutina venció el ${formatDate(v.ends)}. Pedile a tu coach la siguiente.`
      : v.state === "soon"
        ? `Vence el ${formatDate(v.ends)} (${v.daysLeft === 0 ? "hoy" : v.daysLeft === 1 ? "mañana" : `en ${v.daysLeft} días`}).`
        : `Vigente hasta el ${formatDate(v.ends)}.`;
  return (
    <p className={cn("text-[15px]", v.state === "ok" ? "text-muted" : "font-semibold text-ink")}>
      {v.state !== "ok" && <span aria-hidden>⚠︎ </span>}
      {text}
    </p>
  );
}

/**
 * A routine as the client follows it. `videos` adds an expandable demo per
 * exercise (screen); `print` lays it out for paper with the video link written out.
 */
export function RoutineView({
  routine,
  exercises,
  videos = true,
  print = false,
}: {
  routine: Routine;
  exercises: Map<string, Exercise>;
  videos?: boolean;
  print?: boolean;
}) {
  return (
    <div className={cn("space-y-6", print && "space-y-4")}>
      {routine.notes && <p className="whitespace-pre-line text-[15px]">{routine.notes}</p>}
      {routine.days.map((d) => (
        <section key={d.id ?? d.title} className={cn("rounded-2xl border border-border bg-surface", print ? "break-inside-avoid p-3" : "p-4 sm:p-5")}>
          <h3 className={cn("mb-2 font-semibold", print ? "text-[16px]" : "text-lg")}>{d.title}</h3>
          <ol className="divide-y divide-border">
            {d.items.map((it, n) => {
              const ex = exercises.get(it.exercise_id);
              const video = ex ? exerciseVideo(ex) : null;
              const rx = prescription(it);
              return (
                <li key={it.id ?? n} className={print ? "py-1.5" : "py-3"}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                    <p className="font-semibold">
                      {n + 1}. {ex?.name ?? "Ejercicio"}
                      {it.superset && (
                        <span className="ml-2 rounded-full border border-border-strong px-2 py-0.5 text-xs font-semibold">
                          Superserie {letter(it.superset)}
                        </span>
                      )}
                    </p>
                    {rx && <p className="text-[15px]">{rx}</p>}
                  </div>
                  {it.notes && <p className="mt-0.5 text-sm text-muted">{it.notes}</p>}
                  {print && video && <p className="mt-0.5 break-all text-xs text-muted">Video: {video.url}</p>}
                  {!print && videos && ex && (video || ex.instructions) && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm font-semibold underline underline-offset-2">Ver cómo se hace</summary>
                      <div className="mt-3 max-w-xl space-y-3">
                        {video && <ExerciseVideo exercise={ex} />}
                        {ex.instructions && <p className="whitespace-pre-line text-[15px]">{ex.instructions}</p>}
                      </div>
                    </details>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
