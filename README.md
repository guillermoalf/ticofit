# Fit CRM — white-label base

Portal de clientes para gimnasios / entrenadores personales: roster de
clientes, rutinas y programas, biblioteca de ejercicios, visitas, medidas,
progreso, evidencias y pagos.

Esta es la **base white-label**: no lleva marca. Todo lo específico de un
cliente se configura en un solo archivo, [`src/config/brand.ts`](src/config/brand.ts).

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (tokens CSS-first vía `@theme inline`)
- **Supabase** (`@supabase/ssr`) para autenticación y base de datos
- **framer-motion**, **gsap**, **lucide-react**, **sonner**
- **yarn** · desplegable en **AWS Amplify** o **Vercel**

## Desarrollo local

```bash
yarn install
cp .env.example .env.local   # completá con tus llaves de Supabase
cp .mcp.json.example .mcp.json   # opcional: MCP de Supabase para agentes
yarn dev                     # http://localhost:3000
```

`.mcp.json` apunta a **un** proyecto de Supabase (`project_ref`), así que es
por instancia y está en `.gitignore` — igual que `.env.local`. El archivo
versionado es `.mcp.json.example`.

`/` redirige a `/login` (ver `showLanding`); el login y `/portal` requieren
las variables de entorno de Supabase.

### Variables de entorno

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase (Settings → API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Llave pública `anon` |

Nunca comitás `.env.local` ni la `service_role` key.

## Marca (theming por cliente)

Todo se configura en [`src/config/brand.ts`](src/config/brand.ts):

| Campo | Qué controla |
|---|---|
| `name` | Wordmark del portal, título del tab, metadata, OG |
| `tagline` / `description` | Título y descripción de metadata |
| `url` | `metadataBase` (dominio de producción) |
| `logoSrc` | `null` → wordmark de texto; `"/logo.png"` → imagen |
| `showLanding` | `false` → `/` redirige a `/login`; `true` → sirve el landing |
| `accent.color` / `.rgb` / `.ink` | El único color de acento (tokens, glows, focus ring) |
| `contact.whatsapp` / `.email` | Links de WhatsApp y correo |
| `location` / `socials` | Datos del landing (ver `showLanding`) |

El acento se inyecta como variables CSS inline en `<html>` desde
`src/app/layout.tsx`; los valores en `globals.css` son solo el fallback. La
base monocroma oscura no cambia — solo el acento.

### Landing pública

La base arranca **portal-only**: con `BRAND.showLanding: false`, `/` responde
un 307 a `/login` antes de enviar markup, así que nada del landing llega al
navegador (ni HTML ni chunks JS).

Para servir el landing en `/`, poné `showLanding: true` en
[`src/config/brand.ts`](src/config/brand.ts) — no hay que tocar código. Antes
de activarlo, reemplazá el copy PLACEHOLDER de `src/content/site.ts`.

Los componentes viven en `src/components/sections/`, compuestos en
`landing.tsx`. Aparecen bajo `/` en la tabla de rutas del build aunque el flag
esté apagado; es solo una estadística de build, el redirect corta antes.

### Assets

No se incluye ningún archivo de marca. Ver [`public/README.md`](public/README.md)
para la lista de archivos opcionales (`logo.png`, videos, OG image) y
`src/app/icon.svg` para el favicon.

## Base de datos (Supabase)

Ejecutá las migraciones de `supabase/migrations/` en orden en el SQL editor
de Supabase (o `supabase db push`). Crean el enum `user_role`, la tabla
`profiles`, el esquema completo del portal (finanzas, ejercicios, programas,
rutinas, visitas, medidas, evidencias), el bucket privado `evidence` y las
políticas RLS.

Por defecto un usuario nuevo es `client`; para volver a alguien `coach`,
actualizá su fila en `profiles` desde el dashboard.

## Estructura

```
src/
├─ app/            # / (redirect a login), login, portal, auth/callback
├─ config/brand.ts # ⭐ marca: nombre, acento, contacto, logo
├─ components/
│  ├─ sections/    # landing opt-in (landing.tsx compone Navbar, Hero, …)
│  ├─ portal/      # sidebar, formularios, listas del portal
│  ├─ ui/          # Logo, Button (cva), Card, Badge, …
│  └─ motion/      # Reveal (scroll-in)
├─ content/site.ts # copy del landing + helpers (deriva de brand.ts)
├─ lib/supabase/   # clientes browser/server/middleware
└─ middleware.ts   # refresco de sesión + guard de /portal
```

## Despliegue

- **Amplify**: usa `amplify.yml`. Definí las dos variables `NEXT_PUBLIC_*` en
  la consola de Amplify.
- **Vercel**: importá el repo, agregá las mismas variables de entorno. Sin
  configuración adicional.

## Notas de diseño / costo

- Biblioteca de ejercicios = **videos enlazados** (YouTube/Vimeo), nunca
  subidas alojadas — mantiene el costo bajo.
- Imágenes optimizadas; sin video pesado en el repo.
