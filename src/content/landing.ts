/**
 * Landing page content — single source of truth.
 *
 * Every string, price and schedule shown on the public site lives here. Do not
 * hardcode copy in components.
 *
 * PENDIENTE marks content Jeremy has not confirmed yet. Never replace a PENDIENTE
 * with invented data — it is meant to be visible on the page until the real value
 * arrives.
 */

export const PENDIENTE = "[Pendiente — Jeremy]" as const;

export const landing = {
  hero: {
    eyebrow: "Rohrmoser · San José",
    titulo: "Un nuevo comienzo",
    tituloItalico: "se siente.",
    subtitulo: PENDIENTE,
    ctaPrimario: { label: "Reservar", href: "/login" },
    ctaSecundario: { label: "Conocé el club", href: "#nosotros" },
    // Supplied by the client. No stock photography.
    media: { tipo: "video" as "video" | "imagen", src: PENDIENTE, poster: PENDIENTE },
  },

  pilares: [
    { titulo: "Wellness", texto: PENDIENTE },
    { titulo: "Strength", texto: PENDIENTE },
    { titulo: "Balance", texto: PENDIENTE },
  ],

  nosotros: {
    titulo: PENDIENTE,
    historia: PENDIENTE,
    // Only add team members once Jeremy confirms names, roles and photos.
    equipo: [] as Array<{
      nombre: string;
      rol: string;
      certificaciones: string;
      foto: string;
    }>,
  },

  /**
   * Disciplines offered. `sedes` says where each one is available.
   * Do not invent class schedules — those come from the booking system, not from here.
   */
  disciplinas: [
    { slug: "open-gym", nombre: "Open gym", descripcion: PENDIENTE, sedes: ["ayd"] },
    { slug: "personal-training", nombre: "Entrenamiento personal", descripcion: PENDIENTE, sedes: ["ayd", "cafe"] },
    { slug: "fisioterapia", nombre: "Fisioterapia", descripcion: PENDIENTE, sedes: ["ayd", "cafe"] },
    { slug: "nutricion", nombre: "Nutrición", descripcion: PENDIENTE, sedes: ["ayd", "cafe"] },
    { slug: "yoga", nombre: "Yoga", descripcion: PENDIENTE, sedes: ["cafe"] },
    { slug: "pilates", nombre: "Pilates", descripcion: PENDIENTE, sedes: ["cafe"] },
    { slug: "barre", nombre: "Barre", descripcion: PENDIENTE, sedes: ["cafe"] },
    { slug: "recovery", nombre: "Recovery", descripcion: PENDIENTE, sedes: ["cafe"] },
  ],

  /**
   * PRICES ARE NOT CONFIRMED.
   * Their own posters contradict each other on the open gym monthly rate: ₡40,000 on
   * one, ₡105,000 on another, while the quarterly ₡112,500 implies ₡37,500/month.
   * Leave `precio` as PENDIENTE until Jeremy confirms in writing.
   */
  membresias: [
    {
      slug: "open-gym",
      nombre: "Open gym",
      precio: PENDIENTE,
      periodo: "mensual",
      incluye: [PENDIENTE],
      destacado: false,
      sedes: ["ayd"],
    },
    {
      slug: "clases",
      nombre: "Clases",
      precio: PENDIENTE,
      periodo: "mensual",
      incluye: [PENDIENTE],
      destacado: true,
      sedes: ["cafe"],
    },
    {
      slug: "personal-training",
      nombre: "Entrenamiento personal",
      precio: PENDIENTE,
      periodo: "paquete",
      incluye: [PENDIENTE],
      destacado: false,
      sedes: ["ayd", "cafe"],
    },
  ],

  healthyBar: {
    nombre: "Healthy Bar",
    sede: "cafe",
    descripcion: PENDIENTE,
    // Menu items with their own prices. Same rule: nothing invented.
    menu: [] as Array<{ nombre: string; descripcion: string; precio: string }>,
  },

  sedes: [
    {
      slug: "ayd",
      nombre: "AyD",
      zona: "Rohrmoser, San José",
      direccion: PENDIENTE,
      maps: "https://maps.app.goo.gl/DQkPhczxUTHfDDae9",
      abierta: true,
      aforo: 25,
      horario: [
        { dias: "Lunes a viernes", horas: "6:00 a.m. – 9:00 p.m." },
        { dias: "Sábado", horas: "8:00 a.m. – 12:00 m.d." },
      ],
      fotos: [] as string[],
    },
    {
      slug: "cafe",
      nombre: "Parque del Café",
      zona: "San José",
      direccion: PENDIENTE,
      maps: PENDIENTE,
      abierta: false,
      aforo: 50,
      horario: [],
      fotos: [] as string[],
    },
  ],

  resenas: {
    rating: 4.9,
    cantidad: 19,
    fuente: "Google",
    url: "https://maps.app.goo.gl/DQkPhczxUTHfDDae9",
    // Paste real reviews here. Never write fictional ones.
    destacadas: [] as Array<{ autor: string; texto: string; fecha: string }>,
  },

  contacto: {
    telefono: "+506 8827-2099",
    whatsapp: "https://wa.me/50688272099",
    email: PENDIENTE,
    instagram: PENDIENTE,
  },
} as const;

export type Landing = typeof landing;
