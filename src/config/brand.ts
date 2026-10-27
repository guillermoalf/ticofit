/**
 * BRAND — the single place to theme this white-label base.
 *
 * Everything client-specific (name, accent color, contact data, location,
 * socials, logo file) lives here. Change these values and the whole app
 * follows: browser tab title, metadata, portal sidebar wordmark, accent
 * color and glows, WhatsApp/email links.
 *
 * Copy is Spanish (the app's only language); code/comments are English.
 * Values marked PLACEHOLDER must be replaced per client before launch.
 */

export const BRAND = {
  /** Displayed everywhere a brand name appears. Lowercase, always. */
  name: "ticofit wellness club",
  /** Short line under the name (metadata title, footer). */
  tagline: "Un nuevo comienzo se siente.",
  /** Meta description / OG description. */
  description:
    "Tu club de bienestar en San José. Entrená, comé bien y recuperate en un solo lugar.",
  /** PLACEHOLDER — production domain (used as metadataBase). */
  url: "https://example.com",

  /**
   * Optional logo image in /public (e.g. "/logo.png"). While it is null the
   * <Logo /> component renders the brand name as a text wordmark, so the app
   * ships with no branded binary. Drop a file in /public and set the path.
   */
  logoSrc: null as string | null,

  /** Typeset wordmark used by the public site: "tico" + italic "fit" + mark. */
  wordmark: { lead: "tico", italic: "fit", mark: "®" },

  /**
   * Accent color — the ONE hue on an otherwise monochrome dark base.
   * Defaults to a neutral light gray so the base ships brand-free; set a
   * client hue here and the tokens, glows and focus ring all follow.
   * `rgb` is the same color as space-separated channels (used by the glow
   * shadows); `ink` is the text color on a solid accent fill.
   */
  accent: {
    color: "#e4e4e7",
    rgb: "228 228 231",
    ink: "#0a0a0a",
  },

  /** PLACEHOLDER contact data. */
  contact: {
    /** Full international number, digits only (CR country code is 506). */
    whatsapp: "50688272099",
    email: "hola@example.com",
  },

  /** Google Maps link for ticofit pavas. */
  mapsUrl: "https://maps.app.goo.gl/DQkPhczxUTHfDDae9",

  /** PLACEHOLDER location. */
  location: {
    label: "Ciudad, País",
    street: "Dirección exacta",
    city: "San José",
    region: "San José",
    country: "CR",
    lat: 9.9333,
    lng: -84.0833,
  },

  /** PLACEHOLDER social profiles. */
  socials: {
    instagram: "https://www.instagram.com/",
    tiktok: "https://www.tiktok.com/",
  },
  /**
   * Public site palette (October 2026 rebrand). These are full-bleed colour
   * fields, not accents. Contrast rules: never white or cream text on
   * `limaClaro` (use `verdeProfundo`); never white text on `cremaClaro`.
   */
  palette: {
    verdeProfundo: "#24301C",
    limaClaro: "#B4D780",
    cremaClaro: "#FFFEE1",
    celeste: "#81B6BD",
    amarilloVerde: "#E1E289",
    negroGrisaceo: "#242424",
  },

  /**
   * Derived tones taken from the approved landing artboards
   * (design/landing/reference). Near-duplicates were merged; three muted
   * text tones were darkened to pass WCAG AA on their backgrounds.
   */
  site: {
    // Text on light backgrounds
    musgo: "#4A5A3E",
    salvia: "#5B6B4E",
    oliva: "#3B4A2E",
    teal: "#10343A",
    limaSub: "#35472A",
    // Light surfaces
    cremaCard: "#EDEFC8",
    cremaSuave: "#E6E8C4",
    bandaSalvia: "#8FA06F",
    bandaTinta: "#1E2A16",
    // Light rules
    linea: "#DADCAE",
    lineaTag: "#C3C78F",
    // Dark surfaces
    verdeNoche: "#1A2314",
    verdeMedio: "#2D3A22",
    // Dark rules
    lineaOscura: "#3C4A30",
    lineaOscuraSuave: "#2E3A23",
    lineaPlan: "#4C5C3C",
    // Text on dark backgrounds
    nieblaClara: "#E4EDD6",
    niebla: "#D9E6C6",
    nieblaMedia: "#C8D6B6",
    nieblaSuave: "#9FB08E",
    // Over photography
    textoFoto: "#E2EAD4",
    overlayVerde: "#141C0E",
    overlayTeal: "#0A1E22",
  },

  /**
   * Public site typefaces and the CSS variables next/font exposes them on.
   * next/font only accepts literal options, so src/app/(site)/layout.tsx
   * repeats these values — keep the two in sync.
   */
  fonts: {
    display: { family: "Instrument Serif", cssVar: "--font-instrument-serif" },
    body: { family: "Figtree", cssVar: "--font-figtree" },
  },
} as const;

/** kebab-case CSS variable name for a palette/site token, e.g. `--tf-verde-profundo`. */
function tokenVar(key: string): string {
  return `--tf-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
}

/**
 * Public site colour tokens as inline CSS variables. Applied on the `(site)`
 * layout wrapper; globals.css maps them to Tailwind colours (`bg-verde-profundo`,
 * `text-musgo`, …) so components never carry a hex.
 */
export function siteCssVars(): React.CSSProperties {
  const tokens = { ...BRAND.palette, ...BRAND.site };
  return Object.fromEntries(
    Object.entries(tokens).map(([key, value]) => [tokenVar(key), value]),
  ) as React.CSSProperties;
}

/**
 * Accent tokens as inline CSS variables. Applied on <html> in the root
 * layout so the TypeScript config — not the stylesheet — is the source of
 * truth for the theme color; globals.css only carries the fallback values.
 */
export function brandCssVars(): React.CSSProperties {
  return {
    "--primary": BRAND.accent.color,
    "--primary-2": BRAND.accent.color,
    "--accent": BRAND.accent.color,
    "--primary-ink": BRAND.accent.ink,
    "--accent-rgb": BRAND.accent.rgb,
  } as React.CSSProperties;
}
