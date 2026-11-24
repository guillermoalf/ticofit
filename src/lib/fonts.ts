import localFont from "next/font/local";

/**
 * Display serif — TRIAL: Antic Didone (SIL OFL), subset to Latin from
 * public/fonts. It ships Regular only, so italics are synthesised. Shared by
 * the public site and the internal system (`font-tf-serif`).
 */
export const displaySerif = localFont({
  variable: "--font-tf-display",
  src: [{ path: "../fonts/antic-didone.woff2", weight: "400", style: "normal" }],
  display: "swap",
});
