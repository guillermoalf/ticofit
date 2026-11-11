"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DataList,
  StatusPill,
  type DataListColumn,
  type DataListFilter,
} from "@/components/portal/data-list";
import { landing, type SedeId } from "@/content/landing";
import { telefonoLegible } from "@/lib/waitlist";
import type { WaitlistRow } from "@/types/waitlist";
import { setNotificadoAction } from "./actions";

const SEDE_LABELS = Object.fromEntries(
  landing.home.sedes.lista.map((s) => [s.id, s.corto]),
) as Record<SedeId, string>;

const dateFmt = new Intl.DateTimeFormat("es-CR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Costa_Rica",
});

const estadoOf = (r: WaitlistRow) => (r.notificado ? "avisado" : "pendiente");

/** wa.me link with the "we're open" message, addressed by first name. */
function whatsappUrl(r: WaitlistRow) {
  const nombre = r.nombre_completo.split(" ")[0];
  const sede = SEDE_LABELS[r.sede] ?? r.sede;
  const texto = landing.home.listaEspera.whatsapp.replace("{nombre}", nombre).replace("{sede}", sede);
  return `https://wa.me/506${r.telefono}?text=${encodeURIComponent(texto)}`;
}

function exportCsv(rows: WaitlistRow[]) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const header = ["Nombre", "Teléfono", "Correo", "Sede", "Fecha", "Estado"];
  const lines = rows.map((r) =>
    [
      r.nombre_completo,
      `+506 ${telefonoLegible(r.telefono)}`,
      r.email,
      SEDE_LABELS[r.sede] ?? r.sede,
      new Date(r.created_at).toISOString(),
      r.notificado ? "Avisado" : "Pendiente",
    ]
      .map(esc)
      .join(","),
  );
  // BOM so Excel opens the accents correctly.
  const blob = new Blob(["﻿" + [header.map(esc).join(","), ...lines].join("\r\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `lista-de-espera-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const FILTERS: DataListFilter<WaitlistRow>[] = [
  {
    key: "sede",
    label: "Sede",
    options: landing.home.sedes.lista.map((s) => ({ value: s.id, label: s.corto })),
    getValue: (r) => r.sede,
  },
  {
    key: "estado",
    label: "Estado",
    options: [
      { value: "pendiente", label: "Pendiente" },
      { value: "avisado", label: "Avisado" },
    ],
    getValue: estadoOf,
  },
];

export function WaitlistClient({ rows }: { rows: WaitlistRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const pendientes = rows.filter((r) => !r.notificado).length;

  async function toggle(r: WaitlistRow) {
    setBusyId(r.id);
    try {
      const res = await setNotificadoAction(r.id, !r.notificado);
      if (!res.ok) {
        toast.error("No se pudo actualizar", { description: res.error });
        return;
      }
      toast.success(r.notificado ? "Marcado como pendiente" : "Marcado como avisado");
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  const columns: DataListColumn<WaitlistRow>[] = [
    {
      key: "nombre",
      header: "Nombre",
      locked: true,
      searchValue: (r) => `${r.nombre_completo} ${r.email} ${r.telefono}`,
      render: (r) => <p className="truncate font-medium text-ink">{r.nombre_completo}</p>,
    },
    {
      key: "telefono",
      header: "Teléfono",
      render: (r) => (
        <a
          href={whatsappUrl(r)}
          target="_blank"
          rel="noopener noreferrer"
          className="whitespace-nowrap text-ink underline decoration-border-strong underline-offset-4 hover:decoration-primary"
        >
          {telefonoLegible(r.telefono)}
        </a>
      ),
    },
    {
      key: "email",
      header: "Correo",
      render: (r) => <span className="truncate text-muted">{r.email}</span>,
    },
    {
      key: "sede",
      header: "Sede",
      render: (r) => <span className="whitespace-nowrap text-muted">{SEDE_LABELS[r.sede] ?? r.sede}</span>,
    },
    {
      key: "fecha",
      header: "Fecha",
      render: (r) => <span className="whitespace-nowrap text-muted">{dateFmt.format(new Date(r.created_at))}</span>,
    },
    {
      key: "estado",
      header: "Estado",
      render: (r) => (
        <StatusPill tone={r.notificado ? "green" : "amber"}>{r.notificado ? "Avisado" : "Pendiente"}</StatusPill>
      ),
    },
    {
      key: "acciones",
      header: "",
      align: "right",
      render: (r) => (
        <button
          type="button"
          disabled={busyId === r.id}
          onClick={() => toggle(r)}
          className="whitespace-nowrap rounded-full border border-border px-3 py-1 text-xs text-muted transition-colors hover:border-border-strong hover:text-ink disabled:pointer-events-none disabled:opacity-50"
        >
          {busyId === r.id ? "…" : r.notificado ? "Marcar pendiente" : "Marcar avisado"}
        </button>
      ),
    },
  ];

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-widest text-primary">Sedes</p>
          <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">Lista de espera</h1>
          <p className="mt-1 text-sm text-muted">
            {rows.length} {rows.length === 1 ? "persona" : "personas"}
            {` · ${pendientes} ${pendientes === 1 ? "pendiente" : "pendientes"} de avisar`}
          </p>
        </div>
        <Button variant="ghost" onClick={() => exportCsv(rows)} disabled={rows.length === 0} className="shrink-0">
          <Download size={18} />
          Exportar CSV
        </Button>
      </header>

      <section className="mt-8">
        {rows.length === 0 ? (
          <div className="rounded-card border border-dashed border-border-strong bg-surface/40 px-6 py-16 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-border-strong">
              <ListChecks size={24} className="text-primary" />
            </span>
            <h2 className="mt-5 font-display text-xl font-semibold">Todavía nadie se anotó</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
              Las personas que dejen sus datos desde la página aparecen acá, la más reciente primero.
            </p>
          </div>
        ) : (
          <DataList
            rows={rows}
            columns={columns}
            rowKey={(r) => r.id}
            filters={FILTERS}
            searchPlaceholder="Buscar por nombre, correo o teléfono…"
            emptyMessage="Nadie coincide con tu búsqueda."
          />
        )}
      </section>
    </main>
  );
}
