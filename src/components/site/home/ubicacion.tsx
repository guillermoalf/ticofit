"use client";

import { useId, type ReactNode } from "react";

import { landing, type SedeId } from "@/content/landing";
import { PillLink } from "../pill-link";
import { useHomeParams } from "./home-params";
import { MAPA_H, MAPA_W, MAPAS, type MapaSede } from "./mapas.generated";

const { ubicacion } = landing.home;

/** Illustrated map and directions for one sede, shown under its schedule and prices. */
export function SedeUbicacion({ sede }: { sede: SedeId }) {
  const s = ubicacion.sedes.find((u) => u.id === sede);
  if (!s) return null;
  const mapa = MAPAS[sede];
  const destino = s.coords ? `${s.coords[0]},${s.coords[1]}` : null;
  const links = destino
    ? [
        { label: ubicacion.waze, href: `https://waze.com/ul?ll=${destino}&navigate=yes` },
        { label: ubicacion.googleMaps, href: s.href ?? `https://www.google.com/maps/dir/?api=1&destination=${destino}` },
      ]
    : [];

  return (
    <div id={ubicacion.id} className="mt-14 scroll-mt-6">
      <p className="mb-4 text-[12px] font-semibold tracking-[1.8px] text-salvia uppercase">{ubicacion.eyebrow}</p>
      <div className="grid overflow-hidden rounded-2xl bg-verde-profundo text-crema-claro md:grid-cols-[3fr_2fr]">
        <div className="relative aspect-[4/5] md:aspect-auto md:h-[clamp(360px,50vh,520px)]">
          {mapa ? (
            <MapaIlustrado mapa={mapa} titulo={ubicacion.mapaTitulo.replace("{sede}", s.nombre)} />
          ) : (
            <div className="flex h-full items-center justify-center px-8 text-center text-[15px]">
              {ubicacion.pendiente}
            </div>
          )}
          {mapa && (
            <span className="absolute right-3 bottom-2 rounded-full bg-verde-profundo/85 px-2 py-0.5 text-[11px] text-crema-claro/80">{ubicacion.credito}</span>
          )}
        </div>
        <div className="flex flex-col justify-center gap-6 p-7 md:p-9">
          <div>
            <h3 className="font-tf-serif text-[32px] leading-[1.08] font-normal md:text-[38px]">
              {ubicacion.titulo} <span className="italic">{ubicacion.tituloItalico}</span>
            </h3>
            <p className="mt-4 text-[17px] font-semibold">{s.nombre}</p>
            <p className="mt-0.5 text-[15px] text-crema-claro/80">{s.detalle}</p>
          </div>
          {links.length > 0 && (
            <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
              {links.map((l, i) => (
                <PillLink
                  key={l.label}
                  href={l.href}
                  variant={i === 0 ? "lima" : "outlineLima"}
                  className="min-h-12 px-7 text-[14px]"
                >
                  {l.label}
                </PillLink>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Flat street map in the brand palette, drawn from OpenStreetMap data baked
 * by scripts/mapas.py. The sede sits at the centre; `slice` crops the sides
 * on narrow screens and keeps the pin in view.
 */
function MapaIlustrado({ mapa, titulo }: { mapa: MapaSede; titulo: string }) {
  const id = useId();
  const cx = MAPA_W / 2;
  const cy = MAPA_H / 2;

  return (
    <svg
      viewBox={`0 0 ${MAPA_W} ${MAPA_H}`}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={titulo}
      className="absolute inset-0 h-full w-full font-tf-sans"
    >
      <defs>
        <pattern id={`${id}-p`} width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="16" height="16" className="fill-verde-profundo" />
          <rect width="5" height="16" className="fill-lima-claro" />
        </pattern>
      </defs>

      <path d={mapa.parks} fill={`url(#${id}-p)`} />
      {mapa.roads.map((r) => (
        <path
          key={r.w}
          d={r.d}
          fill="none"
          strokeWidth={r.w}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-crema-claro"
        />
      ))}

      {mapa.labels.map((l, i) => (
        <g key={l.name}>
          <path id={`${id}-l${i}`} d={l.d} fill="none" />
          <text dy="5.5" fontSize="15" fontWeight="700" letterSpacing="2.2" className="fill-verde-profundo">
            <textPath href={`#${id}-l${i}`} startOffset="50%" textAnchor="middle">
              {l.name.toUpperCase()}
            </textPath>
          </text>
        </g>
      ))}

      {mapa.landmarks.map((m) => {
        const izquierda = m.x > cx;
        return (
          <g key={m.name}>
            <circle cx={m.x} cy={m.y} r="8" strokeWidth="4" className="fill-celeste stroke-verde-profundo" />
            <text
              x={m.x + (izquierda ? -16 : 16)}
              y={m.y + 7}
              textAnchor={izquierda ? "end" : "start"}
              fontSize="20"
              fontWeight="600"
              strokeWidth="7"
              paintOrder="stroke"
              strokeLinejoin="round"
              className="fill-crema-claro stroke-verde-profundo"
            >
              {m.name}
            </text>
          </g>
        );
      })}

      <g transform={`translate(${cx} ${cy})`}>
        <circle r="26" className="fill-lima-claro/30" />
        <circle r="11" strokeWidth="5" className="fill-verde-profundo stroke-lima-claro" />
        <path d="M0 -22 L-13 -44 L13 -44 Z" className="fill-lima-claro" />
        <rect x="-98" y="-112" width="196" height="70" rx="35" className="fill-lima-claro" />
        <text y="-63" textAnchor="middle" fontSize="46" className="fill-verde-profundo font-tf-serif">
          {ubicacion.pin}
        </text>
      </g>
    </svg>
  );
}

/** Renders its children only while the given sede is selected (`?sede=`). */
export function SoloSede({ sede, children }: { sede: SedeId; children: ReactNode }) {
  const { sede: actual } = useHomeParams();
  return actual === sede ? children : null;
}
