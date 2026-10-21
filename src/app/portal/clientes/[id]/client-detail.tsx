"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, AlertCircle, Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ClientIntakeFields,
  EMPTY_INTAKE,
  type ClientIntakeForm,
} from "@/components/portal/client-intake-fields";
import {
  type Profile,
  type TrainingType,
  type ClientStatus,
  CLIENT_TYPE_LABELS,
  TRAINING_TYPE_LABELS,
  STATUS_LABELS,
} from "@/types/profile";
import type {
  ClientsMeta,
  Measurement,
  ProgramListEntry,
  RoutineListEntry,
  VisitWithMeasurement,
} from "@/types/db";
import { updateClientAction, toggleClientStatusAction } from "../actions";
import { ClientFinances } from "./client-finances";
import { ClientRoutines } from "./client-routines";
import { ClientVisits } from "./client-visits";
import { ClientMeasurements } from "./client-measurements";

/** Profile row -> intake form values. Nulls become "" so inputs stay controlled. */
function toForm(client: Profile): ClientIntakeForm {
  return {
    ...EMPTY_INTAKE,
    full_name: client.full_name ?? "",
    email: client.email ?? "",
    phone: client.phone ?? "",
    national_id: client.national_id ?? "",
    birth_date: client.birth_date ?? "",
    gender: client.gender ?? "",
    address: client.address ?? "",
    occupation: client.occupation ?? "",
    blood_type: client.blood_type ?? "",
    emergency_contact_name: client.emergency_contact_name ?? "",
    emergency_contact_phone: client.emergency_contact_phone ?? "",
    client_type: client.client_type,
    training_type: (client.training_type ?? "in_person") as TrainingType,
    sports_experience: client.sports_experience ?? "",
    weekly_frequency_days:
      client.weekly_frequency_days != null
        ? String(client.weekly_frequency_days)
        : "",
    session_duration_min:
      client.session_duration_min != null
        ? String(client.session_duration_min)
        : "",
    height_cm: client.height_cm != null ? String(client.height_cm) : "",
    goals: client.goals ?? [],
    goal: client.goal ?? "",
    medical_notes: client.medical_notes ?? "",
    medications: client.medications ?? "",
    sports_injuries: client.sports_injuries ?? "",
    excluded_exercises: client.excluded_exercises ?? "",
    equipment_notes: client.equipment_notes ?? "",
  };
}

export function ClientDetail({
  client,
  meta,
  routines,
  programs,
  visits,
  measurements,
}: {
  client: Profile;
  meta: ClientsMeta | null;
  routines: RoutineListEntry[];
  programs: ProgramListEntry[];
  visits: VisitWithMeasurement[];
  measurements: Measurement[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<ClientStatus>(client.status);
  const [form, setForm] = useState<ClientIntakeForm>(() => toForm(client));

  async function onToggleStatus() {
    const next: ClientStatus = status === "active" ? "paused" : "active";
    setTogglingStatus(true);
    const result = await toggleClientStatusAction(client.id, next);
    setTogglingStatus(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setStatus(next);
    toast.success(
      next === "active" ? "Cliente activado" : "Cliente pausado",
    );
    router.refresh();
  }

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateClientAction(client.id, { ...form, status });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Cambios guardados");
      router.refresh();
    });
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-6 sm:py-12">
      <Link
        href="/portal/clientes"
        className="inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={16} />
        Volver a clientes
      </Link>

      <header className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">
            {form.full_name || "Sin nombre"}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone="accent">
              {TRAINING_TYPE_LABELS[form.training_type]}
            </Badge>
            <Badge tone="neutral">{CLIENT_TYPE_LABELS[form.client_type]}</Badge>
            {!client.has_account && (
              <Badge tone="muted">Sin acceso al portal</Badge>
            )}
            <Badge tone={status === "active" ? "neutral" : "muted"}>
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  status === "active" ? "bg-primary" : "bg-muted-2"
                }`}
              />
              {STATUS_LABELS[status]}
            </Badge>
          </div>
        </div>

        <Button
          variant="ghost"
          onClick={onToggleStatus}
          disabled={togglingStatus}
        >
          {status === "active" ? <Pause size={16} /> : <Play size={16} />}
          {status === "active" ? "Pausar cliente" : "Activar cliente"}
        </Button>
      </header>

      <form
        onSubmit={onSave}
        className="mt-8 rounded-card border border-border bg-surface/60 p-5 sm:p-6"
      >
        <h2 className="font-display text-lg font-semibold">Ficha del cliente</h2>

        <div className="mt-5 flex flex-col gap-6">
          <ClientIntakeFields
            form={form}
            onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
            disabled={pending}
            emailRequired={client.has_account}
            emailHint={
              client.has_account
                ? "Con este correo entra al portal"
                : "Opcional — solo contacto"
            }
          />
        </div>

        {error && (
          <p
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-xl border border-border-strong bg-base/60 px-3 py-2.5 text-sm text-ink"
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-primary" />
            <span>{error}</span>
          </p>
        )}

        <div className="mt-6 flex justify-end">
          <Button type="submit" loading={pending}>
            {pending ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </form>

      <ClientFinances clientId={client.id} meta={meta} />

      <ClientRoutines
        clientId={client.id}
        routines={routines}
        programs={programs}
      />

      <ClientVisits
        clientId={client.id}
        clientName={client.full_name}
        visits={visits}
      />

      <ClientMeasurements measurements={measurements} />
    </main>
  );
}
