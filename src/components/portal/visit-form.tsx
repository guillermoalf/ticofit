"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle, Lock, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextField, TextAreaField, SelectField } from "@/components/portal/form-fields";
import { PROCEDURE_TYPE_LABELS, type ProcedureType, type VisitRowWithClient } from "@/types/db";
import {
  createVisitAction,
  updateVisitAction,
  deleteVisitAction,
} from "@/app/portal/visitas/actions";

const PROCEDURE_OPTIONS = (
  Object.entries(PROCEDURE_TYPE_LABELS) as [ProcedureType, string][]
).map(([value, label]) => ({ value, label }));

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Modal for creating or editing a visit (and its optional measurement).
 *
 * When `initialVisit` is provided, the form is in edit mode.
 * When `preselectedClientId` is provided, the client field is locked.
 * When `clients` is provided without a preselection, a dropdown lets the coach
 * pick the client (used from the global /portal/visitas screen).
 */
export function VisitFormModal({
  clients,
  preselectedClientId,
  preselectedClientName,
  initialVisit,
  onClose,
  onSaved,
}: {
  clients?: { id: string; name: string }[];
  preselectedClientId?: string;
  preselectedClientName?: string;
  initialVisit?: VisitRowWithClient;
  onClose: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const isEditing = !!initialVisit;

  const defaultClientId =
    initialVisit?.client_id ?? preselectedClientId ?? clients?.[0]?.id ?? "";

  const [form, setForm] = useState({
    client_id: defaultClientId,
    visit_date: initialVisit?.visit_date ?? todayIso(),
    procedure_type: (initialVisit?.procedure_type ?? "rutina") as ProcedureType,
    cost: initialVisit?.cost != null ? String(initialVisit.cost) : "",
    notes: initialVisit?.notes ?? "",
  });

  const [measurement, setMeasurement] = useState({
    weight: initialVisit?.measurement?.weight != null ? String(initialVisit.measurement.weight) : "",
    muscle_pct:
      initialVisit?.measurement?.muscle_pct != null
        ? String(initialVisit.measurement.muscle_pct)
        : "",
    fat_pct:
      initialVisit?.measurement?.fat_pct != null
        ? String(initialVisit.measurement.fat_pct)
        : "",
  });

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !confirmDelete && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, confirmDelete]);

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setMeasField<K extends keyof typeof measurement>(
    key: K,
    value: string,
  ) {
    setMeasurement((m) => ({ ...m, [key]: value }));
  }

  const isMedicion = form.procedure_type === "medicion";

  const clientLabel =
    initialVisit?.client_name ??
    preselectedClientName ??
    clients?.find((c) => c.id === form.client_id)?.name ??
    "";

  const clientFixed = isEditing || !!preselectedClientId;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const visitInput = {
        client_id: form.client_id,
        visit_date: form.visit_date,
        procedure_type: form.procedure_type,
        cost: form.cost,
        notes: form.notes,
      };
      const measInput = isMedicion ? measurement : undefined;

      let result;
      if (isEditing) {
        result = await updateVisitAction(
          initialVisit.id,
          visitInput,
          measInput,
          initialVisit.measurement?.id ?? null,
        );
      } else {
        result = await createVisitAction(visitInput, measInput);
      }

      if (!result.ok) {
        setError(result.error);
        return;
      }

      toast.success(isEditing ? "Visita actualizada" : "Visita registrada");
      router.refresh();
      onSaved();
    } catch {
      setError("Ocurrió un error inesperado. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  async function onDelete() {
    if (!initialVisit) return;
    setDeleting(true);
    try {
      const result = await deleteVisitAction(initialVisit.id, initialVisit.client_id);
      if (!result.ok) {
        setError(result.error);
        setConfirmDelete(false);
        return;
      }
      toast.success("Visita eliminada");
      router.refresh();
      onSaved();
    } catch {
      setError("Ocurrió un error inesperado al eliminar.");
    } finally {
      setDeleting(false);
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
        aria-label={isEditing ? "Editar visita" : "Registrar visita"}
        className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-t-2xl border border-border-strong bg-surface shadow-glow sm:rounded-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-lg font-semibold text-ink">
            {isEditing ? "Editar visita" : "Registrar visita"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={onSubmit} className="flex flex-col gap-4 px-5 py-5">
          {/* Client */}
          {clientFixed ? (
            <div>
              <span className="mb-1.5 block text-sm text-muted">Cliente</span>
              <p className="rounded-xl border border-border bg-base/40 px-4 py-3 text-sm text-ink">
                {clientLabel || "—"}
              </p>
            </div>
          ) : clients && clients.length > 0 ? (
            <SelectField
              label="Cliente"
              value={form.client_id}
              onChange={(v) => setField("client_id", v)}
              options={clients.map((c) => ({ value: c.id, label: c.name }))}
              required
            />
          ) : (
            <p className="text-sm text-muted">
              No hay clientes. Agregá uno primero en la sección Clientes.
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Fecha"
              type="date"
              value={form.visit_date}
              onChange={(v) => setField("visit_date", v)}
              required
            />
            <SelectField
              label="Procedimiento"
              value={form.procedure_type}
              onChange={(v) => setField("procedure_type", v)}
              options={PROCEDURE_OPTIONS}
              required
            />
          </div>

          <TextField
            label="Costo (₡)"
            type="number"
            value={form.cost}
            onChange={(v) => setField("cost", v)}
            placeholder="Opcional"
          />

          <TextAreaField
            label="Notas"
            value={form.notes}
            onChange={(v) => setField("notes", v)}
            placeholder="Observaciones de la sesión…"
            rows={2}
          />

          {/* Measurement fields — only for medición visits */}
          {isMedicion && (
            <div className="rounded-xl border border-border bg-surface-2/40 p-4">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted">
                <Lock size={11} />
                Mediciones — solo vos las ves
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <TextField
                  label="Peso (kg)"
                  type="number"
                  value={measurement.weight}
                  onChange={(v) => setMeasField("weight", v)}
                  placeholder="Ej. 75.5"
                />
                <TextField
                  label="Músculo (%)"
                  type="number"
                  value={measurement.muscle_pct}
                  onChange={(v) => setMeasField("muscle_pct", v)}
                  placeholder="Ej. 38.2"
                />
                <TextField
                  label="Grasa (%)"
                  type="number"
                  value={measurement.fat_pct}
                  onChange={(v) => setMeasField("fat_pct", v)}
                  placeholder="Ej. 22.1"
                />
              </div>
            </div>
          )}

          {error && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-border-strong bg-base/60 px-3 py-2.5 text-sm text-ink"
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-primary" />
              <span>{error}</span>
            </p>
          )}

          {/* Footer actions */}
          {confirmDelete ? (
            <div className="flex flex-col gap-2 rounded-xl border border-red-400/30 bg-red-400/10 p-4">
              <p className="text-sm text-red-300">
                ¿Seguro que querés eliminar esta visita? Esta acción no se puede
                deshacer.
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={deleting}
                  className="flex-1 rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-2.5 text-sm font-medium text-red-300 transition-colors hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deleting ? "Eliminando…" : "Eliminar"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 pt-1">
              {isEditing && (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="rounded-xl border border-red-400/30 p-2.5 text-red-400 transition-colors hover:border-red-400/60 hover:bg-red-400/10"
                  aria-label="Eliminar visita"
                >
                  <Trash2 size={16} />
                </button>
              )}
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="flex-1"
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                loading={loading}
                disabled={!clientFixed && !form.client_id}
                className="flex-1"
              >
                {loading
                  ? isEditing
                    ? "Guardando…"
                    : "Registrando…"
                  : isEditing
                    ? "Guardar cambios"
                    : "Registrar"}
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
