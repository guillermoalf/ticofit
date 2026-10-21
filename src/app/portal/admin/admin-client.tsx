"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MailPlus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DataList,
  StatusPill,
  type DataListColumn,
  type DataListFilter,
} from "@/components/portal/data-list";
import type { CoachAuthorization } from "@/types/preauth";
import { AuthorizeCoachPanel } from "./authorize-coach-panel";
import {
  revokeCoachAuthorizationAction,
  setCoachAuthorizedAction,
} from "./actions";

const dateFmt = new Intl.DateTimeFormat("es-CR", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function fmtDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFmt.format(date);
}

type CoachState = "pendiente" | "activo" | "suspendido";

/**
 * A ledger row's lifecycle: pending until the coach first signs in (which
 * consumes it), then active or suspended depending on profiles.authorized.
 */
function stateOf(row: CoachAuthorization): CoachState {
  if (!row.consumed_at || !row.account) return "pendiente";
  return row.account.authorized ? "activo" : "suspendido";
}

const STATE_LABELS: Record<CoachState, string> = {
  pendiente: "Pendiente",
  activo: "Activo",
  suspendido: "Suspendido",
};

const STATE_TONES: Record<CoachState, "amber" | "green" | "red"> = {
  pendiente: "amber",
  activo: "green",
  suspendido: "red",
};

const FILTERS: DataListFilter<CoachAuthorization>[] = [
  {
    key: "estado",
    label: "Estado",
    options: (Object.entries(STATE_LABELS) as [CoachState, string][]).map(
      ([value, label]) => ({ value, label }),
    ),
    getValue: stateOf,
  },
];

export function AdminClient({ rows }: { rows: CoachAuthorization[] }) {
  const router = useRouter();
  const [panelOpen, setPanelOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function onRevoke(row: CoachAuthorization) {
    setBusyId(row.id);
    try {
      const result = await revokeCoachAuthorizationAction(row.id);
      if (!result.ok) {
        toast.error("No se pudo revocar", { description: result.error });
        return;
      }
      toast.success("Invitación revocada", {
        description: `${row.email} ya no puede crear una cuenta.`,
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function onToggleAccess(row: CoachAuthorization) {
    if (!row.account) return;
    const next = !row.account.authorized;
    setBusyId(row.id);
    try {
      const result = await setCoachAuthorizedAction(row.account.id, next);
      if (!result.ok) {
        toast.error("No se pudo actualizar", { description: result.error });
        return;
      }
      toast.success(next ? "Acceso restaurado" : "Acceso suspendido", {
        description: next
          ? `${row.email} puede volver a entrar.`
          : `${row.email} no podrá entrar hasta que lo reactivés.`,
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  const columns: DataListColumn<CoachAuthorization>[] = [
    {
      key: "entrenador",
      header: "Entrenador",
      locked: true,
      searchValue: (r) => `${r.full_name ?? ""} ${r.email}`,
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">
            {r.account?.full_name || r.full_name || "Sin nombre"}
          </p>
          <p className="truncate text-xs text-muted">{r.email}</p>
        </div>
      ),
    },
    {
      key: "estado",
      header: "Estado",
      render: (r) => {
        const state = stateOf(r);
        return (
          <StatusPill tone={STATE_TONES[state]}>
            {STATE_LABELS[state]}
          </StatusPill>
        );
      },
    },
    {
      key: "autorizado",
      header: "Autorizado",
      hiddenByDefault: true,
      render: (r) => (
        <span className="whitespace-nowrap text-muted">
          {fmtDate(r.created_at)}
        </span>
      ),
    },
    {
      key: "ingreso",
      header: "Primer ingreso",
      hiddenByDefault: true,
      render: (r) => (
        <span className="whitespace-nowrap text-muted">
          {fmtDate(r.consumed_at)}
        </span>
      ),
    },
    {
      key: "acciones",
      header: "",
      align: "right",
      render: (r) => {
        const state = stateOf(r);
        const busy = busyId === r.id;
        return (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              state === "pendiente" ? onRevoke(r) : onToggleAccess(r)
            }
            className="whitespace-nowrap rounded-full border border-border px-3 py-1 text-xs text-muted transition-colors hover:border-border-strong hover:text-ink disabled:pointer-events-none disabled:opacity-50"
          >
            {busy
              ? "…"
              : state === "pendiente"
                ? "Revocar"
                : state === "activo"
                  ? "Suspender"
                  : "Reactivar"}
          </button>
        );
      },
    },
  ];

  const pending = rows.filter((r) => stateOf(r) === "pendiente").length;

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-widest text-primary">
            Administración
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">
            Entrenadores
          </h1>
          <p className="mt-1 text-sm text-muted">
            {rows.length} {rows.length === 1 ? "autorizado" : "autorizados"}
            {pending > 0 && ` · ${pending} sin activar`}
          </p>
        </div>
        <Button onClick={() => setPanelOpen(true)} className="shrink-0">
          <MailPlus size={18} />
          Autorizar entrenador
        </Button>
      </header>

      <section className="mt-8">
        {rows.length === 0 ? (
          <EmptyState onAdd={() => setPanelOpen(true)} />
        ) : (
          <DataList
            rows={rows}
            columns={columns}
            rowKey={(r) => r.id}
            filters={FILTERS}
            searchPlaceholder="Buscar por nombre o correo…"
            emptyMessage="No hay entrenadores que coincidan con tu búsqueda."
          />
        )}
      </section>

      <AuthorizeCoachPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
      />
    </main>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-card border border-dashed border-border-strong bg-surface/40 px-6 py-16 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-border-strong">
        <ShieldCheck size={24} className="text-primary" />
      </span>
      <h2 className="mt-5 font-display text-xl font-semibold">
        Todavía no autorizaste a ningún entrenador
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
        Esta plataforma es solo por invitación. Autorizá el correo de un
        entrenador para que pueda crear su cuenta y gestionar a sus clientes.
      </p>
      <div className="mt-6 flex justify-center">
        <Button onClick={onAdd}>
          <MailPlus size={18} />
          Autorizar entrenador
        </Button>
      </div>
    </div>
  );
}
