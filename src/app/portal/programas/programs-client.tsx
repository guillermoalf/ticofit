"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle, ClipboardList, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataList, type DataListColumn } from "@/components/portal/data-list";
import { TextField, TextAreaField } from "@/components/portal/form-fields";
import type { ProgramListEntry } from "@/types/db";
import { createProgramAction } from "./actions";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function truncate(text: string, max = 80) {
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

const COLUMNS: DataListColumn<ProgramListEntry>[] = [
  {
    key: "name",
    header: "Nombre",
    locked: true,
    searchValue: (p) => p.name,
    render: (p) => <span className="font-medium text-ink">{p.name}</span>,
  },
  {
    key: "description",
    header: "Descripción",
    hiddenByDefault: true,
    render: (p) =>
      p.description ? (
        <span className="text-muted">{truncate(p.description)}</span>
      ) : (
        <span className="text-muted-2">—</span>
      ),
  },
  {
    key: "item_count",
    header: "Ejercicios",
    align: "center",
    render: (p) => <span className="tabular-nums text-muted">{p.item_count}</span>,
  },
  {
    key: "created_at",
    header: "Creado",
    hiddenByDefault: true,
    render: (p) => <span className="text-muted">{formatDate(p.created_at)}</span>,
  },
];

export function ProgramsClient({ programs }: { programs: ProgramListEntry[] }) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-widest text-primary">Coach</p>
          <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">
            Programas
          </h1>
          <p className="mt-1 text-sm text-muted">
            {programs.length} {programs.length === 1 ? "programa" : "programas"} en
            total
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="shrink-0">
          <Plus size={18} />
          Crear programa
        </Button>
      </header>

      <section className="mt-8">
        {programs.length === 0 ? (
          <EmptyState onAdd={() => setCreateOpen(true)} />
        ) : (
          <DataList
            rows={programs}
            columns={COLUMNS}
            rowKey={(p) => p.id}
            searchPlaceholder="Buscar por nombre…"
            emptyMessage="No hay programas que coincidan con tu búsqueda."
            onRowClick={(p) => router.push(`/portal/programas/${p.id}`)}
            pageSize={15}
          />
        )}
      </section>

      {createOpen && (
        <CreateProgramModal
          onClose={() => setCreateOpen(false)}
          onCreated={(id) => router.push(`/portal/programas/${id}`)}
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
        <ClipboardList size={24} className="text-primary" />
      </span>
      <h2 className="mt-5 font-display text-xl font-semibold">
        Todavía no tenés programas
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
        Creá plantillas de entrenamiento reutilizables con los ejercicios de tu
        biblioteca para asignarlas a tus clientes.
      </p>
      <div className="mt-6 flex justify-center">
        <Button onClick={onAdd}>
          <Plus size={18} />
          Crear programa
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create program modal — creates an empty program and jumps into the builder
// ---------------------------------------------------------------------------

function CreateProgramModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await createProgramAction({ name, description });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Programa creado");
      onCreated(result.id);
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
        aria-label="Crear programa"
        className="relative z-10 w-full max-w-md rounded-2xl border border-border-strong bg-surface p-6 shadow-glow"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Crear programa</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-4">
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

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" loading={loading} className="flex-1">
              {loading ? "Creando…" : "Crear programa"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
