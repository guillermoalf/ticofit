/**
 * Google reviews shown on the home page, one at a time. Copy them word for
 * word from Google — never edit or invent one. The section renders only the
 * entries listed here; with a single entry it shows no progress bars.
 */

import { BRAND } from "@/config/brand";

export type Review = {
  nombre: string;
  texto: string;
  estrellas: number;
  /** Link to the review (or the Google listing). */
  url: string;
};

export const reviews: readonly Review[] = [
  {
    nombre: "Joes O.",
    texto:
      "Por mucho, el mejor gimnasio y un excelente servicio. Jeremy es un gran profesional y cuenta con un gran equipo de trabajo.El apoyo y la guía personalizada de TicoFit me ayudaron a alcanzar mis metas de salud, no sólo mediante las rutinas y el monitoreo de mi avance, sino también mediante educación y motivación constrante 100% recomendado!",
    estrellas: 5,
    url: BRAND.mapsUrl,
  },
  {
    nombre: "Daniel M.",
    texto: "Me encanta el gimnasio, muy bueno y excelente atención.",
    estrellas: 5,
    url: BRAND.mapsUrl,
  },
  {
    nombre:"Luis V.",
    texto:"Gimnasio boutique con atención personalizada. Excelente equipo y atención. Vale cada centavo. Totalmente recomendable",
    estrellas: 5,
    url:BRAND.mapsUrl,
  },
  {
    nombre:"Robin M.",
    texto:"Excelente ambiente , maquinas...... y el equipo super especial",
    estrellas: 5,
    url:BRAND.mapsUrl,
  },
  // Add the third review here, with the same shape:
  // { nombre: "…", texto: "…", estrellas: 5, url: BRAND.mapsUrl },
];
