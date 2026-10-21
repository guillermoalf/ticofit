"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DataList,
  StatusPill,
  type DataListColumn,
  type DataListFilter,
} from "@/components/portal/data-list";
import type { RosterEntry } from "@/types/db";
import { PAYMENT_STATUS_LABELS, type PaymentStatus } from "@/types/db";
import { CLIENT_TYPE_LABELS, type ClientType } from "@/types/profile";
import { AddClientPanel } from "./add-client-panel";

const crc = new Intl.NumberFormat("es-CR", {
  style: "currency",
  currency: "CRC",
  maximumFractionDigits: 0,
});

const dateFmt = new Intl.DateTimeFormat("es-CR", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** Formats a date-only column (YYYY-MM-DD) without timezone drift. */
function fmtDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? "—" : dateFmt.format(date);
}

/** clients_meta.active when the row exists; roster status otherwise. */
function isActive(c: RosterEntry): boolean {
  return c.clients_meta ? c.clients_meta.active : c.status === "active";
}

const PAYMENT_TONES: Record<PaymentStatus, "green" | "amber" | "red"> = {
  al_dia: "green",
  por_vencer: "amber",
  vencido: "red",
};

const CLIENT_TYPE_TONES: Record<ClientType, "green" | "amber" | "violet" | "neutral"> = {
  personal_training: "green",
  fisioterapia: "amber",
  rutinas: "violet",
  otro: "neutral",
};

/**
 * Only "Nombre" and "Activo" show by default — the two things a coach needs
 * at a glance on a phone. Everything else is one tap away in the gear popover.
 */
const COLUMNS: DataListColumn<RosterEntry>[] = [
  {
    key: "nombre",
    header: "Nombre",
    locked: true,
    searchValue: (c) => `${c.full_name ?? ""} ${c.email ?? ""}`,
    render: (c) => (
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border-strong font-display text-xs font-semibold text-ink">
          {(c.full_name ?? "?")
            .split(" ")
            .slice(0, 2)
            .map((p) => p[0]?.toUpperCase() ?? "")
            .join("") || "?"}
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">
            {c.full_name || "Sin nombre"}
          </p>
          <p className="truncate text-xs text-muted">
            {c.email ?? (c.has_account ? "" : "Sin acceso al portal")}
          </p>
        </div>
      </div>
    ),
  },
  {
    key: "tipo",
    hiddenByDefault: true,
    header: "Tipo",
    render: (c) => (
      <StatusPill tone={CLIENT_TYPE_TONES[c.client_type]}>
        {CLIENT_TYPE_LABELS[c.client_type]}
      </StatusPill>
    ),
  },
  {
    key: "activo",
    header: "Activo",
    render: (c) =>
      isActive(c) ? (
        <StatusPill tone="green">Activo</StatusPill>
      ) : (
        <StatusPill tone="neutral">Inactivo</StatusPill>
      ),
  },
  {
    key: "mensualidad",
    hiddenByDefault: true,
    header: "Mensualidad",
    align: "right",
    render: (c) => (
      <span className="tabular-nums">
        {c.clients_meta?.monthly_fee != null
          ? crc.format(c.clients_meta.monthly_fee)
          : "—"}
      </span>
    ),
  },
  {
    key: "fecha_ingreso",
    hiddenByDefault: true,
    header: "Fecha ingreso",
    render: (c) => (
      <span className="text-muted">{fmtDate(c.clients_meta?.join_date)}</span>
    ),
  },
  {
    key: "fecha_pago",
    hiddenByDefault: true,
    header: "Fecha de pago",
    render: (c) => (
      <span className="text-muted">
        {fmtDate(c.clients_meta?.next_payment_date)}
      </span>
    ),
  },
  {
    key: "estado_pago",
    hiddenByDefault: true,
    header: "Estado de pago",
    render: (c) => {
      const status = c.clients_meta?.payment_status;
      if (!status) return <span className="text-muted-2">—</span>;
      return (
        <StatusPill tone={PAYMENT_TONES[status]}>
          {PAYMENT_STATUS_LABELS[status]}
        </StatusPill>
      );
    },
  },
];

const FILTERS: DataListFilter<RosterEntry>[] = [
  {
    key: "tipo",
    label: "Tipo",
    options: (
      Object.entries(CLIENT_TYPE_LABELS) as [ClientType, string][]
    ).map(([value, label]) => ({ value, label })),
    getValue: (c) => c.client_type,
  },
  {
    key: "activo",
    label: "Activo",
    options: [
      { value: "activo", label: "Activos" },
      { value: "inactivo", label: "Inactivos" },
    ],
    getValue: (c) => (isActive(c) ? "activo" : "inactivo"),
  },
  {
    key: "estado_pago",
    label: "Estado de pago",
    options: (
      Object.entries(PAYMENT_STATUS_LABELS) as [PaymentStatus, string][]
    ).map(([value, label]) => ({ value, label })),
    getValue: (c) => c.clients_meta?.payment_status ?? "",
  },
];

export function RosterClient({ clients }: { clients: RosterEntry[] }) {
  const router = useRouter();
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-widest text-primary">
            Coach
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">
            Clientes
          </h1>
          <p className="mt-1 text-sm text-muted">
            {clients.length} {clients.length === 1 ? "cliente" : "clientes"} en
            total
          </p>
        </div>
        <Button onClick={() => setPanelOpen(true)} className="shrink-0">
          <UserPlus size={18} />
          Agregar cliente
        </Button>
      </header>

      <section className="mt-8">
        {clients.length === 0 ? (
          <EmptyState onAdd={() => setPanelOpen(true)} />
        ) : (
          <DataList
            rows={clients}
            columns={COLUMNS}
            rowKey={(c) => c.id}
            filters={FILTERS}
            searchPlaceholder="Buscar por nombre o correo…"
            emptyMessage="No hay clientes que coincidan con tu búsqueda."
            onRowClick={(c) => router.push(`/portal/clientes/${c.id}`)}
          />
        )}
      </section>

      <AddClientPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
    </main>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-card border border-dashed border-border-strong bg-surface/40 px-6 py-16 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-border-strong">
        <Users size={24} className="text-primary" />
      </span>
      <h2 className="mt-5 font-display text-xl font-semibold">
        Todavía no tenés clientes
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
        Agregá a tu primer cliente para empezar a gestionar sus rutinas y su
        progreso.
      </p>
      <div className="mt-6 flex justify-center">
        <Button onClick={onAdd}>
          <UserPlus size={18} />
          Agregar cliente
        </Button>
      </div>
    </div>
  );
}
