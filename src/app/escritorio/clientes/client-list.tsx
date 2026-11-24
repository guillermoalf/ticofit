"use client";

import { useState } from "react";
import Link from "next/link";

export type ClientRow = {
  id: string;
  full_name: string;
  sede_id: string;
  phone: string | null;
  national_id: string | null;
  email: string | null;
  user_id: string | null;
};

const plain = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Roster with accent-insensitive search. Never carries health data. */
export function ClientList({ rows, sedes }: { rows: ClientRow[]; sedes: Record<string, string> }) {
  const [query, setQuery] = useState("");
  const words = plain(query).split(/\s+/).filter(Boolean);
  const shown = rows.filter((r) => {
    const hay = plain([r.full_name, r.national_id, r.phone, r.email].filter(Boolean).join(" "));
    return words.every((w) => hay.includes(w));
  });

  return (
    <>
      <label htmlFor="client-search" className="sr-only">
        Buscar cliente
      </label>
      <input
        id="client-search"
        type="search"
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por nombre, cédula, teléfono o correo"
        className="mb-4 w-full max-w-xl rounded-xl border border-border-strong bg-surface px-4 py-3 text-[16px] text-ink outline-none placeholder:text-muted focus:border-primary"
      />
      {shown.length ? (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {shown.map((r) => (
            <li key={r.id}>
              <Link
                href={`/escritorio/clientes/${r.id}`}
                className="flex flex-wrap items-center justify-between gap-x-6 gap-y-0.5 px-5 py-3 hover:bg-surface-hover"
              >
                <span className="min-w-0 font-semibold">{r.full_name}</span>
                <span className="text-sm text-muted">
                  {[r.phone, sedes[r.sede_id], r.user_id ? "con acceso" : "sin acceso al portal"].filter(Boolean).join(" · ")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-border-strong bg-surface px-5 py-10 text-center text-muted">
          {rows.length ? "Ningún cliente coincide con la búsqueda." : "Todavía no hay clientes en esta sede."}
        </p>
      )}
    </>
  );
}
