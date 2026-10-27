"use client";

import { useState } from "react";

import { landing } from "@/content/landing";
import { cn } from "@/lib/utils";
import { ClassRow } from "./class-row";

const { filtro, items } = landing.clases;
type FiltroId = (typeof filtro.opciones)[number]["id"];

/** Sede filter + the alternating class rows it controls. */
export function ClassFilter() {
  const [sede, setSede] = useState<FiltroId>("todas");
  const visibles = sede === "todas" ? items : items.filter((c) => c.sede === sede);

  return (
    <>
      <section className="px-5 pb-8 lg:px-10">
        <div role="group" aria-label={filtro.label} className="inline-flex flex-wrap gap-2">
          {filtro.opciones.map((opcion) => {
            const selected = opcion.id === sede;
            return (
              <button
                key={opcion.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setSede(opcion.id)}
                className={cn(
                  "min-h-11 cursor-pointer rounded-full border px-6 text-[14px] font-medium transition-colors",
                  selected
                    ? "border-verde-profundo bg-verde-profundo text-crema-claro"
                    : "border-linea-tag bg-transparent text-oliva",
                )}
              >
                {opcion.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="px-5 pb-6 lg:px-10">
        {visibles.map((clase, i) => (
          <ClassRow key={clase.nombre} clase={clase} reverse={i % 2 === 1} />
        ))}
      </section>
    </>
  );
}
