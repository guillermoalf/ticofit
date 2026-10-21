"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle, ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextField, TextAreaField } from "@/components/portal/form-fields";
import {
  ConfirmDeleteModal,
  PlanDays,
  type PlanItemActions,
} from "@/components/portal/plan-builder";
import type { Exercise, Program, ProgramItemWithExercise } from "@/types/db";
import {
  addProgramItemAction,
  deleteProgramAction,
  removeProgramItemAction,
  renameDayAction,
  reorderDayItemsAction,
  updateProgramAction,
  updateProgramItemAction,
} from "../actions";

export function ProgramBuilder({
  program,
  items,
  exercises,
}: {
  program: Program;
  items: ProgramItemWithExercise[];
  exercises: Exercise[];
}) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const actions = useMemo<PlanItemActions>(
    () => ({
      addItem: (exerciseId, dayLabel) =>
        addProgramItemAction(program.id, exerciseId, dayLabel),
      updateItem: (itemId, input) => updateProgramItemAction(itemId, input),
      removeItem: (itemId) => removeProgramItemAction(itemId, program.id),
      reorderDay: (dayLabel, orderedItemIds) =>
        reorderDayItemsAction(program.id, dayLabel, orderedItemIds),
      renameDay: (oldLabel, newLabel) =>
        renameDayAction(program.id, oldLabel, newLabel),
    }),
    [program.id],
  );

  return (
    <main className="mx-auto max-w-4xl px-5 py-10 sm:px-6 sm:py-12">
      <Link
        href="/portal/programas"
        className="inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={16} />
        Volver a programas
      </Link>

      <ProgramHeader program={program} />

      <PlanDays
        items={items}
        exercises={exercises}
        actions={actions}
        empty={{
          title: "Programa vacío",
          description:
            "Agregá un día y empezá a armar el programa con los ejercicios de tu biblioteca.",
        }}
      />

      {/* Danger zone */}
      <section className="mt-12 border-t border-border pt-6">
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-2.5 text-sm font-medium text-red-300 transition-colors hover:bg-red-400/20"
        >
          <Trash2 size={16} />
          Eliminar programa
        </button>
      </section>

      {confirmDelete && (
        <ConfirmDeleteModal
          title="Eliminar programa"
          message={
            <>
              ¿Seguro que querés eliminar{" "}
              <span className="font-medium text-ink">{program.name}</span> y
              todos sus ejercicios? Las rutinas ya asignadas a clientes no se
              ven afectadas. Esta acción no se puede deshacer.
            </>
          }
          successMessage="Programa eliminado"
          onConfirm={() => deleteProgramAction(program.id)}
          onDeleted={() => router.push("/portal/programas")}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </main>
  );
}

// ---------------------------------------------------------------------------
// Program name + description (inline edit)
// ---------------------------------------------------------------------------

function ProgramHeader({ program }: { program: Program }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(program.name);
  const [description, setDescription] = useState(program.description ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await updateProgramAction(program.id, { name, description });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Programa actualizado");
      setEditing(false);
      router.refresh();
    } catch {
      setError("Ocurrió un error inesperado. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  if (!editing) {
    return (
      <header className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-widest text-primary">
            Programa
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold">{program.name}</h1>
          {program.description && (
            <p className="mt-2 max-w-xl text-sm text-muted">
              {program.description}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setName(program.name);
            setDescription(program.description ?? "");
            setEditing(true);
          }}
        >
          <Pencil size={14} />
          Editar
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
        placeholder="Ej. Fuerza — principiante"
      />
      <TextAreaField
        label="Descripción (opcional)"
        value={description}
        onChange={setDescription}
        placeholder="Ej. Programa de 3 días enfocado en fuerza general…"
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
          onClick={() => setEditing(false)}
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
