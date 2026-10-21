"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertCircle,
  Dumbbell,
  Loader2,
  Pencil,
  Play,
  Plus,
  Trash2,
  X,
  Youtube,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DataList,
  StatusPill,
  type DataListColumn,
  type DataListFilter,
} from "@/components/portal/data-list";
import { ComboField, TextField } from "@/components/portal/form-fields";
import {
  SlideOver,
  SlideOverBody,
  SlideOverFooter,
} from "@/components/portal/slide-over";
import { YouTubeEmbed } from "@/components/portal/youtube-embed";
import { isSystemExercise, type Exercise } from "@/types/db";
import {
  createExerciseAction,
  deleteExerciseAction,
  updateExerciseAction,
  type ExerciseInput,
} from "./actions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Opens a YouTube search for whatever the coach typed as the exercise name. */
function youtubeSearchUrl(name: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(name)}`;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ExerciseClient({ exercises }: { exercises: Exercise[] }) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [previewing, setPreviewing] = useState<Exercise | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Exercise | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const ex of exercises) {
      if (ex.category) set.add(ex.category);
    }
    return Array.from(set).sort();
  }, [exercises]);

  const COLUMNS: DataListColumn<Exercise>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Nombre",
        locked: true,
        searchValue: (ex) => ex.name,
        render: (ex) => (
          <span className="font-medium text-ink">{ex.name}</span>
        ),
      },
      {
        key: "origen",
        header: "Origen",
        hiddenByDefault: true,
        searchValue: (ex) =>
          isSystemExercise(ex) ? "Biblioteca base" : "Mis ejercicios",
        render: (ex) => (
          <StatusPill tone={isSystemExercise(ex) ? "neutral" : "violet"}>
            {isSystemExercise(ex) ? "Base" : "Propio"}
          </StatusPill>
        ),
      },
      {
        key: "category",
        header: "Categoría",
        hiddenByDefault: true,
        searchValue: (ex) => ex.category ?? "",
        render: (ex) =>
          ex.category ? (
            <span className="text-muted">{ex.category}</span>
          ) : (
            <span className="text-muted-2">—</span>
          ),
      },
      {
        key: "acciones",
        header: "",
        align: "right",
        // A single icon, identical on every row: three of them pushed the
        // table past a phone's width, and the right-aligned column then sat
        // off-screen behind a horizontal scroll. Editing lives in the detail
        // modal a row tap opens.
        render: (ex) => (
          <div className="flex items-center justify-end">
            <button
              type="button"
              aria-label={`Ver ${ex.name}`}
              title="Ver video"
              onClick={(e) => {
                e.stopPropagation();
                setPreviewing(ex);
              }}
              className="rounded-lg border border-border p-1.5 text-muted transition-colors hover:border-border-strong hover:text-ink"
            >
              <Play size={14} />
            </button>
          </div>
        ),
      },
    ],
    [],
  );

  const ownCount = useMemo(
    () => exercises.filter((ex) => !isSystemExercise(ex)).length,
    [exercises],
  );

  const FILTERS = useMemo(() => {
    const list: DataListFilter<Exercise>[] = [
      {
        key: "source",
        label: "Origen",
        options: [
          { value: "system", label: "Biblioteca base" },
          { value: "coach", label: "Mis ejercicios" },
        ],
        getValue: (ex: Exercise) => ex.source,
      },
    ];

    if (categories.length > 0) {
      list.push({
        key: "category",
        label: "Categoría",
        options: categories.map((c) => ({ value: c, label: c })),
        getValue: (ex: Exercise) => ex.category ?? "",
      });
    }

    return list;
  }, [categories]);

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-widest text-primary">Coach</p>
          <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">
            Ejercicios
          </h1>
          <p className="mt-1 text-sm text-muted">
            {exercises.length}{" "}
            {exercises.length === 1 ? "ejercicio" : "ejercicios"} en total ·{" "}
            {ownCount} {ownCount === 1 ? "propio" : "propios"}
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          aria-label="Agregar ejercicio"
          title="Agregar ejercicio"
          className="inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-border-strong text-ink transition-colors hover:border-primary hover:bg-surface-hover"
        >
          <Plus size={20} />
        </button>
      </header>

      <section className="mt-8">
        {exercises.length === 0 ? (
          <EmptyState onAdd={openAdd} />
        ) : (
          <DataList
            rows={exercises}
            columns={COLUMNS}
            rowKey={(ex) => ex.id}
            filters={FILTERS}
            searchPlaceholder="Buscar por nombre o categoría…"
            emptyMessage="No hay ejercicios que coincidan con tu búsqueda."
            onRowClick={(ex) => setPreviewing(ex)}
            pageSize={15}
          />
        )}
      </section>

      {/* Add / edit slide-over */}
      <ExerciseFormPanel
        open={formOpen}
        exercise={editing}
        categories={categories}
        onClose={closeForm}
        onSaved={() => {
          closeForm();
          router.refresh();
        }}
      />

      {/* Detail modal — video, plus edit/delete for the coach's own rows */}
      {previewing && (
        <VideoModal
          exercise={previewing}
          onClose={() => setPreviewing(null)}
          onEdit={() => {
            const target = previewing;
            setPreviewing(null);
            setEditing(target);
            setFormOpen(true);
          }}
          onDelete={() => {
            const target = previewing;
            setPreviewing(null);
            setConfirmDelete(target);
          }}
        />
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <DeleteModal
          exercise={confirmDelete}
          onClose={() => setConfirmDelete(null)}
          onDeleted={() => {
            setConfirmDelete(null);
            router.refresh();
          }}
        />
      )}
    </main>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-card border border-dashed border-border-strong bg-surface/40 px-6 py-16 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-border-strong">
        <Dumbbell size={24} className="text-primary" />
      </span>
      <h2 className="mt-5 font-display text-xl font-semibold">
        Todavía no tenés ejercicios
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
        Agregá ejercicios y videos explicativos a tu biblioteca para usarlos en
        los programas de tus clientes. La biblioteca base todavía no tiene
        ejercicios disponibles.
      </p>
      <div className="mt-6 flex justify-center">
        <Button onClick={onAdd}>
          <Plus size={18} />
          Agregar ejercicio
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add / edit slide-over
// ---------------------------------------------------------------------------

const EMPTY_FORM: ExerciseInput = {
  name: "",
  category: "",
  youtube_url: "",
  is_explainer: false,
};

function ExerciseFormPanel({
  open,
  exercise,
  categories,
  onClose,
  onSaved,
}: {
  open: boolean;
  exercise: Exercise | null;
  categories: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ExerciseInput>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync form when the panel opens or the target exercise changes.
  useEffect(() => {
    if (open) {
      setError(null);
      setForm(
        exercise
          ? {
              name: exercise.name,
              category: exercise.category ?? "",
              youtube_url: exercise.youtube_url ?? "",
              is_explainer: exercise.is_explainer,
            }
          : EMPTY_FORM,
      );
    }
  }, [open, exercise]);

  function set<K extends keyof ExerciseInput>(key: K, value: ExerciseInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validated here, not by the browser: the panel body scrolls, so a
    // native validation bubble on a field that is out of view blocks the
    // submit with nothing on screen — the "I tap Crear and nothing happens"
    // report. The form carries noValidate for the same reason.
    if (!form.name.trim()) {
      setError("Escribí el nombre del ejercicio.");
      return;
    }
    if (!form.youtube_url.trim()) {
      setError("Pegá el enlace de YouTube del ejercicio.");
      return;
    }

    setLoading(true);
    try {
      const result = exercise
        ? await updateExerciseAction(exercise.id, form)
        : await createExerciseAction(form);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      toast.success(exercise ? "Ejercicio actualizado" : "Ejercicio creado");
      onSaved();
    } catch {
      setError("Ocurrió un error inesperado. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  const isEditing = Boolean(exercise);

  return (
    <SlideOver
      open={open}
      title={isEditing ? "Editar ejercicio" : "Agregar ejercicio"}
      onClose={onClose}
    >
      <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
        <SlideOverBody>
          <TextField
            label="Nombre"
            value={form.name}
            onChange={(v) => set("name", v)}
            required
            disabled={loading}
            placeholder="Ej. Sentadilla búlgara"
          />

          <ComboField
            label="Categoría"
            value={form.category}
            onChange={(v) => set("category", v)}
            options={categories}
            disabled={loading}
            placeholder="Ej. Piernas, Cardio, Movilidad…"
          />

          {/*
            The search button hands the coach the exact query for the name
            they just typed: type the name, tap it, copy the link, paste back.
          */}
          <div>
            <TextField
              label="Enlace de YouTube"
              value={form.youtube_url}
              onChange={(v) => set("youtube_url", v)}
              required
              disabled={loading}
              inputMode="url"
              placeholder="https://www.youtube.com/watch?v=…"
            />
            <button
              type="button"
              disabled={!form.name.trim() || loading}
              onClick={() =>
                window.open(
                  youtubeSearchUrl(form.name.trim()),
                  "_blank",
                  "noopener,noreferrer",
                )
              }
              className="mt-2 inline-flex items-center gap-2 rounded-full border border-border px-3.5 py-2 text-xs text-muted transition-colors hover:border-border-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Youtube size={14} />
              {form.name.trim()
                ? `Buscar "${form.name.trim()}" en YouTube`
                : "Escribí el nombre para buscarlo en YouTube"}
            </button>
          </div>

          {error && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-border-strong bg-base/60 px-3 py-2.5 text-sm text-ink"
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-primary" />
              <span>{error}</span>
            </p>
          )}
        </SlideOverBody>

        <SlideOverFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="flex-1"
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button type="submit" loading={loading} className="flex-1">
            {loading
              ? "Guardando…"
              : isEditing
                ? "Guardar cambios"
                : "Crear ejercicio"}
          </Button>
        </SlideOverFooter>
      </form>
    </SlideOver>
  );
}

// ---------------------------------------------------------------------------
// Video preview modal
// ---------------------------------------------------------------------------

function VideoModal({
  exercise,
  onClose,
  onEdit,
  onDelete,
}: {
  exercise: Exercise;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
      <button
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
      />

      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={`Video: ${exercise.name}`}
        className="relative z-10 w-full max-w-2xl"
      >
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-white">
              {exercise.name}
            </h2>
            {exercise.category && (
              <p className="mt-0.5 text-sm text-white/60">{exercise.category}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="shrink-0 rounded-full p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {exercise.youtube_url ? (
          <YouTubeEmbed url={exercise.youtube_url} title={exercise.name} />
        ) : (
          <div className="flex aspect-video items-center justify-center rounded-xl bg-surface-2 text-sm text-muted">
            Este ejercicio no tiene video asociado.
          </div>
        )}

        {/* Base library rows are shared across every coach — view only. */}
        {isSystemExercise(exercise) ? (
          <p className="mt-3 text-center text-xs text-white/50">
            Ejercicio de la biblioteca base
          </p>
        ) : (
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              <Pencil size={15} />
              Editar
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-2.5 text-sm font-medium text-red-300 transition-colors hover:bg-red-400/20"
            >
              <Trash2 size={15} />
              Eliminar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Delete confirmation modal
// ---------------------------------------------------------------------------

function DeleteModal({
  exercise,
  onClose,
  onDeleted,
}: {
  exercise: Exercise;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleDelete() {
    setLoading(true);
    setError(null);
    try {
      const result = await deleteExerciseAction(exercise.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Ejercicio eliminado");
      onDeleted();
    } catch {
      setError("Ocurrió un error inesperado. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-sm rounded-2xl border border-border-strong bg-surface p-6 shadow-glow"
      >
        <h2 className="font-display text-lg font-semibold">Eliminar ejercicio</h2>
        <p className="mt-2 text-sm text-muted">
          ¿Seguro que querés eliminar{" "}
          <span className="font-medium text-ink">{exercise.name}</span>? Esta
          acción no se puede deshacer.
        </p>

        {error && (
          <p
            role="alert"
            className="mt-3 flex items-start gap-2 rounded-xl border border-border-strong bg-base/60 px-3 py-2.5 text-sm text-ink"
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-primary" />
            <span>{error}</span>
          </p>
        )}

        <div className="mt-5 flex gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="flex-1"
            disabled={loading}
          >
            Cancelar
          </Button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            aria-busy={loading || undefined}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-2.5 text-sm font-medium text-red-300 transition-colors hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            {loading ? "Eliminando…" : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}
