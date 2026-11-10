"use client";

import { useState } from "react";

import { landing, type SedeId } from "@/content/landing";
import { cn } from "@/lib/utils";
import { Star } from "../icons";
import { PillLink } from "../pill-link";

const { tarjeta } = landing.home.hero;

/**
 * Cream card that rides up over the bottom of the hero colour field, as if the
 * next section were entering it. Sede choice feeds "Reservar", which opens
 * the class list filtered to that sede.
 */
export function HeroCard() {
  const [sede, setSede] = useState<SedeId>(tarjeta.sedes[0].id);

  return (
    <div className="tf-intro-cta relative z-10 mx-5 -mt-[72px] rounded-[28px] bg-crema-claro p-5 shadow-[0_-18px_40px_-28px] shadow-verde-profundo/25 md:p-7 lg:mx-10 lg:-mt-24 lg:flex lg:items-center lg:gap-8 lg:px-8 lg:py-6">
      <fieldset className="min-w-0 lg:flex-1">
        <legend className="mb-3 text-[12px] font-semibold tracking-[1.8px] text-salvia uppercase">
          {tarjeta.sedeLabel}
        </legend>
        <div className="flex flex-col gap-2 sm:flex-row">
          {tarjeta.sedes.map((s) => {
            const selected = s.id === sede;
            return (
              <label
                key={s.id}
                className={cn(
                  "flex min-h-14 flex-1 cursor-pointer items-center gap-3 rounded-full border px-5 transition-colors",
                  "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-verde-profundo",
                  selected ? "border-verde-profundo bg-verde-profundo text-crema-claro" : "border-linea-tag text-verde-profundo",
                )}
              >
                <input
                  type="radio"
                  name="hero-sede"
                  value={s.id}
                  checked={selected}
                  onChange={() => setSede(s.id)}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-2.5 shrink-0 rounded-full",
                    selected ? "bg-lima-claro" : "border border-salvia",
                  )}
                />
                <span className="min-w-0">
                  <span className="block text-[15px] leading-tight font-semibold">{s.nombre}</span>
                  <span className={cn("block text-[13px] leading-tight", selected ? "text-niebla" : "text-salvia")}>
                    {s.detalle}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-5 flex items-center gap-4 lg:mt-0">
        <div className="flex items-center gap-2.5" aria-label={tarjeta.ratingLabel} role="img">
          <span className="font-tf-serif text-[40px] leading-none">{tarjeta.rating}</span>
          <span>
            <span className="flex text-verde-profundo">
              {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} className="size-3.5" />
              ))}
            </span>
            <span className="mt-0.5 block text-[12px] text-salvia">{tarjeta.ratingDetalle}</span>
          </span>
        </div>

        <PillLink
          href={`${tarjeta.reservar.href}?sede=${sede}`}
          variant="verde"
          className="ml-auto min-h-[52px] px-8 text-[15px] font-semibold lg:ml-0"
        >
          {tarjeta.reservar.label}
        </PillLink>
      </div>
    </div>
  );
}
