/**
 * Landing page content — single source of truth.
 *
 * Every string, price and class shown on the public site lives here. Do not
 * hardcode copy in components. Copy comes from the approved artboards in
 * design/landing/reference, written in voseo throughout.
 *
 * PENDIENTE marks content Jeremy has not sent yet. Never replace one with
 * invented data — it stays visible on the page until the real value arrives.
 *
 * Nothing here links to /login: only existing clients and staff can sign in,
 * so every "Reservar" / "Comprar" CTA opens WhatsApp instead.
 */

import { BRAND } from "@/config/brand";

export const PENDIENTE = "[Pendiente — Jeremy]" as const;

export type Img = { src: string; alt: string };
export type LinkItem = { label: string; href: string };
export type SedeId = "pavas" | "cafe";
export type HorarioClase = { hora: string; servicio: string; coach: string; cupos: number };

const whatsappUrl = `https://wa.me/${BRAND.contact.whatsapp}`;
const mapsUrl = BRAND.mapsUrl;

const img = (file: string, alt: string): Img => ({
  src: `/img/landing/${file}`,
  alt,
});

const reservar: LinkItem = { label: "Reservar", href: whatsappUrl };

export const landing = {
  meta: {
    home: {
      title: "ticofit wellness club — Un nuevo comienzo se siente.",
      description:
        "Tu club de bienestar en San José. Entrená, comé bien y recuperate en un solo lugar.",
    },
    sedes: {
      title: "Sedes",
      description:
        "ticofit pavas en Rohrmoser y ticofit parque del café. Dos sedes, dos clubes.",
    },
    numa: {
      title: "Numa ProteinBar",
      description: "El bar del club, solo en ticofit parque del café.",
    },
    membresias: {
      title: "Membresías",
      description:
        "Planes de ticofit pavas y ticofit parque del café. Precios mensuales, IVA aparte.",
    },
    comunidad: {
      title: "Comunidad",
      description: "La gente, el equipo y las reseñas de ticofit wellness club.",
    },
  },

  contacto: {
    telefono: "+506 8827-2099",
    whatsappUrl,
    mapsUrl,
  },

  nav: {
    sedesLabel: "Sedes",
    sedesMenu: [
      { label: "ticofit pavas", sub: "Rohrmoser", href: "/sedes" },
      { label: "ticofit parque del café", sub: "Abre pronto", href: "/sedes?sede=cafe" },
    ],
    links: [
      { label: "Clases", href: "/#horario" },
      { label: "Numa ProteinBar", href: "/numa" },
      { label: "Membresías", href: "/membresias" },
      { label: "Comunidad", href: "/comunidad" },
    ],
    reservar,
    inicioLabel: "ticofit, inicio",
    menuLabel: "Menú",
    abrirMenu: "Abrir menú",
    cerrarMenu: "Cerrar menú",
  },

  footer: {
    tagline: { linea: "Un nuevo comienzo", italica: "se siente." },
    whatsappCta: { label: "Escribinos por WhatsApp", href: whatsappUrl },
    sedes: {
      titulo: "SEDES",
      items: [
        { nombre: "ticofit pavas", detalle: "Rohrmoser, San José" },
        { nombre: "ticofit parque del café", detalle: "Abre pronto" },
      ],
    },
    contacto: {
      titulo: "CONTACTO",
      comoLlegar: "Cómo llegar",
      instagram: "[Instagram — pendiente]",
    },
    club: {
      titulo: "EL CLUB",
      links: [
        { label: "Clases", href: "/#horario" },
        { label: "Numa ProteinBar", href: "/numa" },
        { label: "Membresías", href: "/membresias" },
      ],
    },
    copyright: "© 2026 ticofit wellness club · San José, Costa Rica",
  },

  home: {
    hero: {
      eyebrow: "Club de bienestar en San José, Rohrmoser",
      verHorarios: "Ver horarios",
      sliderLabel: "Servicios de ticofit",
      tabsLabel: "Elegí un servicio",
      /**
       * One slide per service, in this order. `figura` is a cut-out PNG with a
       * transparent background in public/hero/ — replace the file to change it;
       * a neutral placeholder renders while the file is missing. `fondo` is a
       * palette token from BRAND (all pass AA against verde profundo text).
       * `tamano` sizes the figure box so each cut-out covers about the same
       * share of the word: "ancha" for landscape cut-outs, "media" for bulky
       * ones, "alta" for tall, narrow ones, "baja" for a landscape cut-out that
       * should only graze the top of the word.
       */
      slides: [
        {
          id: "reformer",
          nombre: "Pilates Reformer",
          descripcion:
            "Fuerza sin impacto. El reformer trabaja tu centro, mejora tu postura y se ajusta a tu nivel desde la primera clase. Grupos pequeños, con guía en cada movimiento.",
          horarios: "/?servicio=reformer#horario",
          fondo: "limaClaro",
          figura: { src: "/hero/reformer.png", alt: "Persona entrenando en un reformer de pilates", tamano: "ancha" as const },
        },
        {
          id: "yoga",
          nombre: "Yoga",
          descripcion:
            "Respirá, estirá y soltá la semana. Clases para ganar flexibilidad, equilibrio y calma, ya sea tu primera vez en el mat o tengas años practicando.",
          horarios: "/?servicio=yoga#horario",
          fondo: "celeste",
          figura: { src: "/hero/yoga.png", alt: "Persona en una postura de yoga", tamano: "baja" as const },
        },
        {
          id: "barre",
          nombre: "Barre",
          descripcion:
            "Movimientos pequeños, resultados que se notan. Barre combina técnica de ballet, pilates y fuerza para tonificar piernas, glúteos y centro, cuidando tus articulaciones.",
          horarios: "/?servicio=barre#horario",
          fondo: "amarilloVerde",
          figura: { src: "/hero/barre.png", alt: "Persona haciendo barre", tamano: "media" as const },
        },
        {
          id: "functional",
          nombre: "Functional System",
          descripcion:
            "Entrená para moverte mejor fuera del gym. Circuitos guiados de fuerza, cardio y coordinación que cambian cada clase, con un coach que adapta todo a tu nivel.",
          horarios: "/?servicio=functional#horario",
          fondo: "bandaSalvia",
          figura: { src: "/hero/functional.png", alt: "Persona en un entrenamiento funcional", tamano: "alta" as const },
        },
        {
          id: "open-gym",
          nombre: "Open Gym",
          descripcion:
            "Tu rutina, a tu ritmo. Pesas libres y espacio para entrenar cuando te quede bien, en un gym tranquilo, sin filas en un espacio grande.",
          horarios: "/?servicio=open-gym#horario",
          fondo: "lineaTag",
          figura: { src: "/hero/open-gym.png", alt: "Persona entrenando en el open gym", tamano: "alta" as const },
        },
        {
          id: "recovery",
          nombre: "Recovery",
          descripcion:
            "La otra mitad del entrenamiento. Sauna, terapia infrarroja y cold plunge para que tu cuerpo se recupere y llegues con ganas a la siguiente clase.",
          horarios: "/?servicio=recovery#horario",
          fondo: "niebla",
          figura: { src: "/hero/recovery.png", alt: "Persona recuperándose después de entrenar", tamano: "media" as const },
        },
      ],
      tarjeta: {
        sedeLabel: "Nuestras sedes",
        pavas: {
          nombre: "ticofit pavas",
          detalle: "Rohrmoser",
          horarios: { label: "Ver horarios", href: "/#horario" },
        },
        cafe: { nombre: "ticofit parque del café", badge: "Abre pronto" },
        rating: "4.9",
        ratingLabel: "4.9 de 5 estrellas en Google",
        ratingDetalle: "19 reseñas en Google",
        reservar: { label: "Reservar", href: "/#horario" },
      },
    },
    intro: {
      eyebrow: "Bienvenidos a ticofit",
      titulo: "Encontrá",
      tituloItalico: "tu espacio.",
      cta: { label: "RESERVÁ TU PRIMERA CLASE", href: whatsappUrl },
      texto:
        "Clases en grupos pequeños, Numa ProteinBar para comer bien, una sala de recovery con sauna, infrarrojo y cold plunge, y un espacio para trabajar entre una cosa y otra. Todo bajo el mismo techo, en dos sedes: Pavas y Parque del Café.",
    },
    tiles: [
      {
        titulo: "ENTRENÁ",
        pie: "Funcional, pesas y entrenamiento personal",
        chips: ["PAVAS", "PARQUE DEL CAFÉ"],
        href: "/#horario",
        img: img("barra.jpg", "Manos en una barra olímpica"),
      },
      {
        titulo: "COMÉ",
        pie: "Numa ProteinBar, adentro del club",
        chips: ["PARQUE DEL CAFÉ"],
        href: "/numa",
        img: img("numa.jpg", "Batido de proteína y bowl de fruta"),
      },
      {
        titulo: "RECUPERATE",
        pie: "Sauna, cold plunge y terapia roja",
        chips: ["PARQUE DEL CAFÉ"],
        href: "/?servicio=recovery#horario",
        img: img("sauna.jpg", "Sauna con terapia de luz roja"),
      },
      {
        titulo: "TRABAJÁ",
        pie: "Coworking para quedarse después",
        chips: ["PARQUE DEL CAFÉ"],
        href: "/sedes?sede=cafe",
        img: img("cowork.jpg", "Rincón de coworking del club"),
      },
    ],
    empezar: {
      id: "primera-clase",
      titulo: "¿No sabés por dónde empezar?",
      texto: "Vení a una clase suelta antes de decidirte. Sin membresía y sin compromiso.",
      cta: { label: "VER EL CALENDARIO", href: "#horario" },
      ofertas: [
        {
          titulo: "PRIMERA CLASE",
          texto: "Una clase a elegir. La forma más fácil de conocer ticofit.",
          precio: "₡20.000",
          cta: { label: "RESERVAR", href: whatsappUrl },
        },
        {
          titulo: "CLASE + RECOVERY",
          texto: "Una clase y una sesión de sauna y cold plunge. La experiencia completa.",
          precio: "₡45.000",
          cta: { label: "RESERVAR", href: whatsappUrl },
        },
      ],
      ivaLabel: "+ IVA",
    },
    horario: {
      id: "horario",
      eyebrow: "Horario",
      titulo: "Reservá tu",
      tituloItalico: "próxima clase.",
      /**
       * Shown under the title while `semana` holds sample rows. Set it to
       * null once Jeremy sends the real schedule.
       */
      aviso: `Horario de muestra. ${PENDIENTE}` as string | null,
      diasLabel: "Elegí un día",
      hoy: "Hoy",
      filtroLabel: "Filtrar por clase",
      todos: "Todos",
      columnas: { hora: "Hora", clase: "Clase", coach: "Coach", cupos: "Cupos" },
      cupo: "cupo disponible",
      cupos: "cupos disponibles",
      lleno: "Lleno",
      vacio: {
        dia: "No hay clases este día.",
        filtro: "No hay clases de este tipo este día.",
        accion: "Ver todas las clases",
      },
      /**
       * Without an account or an active membership, "Reservar" goes to buying
       * the first class. Direct booking for members arrives with the Reservas
       * y aforo module (there is no booking backend yet).
       */
      reservar: { label: "Reservar", href: "#primera-clase" },
      /**
       * Weekly template by day of the week (0 = domingo … 6 = sábado).
       * `servicio` is a slide id from `home.hero.slides`: the filter chips,
       * `?servicio=` and the hero "Ver horarios" links share that one list.
       *
       * PENDIENTE: SAMPLE rows to lay out the section. Replace them with
       * Jeremy's real schedule, coaches and capacities.
       */
      semana: {
        0: [],
        1: [
          { hora: "06:00", servicio: "functional", coach: PENDIENTE, cupos: 8 },
          { hora: "07:00", servicio: "reformer", coach: PENDIENTE, cupos: 3 },
          { hora: "09:00", servicio: "yoga", coach: PENDIENTE, cupos: 10 },
          { hora: "12:00", servicio: "open-gym", coach: PENDIENTE, cupos: 18 },
          { hora: "17:30", servicio: "barre", coach: PENDIENTE, cupos: 0 },
          { hora: "18:30", servicio: "recovery", coach: PENDIENTE, cupos: 4 },
        ],
        2: [
          { hora: "06:00", servicio: "reformer", coach: PENDIENTE, cupos: 5 },
          { hora: "08:00", servicio: "barre", coach: PENDIENTE, cupos: 9 },
          { hora: "12:00", servicio: "open-gym", coach: PENDIENTE, cupos: 20 },
          { hora: "18:00", servicio: "yoga", coach: PENDIENTE, cupos: 1 },
          { hora: "19:00", servicio: "functional", coach: PENDIENTE, cupos: 6 },
        ],
        3: [
          { hora: "06:00", servicio: "functional", coach: PENDIENTE, cupos: 7 },
          { hora: "07:00", servicio: "yoga", coach: PENDIENTE, cupos: 12 },
          { hora: "12:00", servicio: "open-gym", coach: PENDIENTE, cupos: 15 },
          { hora: "17:30", servicio: "reformer", coach: PENDIENTE, cupos: 2 },
          { hora: "18:30", servicio: "recovery", coach: PENDIENTE, cupos: 4 },
        ],
        4: [
          { hora: "06:00", servicio: "reformer", coach: PENDIENTE, cupos: 4 },
          { hora: "08:00", servicio: "barre", coach: PENDIENTE, cupos: 10 },
          { hora: "12:00", servicio: "open-gym", coach: PENDIENTE, cupos: 19 },
          { hora: "18:00", servicio: "yoga", coach: PENDIENTE, cupos: 8 },
          { hora: "19:00", servicio: "functional", coach: PENDIENTE, cupos: 0 },
        ],
        5: [
          { hora: "06:00", servicio: "functional", coach: PENDIENTE, cupos: 9 },
          { hora: "07:00", servicio: "yoga", coach: PENDIENTE, cupos: 11 },
          { hora: "12:00", servicio: "open-gym", coach: PENDIENTE, cupos: 22 },
          { hora: "17:00", servicio: "barre", coach: PENDIENTE, cupos: 6 },
          { hora: "18:00", servicio: "recovery", coach: PENDIENTE, cupos: 3 },
        ],
        6: [
          { hora: "08:00", servicio: "reformer", coach: PENDIENTE, cupos: 2 },
          { hora: "09:00", servicio: "yoga", coach: PENDIENTE, cupos: 12 },
          { hora: "10:00", servicio: "open-gym", coach: PENDIENTE, cupos: 16 },
        ],
      } as Record<number, readonly HorarioClase[]>,
    },
    resenas: {
      eyebrow: "Reseñas",
      rating: "4.9",
      estrellasLabel: "4.9 de 5 estrellas en Google",
      cantidadLabel: "19 reseñas en Google",
      verTodas: { label: "Ver todas en Google", href: mapsUrl },
      siguiente: "Siguiente reseña",
      progresoLabel: "Progreso de las reseñas",
    },
  },

  sedes: {
    titulo: "Dos sedes, dos clubes",
    texto: "No comparten horarios ni precios. Escogé una y toda la página se acomoda a esa sede.",
    tabsLabel: "Sede",
    porDefecto: "pavas" as SedeId,
    tabs: [
      { id: "pavas" as SedeId, label: "ticofit pavas" },
      { id: "cafe" as SedeId, label: "ticofit parque del café" },
    ],
    pavas: {
      badge: "ABIERTA HOY",
      nombre: "ticofit pavas",
      descripcion:
        "Rohrmoser, San José. El club original: open gym de verdad, entrá a la hora que quieras y entrená a tu ritmo, con un coach cerca si lo necesitás.",
      datos: [
        { label: "ENTRADA", valor: "Sin reserva", serif: true },
        { label: "AMBIENTE", valor: "Nunca lleno", serif: true },
        { label: "LUN A VIE", valor: "6:00\u00a0a.m. –\u00a09:00\u00a0p.m.", serif: false },
        { label: "SÁBADO", valor: "8:00\u00a0a.m. –\u00a012:00\u00a0m.d.", serif: false },
      ],
      ctas: [
        { label: "Ver precios de pavas", href: "/membresias?sede=pavas" },
        { label: "Cómo llegar", href: mapsUrl },
      ],
      img: img("opengym.jpg", "Piso de open gym en ticofit pavas"),
      panel: {
        titulo: "Qué hay acá",
        items: [
          "Open gym — ₡40.000 + IVA al mes",
          "Entrenamiento personal en paquetes de 4, 8 y 12",
          "Consultorio por hora: fisioterapia y nutrición",
          "Medición mensual con InBody y cinta métrica",
        ],
      },
    },
    cafe: {
      badge: "PRÓXIMAMENTE",
      nombre: "ticofit parque del café",
      descripcion:
        "El club nuevo. Acá reservás tu espacio antes de venir, hasta para el open gym, así nunca te toca hacer fila por una máquina.",
      datos: [
        { label: "ENTRADA", valor: "Con reserva", serif: true },
        { label: "CLASES", valor: "Grupos pequeños", serif: true },
        { label: "PILATES REFORMER", valor: "Cupo muy limitado", serif: false },
        { label: "APERTURA", valor: PENDIENTE, serif: false },
      ],
      ctas: [
        { label: "Ver membresías", href: "/membresias?sede=cafe" },
        { label: "Ver las clases", href: "/#horario" },
      ],
      img: img("pilates.jpg", "Salón mova de ticofit parque del café"),
      panel: {
        titulo: "Los salones",
        items: [
          { destacado: "mova", texto: " — pilates, yoga, barre y baile" },
          { destacado: "reset", texto: " — sauna, cold plunge y terapia roja" },
          { destacado: null, texto: "Salón funcional, con clase todos los días" },
          { destacado: null, texto: "Numa ProteinBar y coworking" },
        ],
      },
    },
  },

  numa: {
    badge: "SOLO EN PARQUE DEL CAFÉ",
    titulo: "Numa",
    tituloItalico: "ProteinBar",
    texto:
      "El bar del club. Lo que se toma después de entrenar, sin salir del edificio y sin tener que leer una etiqueta para saber qué lleva.",
    pendiente: "[Pendiente — Jeremy: descripción oficial de Numa, quién lo atiende y horario.]",
    img: img("numa.jpg", "Batido de proteína y bowl de fruta en Numa ProteinBar"),
    menu: {
      titulo: "El menú",
      texto: "Las categorías están listas; los platos y precios los pone ticofit.",
      categorias: [
        {
          nombre: "Batidos de proteína",
          descripcion: "Para después de entrenar, con fruta de temporada.",
        },
        {
          nombre: "Bowls y desayunos",
          descripcion: "Comida real para antes o después de la clase.",
        },
        {
          nombre: "Café y bebidas",
          descripcion: "Café de Costa Rica, aguas y bebidas frías.",
        },
      ],
      fila: { producto: "[Producto]", precio: "₡—" },
      filasPorCategoria: 4,
    },
    cierre: {
      texto: "Numa abre junto con ticofit parque del café.",
      cta: { label: "Ver la sede", href: "/sedes?sede=cafe" },
    },
  },

  membresias: {
    kicker: "LOS PLANES",
    titulo: "Elegí cómo querés",
    tituloItalico: "vivir ticofit.",
    texto:
      "Todos los planes incluyen recovery, porque recuperarse no es un extra. Precios mensuales, IVA aparte.",
    tabsLabel: "Sede",
    porDefecto: "cafe" as SedeId,
    tabs: [
      { id: "pavas" as SedeId, label: "ticofit pavas" },
      { id: "cafe" as SedeId, label: "ticofit parque del café" },
    ],
    ivaMes: "+ IVA · al mes",
    pavas: {
      openGym: {
        kicker: "LA MENSUALIDAD",
        nombre: "Open gym",
        precio: "₡40.000",
        incluye: [
          "Entrada libre todo el horario del club",
          "Coach en piso para corregirte la técnica",
          "Medición mensual con InBody",
          "Fisioterapia y nutrición con cita",
        ],
        cta: { label: "Empezar con open gym", href: whatsappUrl },
      },
      personal: {
        kicker: "SI QUERÉS ACOMPAÑAMIENTO",
        nombre: "Entrenamiento personal",
        texto: "Se suma a la mensualidad. Entre más sesiones, menos pagás por cada una.",
        paquetes: [
          { label: "4 sesiones al mes", precio: "₡17.500" },
          { label: "8 sesiones al mes", precio: "₡15.000" },
          { label: "12 sesiones al mes", precio: "₡12.500" },
        ],
        sufijo: " c/u + IVA",
        cta: { label: "Hablar con un coach", href: whatsappUrl },
      },
    },
    cafe: {
      planes: [
        {
          nombre: "Premium",
          kicker: "PARA EMPEZAR",
          precio: "₡60.000",
          tono: "oscuro" as const,
          badge: null,
          incluye: [
            "Open gym sin límite",
            "Clase funcional todos los días",
            "4 clases al mes en el salón mova",
            "Medición mensual con InBody",
          ],
          cta: { label: "Empezar con Premium", href: whatsappUrl },
        },
        {
          nombre: "Plus Premium",
          kicker: "EL MÁS ESCOGIDO",
          precio: "₡80.000",
          tono: "medio" as const,
          badge: null,
          incluye: [
            "Open gym sin límite",
            "Clase funcional todos los días",
            "8 clases al mes en el salón mova",
            "Medición mensual con InBody",
          ],
          cta: { label: "Empezar con Plus Premium", href: whatsappUrl },
        },
        {
          nombre: "Plus +",
          kicker: "ENTRENO Y RECUPERACIÓN",
          precio: "₡100.000",
          tono: "lima" as const,
          badge: "EL MÁS COMPLETO",
          incluye: [
            "Todo lo de Plus Premium",
            "Sesiones de recovery en el salón reset",
            "Sauna, cold plunge y luz roja",
            "Prioridad para reservar",
          ],
          cta: { label: "Empezar con Plus +", href: whatsappUrl },
        },
      ],
      comparativa: {
        titulo: "Todo de un",
        tituloItalico: "vistazo.",
        encabezado: "QUÉ INCLUYE",
        columnas: ["Premium", "Plus Premium", "Plus +"],
        filas: [
          { fila: "Open gym", valores: ["Sin límite", "Sin límite", "Sin límite"] },
          { fila: "Clase funcional diaria", valores: ["Sin límite", "Sin límite", "Sin límite"] },
          { fila: "Clases del salón mova", valores: ["4 al mes", "8 al mes", "8 al mes"] },
          { fila: "Recovery en el salón reset", valores: ["—", "—", "Incluido"] },
          { fila: "Medición mensual con InBody", valores: ["Incluida", "Incluida", "Incluida"] },
          { fila: "Numa ProteinBar", valores: ["Acceso", "Acceso", "Acceso"] },
        ],
        filaPrecio: {
          label: "PRECIO MENSUAL",
          valores: ["₡60.000", "₡80.000", "₡100.000"],
          sufijo: "+ IVA",
        },
      },
      recovery: {
        kicker: "SALÓN RESET",
        titulo: ["Sauna, cold plunge", "y luz roja."],
        texto:
          "Lo que hace que al día siguiente puedas volver. Viene incluido en Plus + o lo comprás por sesión.",
        img: img("sauna.jpg", "Sauna con terapia de luz roja en el salón reset"),
        precios: [
          { label: "1 sesión", precio: "₡25.000", sufijo: " + IVA" },
          { label: "2 sesiones", precio: "₡22.500", sufijo: " c/u + IVA" },
          { label: "3 sesiones", precio: "₡20.000", sufijo: " c/u + IVA" },
          { label: "4 sesiones", precio: "₡17.500", sufijo: " c/u + IVA" },
        ],
      },
      sueltas: {
        titulo: "¿Querés probar antes de",
        tituloItalico: "comprometerte?",
        texto:
          "Comprá clases sueltas y vení cuando puedas. Entre más clases, menos pagás por cada una.",
        paquetes: [
          {
            titulo: "4 CLASES AL MES",
            precio: "₡20.000",
            nota: "Una clase por semana, para probar sin amarrarte.",
          },
          {
            titulo: "8 CLASES AL MES",
            precio: "₡18.000",
            nota: "Dos por semana. El ritmo con el que sí se ven cambios.",
          },
          {
            titulo: "12 CLASES O MÁS",
            precio: "₡16.000",
            nota: "El mejor precio por clase, sin importar cuántas lleves.",
          },
        ],
        sufijo: "por clase · + IVA",
        cta: { label: "Comprar", href: whatsappUrl },
        nota: `También estamos armando planes de coworking y de cumpleaños. ${PENDIENTE}`,
      },
    },
    cta: {
      titulo: "¿Todavía no sabés cuál te sirve?",
      texto: "Escribinos y te ayudamos a escoger en dos minutos.",
      boton: { label: "Escribinos por WhatsApp", href: whatsappUrl },
    },
  },

  comunidad: {
    titulo: "Comunidad",
    texto:
      "ticofit nació de una idea sencilla: que entrenar también sea sentirse bien, acompañado y parte de algo. Acá nadie es un número de casillero.",
    pendiente: "[Pendiente — Jeremy: la historia del club en sus propias palabras.]",
    img: img("comunidad.jpg", "Miembros de ticofit a la entrada del club"),
    equipo: {
      titulo: "El equipo",
      retrato: "[Retrato]",
      nombre: "[Nombre]",
      rol: "[Rol y certificaciones]",
      cantidad: 4,
    },
    resenas: {
      rating: "4.9",
      cantidadLabel: "19 reseñas en Google",
      pendiente: "[Pendiente — Jeremy: dos o tres reseñas reales de Google, con nombre y fecha.]",
    },
  },
} as const;

export type Landing = typeof landing;
