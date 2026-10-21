"use client";

import { useCallback, useState } from "react";
import { Lock, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DataList,
  StatusPill,
  type DataListColumn,
  type DataListFilter,
} from "@/components/portal/data-list";
import { VisitFormModal } from "@/components/portal/visit-form";
import {
  PROCEDURE_TYPE_LABELS,
  type ProcedureType,
  type VisitRowWithClient,
} from "@/types/db";
import { CLIENT_TYPE_LABELS, type ClientType } from "@/types/profile";

const PROCEDURE_PILL_TONE: Record<
  ProcedureType,
  "violet" | "green" | "amber" | "neutral"
> = {
  medicion: "violet",
  rutina: "green",
  fisioterapia: "amber",
  otro: "neutral",
};

const currencyFmt = new Intl.NumberFormat("es-CR", {
  style: "currency",
  currency: "CRC",
  maximumFractionDigits: 0,
});

function localDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("es-CR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(y, m - 1, d));
}

const COLUMNS: DataListColumn<VisitRowWithClient>[] = [
  {
    key: "client_name",
    header: "Cliente",
    locked: true,
    searchValue: (v) => v.client_name ?? "",
    render: (v) => (
      <span className="font-medium text-ink">{v.client_name ?? "—"}</span>
    ),
  },
  {
    key: "visit_date",
    header: "Fecha",
    render: (v) => (
      <span className="tabular-nums text-muted">{localDate(v.visit_date)}</span>
    ),
  },
  {
    key: "procedure_type",
    header: "Procedimiento",
    hiddenByDefault: true,
    render: (v) => (
      <StatusPill tone={PROCEDURE_PILL_TONE[v.procedure_type]}>
        {PROCEDURE_TYPE_LABELS[v.procedure_type]}
      </StatusPill>
    ),
  },
  {
    key: "cost",
    header: "Costo",
    align: "right",
    hiddenByDefault: true,
    render: (v) => (
      <span className="tabular-nums text-muted">
        {v.cost != null ? currencyFmt.format(v.cost) : "—"}
      </span>
    ),
  },
  {
    key: "notes",
    header: "Notas",
    hiddenByDefault: true,
    render: (v) => (
      <span className="line-clamp-1 max-w-[220px] text-sm text-muted-2">
        {v.notes ?? "—"}
      </span>
    ),
  },
];

const FILTERS: DataListFilter<VisitRowWithClient>[] = [
  {
    key: "procedure_type",
    label: "Procedimiento",
    options: (
      Object.entries(PROCEDURE_TYPE_LABELS) as [ProcedureType, string][]
    ).map(([value, label]) => ({ value, label })),
    getValue: (v) => v.procedure_type,
  },
  {
    key: "client_type",
    label: "Tipo de cliente",
    options: (
      Object.entries(CLIENT_TYPE_LABELS) as [ClientType, string][]
    ).map(([value, label]) => ({ value, label })),
    getValue: (v) => v.client_type ?? "",
  },
];

export function VisitsClient({
  visits,
  clients,
}: {
  visits: VisitRowWithClient[];
  clients: { id: string; name: string }[];
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<VisitRowWithClient | null>(null);

  // The date range is the one filter DataList has no primitive for, so the
  // page owns it and hands DataList a predicate.
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const matchesDates = useCallback(
    (v: VisitRowWithClient) => {
      if (dateFrom && v.visit_date < dateFrom) return false;
      if (dateTo && v.visit_date > dateTo) return false;
      return true;
    },
    [dateFrom, dateTo],
  );

  function clearDates() {
    setDateFrom("");
    setDateTo("");
  }

  function openCreate() {
    setEditingVisit(null);
    setModalOpen(true);
  }

  function openEdit(v: VisitRowWithClient) {
    setEditingVisit(v);
    setModalOpen(true);
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 sm:px-6 sm:py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-widest text-primary">Coach</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-ink">Visitas</h1>
          <p className="mt-2 text-sm text-muted">
            Historial de procedimientos y costos de todos tus clientes.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={18} />
          Registrar visita
        </Button>
      </div>

      <div className="mt-6">
        <DataList
          rows={visits}
          columns={COLUMNS}
          rowKey={(v) => v.id}
          filters={FILTERS}
          predicate={matchesDates}
          extraFilterCount={(dateFrom ? 1 : 0) + (dateTo ? 1 : 0)}
          onResetExtraFilters={clearDates}
          extraFilters={
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted-2">Fecha</span>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  aria-label="Desde"
                  className="min-w-0 flex-1 rounded-lg border border-border bg-base/60 px-2.5 py-1.5 text-xs text-ink outline-none transition-colors focus:border-primary"
                />
                <span className="text-xs text-muted-2">—</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  aria-label="Hasta"
                  className="min-w-0 flex-1 rounded-lg border border-border bg-base/60 px-2.5 py-1.5 text-xs text-ink outline-none transition-colors focus:border-primary"
                />
                {(dateFrom || dateTo) && (
                  <button
                    type="button"
                    onClick={clearDates}
                    aria-label="Limpiar fechas"
                    className="shrink-0 rounded-full p-1 text-muted-2 transition-colors hover:text-ink"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          }
          summary={(rows) => (
            <div className="flex items-center gap-6">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-2">
                  Visitas
                </p>
                <p className="font-display text-lg font-bold tabular-nums text-ink">
                  {rows.length}
                </p>
              </div>
              <div>
                <p className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-2">
                  Total <Lock size={9} />
                </p>
                <p className="font-display text-lg font-bold tabular-nums text-ink">
                  {currencyFmt.format(
                    rows.reduce((sum, v) => sum + (v.cost ?? 0), 0),
                  )}
                </p>
              </div>
            </div>
          )}
          searchPlaceholder="Buscar por cliente…"
          emptyMessage="No hay visitas que coincidan con los filtros aplicados."
          onRowClick={openEdit}
        />
      </div>

      {modalOpen && (
        <VisitFormModal
          clients={clients}
          initialVisit={editingVisit ?? undefined}
          onClose={() => setModalOpen(false)}
          onSaved={() => setModalOpen(false)}
        />
      )}
    </main>
  );
}
