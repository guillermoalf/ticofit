"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle, ClipboardList, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/portal/form-fields";
import { DataList, type DataListColumn } from "@/components/portal/data-list";
import {
  PortalSection,
  SectionAction,
  SectionEmpty,
} from "@/components/portal/section-card";
import { cn } from "@/lib/utils";
import type { ProgramListEntry, RoutineListEntry } from "@/types/db";
import {
  assignProgramAsRoutineAction,
  createRoutineAction,
} from "./rutinas/actions";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const COLUMNS: DataListColumn<RoutineListEntry>[] = [
  {
    key: "name",
    header: "Nombre",
    locked: true,
    searchValue: (r) => r.name,
    render: (r) => <span className="font-medium text-ink">{r.name}</span>,
  },
  {
    key: "day_count",
    header: "Días",
    align: "center",
    render: (r) => <span className="tabular-nums text-muted">{r.day_count}</span>,
  },
  {
    key: "assigned_at",
    header: "Asignada",
    render: (r) => (
      <span className="whitespace-nowrap text-muted">
        {formatDate(r.assigned_at)}
      </span>
    ),
  },
];

export function ClientRoutines({
  clientId,
  routines,
  programs,
}: {
  clientId: string;
  routines: RoutineListEntry[];
  programs: ProgramListEntry[];
}) {
  const router = useRouter();
  const [assignOpen, setAssignOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  function openRoutine(routineId: string) {
    router.push(`/portal/clientes/${clientId}/rutinas/${routineId}`);
  }

  return (
    <PortalSection
      title="Rutinas"
      summary={`${routines.length} ${
        routines.length === 1 ? "rutina asignada" : "rutinas asignadas"
      }`}
      action={
        // One "+" instead of two competing buttons: it asks how, then acts.
        <div className="relative">
          <SectionAction
            label="Agregar rutina"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <Plus size={18} />
          </SectionAction>

          {menuOpen && (
            <>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setMenuOpen(false)}
                className="fixed inset-0 z-20 cursor-default"
              />
              <div className="absolute right-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-2xl border border-border-strong bg-surface shadow-glow">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setAssignOpen(true);
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm text-ink transition-colors hover:bg-surface-hover"
                >
                  <ClipboardList size={15} className="shrink-0 text-muted" />
                  Asignar programa
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setCreateOpen(true);
                  }}
                  className="flex w-full items-center gap-2.5 border-t border-border px-4 py-3 text-left text-sm text-ink transition-colors hover:bg-surface-hover"
                >
                  <Plus size={15} className="shrink-0 text-muted" />
                  Crear desde cero
                </button>
              </div>
            </>
          )}
        </div>
      }
    >
      {routines.length === 0 ? (
        <SectionEmpty>Sin rutinas todavía.</SectionEmpty>
      ) : (
        <DataList
          rows={routines}
          columns={COLUMNS}
          rowKey={(r) => r.id}
          searchPlaceholder="Buscar por nombre…"
          emptyMessage="No hay rutinas que coincidan con tu búsqueda."
          onRowClick={(r) => openRoutine(r.id)}
        />
      )}

      {assignOpen && (
        <AssignProgramModal
          clientId={clientId}
          programs={programs}
          onClose={() => setAssignOpen(false)}
          onAssigned={openRoutine}
        />
      )}

      {createOpen && (
        <CreateRoutineModal
          clientId={clientId}
          onClose={() => setCreateOpen(false)}
          onCreated={openRoutine}
        />
      )}
    </PortalSection>
  );
}

// ---------------------------------------------------------------------------
// Assign-from-program modal — picks a program and deep-copies it
// ---------------------------------------------------------------------------

function AssignProgramModal({
  clientId,
  programs,
  onClose,
  onAssigned,
}: {
  clientId: string;
  programs: ProgramListEntry[];
  onClose: () => void;
  onAssigned: (routineId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [assigningId, setAssigningId] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return programs;
    return programs.filter((p) => p.name.toLowerCase().includes(q));
  }, [programs, query]);

  async function assign(program: ProgramListEntry) {
    setAssigningId(program.id);
    try {
      const result = await assignProgramAsRoutineAction(clientId, program.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Rutina "${program.name}" asignada`);
      onAssigned(result.id);
    } finally {
      setAssigningId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <button
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Asignar programa"
        className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl border border-border-strong bg-surface shadow-glow sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-lg font-semibold">
            Asignar programa
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        <div className="border-b border-border px-5 py-3">
          <label className="relative block">
            <Search
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-2"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              placeholder="Buscar por nombre…"
              className="w-full rounded-full border border-border bg-base/60 py-2 pl-10 pr-4 text-sm text-ink outline-none transition-colors placeholder:text-muted-2 focus:border-primary"
            />
          </label>
        </div>

        <div className="flex-1 overflow-y-auto">
          {programs.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted">
              Todavía no tenés programas. Creá uno primero en la sección
              Programas.
            </p>
          ) : filtered.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted">
              No hay programas que coincidan con tu búsqueda.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((program) => (
                <li key={program.id}>
                  <button
                    type="button"
                    onClick={() => assign(program)}
                    disabled={assigningId !== null}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors hover:bg-surface-hover",
                      assigningId !== null && "cursor-not-allowed opacity-60",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-ink">
                        {program.name}
                      </span>
                      <span className="block text-xs text-muted-2">
                        {program.item_count}{" "}
                        {program.item_count === 1 ? "ejercicio" : "ejercicios"}
                      </span>
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted">
                      <Plus size={12} />
                      {assigningId === program.id ? "Asignando…" : "Asignar"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create-from-scratch modal — names an empty routine and jumps to the builder
// ---------------------------------------------------------------------------

function CreateRoutineModal({
  clientId,
  onClose,
  onCreated,
}: {
  clientId: string;
  onClose: () => void;
  onCreated: (routineId: string) => void;
}) {
  const [name, setName] = useState("");
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
      const result = await createRoutineAction(clientId, name);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Rutina creada");
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
        aria-label="Crear rutina"
        className="relative z-10 w-full max-w-md rounded-2xl border border-border-strong bg-surface p-6 shadow-glow"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Crear rutina</h2>
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

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" loading={loading} className="flex-1">
              {loading ? "Creando…" : "Crear rutina"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
