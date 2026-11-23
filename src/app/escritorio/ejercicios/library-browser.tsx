"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { ExerciseVideo } from "@/components/routines/exercise-video";
import { EQUIPMENT, MUSCLES, describeExercise, matchesQuery, type Exercise, type Muscle } from "@/lib/routines/library";
import { cn } from "@/lib/utils";
import { archiveExerciseAction, toggleFavoriteAction } from "./actions";

const control =
  "rounded-xl border border-border-strong bg-surface px-3 py-2.5 text-[16px] text-ink outline-none focus:border-primary";

/** Search and filters shared by the library page and the routine builder's picker. */
export function useLibraryFilter(exercises: Exercise[], favorites: Set<string>) {
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<Muscle | "">("");
  const [equipment, setEquipment] = useState("");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const shown = exercises.filter(
    (e) =>
      matchesQuery(e, query) &&
      (!muscle || e.muscle_groups.includes(muscle)) &&
      (!equipment || e.equipment === equipment) &&
      (!onlyFavorites || favorites.has(e.id)),
  );
  const filters = (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="lib-q">
        Buscar ejercicio
      </label>
      <input
        id="lib-q"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar: pierna, espalda, mancuerna…"
        className={cn(control, "min-w-0 flex-1 basis-64")}
      />
      <label className="sr-only" htmlFor="lib-m">
        Grupo muscular
      </label>
      <select id="lib-m" value={muscle} onChange={(e) => setMuscle(e.target.value as Muscle | "")} className={control}>
        <option value="">Todos los músculos</option>
        {Object.entries(MUSCLES).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
      <label className="sr-only" htmlFor="lib-e">
        Equipo
      </label>
      <select id="lib-e" value={equipment} onChange={(e) => setEquipment(e.target.value)} className={control}>
        <option value="">Todo el equipo</option>
        {Object.entries(EQUIPMENT).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
      <label className="inline-flex min-h-11 items-center gap-2 text-[15px]">
        <input
          type="checkbox"
          checked={onlyFavorites}
          onChange={(e) => setOnlyFavorites(e.target.checked)}
          className="size-4 accent-[var(--tf-verde-profundo)]"
        />
        Mis favoritos
      </label>
    </div>
  );
  return { shown, filters };
}

export function FavoriteButton({
  id,
  name,
  on,
  onChange,
}: {
  id: string;
  name: string;
  on: boolean;
  onChange: (on: boolean) => void;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? `Quitar ${name} de favoritos` : `Marcar ${name} como favorito`}
      disabled={pending}
      onClick={() =>
        start(async () => {
          onChange(!on);
          const res = await toggleFavoriteAction(id, !on);
          if (!res.ok) {
            onChange(on);
            toast.error(res.error);
          }
        })
      }
      className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-xl hover:bg-surface-hover"
    >
      <span aria-hidden className={on ? "text-ink" : "text-muted"}>
        {on ? "★" : "☆"}
      </span>
    </button>
  );
}

export function LibraryBrowser({
  exercises,
  favoriteIds,
  canEdit,
}: {
  exercises: Exercise[];
  favoriteIds: string[];
  canEdit: boolean;
}) {
  const [favorites, setFavorites] = useState(() => new Set(favoriteIds));
  const [showArchived, setShowArchived] = useState(false);
  const pool = exercises.filter((e) => e.archived === showArchived);
  const { shown, filters } = useLibraryFilter(pool, favorites);
  const archivedCount = exercises.filter((e) => e.archived).length;

  const setFavorite = (id: string, on: boolean) =>
    setFavorites((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  return (
    <div className="space-y-4">
      {filters}
      <p className="text-sm text-muted">
        {shown.length} de {pool.length} ejercicios
        {(archivedCount > 0 || showArchived) && (
          <>
            {" · "}
            <button type="button" onClick={() => setShowArchived((v) => !v)} className="cursor-pointer underline underline-offset-2">
              {showArchived ? "Ver la biblioteca" : `Ver archivados (${archivedCount})`}
            </button>
          </>
        )}
      </p>
      {shown.length ? (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {shown.map((e) => (
            <li key={e.id} className="flex items-start gap-1 px-2 py-1 sm:px-3">
              <FavoriteButton id={e.id} name={e.name} on={favorites.has(e.id)} onChange={(on) => setFavorite(e.id, on)} />
              <details className="group min-w-0 flex-1 py-2">
                <summary className="flex cursor-pointer list-none flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 pr-2">
                  <span className="font-semibold">{e.name}</span>
                  <span className="text-sm text-muted">
                    {describeExercise(e) || e.category}
                    {e.source === "staff" && " · del gimnasio"}
                  </span>
                </summary>
                <div className="mt-3 grid gap-4 pr-2 pb-2 lg:grid-cols-[minmax(0,28rem)_1fr]">
                  <ExerciseVideo exercise={e} />
                  <div className="space-y-3 text-[15px]">
                    {e.instructions ? (
                      <p className="whitespace-pre-line">{e.instructions}</p>
                    ) : (
                      <p className="text-muted">Sin instrucciones todavía.</p>
                    )}
                    {canEdit && e.source === "staff" && (
                      <div className="flex flex-wrap gap-4">
                        <Link href={`/escritorio/ejercicios/${e.id}`} className="font-semibold underline underline-offset-2">
                          Editar
                        </Link>
                        <ArchiveButton id={e.id} archived={e.archived} />
                      </div>
                    )}
                  </div>
                </div>
              </details>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-border-strong bg-surface px-5 py-10 text-center text-muted">
          Ningún ejercicio coincide con la búsqueda.
        </p>
      )}
    </div>
  );
}

function ArchiveButton({ id, archived }: { id: string; archived: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await archiveExerciseAction(id, !archived);
          if (res.ok) toast.success(res.message);
          else toast.error(res.error);
        })
      }
      className="cursor-pointer text-muted underline underline-offset-2 hover:text-ink disabled:opacity-50"
    >
      {archived ? "Devolver a la biblioteca" : "Archivar"}
    </button>
  );
}
