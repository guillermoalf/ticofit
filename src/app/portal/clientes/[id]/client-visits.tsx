"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { DataList, StatusPill, type DataListColumn } from "@/components/portal/data-list";
import {
  PortalSection,
  SectionAction,
  SectionEmpty,
} from "@/components/portal/section-card";
import { VisitFormModal } from "@/components/portal/visit-form";
import { PROCEDURE_TYPE_LABELS, type ProcedureType, type VisitWithMeasurement } from "@/types/db";

const PROCEDURE_PILL_TONE: Record<
  ProcedureType,
  "violet" | "green" | "amber" | "neutral"
> = {
  medicion: "violet",
  rutina: "green",
  fisioterapia: "amber",
  otro: "neutral",
};

function localDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("es-CR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(y, m - 1, d));
}

const currencyFmt = new Intl.NumberFormat("es-CR", {
  style: "currency",
  currency: "CRC",
  maximumFractionDigits: 0,
});

const COLUMNS: DataListColumn<VisitWithMeasurement>[] = [
  {
    key: "visit_date",
    header: "Fecha",
    locked: true,
    render: (v) => (
      <span className="tabular-nums text-muted">{localDate(v.visit_date)}</span>
    ),
  },
  {
    key: "procedure_type",
    header: "Procedimiento",
    render: (v) => (
      <StatusPill tone={PROCEDURE_PILL_TONE[v.procedure_type]}>
        {PROCEDURE_TYPE_LABELS[v.procedure_type]}
      </StatusPill>
    ),
  },
  {
    key: "cost",
    header: "Costo",
    hiddenByDefault: true,
    align: "right",
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

export function ClientVisits({
  clientId,
  clientName,
  visits,
}: {
  clientId: string;
  clientName: string | null;
  visits: VisitWithMeasurement[];
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<VisitWithMeasurement | null>(null);

  function openCreate() {
    setEditingVisit(null);
    setModalOpen(true);
  }

  function openEdit(v: VisitWithMeasurement) {
    setEditingVisit(v);
    setModalOpen(true);
  }

  return (
    <PortalSection
      title="Visitas"
      summary={`${visits.length} ${
        visits.length === 1 ? "visita registrada" : "visitas registradas"
      }`}
      action={
        <SectionAction label="Registrar visita" onClick={openCreate}>
          <Plus size={18} />
        </SectionAction>
      }
    >
      {visits.length === 0 ? (
        <SectionEmpty>Sin visitas todavía.</SectionEmpty>
      ) : (
        <DataList
          rows={visits}
          columns={COLUMNS}
          rowKey={(v) => v.id}
          emptyMessage="No hay visitas registradas."
          onRowClick={openEdit}
        />
      )}

      {modalOpen && (
        <VisitFormModal
          preselectedClientId={clientId}
          preselectedClientName={clientName ?? undefined}
          initialVisit={
            editingVisit
              ? { ...editingVisit, client_name: clientName, client_type: null }
              : undefined
          }
          onClose={() => setModalOpen(false)}
          onSaved={() => setModalOpen(false)}
        />
      )}
    </PortalSection>
  );
}
