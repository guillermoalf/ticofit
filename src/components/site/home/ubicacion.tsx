"use client";

import type { ReactNode } from "react";

import { landing, type SedeId } from "@/content/landing";
import { PillLink } from "../pill-link";
import { useHomeParams } from "./home-params";

const { ubicacion } = landing.home;

/** Map and directions for one sede, shown under its schedule and prices. */
export function SedeUbicacion({ sede }: { sede: SedeId }) {
  const s = ubicacion.sedes.find((u) => u.id === sede);
  if (!s) return null;

  return (
    <div id={ubicacion.id} className="mt-14 scroll-mt-6">
      <p className="mb-4 text-[12px] font-semibold tracking-[1.8px] text-salvia uppercase">{ubicacion.eyebrow}</p>
      <div className="grid overflow-hidden rounded-2xl bg-crema-card md:grid-cols-[2fr_1fr]">
        {s.coords ? (
          <iframe
            key={s.id}
            title={ubicacion.mapaTitulo.replace("{sede}", s.nombre)}
            src={`https://maps.google.com/maps?q=${s.coords[0]},${s.coords[1]}&z=16&output=embed`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="aspect-[4/3] w-full border-0 md:aspect-auto md:h-full md:min-h-[340px]"
          />
        ) : (
          <div className="flex aspect-[4/3] w-full items-center justify-center bg-verde-profundo/6 px-8 text-center text-[15px] text-musgo md:aspect-auto md:min-h-[340px]">
            {ubicacion.pendiente}
          </div>
        )}
        <div className="flex flex-col justify-center gap-5 p-7">
          <div>
            <h3 className="font-tf-serif text-[32px] leading-[1.08] font-normal md:text-[36px]">
              {ubicacion.titulo} <span className="italic">{ubicacion.tituloItalico}</span>
            </h3>
            <p className="mt-4 text-[17px] font-semibold">{s.nombre}</p>
            <p className="mt-0.5 text-[15px] text-musgo">{s.detalle}</p>
          </div>
          {s.href && (
            <PillLink href={s.href} variant="verde" className="min-h-12 self-start px-7 text-[14px] font-semibold">
              {ubicacion.comoLlegar}
            </PillLink>
          )}
        </div>
      </div>
    </div>
  );
}

/** Renders its children only while the given sede is selected (`?sede=`). */
export function SoloSede({ sede, children }: { sede: SedeId; children: ReactNode }) {
  const { sede: actual } = useHomeParams();
  return actual === sede ? children : null;
}
