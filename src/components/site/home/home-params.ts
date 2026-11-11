"use client";

import { usePathname, useSearchParams } from "next/navigation";

import { landing, type SedeId } from "@/content/landing";

const { sedes, horario } = landing.home;
const SERVICIOS = Object.keys(horario.cafe.servicios);

/**
 * Home page state kept in the URL: `?sede=` (shared by the hero card and the
 * schedule) and `?servicio=` (the schedule's class chip). Updates use
 * history.replaceState, which Next syncs into useSearchParams without a
 * navigation. A `servicio` only exists at Parque del Café, so it implies it.
 */
export function useHomeParams() {
  const params = useSearchParams();
  const pathname = usePathname();

  const rawServicio = params.get("servicio");
  const servicio = rawServicio && SERVICIOS.includes(rawServicio) ? rawServicio : SERVICIOS[0];
  const rawSede = params.get("sede");
  const sede: SedeId =
    rawSede === "cafe" || rawSede === "bellavista"
      ? rawSede
      : rawServicio && SERVICIOS.includes(rawServicio)
        ? "cafe"
        : sedes.porDefecto;

  const set = (updates: Partial<Record<"sede" | "servicio", string | null>>) => {
    const q = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) q.set(key, value);
      else q.delete(key);
    }
    if (q.get("sede") !== "cafe") q.delete("servicio");
    const qs = q.toString();
    window.history.replaceState(null, "", `${pathname}${qs ? `?${qs}` : ""}${window.location.hash}`);
  };

  return { sede, servicio, set };
}
