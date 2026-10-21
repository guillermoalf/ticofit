"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle, ArrowLeft, Check, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/portal/form-fields";
import {
  ConfirmDeleteModal,
  PlanDays,
  type PlanItemActions,
} from "@/components/portal/plan-builder";
import { PlanSummary } from "@/components/portal/plan-summary";
import type {
  Exercise,
  Routine,
  RoutineItemWithExercise,
  WeightHistoryByExercise,
} from "@/types/db";
import {
  addRoutineItemAction,
  deleteRoutineAction,
  removeRoutineItemAction,
  renameRoutineAction,
  renameRoutineDayAction,
  reorderRoutineDayAction,
  updateRoutineItemAction,
} from "../actions";

export function RoutineBuilder({
  routine,
  clientId,
  clientName,
  items,
  exercises,
  weightHistory,
}: {
  routine: Routine;
  clientId: string;
  clientName: string | null;
  items: RoutineItemWithExercise[];
  exercises: Exercise[];
  /** This client's past loads per exercise, newest first. */
  weightHistory: WeightHistoryByExercise;
}) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  // A saved routine opens read-only: day, exercise, sets × reps. The full
  // editor (notes, reorder, delete) is one tap away but never the default —
  // reviewing a plan is far more common than rewriting one.
  const [editing, setEditing] = useState(items.length === 0);

  const actions = useMemo<PlanItemActions>(
    () => ({
      addItem: (exerciseId, dayLabel) =>
        addRoutineItemAction(routine.id, exerciseId, dayLabel),
      updateItem: (itemId, input) =>
        updateRoutineItemAction(routine.id, itemId, input),
      removeItem: (itemId) => removeRoutineItemAction(routine.id, itemId),
      reorderDay: (dayLabel, orderedItemIds) =>
        reorderRoutineDayAction(routine.id, dayLabel, orderedItemIds),
      renameDay: (oldLabel, newLabel) =>
        renameRoutineDayAction(routine.id, oldLabel, newLabel),
    }),
    [routine.id],
  );

  return (
    <main className="mx-auto max-w-4xl px-5 py-10 sm:px-6 sm:py-12">
      <Link
        href={`/portal/clientes/${clientId}`}
        className="inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={16} />
        Volver al cliente
      </Link>

      <RoutineHeader
        routine={routine}
        clientName={clientName}
        editing={editing}
        onToggleEdit={() => setEditing((e) => !e)}
      />

      {editing ? (
        <PlanDays
          items={items}
          exercises={exercises}
          actions={actions}
          weights={{ history: weightHistory }}
          empty={{
            title: "Rutina vacía",
            description:
              "Agregá un día y armá la rutina con los ejercicios de tu biblioteca.",
          }}
        />
      ) : (
        <div className="mt-8">
          <PlanSummary
            items={items}
            weightHistory={weightHistory}
            emptyMessage="Rutina vacía. Tocá Editar para agregar días y ejercicios."
          />
        </div>
      )}

      {/* Danger zone — only while editing; reviewing shouldn't offer delete. */}
      {editing && (
        <section className="mt-12 border-t border-border pt-6">
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-2.5 text-sm font-medium text-red-300 transition-colors hover:bg-red-400/20"
          >
            <Trash2 size={16} />
            Eliminar rutina
          </button>
        </section>
      )}

      {confirmDelete && (
        <ConfirmDeleteModal
          title="Eliminar rutina"
          message={
            <>
              ¿Seguro que querés eliminar{" "}
              <span className="font-medium text-ink">{routine.name}</span> y
              todos sus ejercicios? Esta acción no se puede deshacer.
            </>
          }
          successMessage="Rutina eliminada"
          onConfirm={() => deleteRoutineAction(routine.id, clientId)}
          onDeleted={() => router.push(`/portal/clientes/${clientId}`)}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </main>
  );
}

// ---------------------------------------------------------------------------
// Routine name (inline edit) + assignment info
// ---------------------------------------------------------------------------

const assignedFmt = new Intl.DateTimeFormat("es-CR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function RoutineHeader({
  routine,
  clientName,
  editing,
  onToggleEdit,
}: {
  routine: Routine;
  clientName: string | null;
  editing: boolean;
  onToggleEdit: () => void;
}) {
  const router = useRouter();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(routine.name);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await renameRoutineAction(routine.id, name);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Rutina actualizada");
      setRenaming(false);
      router.refresh();
    } catch {
      setError("Ocurrió un error inesperado. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  if (!renaming) {
    return (
      <header className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm uppercase tracking-widest text-primary">
            Rutina{clientName ? ` · ${clientName}` : ""}
          </p>
          <button
            type="button"
            onClick={
              editing
                ? () => {
                    setName(routine.name);
                    setRenaming(true);
                  }
                : undefined
            }
            disabled={!editing}
            className="group mt-1 flex items-center gap-2 text-left disabled:cursor-default"
          >
            <h1 className="font-display text-3xl font-bold">{routine.name}</h1>
            {editing && (
              <Pencil
                size={15}
                className="shrink-0 text-muted-2 transition-colors group-hover:text-ink"
              />
            )}
          </button>
          <p className="mt-2 text-sm text-muted">
            Asignada el {assignedFmt.format(new Date(routine.assigned_at))}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onToggleEdit}>
          {editing ? <Check size={14} /> : <Pencil size={14} />}
          {editing ? "Listo" : "Editar"}
        </Button>
      </header>
    );
  }

  return (
    <form
      onSubmit={onSave}
      className="mt-6 flex flex-col gap-4 rounded-card border border-border bg-surface/60 p-5"
    >
      <TextField
        label="Nombre"
        value={name}
        onChange={setName}
        required
        placeholder="Ej. Rutina de adaptación"
      />

      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-border-strong bg-base/60 px-3 py-2.5 text-sm text-ink"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-primary" />
          <span>{error}</span>
        </p>
      )}

      <div className="flex gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setRenaming(false)}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button type="submit" size="sm" loading={loading}>
          {loading ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
