"use client";

import { DataList, type DataListColumn } from "@/components/portal/data-list";
import { PortalSection, SectionEmpty } from "@/components/portal/section-card";
import type { Measurement } from "@/types/db";

function localDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("es-CR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(y, m - 1, d));
}

function num(v: number | null, unit: string) {
  return v != null ? `${v} ${unit}` : "—";
}

const COLUMNS: DataListColumn<Measurement>[] = [
  {
    key: "measured_at",
    header: "Fecha",
    locked: true,
    render: (m) => (
      <span className="tabular-nums text-muted">{localDate(m.measured_at)}</span>
    ),
  },
  {
    key: "weight",
    header: "Peso",
    align: "right",
    render: (m) => (
      <span className="tabular-nums text-ink">{num(m.weight, "kg")}</span>
    ),
  },
  {
    key: "muscle_pct",
    header: "Músculo",
    hiddenByDefault: true,
    align: "right",
    render: (m) => (
      <span className="tabular-nums text-ink">{num(m.muscle_pct, "%")}</span>
    ),
  },
  {
    key: "fat_pct",
    header: "Grasa",
    hiddenByDefault: true,
    align: "right",
    render: (m) => (
      <span className="tabular-nums text-ink">{num(m.fat_pct, "%")}</span>
    ),
  },
];

/**
 * Coach-only measurements list. Edit is done via the visit form when the
 * visit is a medición; this component is read-only. Charts come in Fase G.
 */
export function ClientMeasurements({ measurements }: { measurements: Measurement[] }) {
  return (
    <PortalSection
      title="Mediciones"
      summary={`${measurements.length} ${
        measurements.length === 1 ? "registro" : "registros"
      } — se editan desde la visita`}
    >
      {measurements.length === 0 ? (
        <SectionEmpty>Sin mediciones todavía.</SectionEmpty>
      ) : (
        <DataList
          rows={measurements}
          columns={COLUMNS}
          rowKey={(m) => m.id}
          emptyMessage="Sin mediciones."
        />
      )}
    </PortalSection>
  );
}
