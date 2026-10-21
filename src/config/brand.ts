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
  /** Displayed everywhere a brand name appears. PLACEHOLDER. */
  name: "Tu Gimnasio",
  /** Short line under the name (metadata title, footer). PLACEHOLDER. */
  tagline: "Entrenamiento con seguimiento real",
  /** Meta description / OG description. PLACEHOLDER. */
  description:
    "Portal de clientes: rutinas, progreso, medidas y pagos en un solo lugar.",
  /** PLACEHOLDER — production domain (used as metadataBase). */
  url: "https://example.com",

  /**
   * Optional logo image in /public (e.g. "/logo.png"). While it is null the
   * <Logo /> component renders the brand name as a text wordmark, so the app
   * ships with no branded binary. Drop a file in /public and set the path.
   */
  logoSrc: null as string | null,

  /**
   * Public marketing landing at `/`. While this is false the root route
   * redirects to /login and the base ships as a portal only. Set it to true
   * to render the landing sections (Navbar, Hero, Servicios, …) — remember
   * to replace the PLACEHOLDER copy in `src/content/site.ts` first.
   */
  showLanding: false as boolean,

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
    whatsapp: "50600000000",
    email: "hola@example.com",
  },

  /** PLACEHOLDER location — used by the landing (see `showLanding`). */
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
} as const;

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
