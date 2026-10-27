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
    clases: {
      title: "Clases",
      description:
        "Funcional, pilates reformer, yoga, barre, baile, recovery, open gym y entrenamiento personal.",
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
      { label: "Clases", href: "/clases" },
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
        { label: "Clases", href: "/clases" },
        { label: "Numa ProteinBar", href: "/numa" },
        { label: "Membresías", href: "/membresias" },
      ],
    },
    sufijoWordmark: "WELLNESS CLUB",
    copyright: "© 2026 ticofit wellness club · San José, Costa Rica",
  },

  home: {
    hero: {
      titulo: "Un nuevo comienzo",
      tituloItalico: "se siente.",
      subtitulo:
        "Tu club de bienestar en San José. Entrená, comé bien y recuperate en un solo lugar.",
      img: img("hero.jpg", "Salón de ticofit con luz natural de la mañana"),
      ctas: [reservar, { label: "Conocé el club", href: "/sedes" }],
    },
    intro: {
      titulo: ["Entrená, comé,", "recuperate y trabajá."],
      cta: { label: "RESERVÁ TU PRIMERA CLASE", href: whatsappUrl },
      kicker: "Bienvenido a ticofit: todo lo que tu cuerpo necesita, en un mismo lugar.",
      texto:
        "Clases que retan de verdad, comida real que alimenta y un espacio para recuperarte de lo que hiciste. Dos sedes, grupos pequeños y gente que se aprende tu nombre.",
    },
    tiles: [
      {
        titulo: "ENTRENÁ",
        pie: "Funcional, pesas y entrenamiento personal",
        chips: ["PAVAS", "PARQUE DEL CAFÉ"],
        href: "/clases",
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
        href: "/clases",
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
    clases: {
      kicker: "Nuestras clases",
      lista: [
        "FUNCIONAL",
        "PILATES REFORMER",
        "YOGA",
        "BARRE",
        "BAILE",
        "OPEN GYM",
        "ENTRENAMIENTO PERSONAL",
      ],
      href: "/clases",
      cta: { label: "VER TODAS", href: "/clases" },
      texto:
        "Grupos pequeños, con un coach que te corrige la técnica y te lleva el progreso. No es una clase donde sos uno más en el fondo del salón.",
      img: img("funcional.jpg", "Clase funcional en ticofit"),
    },
    sedes: {
      titulo: "Nuestras sedes",
      textoAntes: "Dos clubes en ",
      textoDestacado: "San José",
      textoDespues: " pensados para que entrenes, comas y te recuperes sin moverte de ahí.",
      cards: [
        {
          nombre: "TICOFIT PAVAS",
          badge: null,
          href: "/sedes",
          tono: "verde",
          img: img("opengym.jpg", "Piso de open gym en ticofit pavas"),
        },
        {
          nombre: "TICOFIT PARQUE DEL CAFÉ",
          badge: "ABRE PRONTO",
          href: "/sedes?sede=cafe",
          tono: "teal",
          img: img("cowork.jpg", "Interior de ticofit parque del café"),
        },
      ],
    },
    empezar: {
      titulo: "¿No sabés por dónde empezar?",
      texto: "Vení a una clase suelta antes de decidirte. Sin membresía y sin compromiso.",
      cta: { label: "VER EL CALENDARIO", href: "/clases" },
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
    ctaAncho: {
      titulo: "Reservá tu primera sesión",
      texto: "Da el primer paso hacia tu mejor versión.",
      cta: { label: "Empezar ahora", href: whatsappUrl },
      img: img("comunidad.jpg", "Comunidad de ticofit a la entrada del club"),
    },
    resenas: {
      rating: "4.9",
      estrellasLabel: "4.9 de 5 estrellas",
      cantidadLabel: "19 reseñas en Google",
      placeholders: [
        { texto: "[Pendiente — reseña real de Google]", autor: "[Nombre]" },
        { texto: "[Pendiente — reseña real de Google]", autor: "[Nombre]" },
        { texto: "[Pendiente — reseña real de Google]", autor: "[Nombre]" },
      ],
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
        { label: "Ver las clases", href: "/clases" },
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

  clases: {
    titulo: "Clases que se",
    tituloItalico: "sienten distinto.",
    texto:
      "Grupos pequeños, coaches que te corrigen y un salón donde se oye la respiración, no la música a todo volumen. Reservá desde tu cuenta.",
    filtro: {
      label: "Filtrar por sede",
      opciones: [
        { id: "todas" as const, label: "Todas" },
        { id: "pavas" as const, label: "ticofit pavas" },
        { id: "cafe" as const, label: "ticofit parque del café" },
      ],
    },
    cta: { label: "RESERVAR", href: whatsappUrl },
    items: [
      {
        nombre: "Funcional",
        sede: "cafe" as SedeId,
        sedeLabel: "PARQUE DEL CAFÉ",
        descripcion:
          "Fuerza, potencia y aguante en una sola hora. Hay clase todos los días y con la membresía entrás a la que quieras.",
        tags: ["Todos los días", "Grupo pequeño"],
        img: img("funcional.jpg", "Clase funcional con kettlebells"),
      },
      {
        nombre: "Pilates reformer",
        sede: "cafe" as SedeId,
        sedeLabel: "SALÓN MOVA · PARQUE DEL CAFÉ",
        descripcion:
          "Control, centro y movilidad sobre el reformer. Cupo muy limitado, así que el coach te ve toda la clase.",
        tags: ["Cupo limitado", "Nivel inicial y avanzado"],
        img: img("pilates.jpg", "Mujer en un reformer de pilates"),
      },
      {
        nombre: "Yoga",
        sede: "cafe" as SedeId,
        sedeLabel: "SALÓN MOVA · PARQUE DEL CAFÉ",
        descripcion:
          "Respirar, estirar y bajar revoluciones. Para abrir el día o para cerrarlo sin llevarte el trabajo a la casa.",
        tags: ["Grupo pequeño", "Mañana y tarde"],
        img: img("yoga.jpg", "Grupo de yoga en el salón"),
      },
      {
        nombre: "Barre",
        sede: "cafe" as SedeId,
        sedeLabel: "SALÓN MOVA · PARQUE DEL CAFÉ",
        descripcion:
          "Repeticiones chiquitas en la barra que al rato se sienten enormes. Piernas, glúteo y centro.",
        tags: ["Grupo pequeño", "Bajo impacto"],
        img: img("barre.jpg", "Clase de barre en la barra"),
      },
      {
        nombre: "Baile",
        sede: "cafe" as SedeId,
        sedeLabel: "SALÓN MOVA · PARQUE DEL CAFÉ",
        descripcion:
          "Cardio que no se siente cardio. Coreografías cortas, buena música y una hora que se pasa volando.",
        tags: ["Grupo pequeño", "Sin experiencia"],
        img: img("baile.jpg", "Clase de baile en el salón con espejos"),
      },
      {
        nombre: "Recovery",
        sede: "cafe" as SedeId,
        sedeLabel: "SALÓN RESET · PARQUE DEL CAFÉ",
        descripcion:
          "Sauna, cold plunge y terapia de luz roja. Lo que hace que mañana puedas volver a entrenar.",
        tags: ["Por sesión o paquete", "Sauna · Cold plunge · Luz roja"],
        img: img("recovery.jpg", "Sala de recovery con cold plunge"),
      },
      {
        nombre: "Open gym",
        sede: "pavas" as SedeId,
        sedeLabel: "TICOFIT PAVAS",
        descripcion:
          "Entrá a la hora que quieras y entrená a tu ritmo. Siempre hay un coach en piso por si necesitás que te revisen la técnica.",
        tags: ["Entrada libre", "Todo el horario"],
        img: img("opengym.jpg", "Piso de open gym con mancuernas"),
      },
      {
        nombre: "Entrenamiento personal",
        sede: "pavas" as SedeId,
        sedeLabel: "TICOFIT PAVAS",
        descripcion:
          "Uno a uno, con un plan hecho para vos y mediciones cada mes para ver si está funcionando.",
        tags: ["Paquetes de 4, 8 y 12", "Medición mensual"],
        img: img("personal.jpg", "Coach acompañando a un cliente"),
      },
      {
        nombre: "Fisioterapia y nutrición",
        sede: "pavas" as SedeId,
        sedeLabel: "CONSULTORIO · TICOFIT PAVAS",
        descripcion:
          "Profesionales que atienden dentro del club, para que no andes buscando cita por otro lado.",
        tags: ["Con cita", "Profesional externo"],
        img: img("hero.jpg", "Consultorio del club con luz natural"),
      },
    ],
    cierre: {
      titulo: "El calendario sale cada semana",
      texto:
        "Reservá tu campo desde la app. Si la clase ya se llenó, entrás en lista de espera y te avisamos apenas se libere un espacio.",
      cta: { label: "Ver membresías", href: "/membresias" },
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
