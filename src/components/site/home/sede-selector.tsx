"use client";

import { landing } from "@/content/landing";
import { cn } from "@/lib/utils";
import { SmartLink } from "../smart-link";
import { WaitlistButton } from "../waitlist-modal";
import { useHomeParams } from "./home-params";

const { selector, sedes } = landing.home;

function Flecha() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0 transition-transform group-hover:translate-x-1"
    >
      <path d="M4 12h16M14 6l6 6-6 6" />
    </svg>
  );
}

/**
 * First thing after the hero: pick a sede and see what it offers. The choice
 * lives in `?sede=` (useHomeParams), so the schedule, prices, map and offers
 * below all follow it. A sede that hasn't opened can still be picked; its
 * list ends with the waitlist link.
 */
export function SedeSelector() {
  const { sede, set } = useHomeParams();
  const actual = sedes.lista.find((s) => s.id === sede);
  const servicios = selector.servicios[sede];

  return (
    <div>
      <p className="mb-5 text-[13px] font-semibold tracking-[1.2px] text-salvia uppercase">{selector.eyebrow}</p>
      <div role="group" aria-label={selector.eyebrow} className="flex gap-5 border-b border-linea md:gap-14">
        {sedes.lista.map((s) => {
          const selected = s.id === sede;
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={selected}
              onClick={() => set({ sede: s.id })}
              className={cn(
                "-mb-px flex min-w-0 flex-1 cursor-pointer flex-col items-start gap-2 border-b-[3px] pb-4 text-left transition-colors md:flex-none md:pb-5",
                selected ? "border-verde-profundo text-verde-profundo" : "border-transparent text-salvia hover:text-verde-profundo",
              )}
            >
              <span className="font-tf-serif text-[26px] leading-[1.05] md:text-[clamp(40px,5vw,64px)] md:leading-none">{s.corto}</span>
              <span className="text-[14px] text-musgo md:text-[15px]">{selector.zona}</span>
            </button>
          );
        })}
      </div>

      <ul className="mt-6">
        {servicios.map((s) => {
          const fila = (
            <>
              <span className="min-w-0 flex-1 font-tf-serif text-[30px] leading-[1.1] md:text-[clamp(30px,3.4vw,46px)]">
                {s.nombre}
              </span>
              <span className="hidden text-right text-[15px] text-musgo sm:block">{s.detalle}</span>
              {s.href && <Flecha />}
            </>
          );
          return (
            <li key={s.nombre} className="border-b border-linea">
              {s.href ? (
                <SmartLink href={s.href} className="group flex items-center gap-6 py-5 text-verde-profundo no-underline md:py-6">
                  {fila}
                </SmartLink>
              ) : (
                <div className="flex items-center gap-6 py-5 md:py-6">{fila}</div>
              )}
              <span className="-mt-3 block pb-4 text-[14px] text-musgo sm:hidden">{s.detalle}</span>
            </li>
          );
        })}
      </ul>

      {actual?.estado === "proximamente" && <WaitlistButton sede={sede} link className="mt-6" />}
    </div>
  );
}
