import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import { BRAND, brandCssVars } from "@/config/brand";
import { introScript } from "@/lib/intro";
import "./globals.css";

/**
 * Google Sans (brand manual typeface, SIL OFL — see src/fonts/GoogleSans-OFL.txt).
 * Variable weight 400–700, subset to Latin from public/fonts/Google_Sans.
 * The one sans for the whole app: public site and portal.
 */
const googleSans = localFont({
  variable: "--font-google-sans",
  src: [
    { path: "../fonts/google-sans.woff2", weight: "400 700", style: "normal" },
    { path: "../fonts/google-sans-italic.woff2", weight: "400 700", style: "italic" },
  ],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.url),
  title: {
    default: `${BRAND.name} — ${BRAND.tagline}`,
    template: `%s · ${BRAND.name}`,
  },
  description: BRAND.description,
  keywords: [
    "entrenamiento personalizado",
    "personal training",
    "gimnasio",
    "portal de clientes",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: BRAND.description,
    url: "/",
    siteName: BRAND.name,
    locale: "es_CR",
    type: "website",
    // No OG image ships with the base — add one per client in /public and
    // declare it here (see README, "Assets to replace").
  },
  twitter: {
    card: "summary",
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: BRAND.description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: introScript may add data-tf-intro to <html>
    // before React hydrates it.
    <html lang="es" style={brandCssVars()} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: introScript }} />
      </head>
      <body
        className={`${googleSans.variable} font-sans antialiased`}
      >
        {children}
        <Toaster theme="dark" position="top-center" richColors />
      </body>
    </html>
  );
}
