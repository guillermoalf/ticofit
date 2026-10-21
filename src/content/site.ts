/**
 * Site copy + swappable business data, derived from the BRAND config.
 *
 * Brand-level values (name, contact, location, socials) come from
 * `src/config/brand.ts` — edit them there, in one place. What lives here is
 * the marketing copy of the public landing (see `BRAND.showLanding`) plus small
 * shared helpers such as `formatCRC` and `waLink`.
 *
 * Copy is Spanish (the app's only language); code/comments are English.
 * Values marked PLACEHOLDER must be confirmed before launch.
 */

import { BRAND } from "@/config/brand";

export const SITE = {
  name: BRAND.name,
  tagline: BRAND.tagline,
  description: BRAND.description,
  url: BRAND.url,
  whatsapp: BRAND.contact.whatsapp,
  email: BRAND.contact.email,
} as const;

export const SOCIALS = {
  instagram: BRAND.socials.instagram,
  tiktok: BRAND.socials.tiktok,
  whatsapp: `https://wa.me/${SITE.whatsapp}`,
} as const;

export const LOCATION = BRAND.location;

/** Build a WhatsApp deep link with a prefilled Spanish message. */
export function waLink(message: string): string {
  return `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(message)}`;
}

/** Google Maps "directions to" link for the location. */
export const mapsDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${LOCATION.lat},${LOCATION.lng}`;

/** Embeddable Google Maps iframe src centered on the location (no API key). */
export const mapsEmbedUrl = `https://maps.google.com/maps?q=${LOCATION.lat},${LOCATION.lng}&z=15&output=embed`;

export const NAV_LINKS = [
  { href: "#servicios", label: "Servicios" },
  { href: "#nosotros", label: "Sobre nosotros" },
  { href: "#ubicacion", label: "Ubicación" },
  { href: "#contacto", label: "Contacto" },
] as const;

/** Format a CRC amount the Costa Rican way: ₡25.000 */
export function formatCRC(amount: number): string {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 0,
  }).format(amount);
}

export type Service = {
  id: string;
  title: string;
  description: string;
  /** PLACEHOLDER prices in CRC — set per client. */
  price: number;
  unit: string;
};

export const SERVICES: Service[] = [
  {
    id: "personal-training",
    title: "Personal Training",
    description:
      "Sesiones uno a uno diseñadas alrededor de tu objetivo, tu nivel y tu disponibilidad.",
    price: 18000,
    unit: "sesión",
  },
  {
    id: "evaluaciones",
    title: "Evaluaciones físicas",
    description:
      "Análisis de composición corporal, movilidad y fuerza para trazar un punto de partida claro.",
    price: 25000,
    unit: "evaluación",
  },
  {
    id: "rutinas",
    title: "Rutinas de gimnasio",
    description:
      "Programas mensuales estructurados para que cada visita al gimnasio tenga un propósito.",
    price: 30000,
    unit: "mes",
  },
  {
    id: "fisioterapia",
    title: "Sesiones de fisioterapia",
    description:
      "Recuperación y prevención de lesiones con un enfoque clínico basado en evidencia.",
    price: 22000,
    unit: "sesión",
  },
  {
    id: "coaching",
    title: "Coaching personalizado",
    description:
      "Acompañamiento integral: entrenamiento, hábitos y seguimiento continuo hacia tu meta.",
    price: 45000,
    unit: "mes",
  },
];

/**
 * "About us" copy for the landing's team section — all PLACEHOLDER.
 * The export name is legacy (kept so no identifier/import has to change);
 * read it as "the coach/team block".
 */
export const ANDRES = {
  name: "nosotros",
  role: "Tu equipo de entrenamiento",
  headline: "PLACEHOLDER — tu propuesta de valor en una línea",
  credentials: [
    "PLACEHOLDER — credencial 1",
    "PLACEHOLDER — credencial 2",
  ],
  bio: [
    "PLACEHOLDER — contá quién está detrás del gimnasio: formación, enfoque y qué hace distinto el trabajo que hacés con cada cliente.",
    "PLACEHOLDER — explicá cómo se estructura el proceso: evaluación inicial, plan a medida y seguimiento continuo.",
    "PLACEHOLDER — cerrá con el compromiso que asumís con quien entrena con vos.",
  ],
} as const;
